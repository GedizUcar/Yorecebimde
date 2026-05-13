'use client';

import Link from 'next/link';
import { authClient } from '@/lib/auth-client';

export function AccountSummary() {
  const { data, isPending } = authClient.useSession();

  if (isPending) {
    return <p className="text-sm text-ink-muted80">Yükleniyor…</p>;
  }

  if (!data?.user) {
    return (
      <div className="rounded-lg bg-canvas-parchment p-12 text-center space-y-3">
        <p className="text-ink-muted80">Hesabınızı görüntülemek için giriş yapın.</p>
        <Link
          href="/giris"
          className="inline-block px-6 py-2 rounded-pill bg-primary text-white font-medium hover:bg-primary-700"
        >
          Giriş Yap
        </Link>
      </div>
    );
  }

  const user = data.user;
  const initial =
    user.name?.trim().charAt(0).toUpperCase() ?? user.email.charAt(0).toUpperCase();

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-canvas border border-hairline p-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-canvas-parchment flex items-center justify-center text-2xl font-semibold">
          {initial}
        </div>
        <div className="flex-1">
          <p className="text-lg font-semibold">{user.name ?? 'Kullanıcı'}</p>
          <p className="text-sm text-ink-muted80">{user.email}</p>
          {user.emailVerified && (
            <p className="text-xs text-green-700 mt-1">✓ Email doğrulandı</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LinkCard
          href="/hesabim/siparislerim"
          title="Siparişlerim"
          description="Geçmiş siparişleriniz ve durumları"
        />
        <LinkCard
          href="/begendiklerim"
          title="Beğendiklerim"
          description="Kalp ikonuyla eklediğiniz ürünler"
        />
        <LinkCard
          href="/hesabim/iadelerim"
          title="İade Taleplerim"
          description="Açık iade talepleri ve durumları"
        />
        <LinkCard
          href="/hesabim/mesajlarim"
          title="Mesajlarım"
          description="Satıcılarla yazışmalarınız"
        />
        <LinkCard
          href="/hesabim/puanlarim"
          title="Puanlarım"
          description="Kazanılan ve kullanılan sadakat puanları"
        />
        <LinkCard
          href="/hesabim/davet"
          title="Arkadaşını Davet Et"
          description="Davet kodunu paylaş, puan kazan"
        />
        <LinkCard
          href="/hesabim/yorumlarim"
          title="Yorumlarım"
          description="Yorum yapılacak ürünler ve geçmiş yorumlar"
        />
        <LinkCard
          href="/hesabim/veri-yonetimi"
          title="Veri Yönetimi"
          description="KVKK — verilerimi indir, hesabımı sil"
        />
        <PlaceholderCard
          title="Adreslerim"
          description="Yakında — şu an checkout'tan ekleyebilirsiniz"
        />
      </div>
    </div>
  );
}

function LinkCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg bg-canvas border border-hairline p-6 hover:border-primary hover:shadow-product transition-all"
    >
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-ink-muted80 mt-1">{description}</p>
    </Link>
  );
}

function PlaceholderCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg bg-canvas-parchment border border-hairline p-6">
      <h3 className="font-semibold text-ink-muted80">{title}</h3>
      <p className="text-sm text-ink-muted80 mt-1">{description}</p>
    </div>
  );
}
