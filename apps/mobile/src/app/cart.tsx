import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { api } from '@/lib/api';

type CartItem = {
  id: string;
  productId: string;
  quantity: string;
  product: { nameTr: string; unit: string };
};

type Cart = {
  cart: { id: string };
  items: CartItem[];
  totals: { subtotalCents: number; discountCents: number; totalCents: number };
  warnings: string[];
};

export default function CartScreen() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: () => api.get<Cart>('/v1/cart'),
  });

  async function removeItem(itemId: string) {
    try {
      await api.delete(`/v1/cart/items/${itemId}`);
      qc.invalidateQueries({ queryKey: ['cart'] });
    } catch {
      Alert.alert('Hata', 'Kaldırılamadı');
    }
  }

  async function updateQty(itemId: string, qty: number) {
    if (qty <= 0) return removeItem(itemId);
    try {
      await api.post(`/v1/cart/items/${itemId}`, { quantity: qty });
      qc.invalidateQueries({ queryKey: ['cart'] });
    } catch {
      Alert.alert('Hata', 'Güncellenemedi');
    }
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Yükleniyor…</Text>
      </View>
    );
  }

  if (!data?.items?.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Sepetin boş</Text>
        <TouchableOpacity
          style={[styles.cta, { marginTop: 16 }]}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.ctaText}>Alışverişe başla</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.list}>
        {data.warnings.map((w, i) => (
          <Text key={i} style={styles.warning}>
            ⚠ {w}
          </Text>
        ))}

        {data.items.map((it) => {
          const qty = Number(it.quantity);
          return (
            <View key={it.id} style={styles.item}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{it.product.nameTr}</Text>
              </View>
              <View style={styles.qtyControls}>
                <TouchableOpacity onPress={() => updateQty(it.id, qty - 1)} style={styles.qtyBtn}>
                  <Text style={styles.qtyBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qtyValue}>
                  {qty} {it.product.unit}
                </Text>
                <TouchableOpacity onPress={() => updateQty(it.id, qty + 1)} style={styles.qtyBtn}>
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.summary}>
        <View style={styles.row}>
          <Text style={styles.muted}>Toplam</Text>
          <Text style={styles.totalText}>
            {(data.totals.totalCents / 100).toFixed(2)} ₺
          </Text>
        </View>
        <TouchableOpacity style={styles.cta} onPress={() => router.push('/checkout')}>
          <Text style={styles.ctaText}>Ödemeye Devam Et</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfaf5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  muted: { color: '#6b6b6b' },
  list: { padding: 16, gap: 8 },
  warning: {
    fontSize: 12,
    color: '#92400e',
    backgroundColor: '#fef3c7',
    padding: 8,
    borderRadius: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    gap: 8,
  },
  itemName: { fontSize: 14, fontWeight: '600' },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 32,
    height: 32,
    backgroundColor: '#f5f0e8',
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: { fontSize: 18, fontWeight: '600' },
  qtyValue: { fontSize: 13, fontWeight: '600', minWidth: 60, textAlign: 'center' },
  summary: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopColor: '#e5e5e5',
    borderTopWidth: 1,
    gap: 12,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  totalText: { fontSize: 22, fontWeight: '700' },
  cta: {
    backgroundColor: '#0a0a0a',
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
