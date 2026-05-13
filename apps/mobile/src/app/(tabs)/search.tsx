import { useState } from 'react';
import { View, TextInput, StyleSheet, Text, ScrollView, TouchableOpacity } from 'react-native';
import { api } from '@/lib/api';

type Result = {
  id: string;
  slug: string;
  nameTr: string;
  baseUnitPrice: string;
  unit: string;
  seller: { slug: string; displayName: string };
};

export default function SearchScreen() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Result[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function search() {
    if (!q.trim()) return;
    setBusy(true);
    try {
      const rows = await api.get<Result[]>(`/v1/search?q=${encodeURIComponent(q)}&limit=20`);
      setResults(rows);
    } catch {
      setResults([]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Ne arıyorsun? (örn. zeytinyağı, peynir, bal)"
        value={q}
        onChangeText={setQ}
        onSubmitEditing={search}
        autoFocus
      />

      {busy && <Text style={styles.muted}>Aranıyor…</Text>}

      <ScrollView contentContainerStyle={styles.list}>
        {results?.map((r) => (
          <TouchableOpacity key={r.id} style={styles.item}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{r.nameTr}</Text>
              <Text style={styles.itemSeller}>{r.seller.displayName}</Text>
            </View>
            <Text style={styles.itemPrice}>
              {parseFloat(r.baseUnitPrice).toFixed(2)} ₺ / {r.unit}
            </Text>
          </TouchableOpacity>
        ))}
        {results?.length === 0 && !busy && (
          <Text style={styles.muted}>Sonuç yok — başka bir kelime deneyin.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfaf5', padding: 16 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  muted: { color: '#6b6b6b', marginTop: 16, textAlign: 'center' },
  list: { gap: 8, paddingVertical: 16 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  itemName: { fontSize: 14, fontWeight: '600' },
  itemSeller: { fontSize: 11, color: '#6b6b6b', marginTop: 2 },
  itemPrice: { fontSize: 13, fontWeight: '600' },
});
