import { MyReferral } from '@/components/referral/my-referral';

export default function DavetPage() {
  return (
    <main className="tile-light">
      <div className="max-w-content mx-auto space-y-6">
        <h1>Arkadaşını Davet Et</h1>
        <p className="text-sm text-ink-muted80">
          Davet kodunuzu paylaşın. Davet ettiğiniz kişi ilk siparişini tamamladığında
          <strong> 100 puan</strong> kazanırsınız. Davet ettiğiniz kişi de
          <strong> 25 ₺ hoşgeldin kuponu</strong> alır.
        </p>
        <MyReferral />
      </div>
    </main>
  );
}

export const metadata = { title: 'Davet', robots: { index: false } };
