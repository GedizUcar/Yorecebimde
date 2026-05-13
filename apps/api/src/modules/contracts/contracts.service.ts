import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import PDFDocument from 'pdfkit';
import { orderItems, orders } from '@yorecebimde/db/schema';
import { BusinessRuleError, NotFoundError } from '@yorecebimde/shared';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';

/**
 * Server-side PDF üretimi (pdfkit). HTML print'e alternatif — bildirim email
 * ekine veya admin export'a uygundur.
 *
 * Yazı tipi: pdfkit'in built-in Helvetica (Latin-1) — Türkçe karakterler için
 * çoğu durumda yeterli. Tam Unicode için Faz 8'de DejaVu/Noto font register.
 */
@Injectable()
export class ContractsService {
  constructor(@Inject(DB_TOKEN) private readonly db: DbToken) {}

  async generateMesafeliSatisPdf(userId: string, orderNo: string): Promise<Buffer> {
    const [order] = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.orderNo, orderNo), eq(orders.userId, userId), isNull(orders.deletedAt)))
      .limit(1);
    if (!order) throw new NotFoundError('Order', orderNo);

    const items = await this.db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));
    if (items.length === 0) throw new BusinessRuleError('Sipariş kalemleri bulunamadı');

    const buffers: Buffer[] = [];
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.on('data', (chunk) => buffers.push(chunk));
    const done = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
    });

    // Türkçe karakter desteği için pdfkit built-in fontları yerine bir TTF font
    // register etmek lazım. Çoğu ürün adı Latin-1 içinde — şu an Helvetica yeterli.
    // ASCII fallback uygulayalım: özel karakterleri yaklaşık karşılığa map et.
    const tr = (s: string) =>
      s
        .replace(/ı/g, 'i')
        .replace(/İ/g, 'I')
        .replace(/ş/g, 's')
        .replace(/Ş/g, 'S')
        .replace(/ğ/g, 'g')
        .replace(/Ğ/g, 'G')
        .replace(/ü/g, 'u')
        .replace(/Ü/g, 'U')
        .replace(/ö/g, 'o')
        .replace(/Ö/g, 'O')
        .replace(/ç/g, 'c')
        .replace(/Ç/g, 'C');

    const fmtCents = (c: number) => `${(c / 100).toFixed(2)} TL`;
    const addr = order.shippingAddressSnapshot as Record<string, string>;

    doc.fontSize(16).font('Helvetica-Bold').text(tr('MESAFELI SATIS SOZLESMESI'), {
      align: 'center',
    });
    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(
        tr(
          `Siparis No: ${order.orderNo}    Tarih: ${order.createdAt.toLocaleDateString('tr-TR')}`,
        ),
        { align: 'center' },
      );
    doc.moveDown(1);

    doc.fontSize(11).font('Helvetica-Bold').text(tr('1. TARAFLAR'));
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(
        tr(
          'SATICI: Yorecebimde Pazaryeri (Araci Hizmet Saglayici). Urunun asil saticisi, siparis detayinda belirtilen uretici/satici isletmedir.',
        ),
      );
    doc.moveDown(0.5);
    doc.text(
      tr(
        `ALICI: ${addr['recipientName'] ?? '-'}\nAdres: ${addr['addressLine'] ?? '-'}, ${addr['district'] ?? '-'}/${addr['province'] ?? '-'}\nTelefon: ${addr['phone'] ?? '-'}`,
      ),
    );
    doc.moveDown(1);

    doc.fontSize(11).font('Helvetica-Bold').text(tr('2. SOZLESMENIN KONUSU'));
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(
        tr(
          "Isbu sozlesme; ALICI'nin elektronik ortamda siparis verdigi asagidaki urun(ler)in satisi ve teslimi ile ilgili taraflarin hak ve yukumluluklerini duzenler.",
        ),
      );
    doc.moveDown(1);

    doc.fontSize(11).font('Helvetica-Bold').text(tr('3. URUN BILGILERI'));
    doc.moveDown(0.3);

    // Table header
    const tableTop = doc.y;
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text(tr('Urun'), 50, tableTop);
    doc.text(tr('Miktar'), 280, tableTop);
    doc.text(tr('Birim Fiyat'), 350, tableTop);
    doc.text(tr('Tutar'), 480, tableTop);
    doc
      .moveTo(50, tableTop + 15)
      .lineTo(545, tableTop + 15)
      .stroke();

    doc.font('Helvetica');
    let y = tableTop + 20;
    for (const it of items) {
      const name = tr(it.productNameSnapshot) + (it.variationLabelSnapshot ? ` (${tr(it.variationLabelSnapshot)})` : '');
      doc.fontSize(9);
      doc.text(name, 50, y, { width: 220 });
      doc.text(`${Number(it.quantity)} ${tr(it.unitSnapshot)}`, 280, y);
      doc.text(fmtCents(Number(it.unitPriceCents)), 350, y);
      doc.text(fmtCents(Number(it.lineTotalCents)), 480, y);
      y += 18;
    }

    doc
      .moveTo(50, y + 2)
      .lineTo(545, y + 2)
      .stroke();
    y += 10;

    doc.font('Helvetica');
    doc.text(tr(`Ara Toplam: ${fmtCents(order.subtotalCents)}`), 350, y);
    y += 14;
    if (order.discountCents > 0) {
      doc.text(tr(`Indirim: -${fmtCents(order.discountCents)}`), 350, y);
      y += 14;
    }
    doc.text(tr(`KDV (dahil): ${fmtCents(order.kdvCents)}`), 350, y);
    y += 14;
    doc.text(tr(`Kargo: ${fmtCents(order.shippingCents)}`), 350, y);
    y += 14;
    doc.font('Helvetica-Bold').text(tr(`GENEL TOPLAM: ${fmtCents(order.totalCents)}`), 350, y);
    doc.font('Helvetica');
    y += 25;

    doc.fontSize(11).font('Helvetica-Bold').text(tr('4. CAYMA HAKKI'), 50, y);
    y = doc.y;
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(
        tr(
          "ALICI; sozlesme konusu mali teslim aldigi tarihten itibaren 14 gun icerisinde herhangi bir gerekce gostermeksizin ve cezai sart odemeksizin sozlesmeden cayma hakkina sahiptir.",
        ),
        50,
        doc.y,
      );
    doc.moveDown(0.3);
    doc.text(
      tr(
        'Istisna: Mesafeli Sozlesmeler Yonetmeligi madde 15 geregi, cabuk bozulabilen veya son kullanma tarihi gecebilecek olan urunler (taze gida, sut urunu, soguk zincir) icin cayma hakki kullanilamaz.',
      ),
    );
    doc.moveDown(1);

    doc.fontSize(11).font('Helvetica-Bold').text(tr('5. TESLIMAT'));
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(
        tr(
          "Urunler, odeme onayindan sonra en gec 30 gun icerisinde, satici tarafindan belirtilen kargo sirketi araciligiyla ALICI'ya teslim edilir.",
        ),
      );
    doc.moveDown(1);

    doc.fontSize(11).font('Helvetica-Bold').text(tr('6. SIKAYET VE ITIRAZ'));
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(
        tr(
          'ALICI; sikayet ve itirazlari icin T.C. Sanayi ve Teknoloji Bakanligi Tuketici Hakem Heyetleri ile Tuketici Mahkemelerine basvurabilir.',
        ),
      );
    doc.moveDown(1);

    doc.fontSize(11).font('Helvetica-Bold').text(tr('7. YURURLUK'));
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(
        tr(
          `ALICI'nin siparis onayi ile birlikte isbu sozlesmenin tum kosullarini kabul ettigi varsayilir. Sozlesme ${order.createdAt.toLocaleString('tr-TR')} tarihinde elektronik ortamda kurulmustur.`,
        ),
      );

    doc.moveDown(2);
    doc
      .fontSize(8)
      .text(
        tr(
          'Bu sozlesme 6502 sayili Tuketicinin Korunmasi Hakkinda Kanun ve Mesafeli Sozlesmeler Yonetmeligi cercevesinde duzenlenmistir.',
        ),
        { align: 'center' },
      );

    doc.end();
    return done;
  }
}
