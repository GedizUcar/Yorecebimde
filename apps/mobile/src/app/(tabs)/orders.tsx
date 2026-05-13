import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

type Order = {
  id: string;
  orderNo: string;
  status: string;
  totalCents: number;
  createdAt: string;
};

const STATUS_LABELS: Record<string, string> = {
  created: 'Oluşturuldu',
  pending_payment: 'Ödeme bekleniyor',
  paid: 'Ödendi',
  confirmed: 'Onaylandı',
  preparing: 'Hazırlanıyor',
  shipped: 'Kargoda',
  delivered: 'Teslim edildi',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
};

export default function OrdersScreen() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => api.get<Order[]>('/v1/orders?limit=50'),
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Yükleniyor…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Önce giriş yapmalısın.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {(data ?? []).map((o) => (
        <View key={o.id} style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.orderNo}>{o.orderNo}</Text>
            <Text style={styles.status}>{STATUS_LABELS[o.status] ?? o.status}</Text>
          </View>
          <Text style={styles.date}>{new Date(o.createdAt).toLocaleString('tr-TR')}</Text>
          <Text style={styles.total}>{(o.totalCents / 100).toFixed(2)} ₺</Text>
        </View>
      ))}
      {data?.length === 0 && <Text style={styles.muted}>Sipariş yok.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfaf5' },
  content: { padding: 16, gap: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  muted: { color: '#6b6b6b' },
  card: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  orderNo: { fontWeight: '600', fontSize: 14 },
  status: {
    fontSize: 11,
    color: '#6b6b6b',
    backgroundColor: '#f5f0e8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  date: { fontSize: 11, color: '#6b6b6b', marginTop: 4 },
  total: { fontSize: 15, fontWeight: '700', marginTop: 4 },
});
