import { Alert, Platform } from 'react-native';

// Alert do React Native não faz nada na web; lá os diálogos usam os do navegador.

export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

type Choice<T> = { label: string; value: T; style?: 'default' | 'destructive' };

/**
 * Pergunta com uma ou mais ações e "Cancelar". Resolve com a ação escolhida, ou null.
 * Na web, pergunta uma ação de cada vez com confirm().
 */
export function choose<T>(title: string, message: string, choices: Choice<T>[], cancelLabel = 'Cancelar'): Promise<T | null> {
  if (Platform.OS === 'web') {
    for (const choice of choices) {
      if (window.confirm(`${title}\n\n${message}\n\n${choice.label}?`)) return Promise.resolve(choice.value);
    }
    return Promise.resolve(null);
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

/** Confirmação de uma ação só. */
export async function confirm(title: string, message: string, actionLabel: string, destructive = false): Promise<boolean> {
  const result = await choose(title, message, [{ label: actionLabel, value: true, style: destructive ? 'destructive' : 'default' }]);
  return result === true;
}
