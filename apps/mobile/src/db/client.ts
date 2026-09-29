import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { openDatabaseAsync } from 'expo-sqlite';

import * as schema from './schema';

type Database = ExpoSQLiteDatabase<typeof schema>;

let instance: Database | null = null;

/**
 * Abre o banco uma vez. É assíncrono porque na web o SQLite roda num worker que precisa
 * carregar antes da primeira consulta (abrir de forma síncrona estoura o tempo por lá).
 * enableChangeListener: o useLiveQuery do Drizzle re-renderiza as telas quando os dados mudam.
 */
export async function openDatabase(): Promise<Database> {
  if (instance) return instance;
  const sqlite = await openDatabaseAsync('crazy-training.db', { enableChangeListener: true });
  await sqlite.execAsync('PRAGMA foreign_keys = ON;');
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
