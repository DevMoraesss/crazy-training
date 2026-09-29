import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { useEffect, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { openDatabase } from '@/db/client';

import migrations from '../../drizzle/migrations';

/** Abre o banco e aplica as migrações antes de mostrar o app. */
export function DatabaseGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<{ ready: boolean; error?: Error }>({ ready: false });

  useEffect(() => {
    openDatabase()
      .then((db) => migrate(db, migrations))
      .then(
        () => setStatus({ ready: true }),
        (error: Error) => setStatus({ ready: false, error }),
      );
  }, []);

  if (status.error) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-10">
        <Text className="text-center text-title3 font-semibold text-label">Não foi possível abrir seus dados</Text>
        <Text className="mt-2 text-center text-body text-label-secondary">{status.error.message}</Text>
      </View>
    );
  }
  if (!status.ready) return <View className="flex-1 bg-background" />;
  return children;
}
