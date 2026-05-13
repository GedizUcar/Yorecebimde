# @yorecebimde/ai-bot

> Google Gemini Flash Lite 3.1 wrapper + function calling executor + bot persona.
> Web ve mobil aynı bot endpoint'ini kullanır.

## Akış

```
User message → POST /v1/bot/chat
                ↓
              NestJS bot controller
                ↓
              Gemini SDK (streaming)
                ↓ function_call
              Function executor → NestJS internal endpoint (HMAC service token)
                ↓ result JSON
              Gemini follow-up
                ↓
              Final natural language response → frontend
```

## Functions

`packages/ai-bot/src/functions/`:

- `searchProducts.ts`
- `getProductDetail.ts`
- `getCart.ts`
- `addToCart.ts`
- `updateCartItem.ts`
- `removeFromCart.ts`
- `getAddresses.ts`
- `getPaymentMethods.ts`
- `placeOrder.ts` (auth zorunlu, misafire `LOGIN_REQUIRED` döner)
- `getOrderStatus.ts`
- `contactSeller.ts`

Her function:
- Zod input schema
- Zod output schema
- Internal endpoint mapping
- Description (Gemini'ye verilir)

## System Prompt

`packages/ai-bot/src/prompts/system.ts`:
- Bot persona (Yörecebimde asistanı, samimi TR, yardımcı)
- İş kuralları (misafir checkout yapamaz, vs.)
- Function tool listesi (Gemini formatında)
- Locale (TR / EN dynamic)

## Konuşma Persist Etmiyor

In-memory request scope only. Sayfa kapanınca / oturum biterse → silinir. Privacy by design.

## Rate Limit & Quota

- 60 mesaj/saat/user (Redis sliding window)
- Aylık 1000 mesaj/user (configurable, admin)
- Cost monitoring (Gemini token usage)

## API

```ts
import { Bot } from '@yorecebimde/ai-bot';

const bot = new Bot({ apiKey, model: 'gemini-flash-lite-3.1' });

const stream = await bot.chat({
  userMessage,
  context: { userId, locale, sessionId },
  history: [], // request-scope history
});

for await (const chunk of stream) {
  // emit to client via SSE / WebSocket
}
```

## Detay

[docs/PHASES/PHASE-6-AI-BOT-BOOST.md](../../docs/PHASES/PHASE-6-AI-BOT-BOOST.md)
