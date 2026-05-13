import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { api } from '@/lib/api';

/**
 * Better-Auth email/password ile login. Login başarılıysa cookie SecureStore'a
 * yazılır (api.ts response set-cookie yakalar) ve tabs'a redirect.
 */
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function login() {
    if (!email || !password) {
      Alert.alert('Eksik bilgi', 'E-posta ve şifre gerekli');
      return;
    }
    setBusy(true);
    try {
      await api.post('/api/auth/sign-in/email', { email, password });
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Giriş başarısız', e instanceof Error ? e.message : 'Bilinmeyen hata');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Yörecebimde</Text>
      <Text style={styles.subtitle}>Hoş geldin — yöresel ürünlere giriş</Text>

      <TextInput
        style={styles.input}
        placeholder="E-posta"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Şifre"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={[styles.button, busy && { opacity: 0.6 }]}
        onPress={login}
        disabled={busy}
      >
        <Text style={styles.buttonText}>{busy ? 'Giriş yapılıyor…' : 'Giriş Yap'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.guestBtn}>
        <Text style={styles.guestText}>Misafir olarak devam et</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdfaf5',
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    color: '#0a0a0a',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#6b6b6b',
    marginTop: 8,
    marginBottom: 32,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#0a0a0a',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  guestBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  guestText: {
    color: '#6b6b6b',
    fontSize: 14,
  },
});
