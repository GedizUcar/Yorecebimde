import { MyReviews } from '@/components/reviews/my-reviews';

export default function YorumlarimPage() {
  return (
    <main className="tile-light">
      <div className="max-w-content mx-auto space-y-6">
        <h1>Yorumlarım</h1>
        <p className="text-sm text-ink-muted80">
          Teslim aldığınız ürünler için yorum yazabilirsiniz.
        </p>
        <MyReviews />
      </div>
    </main>
  );
}

export const metadata = { title: 'Yorumlarım', robots: { index: false } };
