import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { api } from '@/lib/api';

type Address = {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  province: string;
  district: string;
  addressLine: string;
  isDefault: boolean;
};

type Cart = {
  items: Array<{ id: string; product: { nameTr: string } }>;
  totals: { totalCents: number };
};

export default function CheckoutScreen() {
  const [selected, setSelected] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  const { data: addresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api.get<Address[]>('/v1/addresses'),
  });

  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: () => api.get<Cart>('/v1/cart'),
  });

  // Default address otomatik seç
  if (addresses && !selected) {
    const def = addresses.find((a) => a.isDefault) ?? addresses[0];
    if (def) setSelected(def.id);
  }

  async function placeOrder() {
    if (!selected) {
      Alert.alert('Eksik', 'Teslimat adresi seç');
      return;
    }
    setPlacing(true);
    try {
      const result = await api.post<{
        paymentRef: string;
        redirectUrl: string;
        orders: Array<{ orderNo: string }>;
      }>('/v1/orders', { shippingAddressId: selected });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Iyzico 3DS — in-app browser
      const webResult = await WebBrowser.openAuthSessionAsync(
        result.redirectUrl,
        'yorecebimde://payment-callback',
      );

      if (webResult.type === 'success' || webResult.type === 'cancel') {
        // Callback URL'i yakalandı veya kullanıcı kapattı — orders ekranına dön
        router.replace('/(tabs)/orders');
      }
    } catch (e) {
      Alert.alert('Sipariş alınamadı', e instanceof Error ? e.message : 'Hata');
    } finally {
      setPlacing(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.h2}>1. Teslimat Adresi</Text>
        {addresses === undefined ? (
          <Text style={styles.muted}>Yükleniyor…</Text>
        ) : addresses.length === 0 ? (
          <Text style={styles.muted}>
            Kayıtlı adresin yok. Adres ekleme web'den şu an — mobile Faz 7.4'te.
          </Text>
        ) : (
          addresses.map((a) => (
            <TouchableOpacity
              key={a.id}
              onPress={() => setSelected(a.id)}
              style={[
                styles.addrItem,
                selected === a.id && styles.addrItemSelected,
              ]}
            >
              <Text style={styles.addrLabel}>
                {a.label} {a.isDefault && <Text style={styles.muted}>(varsayılan)</Text>}
              </Text>
              <Text style={styles.addrLine}>{a.recipientName} · {a.phone}</Text>
              <Text style={styles.addrLine}>
                {a.district}, {a.province} — {a.addressLine}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.h2}>2. Sipariş Özeti</Text>
        {cart?.items?.map((it) => (
          <Text key={it.id} style={styles.itemLine}>
            • {it.product.nameTr}
          </Text>
        ))}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Toplam</Text>
          <Text style={styles.summaryValue}>
            {((cart?.totals.totalCents ?? 0) / 100).toFixed(2)} ₺
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.cta, (!selected || placing) && { opacity: 0.5 }]}
        onPress={placeOrder}
        disabled={!selected || placing}
      >
        <Text style={styles.ctaText}>
          {placing ? 'Yönlendiriliyor…' : 'Ödemeye Geç'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfaf5' },
  content: { padding: 16, gap: 16 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    gap: 8,
  },
  h2: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  muted: { color: '#6b6b6b', fontSize: 13 },
  addrItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    marginTop: 4,
  },
  addrItemSelected: { borderColor: '#0a0a0a', backgroundColor: '#0a0a0a08' },
  addrLabel: { fontWeight: '600', fontSize: 13 },
  addrLine: { fontSize: 12, color: '#6b6b6b', marginTop: 2 },
  itemLine: { fontSize: 13, color: '#4a4a4a' },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: 8,
    marginTop: 8,
    borderTopColor: '#e5e5e5',
    borderTopWidth: 1,
  },
  summaryLabel: { fontSize: 13, color: '#6b6b6b' },
  summaryValue: { fontSize: 18, fontWeight: '700' },
  cta: {
    backgroundColor: '#0a0a0a',
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
