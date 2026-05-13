import { useQuery } from '@tanstack/react-query';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { api } from '@/lib/api';

type Code = { code: string; totalRedemptions: number };
type Referral = {
  id: string;
  status: 'pending' | 'completed' | 'cancelled';
  rewardedAt: string | null;
  createdAt: string;
};

export default function ReferralScreen() {
  const { data: codeData } = useQuery({
    queryKey: ['my-referral-code'],
    queryFn: () => api.get<Code>('/v1/referrals/my-code'),
  });
  const { data: referrals } = useQuery({
    queryKey: ['my-referrals'],
    queryFn: () => api.get<Referral[]>('/v1/referrals/my-referrals'),
  });

  const code = codeData?.code ?? '';
  const link = `https://yorecebimde.com/kayit?ref=${code}`;

  async function copyCode() {
    await Clipboard.setStringAsync(code);
    Alert.alert('Kopyalandı', code);
  }

  async function shareLink() {
    try {
      await Share.share({
        message: `Yörecebimde'de yöresel ürün keşfet! Davet kodumla %25₺ hoşgeldin kuponu kazan: ${link}`,
      });
    } catch {
      // user cancelled
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.heroSub}>Davet Kodun</Text>
        <Text style={styles.codeText}>{code}</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity onPress={copyCode} style={styles.btnSecondary}>
            <Text style={styles.btnSecondaryText}>📋 Kopyala</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={shareLink} style={styles.btnPrimary}>
            <Text style={styles.btnPrimaryText}>↗ Paylaş</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.info}>
          Arkadaşın ilk siparişini tamamlayınca: <Text style={styles.bold}>100 puan</Text> kazanırsın,
          o da <Text style={styles.bold}>25 ₺ hoşgeldin kuponu</Text> alır.
        </Text>
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.muted}>Tamamlanan Davet</Text>
        <Text style={styles.statValue}>{codeData?.totalRedemptions ?? 0}</Text>
      </View>

      <Text style={styles.sectionTitle}>Davet Geçmişin</Text>
      {(referrals ?? []).map((r) => (
        <View key={r.id} style={styles.refRow}>
          <Text style={styles.refDate}>
            {new Date(r.createdAt).toLocaleDateString('tr-TR')}
          </Text>
          <Text
            style={[
              styles.refStatus,
              {
                color:
                  r.status === 'completed'
                    ? '#15803d'
                    : r.status === 'pending'
                      ? '#6b6b6b'
                      : '#b91c1c',
              },
            ]}
          >
            {r.status === 'completed'
              ? '✓ Tamamlandı'
              : r.status === 'pending'
                ? 'Beklemede'
                : 'İptal'}
          </Text>
        </View>
      ))}
      {(!referrals || referrals.length === 0) && (
        <Text style={styles.muted}>Henüz kimseyi davet etmedin.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfaf5' },
  content: { padding: 16, gap: 12 },
  heroCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    gap: 12,
    alignItems: 'center',
  },
  heroSub: { fontSize: 12, color: '#6b6b6b' },
  codeText: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 4,
    fontFamily: 'Menlo',
  },
  actionsRow: { flexDirection: 'row', gap: 8 },
  btnSecondary: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  btnSecondaryText: { fontSize: 13, color: '#0a0a0a' },
  btnPrimary: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#0a0a0a',
  },
  btnPrimaryText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  info: { fontSize: 12, color: '#4a4a4a', textAlign: 'center', lineHeight: 18 },
  bold: { fontWeight: '600' },
  statsCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    alignItems: 'center',
  },
  muted: { color: '#6b6b6b', fontSize: 12 },
  statValue: { fontSize: 28, fontWeight: '700', marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  refRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  refDate: { fontSize: 13 },
  refStatus: { fontSize: 13, fontWeight: '500' },
});
