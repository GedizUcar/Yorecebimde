import Link from 'next/link';
import { SellerApplicationForm } from '@/components/seller-application-form';

export default function SaticiOlPage() {
  return (
    <main className="tile-light">
      <div className="max-w-narrow mx-auto space-y-6">
        <nav className="text-sm text-ink-muted80">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="hover:text-primary">
                Anasayfa
              </Link>
            </li>
            <li>›</li>
            <li className="text-ink font-medium">Satıcı Ol</li>
          </ol>
        </nav>
        <div>
          <h1>Satıcı Başvurusu</h1>
          <p className="text-sm text-ink-muted80">
            Yöresel ürünlerinizi Yörecebimde'de satmak için başvurun. Belgeleriniz onaylandıktan sonra
            (1-3 iş günü) email ile davet bağlantısı gönderilir.
          </p>
        </div>
        <SellerApplicationForm />
      </div>
    </main>
  );
}

export const metadata = { title: 'Satıcı Ol' };
