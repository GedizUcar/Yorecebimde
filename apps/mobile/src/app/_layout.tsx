import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { registerPushToken } from '@/lib/push';

const queryClient = new QueryClient();

export default function RootLayout() {
  useEffect(() => {
    // Login durumunda push token register et — login screen sonrası kontrol
    void registerPushToken().catch(() => undefined);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerShown: true, headerStyle: { backgroundColor: '#fff' } }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="product/[sellerSlug]/[productSlug]" options={{ title: 'Ürün' }} />
            <Stack.Screen name="cart" options={{ title: 'Sepetim' }} />
            <Stack.Screen name="checkout" options={{ title: 'Ödeme' }} />
            <Stack.Screen name="addresses" options={{ title: 'Adreslerim' }} />
            <Stack.Screen name="wishlist" options={{ title: 'Beğendiklerim' }} />
            <Stack.Screen name="loyalty" options={{ title: 'Puanlarım' }} />
            <Stack.Screen name="referral" options={{ title: 'Arkadaşını Davet Et' }} />
            <Stack.Screen name="kvkk" options={{ title: 'Veri Yönetimi' }} />
            <Stack.Screen name="bot" options={{ title: 'Yöre — Asistan' }} />
          </Stack>
          <StatusBar style="auto" />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
