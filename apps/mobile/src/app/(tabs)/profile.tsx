import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { api, clearSession } from '@/lib/api';

const ITEMS: { href: string; label: string; icon: string }[] = [
  { href: '/addresses', label: 'Adreslerim', icon: '📍' },
  { href: '/wishlist', label: 'Beğendiklerim', icon: '❤' },
  { href: '/loyalty', label: 'Puanlarım', icon: '🎁' },
  { href: '/referral', label: 'Arkadaşını Davet Et', icon: '👥' },
  { href: '/kvkk', label: 'Veri Yönetimi (KVKK)', icon: '🔒' },
];

export default function ProfileScreen() {
  async function logout() {
    try {
      await api.post('/api/auth/sign-out');
    } catch {
      // session expired olabilir
    }
    await clearSession();
    router.replace('/login');
  }

  async function enableBiometric() {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !enrolled) {
      Alert.alert(
        'Biyometrik kullanılamıyor',
        'Cihazında FaceID/TouchID/parmak izi tanımlı değil.',
      );
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Yörecebimde giriş için biyometrik kullanmak istiyor musun?',
      fallbackLabel: 'Şifre kullan',
    });
    if (result.success) {
      Alert.alert('Aktive edildi', 'Sonraki girişlerinde biyometrik kullanılacak.');
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={enableBiometric} style={styles.bioBtn}>
        <Text style={styles.bioText}>🔒 Biyometrik Girişi Aktive Et</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        {ITEMS.map((it, i) => (
          <TouchableOpacity
            key={it.href}
            style={[styles.item, i < ITEMS.length - 1 && styles.itemBorder]}
            onPress={() => router.push(it.href as never)}
          >
            <Text style={styles.itemIcon}>{it.icon}</Text>
            <Text style={styles.itemText}>{it.label}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Çıkış Yap</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfaf5' },
  content: { padding: 16, gap: 12 },
  bioBtn: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    alignItems: 'center',
  },
  bioText: { fontSize: 14, color: '#92400e', fontWeight: '500' },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  itemBorder: { borderBottomColor: '#e5e5e5', borderBottomWidth: 1 },
  itemIcon: { fontSize: 18 },
  itemText: { flex: 1, fontSize: 14 },
  chevron: { fontSize: 20, color: '#9a9a9a' },
  logoutBtn: {
    marginTop: 12,
    padding: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#b91c1c',
    alignItems: 'center',
  },
  logoutText: { color: '#b91c1c', fontWeight: '600' },
});
