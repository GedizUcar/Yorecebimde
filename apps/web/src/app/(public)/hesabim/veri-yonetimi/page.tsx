import { VeriYonetimi } from '@/components/kvkk/veri-yonetimi';

export default function VeriYonetimiPage() {
  return (
    <main className="tile-light">
      <div className="max-w-content mx-auto space-y-6">
        <h1>Veri Yönetimi</h1>
        <p className="text-sm text-ink-muted80">
          KVKK madde 11 gereği verilerinize erişme, indirme ve silme hakkınız vardır.
        </p>
        <VeriYonetimi />
      </div>
    </main>
  );
}

export const metadata = { title: 'Veri Yönetimi', robots: { index: false } };
