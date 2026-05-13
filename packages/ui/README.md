# @yorecebimde/ui

> shadcn/ui tabanlı paylaşılan React component'ler. Web ve seller paneli ortak.
> Mobile için ayrı (React Native component'leri uyumsuz).

## İçerik

- `components/` — shadcn primitives (Button, Input, Dialog, ...) + custom
- `theme/` — Tailwind config token'ları (renkler, typography, spacing)
- `icons/` — lucide-react re-export + custom Yörecebimde icons
- `layouts/`:
  - `PublicLayout`
  - `SellerLayout`
  - `AdminLayout`
- `forms/` — form helpers (FormField, FormError, vs.)
- `data-display/` — Table, EmptyState, Pagination
- `feedback/` — Toast, Alert, ConfirmDialog
- `commerce/` — ProductCard, PriceTag, DiscountBadge, SponsoredBadge, etc.

## Setup

```bash
pnpm --filter @yorecebimde/ui add <shadcn-component>
```

## Kullanım

```tsx
import { Button, Card } from '@yorecebimde/ui';
import { ProductCard } from '@yorecebimde/ui/commerce';
```

## Tema

DESIGN.md'deki tasarım pattern'lerine göre token'lar [docs/DESIGN.md](../../docs/DESIGN.md) güncellenince çıkacak.
