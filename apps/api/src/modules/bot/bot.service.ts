import { Injectable, Logger } from '@nestjs/common';
import { BotClient, type BotChatInput, type BotChatResult } from '@yorecebimde/ai-bot';
import { BusinessRuleError } from '@yorecebimde/shared';
import { BotFunctionsService } from './bot-functions.service.js';

const MAX_FUNCTION_ITERATIONS = 5;

/**
 * Bot orchestrator. Tek mesaj alır, Gemini'den text dönene kadar function call
 * loop'u yürütür. Conversation history persist edilmez — caller turn'leri
 * frontend state'inde tutar.
 */
@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);
  private readonly client: BotClient | null;

  constructor(private readonly functions: BotFunctionsService) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      this.client = null;
      this.logger.warn('GEMINI_API_KEY not set — bot will return fallback');
    } else {
      this.client = new BotClient({
        apiKey,
        ...(process.env.GEMINI_MODEL ? { model: process.env.GEMINI_MODEL } : {}),
      });
    }
  }

  async chat(input: {
    userMessage: string;
    history: BotChatInput['history'];
    userId: string | null;
    deviceId: string | null;
    locale?: 'tr' | 'en';
    userName?: string | null;
  }) {
    if (!this.client) {
      return {
        type: 'text' as const,
        text: 'Bot şu an kullanılamıyor (yapılandırma eksik). Lütfen daha sonra tekrar deneyin.',
        history: input.history,
      };
    }

    const history = [...input.history];

    for (let i = 0; i < MAX_FUNCTION_ITERATIONS; i++) {
      const result: BotChatResult = await this.client.chat({
        userMessage: i === 0 ? input.userMessage : '',
        history,
        context: {
          userId: input.userId,
          locale: input.locale ?? 'tr',
          ...(input.userName !== undefined ? { userName: input.userName } : {}),
        },
      });

      if (i === 0) {
        history.push({ role: 'user', content: input.userMessage });
      }

      if (result.type === 'text') {
        history.push({ role: 'model', content: result.text });
        return { type: 'text' as const, text: result.text, history };
      }

      // functionCall
      const fnName = result.call.name;
      const fnResult = await this.functions.execute(result.call, {
        userId: input.userId,
        deviceId: input.deviceId,
      });
      history.push({
        role: 'model',
        content: JSON.stringify({ functionCall: { name: fnName, args: result.call.args } }),
      });
      history.push({
        role: 'function',
        name: fnName,
        content: JSON.stringify(fnResult),
      });
    }

    throw new BusinessRuleError('Bot iterasyon limiti aşıldı');
  }

  /**
   * Streaming chat — function loop synchronously, final text token-by-token.
   * Yields:
   *   { type: 'function', name, args } — function execute edildiğinde
   *   { type: 'function_result', result } — function sonucu
   *   { type: 'token', text } — final text chunk
   *   { type: 'done', history } — son
   */
  async *chatStream(input: {
    userMessage: string;
    history: BotChatInput['history'];
    userId: string | null;
    deviceId: string | null;
    locale?: 'tr' | 'en';
    userName?: string | null;
  }): AsyncGenerator<
    | { type: 'function'; name: string; args: Record<string, unknown> }
    | { type: 'function_result'; result: Record<string, unknown> }
    | { type: 'token'; text: string }
    | { type: 'done'; history: BotChatInput['history'] },
    void,
    unknown
  > {
    if (!this.client) {
      yield {
        type: 'token',
        text: 'Bot şu an kullanılamıyor (yapılandırma eksik).',
      };
      yield { type: 'done', history: input.history };
      return;
    }

    const history = [...input.history];
    let currentMessage = input.userMessage;

    for (let i = 0; i < MAX_FUNCTION_ITERATIONS; i++) {
      let collectedText = '';
      let toolCall: { name: string; args: Record<string, unknown> } | null = null;

      for await (const event of this.client.chatStream({
        userMessage: currentMessage,
        history,
        context: {
          userId: input.userId,
          locale: input.locale ?? 'tr',
          ...(input.userName !== undefined ? { userName: input.userName } : {}),
        },
      })) {
        if (event.type === 'token') {
          collectedText += event.text;
          yield { type: 'token', text: event.text };
        } else if (event.type === 'functionCall') {
          toolCall = { name: event.call.name, args: event.call.args };
          break;
        }
      }

      if (i === 0) {
        history.push({ role: 'user', content: input.userMessage });
      }

      if (toolCall) {
        history.push({
          role: 'model',
          content: JSON.stringify({ functionCall: toolCall }),
        });
        yield { type: 'function', name: toolCall.name, args: toolCall.args };
        const fnResult = await this.functions.execute(
          { name: toolCall.name as never, args: toolCall.args },
          { userId: input.userId, deviceId: input.deviceId },
        );
        history.push({
          role: 'function',
          name: toolCall.name,
          content: JSON.stringify(fnResult),
        });
        yield { type: 'function_result', result: fnResult };
        currentMessage = '';
        continue;
      }

      // Text response — final
      history.push({ role: 'model', content: collectedText });
      yield { type: 'done', history };
      return;
    }

    yield { type: 'token', text: 'Üzgünüm, çok fazla işlem gerekti.' };
    yield { type: 'done', history };
  }
}
