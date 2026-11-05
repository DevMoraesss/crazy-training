import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import * as schema from './schema';

type Database = ExpoSQLiteDatabase<typeof schema>;

let instance: Database | null = null;

type ConnectionState = {
  sqlite: SQLiteDatabase | null;
  opening: Promise<SQLiteDatabase> | null;
  releaseLock?: () => void;
};

// Sobrevive ao Fast Refresh. Um worker/conexão por página, inclusive enquanto abre.
const runtime = globalThis as typeof globalThis & { __crazyTrainingSQLite?: ConnectionState };
const connection = (runtime.__crazyTrainingSQLite ??= { sqlite: null, opening: null });

async function acquireWebLock() {
  if (Platform.OS !== 'web') return;
  if (typeof SharedArrayBuffer === 'undefined' || !globalThis.crossOriginIsolated) {
    throw new Error(
      'O banco local precisa de uma conexão segura e dos cabeçalhos de isolamento. No computador, use a prévia na porta 8081 ou o acesso de desenvolvimento na porta 8083.',
    );
  }
  if (!navigator.locks) return;
  await new Promise<void>((resolve, reject) => {
    void navigator.locks
      .request('crazy-training-sqlite', { ifAvailable: true }, async (lock) => {
        if (!lock) {
          reject(
            new Error(
              'Seus dados estão abertos em outra aba do Crazy Training. Feche essa aba e toque em Tentar novamente.',
            ),
          );
          return;
        }
        const held = new Promise<void>((release) => {
          connection.releaseLock = release;
        });
        resolve();
        await held;
      })
      .catch(reject);
  });
}

async function openConnection(): Promise<SQLiteDatabase> {
  if (connection.sqlite) return connection.sqlite;
  if (connection.opening) return connection.opening;
  connection.opening = (async () => {
    let sqlite: SQLiteDatabase | undefined;
    try {
      await acquireWebLock();
      sqlite = await openDatabaseAsync('crazy-training.db', { enableChangeListener: true });
      await sqlite.execAsync('PRAGMA foreign_keys = ON;');
      connection.sqlite = sqlite;
      return sqlite;
    } catch (error) {
      if (sqlite) await sqlite.closeAsync().catch(() => undefined);
      connection.releaseLock?.();
      connection.releaseLock = undefined;
      connection.opening = null;
      throw error;
    }
  })();
  return connection.opening;
}

/**
 * Abre o banco uma vez. É assíncrono porque na web o SQLite roda num worker que precisa
 * carregar antes da primeira consulta (abrir de forma síncrona estoura o tempo por lá).
 * enableChangeListener: o useLiveQuery do Drizzle re-renderiza as telas quando os dados mudam.
 */
export async function openDatabase(): Promise<Database> {
  if (instance) return instance;
  const sqlite = await openConnection();
  instance = drizzle(sqlite, { schema });
  return instance;
}

/** O banco aberto. Disponível depois que o DatabaseGate termina de abrir e migrar. */
export const db = new Proxy({} as Database, {
  get(_target, property) {
    if (!instance) throw new Error('O banco ainda não foi aberto (use dentro do DatabaseGate).');
    const value: unknown = Reflect.get(instance, property, instance);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});
