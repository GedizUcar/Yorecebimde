import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { api } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return null;

  const tokenResponse = await Notifications.getExpoPushTokenAsync();
  const token = tokenResponse.data;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  try {
    await api.post('/v1/push-tokens', {
      token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      deviceLabel: `${Device.brand ?? ''} ${Device.modelName ?? ''}`.trim(),
    });
  } catch {
    // token register backend'e ulaşmadıysa next launch'ta tekrar dener
  }

  return token;
}
