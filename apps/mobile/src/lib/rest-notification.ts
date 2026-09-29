import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Notificação local do fim do descanso: é o que avisa com a tela bloqueada.
// Com o app aberto, quem avisa é a vibração da própria tela de treino.
const SUPPORTED = Platform.OS !== 'web';

if (SUPPORTED) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Pede permissão uma vez. Retorna se o app pode avisar com a tela bloqueada. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!SUPPORTED) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

export async function scheduleRestEnd(seconds: number, body: string): Promise<string | null> {
  if (!(await ensureNotificationPermission())) return null;
  return Notifications.scheduleNotificationAsync({
    content: { title: 'Descanso terminou', body, sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.max(1, Math.round(seconds)) },
  });
}

export async function cancelRestEnd(id: string | null) {
  if (SUPPORTED && id) await Notifications.cancelScheduledNotificationAsync(id);
}
