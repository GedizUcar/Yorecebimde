import { IyzicoMockClient } from '@/components/iyzico-mock-client';

export default async function IyzicoMockPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; ref?: string; amount?: string }>;
}) {
  const { token = '', ref = '', amount = '0' } = await searchParams;
  return (
    <main className="tile-light">
      <div className="max-w-narrow mx-auto">
        <IyzicoMockClient token={token} paymentRef={ref} amountCents={Number(amount)} />
      </div>
    </main>
  );
}

export const metadata = { title: 'Ödeme', robots: { index: false } };
