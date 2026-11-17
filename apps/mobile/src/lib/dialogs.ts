import { Alert, Platform } from 'react-native';

import { openFeedbackDialog, pushNotice, type FeedbackTone } from './feedback-store';

/** Avisos no app. Erros ficam visíveis até serem dispensados; sucessos somem sozinhos. */
export function notify(
  title: string,
  message?: string,
  options: { tone?: FeedbackTone; duration?: number | null } = {},
) {
  if (Platform.OS === 'web') {
    pushNotice(title, message, options);
    return;
  }
  Alert.alert(title, message);
}

/** Conteúdo de leitura, como instruções de um exercício, não é uma notificação temporária. */
export function showInfo(title: string, message: string) {
  if (Platform.OS === 'web') {
    void openFeedbackDialog(title, message, [{ label: 'Entendi' }], null);
    return;
  }
  Alert.alert(title, message);
}
type Choice<T> = { label: string; value: T; style?: 'default' | 'destructive' };

export async function choose<T>(
  title: string,
  message: string,
  choices: Choice<T>[],
  cancelLabel = 'Cancelar',
): Promise<T | null> {
  if (Platform.OS === 'web') {
    const index = await openFeedbackDialog(
      title,
      message,
      choices.map(({ label, style }) => ({ label, style })),
      cancelLabel,
    );
    return index === null ? null : choices[index]!.value;
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        ...choices.map((choice) => ({ text: choice.label, style: choice.style, onPress: () => resolve(choice.value) })),
        { text: cancelLabel, style: 'cancel' as const, onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}
export async function confirm(
  title: string,
  message: string,
  actionLabel: string,
  destructive = false,
): Promise<boolean> {
  return (
    (await choose(title, message, [
      { label: actionLabel, value: true, style: destructive ? 'destructive' : 'default' },
    ])) === true
  );
}
