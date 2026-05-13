import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { api } from '@/lib/api';
import { PlaceholderImage } from '@/components/placeholder-image';

type ListingProduct = {
  id: string;
  slug: string;
  nameTr: string;
  shortDescriptionTr: string | null;
  baseUnitPrice: string;
  unit: string;
  seller: { slug: string; displayName: string };
  bestDiscountPct?: number;
  isSponsored?: boolean;
  primaryImage?: { url: string; webpUrl: string | null; thumbnailUrl: string | null } | null;
};

export default function HomeScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['home-products'],
    queryFn: () => api.get<ListingProduct[]>('/v1/products?limit=20'),
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Yükleniyor…</Text>
      </View>
    );
  }

  return (
    <View style={styles.outer}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.h1}>Yöresel Lezzetler</Text>
            <Text style={styles.muted}>Türkiye'nin dört bir köşesinden taze ürünler</Text>
          </View>
          <TouchableOpacity
            style={styles.cartBtn}
            onPress={() => router.push('/cart')}
          >
            <Text style={styles.cartIcon}>🛒</Text>
          </TouchableOpacity>
        </View>

      <View style={styles.grid}>
        {(data ?? []).map((p) => (
          <TouchableOpacity
            key={p.id}
            style={styles.card}
            onPress={() => router.push(`/product/${p.seller.slug}/${p.slug}` as never)}
          >
            <View style={styles.cardImage}>
              {p.primaryImage ? (
                <Image
                  source={{ uri: p.primaryImage.thumbnailUrl ?? p.primaryImage.webpUrl ?? p.primaryImage.url }}
                  style={styles.cardImageImg}
                  resizeMode="cover"
                />
              ) : (
                <PlaceholderImage seed={p.nameTr} size="md" />
              )}
            </View>
            <Text style={styles.cardSeller}>{p.seller.displayName}</Text>
            <Text style={styles.cardName} numberOfLines={2}>
              {p.nameTr}
            </Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardPrice}>
                {parseFloat(p.baseUnitPrice).toFixed(2)} ₺
              </Text>
              <Text style={styles.cardUnit}>/ {p.unit}</Text>
            </View>
            {p.isSponsored && <Text style={styles.sponsored}>Sponsorlu</Text>}
            {p.bestDiscountPct && p.bestDiscountPct > 0 && (
              <Text style={styles.discount}>%{p.bestDiscountPct.toFixed(0)} indirim</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
      </ScrollView>

      <TouchableOpacity style={styles.botFab} onPress={() => router.push('/bot')}>
        <Text style={styles.botFabText}>💬</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  container: { flex: 1, backgroundColor: '#fdfaf5' },
  content: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  cartBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartIcon: { fontSize: 22 },
  botFab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  botFabText: { fontSize: 24 },
  h1: { fontSize: 24, fontWeight: '700', color: '#0a0a0a' },
  muted: { color: '#6b6b6b', marginTop: 4, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  cardImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: '#f5f0e8',
  },
  cardImageImg: { width: '100%', height: '100%' },
  cardSeller: { fontSize: 11, color: '#6b6b6b' },
  cardName: { fontSize: 13, fontWeight: '600', marginTop: 4, minHeight: 36 },
  cardFooter: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8 },
  cardPrice: { fontSize: 15, fontWeight: '700' },
  cardUnit: { fontSize: 11, color: '#6b6b6b', marginLeft: 4 },
  sponsored: {
    position: 'absolute',
    top: 6,
    right: 8,
    fontSize: 9,
    color: '#6b6b6b',
    backgroundColor: '#f5f0e8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  discount: {
    marginTop: 4,
    fontSize: 11,
    color: '#0a0a0a',
    fontWeight: '600',
  },
});
