# @yorecebimde/mobile

> Expo (React Native) — customer mobile app (iOS + Android).
> Sadece müşteri arayüzü; satıcı ve admin paneli mobile'da yok.

## Geliştirme

```bash
# İlk kurulum (workspace root'tan)
pnpm install

# Lokal dev (Expo Go)
pnpm -F @yorecebimde/mobile start

# iOS simulator
pnpm -F @yorecebimde/mobile ios

# Android emulator
pnpm -F @yorecebimde/mobile android
```

Backend için API URL:
- Dev: `app.json > extra.apiUrl` veya `EXPO_PUBLIC_API_URL`
- Staging: `https://yorecebimde-staging.gkteches.com/api` (eas.json `preview`)
- Prod: `https://api.yorecebimde.com` (eas.json `production`)

## Build & Deploy

```bash
eas login
pnpm -F @yorecebimde/mobile build:preview      # TestFlight + Internal Track
pnpm -F @yorecebimde/mobile build:production   # App Store + Play Store
pnpm -F @yorecebimde/mobile update:production  # OTA update
```

## Faz 7.2 Scaffold — Mevcut Durum

✅ Yapıldı:
- Expo SDK 52 + expo-router 4 + new architecture
- API client (`src/lib/api.ts`) — Better-Auth session cookie SecureStore'da
- Push register (`src/lib/push.ts`) — backend `/v1/push-tokens`'a kayıt
- Login screen (email/password + misafir devam)
- Tabs layout: Anasayfa, Arama, Siparişlerim, Profil
- Anasayfa: ürün listesi (sponsorlu badge dahil)
- Arama: `/v1/search`
- Siparişlerim: `/v1/orders`
- Profil: biyometrik aktivasyon + çıkış

⏳ Faz 7.3 (full mobile):
- Ürün detay + galeri + variation
- Sepet + checkout + Iyzico 3DS WebView (`expo-web-browser`)
- Chat (WebSocket) + AI Bot (FAB)
- KVKK self-service + 2FA setup
- Adres CRUD, beğendiklerim, puanlarım, davet
- OTA update channel CI

## Deep Linking

- `yorecebimde://order/<orderNo>` → orders tab
- `yorecebimde://product/<sellerSlug>/<productSlug>` → product detail (Faz 7.3)

Push notification `data.url` bu pattern'i kullanır.
