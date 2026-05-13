import { Injectable } from '@nestjs/common';
import { logger } from '@yorecebimde/shared';

export type CargoMode = 'self_managed' | 'aras' | 'mng' | 'yurtici' | 'ptt' | 'integrated_other';

export type ShippingOption = {
  mode: CargoMode;
  label: string;
  estDays: string;
  priceCents: number;
  supportsColdChain: boolean;
};

export type ShipmentRequest = {
  sellerId: string;
  orderId: string;
  orderNo: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  isColdChain: boolean;
};

export type ShipmentResult = {
  provider: CargoMode;
  trackingNo: string;
  labelUrl: string | null;
};

export interface IShippingProvider {
  readonly mode: CargoMode;
  createShipment(req: ShipmentRequest): Promise<ShipmentResult>;
  track(trackingNo: string): Promise<{ status: string; events: Array<{ at: string; desc: string }> }>;
}

/**
 * Shipping provider stubs — gerçek API entegrasyonu Faz 4.x'te.
 * Aras: XML/SOAP veya yeni REST API
 * MNG: REST + token
 * Yurtiçi: REST + API key
 * PTT: REST + UserCode/Password
 */

class StubProvider implements IShippingProvider {
  constructor(public readonly mode: CargoMode, private readonly displayName: string) {}

  async createShipment(req: ShipmentRequest): Promise<ShipmentResult> {
    const trackingNo = `${this.mode.toUpperCase()}-STUB-${Date.now()}`;
    logger.info(
      {
        provider: `${this.displayName}-stub`,
        orderNo: req.orderNo,
        recipient: req.recipientName,
        trackingNo,
      },
      '[STUB] shipment created',
    );
    return {
      provider: this.mode,
      trackingNo,
      labelUrl: null, // Faz 4'te PDF gerçek
    };
  }

  async track(_trackingNo: string) {
    return {
      status: 'in_transit',
      events: [
        { at: new Date().toISOString(), desc: `[stub] ${this.displayName} kargoda` },
      ],
    };
  }
}

@Injectable()
export class ShippingService {
  private readonly providers: Record<Exclude<CargoMode, 'self_managed'>, IShippingProvider> = {
    aras: new StubProvider('aras', 'Aras'),
    mng: new StubProvider('mng', 'MNG'),
    yurtici: new StubProvider('yurtici', 'Yurtiçi'),
    ptt: new StubProvider('ptt', 'PTT'),
    integrated_other: new StubProvider('integrated_other', 'Diğer'),
  };

  /**
   * Adres + soğuk zincir bayrağına göre kullanılabilir kargo seçenekleri.
   * Faz 4 gerçeği: kargo şirketlerinin API'sinden fiyat sorgu + bölge kontrolü.
   */
  listOptions(_address: { province: string; district: string }, isColdChain: boolean): ShippingOption[] {
    const base: ShippingOption[] = [
      { mode: 'aras', label: 'Aras Kargo', estDays: '1-3', priceCents: 4990, supportsColdChain: false },
      { mode: 'mng', label: 'MNG Kargo', estDays: '1-3', priceCents: 4490, supportsColdChain: false },
      { mode: 'yurtici', label: 'Yurtiçi Kargo', estDays: '1-3', priceCents: 5490, supportsColdChain: true },
      { mode: 'ptt', label: 'PTT Kargo', estDays: '2-4', priceCents: 3990, supportsColdChain: false },
    ];
    return isColdChain ? base.filter((b) => b.supportsColdChain) : base;
  }

  async createLabel(mode: CargoMode, req: ShipmentRequest): Promise<ShipmentResult> {
    if (mode === 'self_managed') {
      return { provider: 'self_managed', trackingNo: '', labelUrl: null };
    }
    const provider = this.providers[mode];
    if (!provider) throw new Error(`Unknown shipping mode: ${mode}`);
    return provider.createShipment(req);
  }

  async track(mode: CargoMode, trackingNo: string) {
    if (mode === 'self_managed') {
      return { status: 'self_managed', events: [] };
    }
    const provider = this.providers[mode];
    if (!provider) throw new Error(`Unknown shipping mode: ${mode}`);
    return provider.track(trackingNo);
  }
}
