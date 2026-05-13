import Link from 'next/link';
import { KvkkRequestForm } from '@/components/kvkk-request-form';

export default function KvkkRequestPage() {
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
            <li className="text-ink font-medium">KVKK Talep</li>
          </ol>
        </nav>

        <div>
          <h1>KVKK Talep Formu</h1>
          <p className="text-sm text-ink-muted80">
            6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamındaki haklarınızı kullanmak için
            bu formu doldurun. 30 gün içinde size cevap vereceğiz.
          </p>
        </div>

        <KvkkRequestForm />
      </div>
    </main>
  );
}

export const metadata = { title: 'KVKK Talep' };
