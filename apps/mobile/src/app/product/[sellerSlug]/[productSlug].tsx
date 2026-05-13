import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ScrollView,
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { api } from '@/lib/api';

type ProductDetail = {
  id: string;
  nameTr: string;
  shortDescriptionTr: string | null;
  descriptionTr: string | null;
  baseUnitPrice: string;
  unit: string;
  stockQuantity: string;
  isColdChain: boolean;
  kdvRate: string;
  seller: { id: string; slug: string; displayName: string };
  images: Array<{ id: string; webpUrl: string | null; url: string }>;
};

export default function ProductDetailScreen() {
  const { sellerSlug, productSlug } = useLocalSearchParams<{
    sellerSlug: string;
    productSlug: string;
  }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['product', sellerSlug, productSlug],
    queryFn: () => api.get<ProductDetail>(`/v1/products/${sellerSlug}/${productSlug}`),
    enabled: !!(sellerSlug && productSlug),
  });

  async function addToCart() {
    if (!data) return;
    try {
      await api.post('/v1/cart/items', { productId: data.id, quantity: 1 });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Sepete eklendi', data.nameTr, [
        { text: 'Tamam' },
        { text: 'Sepete Git', onPress: () => router.push('/cart') },
      ]);
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Eklenemedi');
    }
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Yükleniyor…</Text>
      </View>
    );
  }
  if (error || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Ürün bulunamadı</Text>
      </View>
    );
  }

  const primaryImage = data.images?.[0];
  const price = parseFloat(data.baseUnitPrice).toFixed(2);
  const stock = parseFloat(data.stockQuantity);

  return (
    <ScrollView style={styles.container}>
      {primaryImage ? (
        <Image
          source={{ uri: primaryImage.webpUrl ?? primaryImage.url }}
          style={styles.hero}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.hero, styles.heroPlaceholder]} />
      )}

      <View style={styles.body}>
        <Text style={styles.seller}>{data.seller.displayName}</Text>
        <Text style={styles.title}>{data.nameTr}</Text>
        {data.shortDescriptionTr && (
          <Text style={styles.shortDesc}>{data.shortDescriptionTr}</Text>
        )}

        <View style={styles.priceRow}>
          <Text style={styles.price}>{price} ₺</Text>
          <Text style={styles.unit}>/ {data.unit}</Text>
        </View>

        <View style={styles.metaRow}>
          {data.isColdChain && <Text style={styles.coldChain}>❄ Soğuk zincir</Text>}
          <Text style={styles.stock}>
            Stok: {stock} {data.unit}
          </Text>
        </View>

        {data.descriptionTr && (
          <View style={styles.descSection}>
            <Text style={styles.h2}>Ürün Hakkında</Text>
            <Text style={styles.desc}>{data.descriptionTr}</Text>
          </View>
        )}
      </View>

      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.cta, stock <= 0 && { opacity: 0.5 }]}
          onPress={addToCart}
          disabled={stock <= 0}
        >
          <Text style={styles.ctaText}>
            {stock > 0 ? 'Sepete Ekle' : 'Stok yok'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfaf5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  muted: { color: '#6b6b6b' },
  hero: { width: '100%', aspectRatio: 1, backgroundColor: '#f5f0e8' },
  heroPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  body: { padding: 16, gap: 8 },
  seller: { fontSize: 12, color: '#6b6b6b' },
  title: { fontSize: 22, fontWeight: '700', color: '#0a0a0a' },
  shortDesc: { fontSize: 14, color: '#6b6b6b', marginTop: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8 },
  price: { fontSize: 28, fontWeight: '700' },
  unit: { fontSize: 14, color: '#6b6b6b', marginLeft: 6 },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  coldChain: {
    fontSize: 12,
    backgroundColor: '#f5f0e8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  stock: { fontSize: 12, color: '#6b6b6b' },
  descSection: { marginTop: 16, gap: 8 },
  h2: { fontSize: 16, fontWeight: '600' },
  desc: { fontSize: 14, color: '#4a4a4a', lineHeight: 22 },
  actionBar: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopColor: '#e5e5e5',
    borderTopWidth: 1,
  },
  cta: {
    backgroundColor: '#0a0a0a',
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
