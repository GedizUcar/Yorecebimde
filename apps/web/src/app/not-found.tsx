import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="tile-light">
      <div className="max-w-narrow mx-auto text-center space-y-6">
        <h1>404</h1>
        <p className="text-ink-muted80">Aradığınız sayfa bulunamadı.</p>
        <Link href="/" className="btn-primary">
          Anasayfa
        </Link>
      </div>
    </main>
  );
}
