import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { useEffect, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { openDatabase } from '@/db/client';

import migrations from '../../drizzle/migrations';

let initialization: Promise<void> | null = null;

function initialize() {
  return (initialization ??= openDatabase()
    .then((db) => migrate(db, migrations))
    .catch((error: unknown) => {
      initialization = null;
      throw error;
    }));
}

function errorMessage(error: Error) {
  const seen = new Set<unknown>();
  let cause: unknown = error;
  while (cause instanceof Error && cause.cause && !seen.has(cause)) {
    seen.add(cause);
    cause = cause.cause;
  }
  const message = cause instanceof Error ? cause.message : String(cause);
  if (/createSyncAccessHandle|another open Access Handle/i.test(message)) {
    return 'O banco está sendo usado por outra aba. Feche as outras abas do Crazy Training e tente novamente.';
  }
  return message;
}

/** Abre o banco e aplica as migrações antes de mostrar o app. */
export function DatabaseGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<{ ready: boolean; error?: Error }>({ ready: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    initialize().then(
      () => {
        if (!cancelled) setStatus({ ready: true });
      },
      (error: Error) => {
        if (!cancelled) setStatus({ ready: false, error });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (status.error) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-10">
        <Text className="text-center text-title3 font-semibold text-label">Não foi possível abrir seus dados</Text>
        <Text className="mt-2 text-center text-body text-label-secondary">{errorMessage(status.error)}</Text>
        <View className="mt-6">
          <Button
            title="Tentar novamente"
            onPress={() => {
              setStatus({ ready: false });
              setAttempt((value) => value + 1);
            }}
          />
        </View>
      </View>
    );
  }
  if (!status.ready) return <View className="flex-1 bg-background" />;
  return children;
}
