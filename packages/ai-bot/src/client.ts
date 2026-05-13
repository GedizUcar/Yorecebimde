import {
  GoogleGenerativeAI,
  type Content,
  type Part,
} from '@google/generative-ai';
import { functionDeclarations, type FunctionCall, type FunctionName } from './functions/index.js';
import { systemPrompt } from './prompts/system.js';

export type BotConfig = {
  apiKey: string;
  model?: string;
};

export type BotChatInput = {
  userMessage: string;
  history: Array<{ role: 'user' | 'model' | 'function'; content: string; name?: string }>;
  context: {
    userId: string | null;
    locale: 'tr' | 'en';
    userName?: string | null;
  };
};

export type BotChatResult =
  | { type: 'text'; text: string }
  | { type: 'functionCall'; call: FunctionCall };

/**
 * Gemini wrapper. Tek-turn chat — caller function call'u execute eder, sonucu
 * `history`'ye ekleyip tekrar `chat` çağırır. Max iteration controller'da
 * yönetilir (default 5).
 */
export class BotClient {
  private readonly gen: GoogleGenerativeAI;
  private readonly modelName: string;

  constructor(config: BotConfig) {
    this.gen = new GoogleGenerativeAI(config.apiKey);
    this.modelName = config.model ?? 'gemini-2.5-flash';
  }

  async chat(input: BotChatInput): Promise<BotChatResult> {
    const model = this.gen.getGenerativeModel({
      model: this.modelName,
      systemInstruction: systemPrompt({
        locale: input.context.locale,
        isAuthenticated: input.context.userId !== null,
        ...(input.context.userName !== undefined ? { userName: input.context.userName } : {}),
      }),
      tools: [{ functionDeclarations }],
    });

    const contents: Content[] = [
      ...input.history.map<Content>((h) => {
        if (h.role === 'function') {
          return {
            role: 'function',
            parts: [
              {
                functionResponse: {
                  name: h.name ?? 'unknown',
                  response: safeJson(h.content),
                },
              } as Part,
            ],
          };
        }
        return { role: h.role, parts: [{ text: h.content }] };
      }),
      { role: 'user', parts: [{ text: input.userMessage }] },
    ];

    const result = await model.generateContent({ contents });
    const response = result.response;
    const candidate = response.candidates?.[0];
    const part = candidate?.content?.parts?.[0];
    if (!part) return { type: 'text', text: 'Üzgünüm, cevap üretemedim.' };

    if ('functionCall' in part && part.functionCall) {
      const name = part.functionCall.name as FunctionName;
      const args = (part.functionCall.args ?? {}) as Record<string, unknown>;
      return { type: 'functionCall', call: { name, args } };
    }

    const text = response.text();
    return { type: 'text', text: text || 'Üzgünüm, cevap üretemedim.' };
  }

  /**
   * Streaming variant — final text response için token-by-token chunk yield eder.
   * Function call dönerse `functionCall` event yielder + biter (caller'ın
   * function'ı çalıştırıp tekrar başlatması gerekir).
   */
  async *chatStream(
    input: BotChatInput,
  ): AsyncGenerator<
    { type: 'token'; text: string } | { type: 'functionCall'; call: FunctionCall },
    void,
    unknown
  > {
    const model = this.gen.getGenerativeModel({
      model: this.modelName,
      systemInstruction: systemPrompt({
        locale: input.context.locale,
        isAuthenticated: input.context.userId !== null,
        ...(input.context.userName !== undefined ? { userName: input.context.userName } : {}),
      }),
      tools: [{ functionDeclarations }],
    });

    const contents: Content[] = [
      ...input.history.map<Content>((h) => {
        if (h.role === 'function') {
          return {
            role: 'function',
            parts: [
              {
                functionResponse: {
                  name: h.name ?? 'unknown',
                  response: safeJson(h.content),
                },
              } as Part,
            ],
          };
        }
        return { role: h.role, parts: [{ text: h.content }] };
      }),
      { role: 'user', parts: [{ text: input.userMessage }] },
    ];

    const result = await model.generateContentStream({ contents });

    let pendingFunctionCall: FunctionCall | null = null;
    for await (const chunk of result.stream) {
      // functionCall chunk gelirse hemen yield et + dur
      const candidate = chunk.candidates?.[0];
      const parts = candidate?.content?.parts ?? [];
      for (const p of parts) {
        if ('functionCall' in p && p.functionCall) {
          pendingFunctionCall = {
            name: p.functionCall.name as FunctionName,
            args: (p.functionCall.args ?? {}) as Record<string, unknown>,
          };
          break;
        }
      }
      if (pendingFunctionCall) break;

      try {
        const text = chunk.text();
        if (text) yield { type: 'token', text };
      } catch {
        // text() bazı chunk'larda yok (functionCall vs.)
      }
    }

    if (pendingFunctionCall) {
      yield { type: 'functionCall', call: pendingFunctionCall };
    }
  }
}

function safeJson(s: string): Record<string, unknown> {
  try {
    const v = JSON.parse(s);
    if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
    return { result: v };
  } catch {
    return { result: s };
  }
}
