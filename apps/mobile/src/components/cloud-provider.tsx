import { cloudRecordSchema } from '@crazy-training/shared';
import { addDatabaseChangeListener } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import {
  CLOUD_TABLES,
  exportCloudSnapshot,
  importCloudSnapshot,
  latestCloudBackup,
  readCloudState,
  snapshotFingerprint,
  snapshotHasData,
  writeCloudState,
} from '@/db/cloud-data';
import { ApiError, apiRequest } from '@/lib/api';

type User = { id: string; email: string };
type Phase = 'signed-out' | 'ready' | 'syncing' | 'needs-link' | 'conflict' | 'offline' | 'error';
type CloudContextValue = {
  user: User | null;
  phase: Phase;
  message: string;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  synchronize: (allowLink?: boolean) => Promise<void>;
  useCloudCopy: () => Promise<void>;
  restoreBackup: () => Promise<void>;
};
const CloudContext = createContext<CloudContextValue | null>(null);

export function CloudProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [phase, setPhase] = useState<Phase>('signed-out');
  const [message, setMessage] = useState('');
  const busy = useRef(false);
  const currentUser = useRef<User | null>(null);
  const blocked = useRef(false);
  const authEpoch = useRef(0);
  const handleError = useCallback((error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      setUser(null);
      currentUser.current = null;
      setPhase('signed-out');
    } else
      setPhase(
        error instanceof ApiError && error.status === 0
          ? 'offline'
          : error instanceof ApiError && error.status === 409
            ? 'conflict'
            : 'error',
      );
    setMessage(
      error instanceof Error && error.name === 'ZodError'
        ? 'Há dados que precisam de revisão antes de sincronizar. Nenhum registro foi alterado.'
        : error instanceof Error
          ? error.message
          : 'Não foi possível sincronizar.',
    );
  }, []);

  const synchronize = useCallback(
    async (allowLink = false) => {
      const account = currentUser.current;
      if (!account || busy.current || blocked.current) return;
      busy.current = true;
      setPhase('syncing');
      setMessage('');
      try {
        const metadata = readCloudState();
        if (metadata && metadata.ownerId !== account.id)
          throw new Error(
            'Este aparelho tem dados vinculados a outra conta. Use outro perfil do navegador para manter as contas separadas.',
          );
        const local = exportCloudSnapshot();
        const fingerprint = await snapshotFingerprint(local);
        if (!metadata && snapshotHasData(local) && !allowLink) {
          setPhase('needs-link');
          return;
        }
        const remote = cloudRecordSchema.parse(await apiRequest('/cloud/snapshot'));
        // Uma edição pode acontecer enquanto a requisição está em trânsito.
        if (JSON.stringify(exportCloudSnapshot()) !== JSON.stringify(local)) {
          setPhase('ready');
          return;
        }
        const dirty = metadata ? metadata.fingerprint !== fingerprint : snapshotHasData(local);
        if (remote.revision !== (metadata?.revision ?? 0)) {
          if (dirty) {
            setPhase('conflict');
            setMessage('Existem alterações neste aparelho e na conta. Nenhum dado foi sobrescrito.');
            return;
          }
          if (remote.snapshot) {
            const remoteFingerprint = await snapshotFingerprint(remote.snapshot);
            if (JSON.stringify(exportCloudSnapshot()) !== JSON.stringify(local)) {
              setPhase('ready');
              return;
            }
            importCloudSnapshot(remote.snapshot, account.id, remote.revision, remoteFingerprint);
          }
        } else if (dirty) {
          const saved = cloudRecordSchema.parse(
            await apiRequest('/cloud/snapshot', {
              method: 'PUT',
              body: JSON.stringify({ revision: remote.revision, snapshot: local }),
            }),
          );
          // Use o fingerprint enviado: uma edição posterior continua pendente para o próximo envio.
          writeCloudState(account.id, saved.revision, fingerprint);
        } else if (!metadata) writeCloudState(account.id, remote.revision, fingerprint);
        setPhase('ready');
      } catch (error) {
        handleError(error);
      } finally {
        busy.current = false;
      }
    },
    [handleError],
  );

  useEffect(() => {
    let active = true;
    const epoch = authEpoch.current;
    void apiRequest<User>('/auth/me')
      .then((account) => {
        if (!active || epoch !== authEpoch.current) return;
        currentUser.current = account;
        setUser(account);
        setPhase('ready');
        void synchronize();
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [synchronize]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void synchronize(), 2000);
    };
    const listener = addDatabaseChangeListener(({ tableName }) => {
      if (CLOUD_TABLES.includes(tableName)) schedule();
    });
    const interval = setInterval(() => void synchronize(), 60_000);
    if (Platform.OS === 'web') {
      window.addEventListener('online', schedule);
      window.addEventListener('focus', schedule);
    }
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      listener.remove();
      if (Platform.OS === 'web') {
        window.removeEventListener('online', schedule);
        window.removeEventListener('focus', schedule);
      }
    };
  }, [synchronize]);

  const login = async (email: string, password: string) => {
    authEpoch.current++;
    const account = await apiRequest<User>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim(), password }),
    });
    currentUser.current = account;
    setUser(account);
    setPhase('ready');
    setMessage('');
    await synchronize();
  };
  const logout = async () => {
    if (busy.current) throw new Error('Aguarde a sincronização terminar antes de sair.');
    blocked.current = true;
    authEpoch.current++;
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
      currentUser.current = null;
      setUser(null);
      setPhase('signed-out');
      setMessage('');
    } finally {
      blocked.current = false;
    }
  };
  const useCloudCopy = async () => {
    const account = currentUser.current;
    if (!account || busy.current) return;
    busy.current = true;
    try {
      const metadata = readCloudState();
      if (metadata && metadata.ownerId !== account.id)
        throw new Error('Os dados deste aparelho pertencem a outra conta.');
      const local = exportCloudSnapshot();
      const remote = cloudRecordSchema.parse(await apiRequest('/cloud/snapshot'));
      if (!remote.snapshot) throw new Error('A conta ainda não tem dados para baixar.');
      const remoteFingerprint = await snapshotFingerprint(remote.snapshot);
      if (JSON.stringify(exportCloudSnapshot()) !== JSON.stringify(local))
        throw new Error('Os dados deste aparelho mudaram. Confira antes de tentar novamente.');
      importCloudSnapshot(remote.snapshot, account.id, remote.revision, remoteFingerprint, local);
      setPhase('ready');
      setMessage('Uma cópia anterior deste aparelho foi guardada para recuperação.');
    } catch (error) {
      handleError(error);
    } finally {
      busy.current = false;
    }
  };
  const restoreBackup = async () => {
    const account = currentUser.current;
    if (!account || busy.current) return;
    const backup = latestCloudBackup(account.id);
    const metadata = readCloudState();
    if (!backup || !metadata || metadata.ownerId !== account.id)
      throw new Error('Não há uma cópia anterior disponível.');
    importCloudSnapshot(backup.data, account.id, metadata.revision, metadata.fingerprint, exportCloudSnapshot());
    setPhase('ready');
    setMessage('Cópia restaurada neste aparelho. As alterações serão sincronizadas.');
  };
  return (
    <CloudContext.Provider value={{ user, phase, message, login, logout, synchronize, useCloudCopy, restoreBackup }}>
      {children}
    </CloudContext.Provider>
  );
}
export function useCloud() {
  const cloud = useContext(CloudContext);
  if (!cloud) throw new Error('CloudProvider não está disponível.');
  return cloud;
}
