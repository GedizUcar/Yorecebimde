import { SellerInviteRedeem } from '@/components/seller-invite-redeem';

export default async function SellerInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <main className="tile-light">
      <div className="max-w-narrow mx-auto space-y-6">
        <h1>Yörecebimde'ye Hoşgeldiniz</h1>
        <SellerInviteRedeem token={token} />
      </div>
    </main>
  );
}

export const metadata = { title: 'Satıcı Daveti', robots: { index: false } };
