import { useQuery } from '@tanstack/react-query';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { api } from '@/lib/api';

type Balance = {
  balance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  lirasFromPoints: number;
  redeemPerLira: number;
};

type Tx = {
  id: string;
  type: 'earn' | 'redeem' | 'expire' | 'refund_revoke' | 'admin_adjust';
  points: number;
  note: string | null;
  createdAt: string;
};

const TYPE_LABELS: Record<Tx['type'], string> = {
  earn: 'Kazanım',
  redeem: 'Kullanım',
  expire: 'Süresi dolan',
  refund_revoke: 'İade geri alımı',
  admin_adjust: 'Admin düzeltme',
};

export default function LoyaltyScreen() {
  const { data: balance } = useQuery({
    queryKey: ['loyalty-balance'],
    queryFn: () => api.get<Balance>('/v1/loyalty/balance'),
  });
  const { data: txs } = useQuery({
    queryKey: ['loyalty-tx'],
    queryFn: () => api.get<Tx[]>('/v1/loyalty/transactions'),
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.balanceCard}>
        <Text style={styles.muted}>Mevcut Puan</Text>
        <Text style={styles.balanceValue}>
          {(balance?.balance ?? 0).toLocaleString('tr-TR')}
        </Text>
        <Text style={styles.muted}>
          ≈ {balance?.lirasFromPoints ?? 0} ₺ indirim hakkı
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.muted}>Toplam Kazanılan</Text>
            <Text style={styles.statValue}>{balance?.lifetimeEarned ?? 0}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.muted}>Toplam Kullanılan</Text>
            <Text style={styles.statValue}>{balance?.lifetimeRedeemed ?? 0}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Hareketler</Text>
      {(txs ?? []).map((tx) => (
        <View key={tx.id} style={styles.txRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.txType}>{TYPE_LABELS[tx.type]}</Text>
            {tx.note && <Text style={styles.txNote}>{tx.note}</Text>}
            <Text style={styles.txDate}>
              {new Date(tx.createdAt).toLocaleString('tr-TR')}
            </Text>
          </View>
          <Text
            style={[
              styles.txPoints,
              { color: tx.points > 0 ? '#15803d' : '#b91c1c' },
            ]}
          >
            {tx.points > 0 ? '+' : ''}
            {tx.points}
          </Text>
        </View>
      ))}
      {(!txs || txs.length === 0) && (
        <Text style={styles.muted}>Henüz hareket yok.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfaf5' },
  content: { padding: 16, gap: 12 },
  muted: { color: '#6b6b6b', fontSize: 12 },
  balanceCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    gap: 6,
  },
  balanceValue: { fontSize: 36, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 12,
    paddingTop: 12,
    borderTopColor: '#e5e5e5',
    borderTopWidth: 1,
  },
  stat: { flex: 1 },
  statValue: { fontSize: 16, fontWeight: '600', marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  txRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    alignItems: 'center',
    gap: 8,
  },
  txType: { fontSize: 13, fontWeight: '500' },
  txNote: { fontSize: 11, color: '#6b6b6b', marginTop: 2 },
  txDate: { fontSize: 10, color: '#9a9a9a', marginTop: 2 },
  txPoints: { fontSize: 15, fontWeight: '700', fontFamily: 'Menlo' },
});
