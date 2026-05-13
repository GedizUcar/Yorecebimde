import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
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

type Draft = Omit<Address, 'id' | 'isDefault'>;

const EMPTY: Draft = {
  label: 'Ev',
  recipientName: '',
  phone: '',
  province: '',
  district: '',
  addressLine: '',
};

export default function AddressesScreen() {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const { data, isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api.get<Address[]>('/v1/addresses'),
  });

  async function save() {
    if (!draft.recipientName || !draft.phone || !draft.addressLine) {
      Alert.alert('Eksik', 'Alıcı, telefon ve adres gerekli');
      return;
    }
    try {
      await api.post('/v1/addresses', draft);
      setDraft(EMPTY);
      setAdding(false);
      qc.invalidateQueries({ queryKey: ['addresses'] });
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Adres eklenemedi');
    }
  }

  async function setDefault(id: string) {
    try {
      await api.post(`/v1/addresses/${id}/set-default`);
      qc.invalidateQueries({ queryKey: ['addresses'] });
    } catch {
      Alert.alert('Hata', 'Güncellenemedi');
    }
  }

  async function remove(id: string) {
    Alert.alert('Adresi sil', 'Emin misin?', [
      { text: 'İptal' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/v1/addresses/${id}`);
            qc.invalidateQueries({ queryKey: ['addresses'] });
          } catch {
            Alert.alert('Hata', 'Silinemedi');
          }
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {isLoading && <Text style={styles.muted}>Yükleniyor…</Text>}

      {(data ?? []).map((a) => (
        <View key={a.id} style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>{a.label}</Text>
            {a.isDefault && <Text style={styles.badge}>Varsayılan</Text>}
          </View>
          <Text style={styles.field}>
            {a.recipientName} · {a.phone}
          </Text>
          <Text style={styles.field}>
            {a.district}, {a.province} — {a.addressLine}
          </Text>
          <View style={styles.actions}>
            {!a.isDefault && (
              <TouchableOpacity onPress={() => setDefault(a.id)}>
                <Text style={styles.linkText}>Varsayılan yap</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => remove(a.id)}>
              <Text style={styles.dangerText}>Sil</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {!adding ? (
        <TouchableOpacity style={styles.addBtn} onPress={() => setAdding(true)}>
          <Text style={styles.addBtnText}>+ Yeni Adres Ekle</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.card}>
          <Text style={styles.label}>Yeni Adres</Text>
          {(['label', 'recipientName', 'phone', 'province', 'district', 'addressLine'] as const).map(
            (key) => (
              <TextInput
                key={key}
                style={styles.input}
                placeholder={LABELS[key]}
                value={draft[key]}
                onChangeText={(t) => setDraft({ ...draft, [key]: t })}
                multiline={key === 'addressLine'}
              />
            ),
          )}
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => setAdding(false)}>
              <Text style={styles.muted}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={save} style={styles.cta}>
              <Text style={styles.ctaText}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const LABELS: Record<keyof Draft, string> = {
  label: 'Etiket (ör. Ev, İş)',
  recipientName: 'Alıcı adı soyadı',
  phone: 'Telefon (05XX...)',
  province: 'İl',
  district: 'İlçe',
  addressLine: 'Açık adres',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfaf5' },
  content: { padding: 16, gap: 12 },
  muted: { color: '#6b6b6b' },
  card: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    gap: 6,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontWeight: '600', fontSize: 14 },
  badge: {
    fontSize: 11,
    backgroundColor: '#f5f0e8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  field: { fontSize: 13, color: '#4a4a4a' },
  actions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    alignItems: 'center',
  },
  linkText: { color: '#0a0a0a', fontSize: 13, fontWeight: '500' },
  dangerText: { color: '#b91c1c', fontSize: 13 },
  addBtn: {
    padding: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#e5e5e5',
    borderRadius: 12,
    alignItems: 'center',
  },
  addBtnText: { color: '#6b6b6b', fontSize: 14 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    marginTop: 4,
  },
  cta: {
    backgroundColor: '#0a0a0a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  ctaText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});
