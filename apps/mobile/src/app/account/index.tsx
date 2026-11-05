import { Stack } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { useCloud } from '@/components/cloud-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { Section } from '@/components/ui/section';
import { confirm, notify } from '@/lib/dialogs';
import { useColors } from '@/theme';

const STATUS = {
  'signed-out': 'Entre na sua conta',
  ready: 'Sincronização ativada',
  syncing: 'Sincronizando…',
  'needs-link': 'Conecte os dados deste aparelho',
  conflict: 'Há alterações em dois aparelhos',
  offline: 'Sem conexão com o servidor',
  error: 'Não foi possível sincronizar',
};
export default function AccountScreen() {
  const cloud = useCloud();
  const colors = useColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const execute = async (operation: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await operation();
    } catch (error) {
      notify('Não foi possível continuar', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  return (
    <>
      <Stack.Screen options={{ title: 'Minha conta' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        className="flex-1 bg-background"
        contentContainerClassName="gap-6 pb-10 pt-4"
      >
        <Card>
          <Text className="text-title2 font-bold text-label">
            {cloud.user ? STATUS[cloud.phase] : 'Seu progresso com você'}
          </Text>
          <Text className="mt-2 text-body text-label-secondary">
            {cloud.user
              ? cloud.user.email
              : 'Entre para guardar seu perfil, treinos e alimentação na sua conta e usar em outros aparelhos. Sem conta, o app continua salvando neste navegador.'}
          </Text>
          {cloud.message ? <Text className="mt-3 text-footnote text-label-secondary">{cloud.message}</Text> : null}
        </Card>
        {!cloud.user ? (
          <>
            <Section title="Entrar">
              <View className="gap-2 px-5 py-3">
                <Text className="text-body text-label">E-mail</Text>
                <TextInput
                  accessibilityLabel="E-mail"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Seu e-mail"
                  placeholderTextColor={colors['label-tertiary']}
                  className="py-2 text-body text-label"
                />
              </View>
              <View className="gap-2 px-5 py-3">
                <Text className="text-body text-label">Senha</Text>
                <TextInput
                  accessibilityLabel="Senha"
                  secureTextEntry
                  autoComplete="current-password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Sua senha"
                  placeholderTextColor={colors['label-tertiary']}
                  className="py-2 text-body text-label"
                />
              </View>
            </Section>
            <View className="mx-4">
              <Button
                title={busy ? 'Entrando…' : 'Entrar'}
                onPress={() =>
                  execute(async () => {
                    await cloud.login(email, password);
                    setPassword('');
                  })
                }
              />
            </View>
          </>
        ) : (
          <>
            <View className="mx-4">
              <Button
                title={
                  busy || cloud.phase === 'syncing'
                    ? 'Aguarde…'
                    : cloud.phase === 'needs-link'
                      ? 'Conectar dados deste aparelho'
                      : 'Sincronizar agora'
                }
                onPress={() =>
                  execute(async () => {
                    if (
                      cloud.phase === 'needs-link' &&
                      !(await confirm(
                        'Conectar seus dados?',
                        'Seu perfil, treinos, histórico e alimentação deste aparelho serão enviados para sua conta. Se a conta já tiver alterações, o app pedirá que você resolva o conflito.',
                        'Conectar',
                      ))
                    )
                      return;
                    await cloud.synchronize(true);
                  })
                }
              />
            </View>
            {cloud.phase === 'conflict' ? (
              <Section
                title="Resolver conflito"
                footer="As alterações deste aparelho serão guardadas em uma cópia local antes de baixar os dados da conta."
              >
                <ListRow
                  title="Guardar cópia e usar dados da conta"
                  tone="tint"
                  onPress={() =>
                    execute(async () => {
                      if (
                        await confirm(
                          'Usar os dados da conta?',
                          'Uma cópia dos dados atuais deste aparelho ficará disponível para recuperação. Depois serão carregados os dados da conta.',
                          'Guardar cópia e baixar',
                        )
                      )
                        await cloud.useCloudCopy();
                    })
                  }
                />
              </Section>
            ) : null}
            <Section title="Recuperação">
              <ListRow
                title="Restaurar última cópia deste aparelho"
                onPress={() =>
                  execute(async () => {
                    if (
                      await confirm(
                        'Restaurar cópia anterior?',
                        'A cópia anterior substituirá os dados atuais e será sincronizada com sua conta. Os dados atuais também serão guardados para recuperação.',
                        'Restaurar',
                      )
                    )
                      await cloud.restoreBackup();
                  })
                }
              />
            </Section>
            <Section footer="Sair encerra a sessão no servidor. Os dados deste navegador continuam disponíveis no aparelho.">
              <ListRow title="Sair da conta" tone="destructive" onPress={() => execute(cloud.logout)} />
            </Section>
          </>
        )}
      </ScrollView>
    </>
  );
}
