'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { getDeviceId } from '@/lib/device-id';
import type { CartView, EmptyCartView } from '@/lib/cart-types';
import { isEmpty } from '@/lib/cart-types';

const CART_EVENT = 'yorecebimde:cart-updated';

function deviceHeaders(): Record<string, string> {
  return { 'x-device-id': getDeviceId() };
}

async function fetchCart(): Promise<CartView | EmptyCartView> {
  return apiClient.get<CartView | EmptyCartView>('/v1/cart', { headers: deviceHeaders() });
}

export function emitCartUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CART_EVENT));
  }
}

/** Global cart state — useEffect ile fetch eder, event emit ile günceller. */
export function useCart() {
  const [cart, setCart] = useState<CartView | EmptyCartView | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchCart();
      setCart(data);
    } catch {
      setCart({ empty: true, items: [], totals: zeroTotals() });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const handler = () => void refresh();
    window.addEventListener(CART_EVENT, handler);
    return () => window.removeEventListener(CART_EVENT, handler);
  }, [refresh]);

  return { cart, loading, refresh };
}

export async function addToCart(input: {
  productId: string;
  variationId?: string;
  quantity: number;
}): Promise<CartView> {
  const data = await apiClient.post<CartView>('/v1/cart/items', input, {
    headers: deviceHeaders(),
  });
  emitCartUpdate();
  return data;
}

export async function updateCartItem(itemId: string, quantity: number): Promise<CartView> {
  const data = await apiClient.patch<CartView>(
    `/v1/cart/items/${itemId}`,
    { quantity },
    { headers: deviceHeaders() },
  );
  emitCartUpdate();
  return data;
}

export async function removeCartItem(itemId: string): Promise<CartView> {
  const data = await apiClient.delete<CartView>(`/v1/cart/items/${itemId}`, {
    headers: deviceHeaders(),
  });
  emitCartUpdate();
  return data;
}

export function cartItemCount(cart: CartView | EmptyCartView | null): number {
  if (!cart) return 0;
  if (isEmpty(cart)) return 0;
  return cart.totals.itemCount;
}

function zeroTotals() {
  return {
    subtotalCents: 0,
    discountCents: 0,
    kdvCents: 0,
    totalCents: 0,
    itemCount: 0,
    lineSummaries: [],
  };
}
