# @yorecebimde/storage

> MinIO (S3-compatible) wrapper. Presigned URL üretimi, image processing trigger, bucket management.

## Bucket'lar

| Bucket | Görünürlük | İçerik |
|---|---|---|
| `products` | Public read | Ürün görselleri (WebP) |
| `seller-documents` | Private | KYC belgeleri (vergi levhası, IBAN evrak, vs.) |
| `invoices` | Private | e-Arşiv + e-Fatura PDF |
| `chat-attachments` | Private | Chat ek dosyaları |
| `disputes` | Private | Dispute delilleri |
| `backups` | Private | DB dump'ları (off-server'a sync) |

## API

```ts
import { StorageClient } from '@yorecebimde/storage';

const storage = new StorageClient({ endpoint, accessKey, secretKey });

const { url, key } = await storage.getPresignedUploadUrl({
  bucket: 'products',
  filename: 'kayisi.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 1_234_567,
  expiresInSec: 600,
});

await storage.getPresignedDownloadUrl({ bucket, key });
await storage.deleteObject({ bucket, key });
```

## Image Processing

Upload sonrası `image-processing` BullMQ job tetiklenir:
- Sharp ile WebP dönüşüm (orijinal + thumbnail)
- Resize max 2000px width
- Thumbnail 400×400 cover
- DB `product_images` row update

## Güvenlik

- Presigned URL TTL 10 dk (kısa)
- IP bound (uygulanabilirse)
- MIME tip + magic byte check upload öncesi
- ClamAV virus scan (`virus-scan` BullMQ job)
- Path traversal önleme: filename hash + UUID

## Detay

[docs/ARCHITECTURE.md §2.7](../../docs/ARCHITECTURE.md)
