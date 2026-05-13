import Link from 'next/link';

export default function OnboardingPage() {
  return (
    <div className="max-w-narrow mx-auto space-y-8 py-8">
      <div className="text-center space-y-3">
        <div className="text-5xl">🎉</div>
        <h1>Yörecebimde'ye Hoşgeldiniz!</h1>
        <p className="text-ink-muted80">
          Hesabınız oluşturuldu. Şimdi mağazanızı kurmaya başlayalım.
        </p>
      </div>

      <ul className="space-y-3">
        <StepCard
          step={1}
          title="Mağaza profilinizi düzenleyin"
          description="Logo, kapak görseli, hakkında bilgisi ekleyin."
          href="/seller/settings/store"
        />
        <StepCard
          step={2}
          title="İlk ürününüzü ekleyin"
          description="3 adımlı form: bilgiler, görseller, yayına al."
          href="/seller/products/new"
        />
        <StepCard
          step={3}
          title="Panele git"
          description="Genel bakış, siparişler ve raporlar burada."
          href="/seller/dashboard"
        />
      </ul>

      <div className="rounded-md bg-canvas-parchment p-4 text-sm text-ink-muted80">
        <strong>Not (Faz 4 borç):</strong> 2FA setup, çalışma saatleri editörü ve
        bildirim tercihleri kısa sürede aktif olacak.
      </div>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
  href,
}: {
  step: number;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-4 p-4 rounded-lg bg-canvas border border-hairline hover:border-primary transition-colors"
      >
        <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-sm flex-shrink-0">
          {step}
        </span>
        <div className="flex-1">
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-ink-muted80">{description}</p>
        </div>
        <span className="text-primary">→</span>
      </Link>
    </li>
  );
}

export const metadata = { title: 'Hoşgeldiniz', robots: { index: false } };
