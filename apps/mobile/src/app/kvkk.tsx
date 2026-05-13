import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { api, clearSession } from '@/lib/api';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function KvkkScreen() {
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);

  async function downloadData() {
    setBusy(true);
    try {
      const data = await api.get<Record<string, unknown>>('/v1/kvkk-me/export');
      const json = JSON.stringify(data, null, 2);
      const fileUri =
        FileSystem.cacheDirectory + `yorecebimde-verilerim-${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(fileUri, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'application/json' });
      } else {
        Alert.alert('İndirildi', `Cihaz cache'ine kaydedildi: ${fileUri}`);
      }
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'İndirilemedi');
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    if (confirmText !== 'HESABIMI SİL') {
      Alert.alert('Onay metni eksik', 'Tam olarak "HESABIMI SİL" yazmalısın');
      return;
    }
    Alert.alert(
      'Son onay',
      'Hesabın silinecek, isim/adres/iletişim anonimleştirilecek. Bu geri alınamaz.',
      [
        { text: 'İptal' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await api.post('/v1/kvkk-me/delete-account', { confirm: true });
              await clearSession();
              router.replace('/login');
            } catch (e) {
              Alert.alert('Hata', e instanceof Error ? e.message : 'Silme başarısız');
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.h2}>📦 Verilerimi İndir</Text>
        <Text style={styles.muted}>
          Profil, adres, sipariş, puan, yorum, soru ve davet bilgilerini JSON olarak indir
          (KVKK madde 11/d — erişim hakkı).
        </Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={downloadData}
          disabled={busy}
        >
          <Text style={styles.btnText}>{busy ? 'Hazırlanıyor…' : 'JSON İndir'}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, styles.danger]}>
        <Text style={styles.h2Danger}>⚠ Hesabımı Sil</Text>
        <Text style={styles.mutedDanger}>
          Hesabın kapatılır, kişisel verilerin anonimleştirilir. Sipariş + fatura yasal saklama
          (KVKK madde 28) için anonim kalır. <Text style={styles.bold}>Geri alınamaz.</Text>
        </Text>
        <Text style={styles.confirmHint}>
          Devam için aşağıya <Text style={styles.bold}>HESABIMI SİL</Text> yaz:
        </Text>
        <TextInput
          style={styles.input}
          value={confirmText}
          onChangeText={setConfirmText}
          placeholder="HESABIMI SİL"
          autoCapitalize="characters"
        />
        <TouchableOpacity
          style={[styles.btnDanger, confirmText !== 'HESABIMI SİL' && { opacity: 0.4 }]}
          onPress={deleteAccount}
          disabled={confirmText !== 'HESABIMI SİL' || busy}
        >
          <Text style={styles.btnDangerText}>Hesabı Kalıcı Olarak Sil</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footerNote}>
        API: <Text style={styles.mono}>{API_BASE}/v1/kvkk-me</Text>
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfaf5' },
  content: { padding: 16, gap: 16 },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    gap: 10,
  },
  danger: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  h2: { fontSize: 16, fontWeight: '600' },
  h2Danger: { fontSize: 16, fontWeight: '600', color: '#b91c1c' },
  muted: { color: '#6b6b6b', fontSize: 13, lineHeight: 20 },
  mutedDanger: { color: '#7f1d1d', fontSize: 13, lineHeight: 20 },
  bold: { fontWeight: '600' },
  btn: {
    backgroundColor: '#0a0a0a',
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  btnDanger: {
    backgroundColor: '#b91c1c',
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
  },
  btnDangerText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  confirmHint: { fontSize: 12, color: '#7f1d1d', marginTop: 8 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
    padding: 10,
    fontFamily: 'Menlo',
    fontSize: 13,
  },
  footerNote: { fontSize: 10, color: '#9a9a9a', textAlign: 'center' },
  mono: { fontFamily: 'Menlo' },
});
