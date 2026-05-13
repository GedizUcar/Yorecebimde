# Mobile Assets

Bu klasör mobile uygulama için ikon, splash, adaptive-icon ve notification icon dosyalarını barındırır.

## Gerekli Dosyalar (production)

| Dosya | Boyut | Kullanım |
|---|---|---|
| `icon.png` | 1024×1024 PNG (no transparency, no rounded corners) | App icon — iOS App Store + Android Play Store |
| `splash.png` | 1284×2778 (iPhone 14 Pro Max) veya 2048×2048 | Launch screen |
| `adaptive-icon.png` | 1024×1024 PNG (transparent bg, foreground only) | Android adaptive icon foreground |
| `notification-icon.png` | 96×96 monochrome PNG | Android notification status bar icon |
| `favicon.png` | 48×48 | Web preview |

## Tasarım Brief

- **Logo motifi**: "Y" harfi stilize, sıcak yöresel ton (#d2691e turuncu-kahve)
- **Background**: koyu (#0a0a0a) splash + adaptive icon background
- **Foreground**: beyaz / krem (#fdfaf5) — yüksek kontrast

## Şu An (Faz 7.2 placeholder)

Asset'ler henüz hazır değil — graphic designer'dan beklenecek (Faz 7.3 launch öncesi).
Build sırasında Expo default'larını kullanır (jenerik mavi background + Expo logo).

`app.json`'da referanslar mevcut ama dosyalar yok — `eas build` warning verir ama
build'i durdurmaz.

## Asset Üretimi

İlk asset hazır olunca:
```bash
# Expo'nun otomatik resize'ı için generator kullanılabilir
npx @bam.tech/react-native-make set-icon \
  --platform all \
  --path apps/mobile/assets/icon.png
```

## Privacy Manifest (iOS 17+)

`PrivacyInfo.xcprivacy` — `apps/mobile/ios/PrivacyInfo.xcprivacy` (eas build sonrası
generate edilir). Şu an plugin config yeterli, manuel manifest gerek yok.
