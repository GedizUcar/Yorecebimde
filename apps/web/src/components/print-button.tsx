'use client';

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="px-4 py-2 rounded-pill bg-primary text-white text-sm hover:bg-primary-700"
    >
      🖨 Yazdır / PDF Olarak Kaydet
    </button>
  );
}
