import { SellerQuestions } from '@/components/seller/seller-questions';

export default function SellerQuestionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1>Müşteri Soruları</h1>
        <p className="text-sm text-ink-muted80">
          Müşterilerin ürünleriniz hakkında sorduğu soruları cevaplayın. "Yayınla" işaretlerseniz
          cevap ürün sayfasında herkese görünür.
        </p>
      </div>
      <SellerQuestions />
    </div>
  );
}

export const metadata = { title: 'Sorular', robots: { index: false } };
