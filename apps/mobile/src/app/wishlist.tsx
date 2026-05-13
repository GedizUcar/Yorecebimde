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

type WishlistRow = {
  productId: string;
  product: {
    nameTr: string;
    slug: string;
    baseUnitPrice: string;
    unit: string;
    seller: { slug: string; displayName: string };
  };
};

export default function WishlistScreen() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api.get<WishlistRow[]>('/v1/wishlist'),
  });

  async function remove(productId: string) {
    try {
      await api.delete(`/v1/wishlist/${productId}`);
      qc.invalidateQueries({ queryKey: ['wishlist'] });
    } catch {
      Alert.alert('Hata', 'Kaldırılamadı');
    }
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Yükleniyor…</Text>
      </View>
    );
  }
  if (!data?.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Beğendiğin ürün yok</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {data.map((w) => (
        <View key={w.productId} style={styles.card}>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() =>
              router.push(`/product/${w.product.seller.slug}/${w.product.slug}` as never)
            }
          >
            <Text style={styles.name}>{w.product.nameTr}</Text>
            <Text style={styles.seller}>{w.product.seller.displayName}</Text>
            <Text style={styles.price}>
              {parseFloat(w.product.baseUnitPrice).toFixed(2)} ₺ / {w.product.unit}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => remove(w.productId)} style={styles.heartBtn}>
            <Text style={styles.heartFilled}>♥</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfaf5' },
  content: { padding: 16, gap: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  muted: { color: '#6b6b6b' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    gap: 8,
  },
  name: { fontSize: 14, fontWeight: '600' },
  seller: { fontSize: 11, color: '#6b6b6b', marginTop: 2 },
  price: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  heartBtn: { padding: 8 },
  heartFilled: { fontSize: 22, color: '#b91c1c' },
});
