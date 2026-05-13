import { notFound } from 'next/navigation';
import { apiServer, ApiClientError } from '@/lib/api';
import { PrintButton } from '@/components/print-button';

type OrderItem = {
  id: string;
  productNameSnapshot: string;
  variationLabelSnapshot: string | null;
  unitSnapshot: string;
  quantity: string;
  unitPriceCents: number;
  lineTotalCents: number;
  discountCents: number;
  kdvRate: string;
};

type OrderDetail = {
  order: {
    id: string;
    orderNo: string;
    subtotalCents: number;
    discountCents: number;
    shippingCents: number;
    kdvCents: number;
    totalCents: number;
    shippingAddressSnapshot: {
      label: string;
      recipientName: string;
      phone: string;
      province: string;
      district: string;
      addressLine: string;
    };
    createdAt: string;
  };
  items: OrderItem[];
};

function formatCents(n: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n / 100);
}

/**
 * Mesafeli satış sözleşmesi — yazdırılabilir HTML. Kullanıcı tarayıcıdan PDF
 * olarak kaydedebilir (Ctrl+P → Save as PDF). Gerçek PDF üretimi (puppeteer)
 * Faz 8 — sunucu kaynağı gerektirir.
 */
export default async function SozlesmePage({
  params,
}: {
  params: Promise<{ orderNo: string }>;
}) {
  const { orderNo } = await params;
  let data: OrderDetail;
  try {
    data = await apiServer.get<OrderDetail>(`/v1/orders/${orderNo}`);
  } catch (e) {
    if (e instanceof ApiClientError && e.status === 404) notFound();
    throw e;
  }

  const { order, items } = data;

  return (
    <main className="bg-canvas p-8 max-w-content mx-auto print:p-0">
      <div className="print:hidden mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mesafeli Satış Sözleşmesi</h1>
        <PrintButton />
      </div>

      <article className="prose-sm space-y-4 text-sm leading-relaxed">
        <header className="text-center">
          <h2 className="text-xl font-bold">MESAFELİ SATIŞ SÖZLEŞMESİ</h2>
          <p className="text-ink-muted80">
            Sipariş No: <strong>{order.orderNo}</strong> · Tarih:{' '}
            {new Date(order.createdAt).toLocaleDateString('tr-TR')}
          </p>
        </header>

        <section>
          <h3 className="font-bold">1. TARAFLAR</h3>
          <p>
            <strong>1.1. SATICI:</strong> Yörecebimde Pazaryeri (Aracı Hizmet Sağlayıcı). Ürünün
            asıl satıcısı, sipariş detayında belirtilen üretici/satıcı işletmedir.
          </p>
          <p>
            <strong>1.2. ALICI:</strong> {order.shippingAddressSnapshot.recipientName}
            <br />
            Adres: {order.shippingAddressSnapshot.addressLine},{' '}
            {order.shippingAddressSnapshot.district}/{order.shippingAddressSnapshot.province}
            <br />
            Telefon: {order.shippingAddressSnapshot.phone}
          </p>
        </section>

        <section>
          <h3 className="font-bold">2. SÖZLEŞMENİN KONUSU</h3>
          <p>
            İşbu sözleşme; ALICI'nın elektronik ortamda sipariş verdiği, aşağıda nitelik ve
            satış fiyatı belirtilen ürün/ürünlerin satışı ve teslimi ile ilgili tarafların hak ve
            yükümlülüklerini düzenler.
          </p>
        </section>

        <section>
          <h3 className="font-bold">3. ÜRÜN BİLGİLERİ</h3>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-ink">
                <th className="py-2 text-left">Ürün</th>
                <th className="py-2 text-right">Miktar</th>
                <th className="py-2 text-right">Birim Fiyat</th>
                <th className="py-2 text-right">İndirim</th>
                <th className="py-2 text-right">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b border-hairline">
                  <td className="py-2">
                    {it.productNameSnapshot}
                    {it.variationLabelSnapshot && (
                      <span className="text-ink-muted80"> · {it.variationLabelSnapshot}</span>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    {Number(it.quantity)} {it.unitSnapshot}
                  </td>
                  <td className="py-2 text-right">{formatCents(it.unitPriceCents)}</td>
                  <td className="py-2 text-right">{formatCents(it.discountCents)}</td>
                  <td className="py-2 text-right">{formatCents(it.lineTotalCents)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td colSpan={4} className="py-2 text-right">
                  Ara Toplam
                </td>
                <td className="py-2 text-right">{formatCents(order.subtotalCents)}</td>
              </tr>
              {order.discountCents > 0 && (
                <tr>
                  <td colSpan={4} className="py-2 text-right">
                    İndirim
                  </td>
                  <td className="py-2 text-right">−{formatCents(order.discountCents)}</td>
                </tr>
              )}
              <tr>
                <td colSpan={4} className="py-2 text-right">
                  KDV (dahil)
                </td>
                <td className="py-2 text-right">{formatCents(order.kdvCents)}</td>
              </tr>
              <tr>
                <td colSpan={4} className="py-2 text-right">
                  Kargo
                </td>
                <td className="py-2 text-right">{formatCents(order.shippingCents)}</td>
              </tr>
              <tr className="font-bold text-base border-t-2 border-ink">
                <td colSpan={4} className="py-2 text-right">
                  GENEL TOPLAM
                </td>
                <td className="py-2 text-right">{formatCents(order.totalCents)}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        <section>
          <h3 className="font-bold">4. CAYMA HAKKI</h3>
          <p>
            ALICI; sözleşme konusu malı teslim aldığı tarihten itibaren <strong>14 gün</strong>{' '}
            içerisinde herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin sözleşmeden
            cayma hakkına sahiptir.
          </p>
          <p>
            <strong>İstisna:</strong> Mesafeli Sözleşmeler Yönetmeliği madde 15 gereği, çabuk
            bozulabilen veya son kullanma tarihi geçebilecek olan ürünler (taze gıda, süt ürünü,
            soğuk zincir ürünler) için cayma hakkı kullanılamaz.
          </p>
        </section>

        <section>
          <h3 className="font-bold">5. TESLİMAT</h3>
          <p>
            Ürünler, ödeme onayından sonra en geç 30 gün içerisinde, satıcı tarafından belirtilen
            kargo şirketi aracılığıyla ALICI'ya teslim edilir.
          </p>
        </section>

        <section>
          <h3 className="font-bold">6. ŞİKAYET VE İTİRAZ</h3>
          <p>
            ALICI; şikayet ve itirazları için T.C. Sanayi ve Teknoloji Bakanlığı Tüketici Hakem
            Heyetleri ile Tüketici Mahkemelerine başvurabilir.
          </p>
        </section>

        <section>
          <h3 className="font-bold">7. YÜRÜRLÜK</h3>
          <p>
            ALICI'nın sipariş onayı ile birlikte işbu sözleşmenin tüm koşullarını kabul ettiği
            varsayılır. Sözleşme {new Date(order.createdAt).toLocaleString('tr-TR')} tarihinde
            elektronik ortamda kurulmuştur.
          </p>
        </section>

        <footer className="pt-6 border-t border-hairline text-xs text-ink-muted80">
          <p>
            Bu sözleşme 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler
            Yönetmeliği çerçevesinde düzenlenmiştir.
          </p>
        </footer>
      </article>
    </main>
  );
}

export const metadata = { title: 'Mesafeli Satış Sözleşmesi', robots: { index: false } };
