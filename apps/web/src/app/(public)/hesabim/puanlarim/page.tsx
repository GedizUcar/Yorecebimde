import { MyLoyalty } from '@/components/loyalty/my-loyalty';

export default function PuanlarimPage() {
  return (
    <main className="tile-light">
      <div className="max-w-content mx-auto space-y-6">
        <h1>Puanlarım</h1>
        <MyLoyalty />
      </div>
    </main>
  );
}

export const metadata = { title: 'Puanlarım', robots: { index: false } };
