import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useColors } from '@/theme';

type ListRowProps = {
  title: string;
  subtitle?: string;
  /** Valor à direita, em cinza (ex.: "4 × 10"). */
  value?: string;
  /** Símbolo à esquerda, na cor de destaque (ou em iconColor). Use separatorInset={56} na Section. */
  icon?: SymbolViewProps['name'];
  iconColor?: string;
  /** tint: ação ("Adicionar treino"). destructive: ação que apaga. */
  tone?: 'default' | 'tint' | 'destructive';
  /** Marca de seleção à direita, para listas de escolha única. */
  checked?: boolean;
  onPress?: () => void;
  /** A seta aparece sozinha em linhas tocáveis que navegam. false esconde (linha que faz uma ação na hora). */
  chevron?: boolean;
  /** Conteúdo extra abaixo do texto (botões de escolha, por exemplo). */
  children?: ReactNode;
};

const TITLE = { default: 'text-label', tint: 'text-tint', destructive: 'text-danger' } as const;

/** Linha de uma Section. Com onPress vira tocável; em tom padrão ganha a seta de navegação. */
export function ListRow({ title, subtitle, value, icon, iconColor, tone = 'default', checked, onPress, chevron, children }: ListRowProps) {
  const colors = useColors();
  const showChevron = chevron ?? (Boolean(onPress) && tone === 'default' && checked === undefined);

  const content = (
    <View className="min-h-[52px] flex-row items-center gap-3 px-5 py-3">
      {icon ? <SymbolView name={icon} size={22} tintColor={iconColor ?? colors[tone === 'destructive' ? 'danger' : 'tint']} /> : null}
      <View className="flex-1">
        <Text className={`text-body ${TITLE[tone]}`}>{title}</Text>
        {subtitle ? <Text className="text-subhead text-label-secondary">{subtitle}</Text> : null}
        {children}
      </View>
      {value ? (
        <Text className="text-body text-label-secondary" style={{ fontVariant: ['tabular-nums'] }}>
          {value}
        </Text>
      ) : null}
      {checked ? <SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={17} tintColor={colors.tint} /> : null}
      {showChevron ? (
        <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={14} tintColor={colors['icon-tertiary']} />
      ) : null}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={checked === undefined ? undefined : { selected: checked }}
      onPress={onPress}
      className="active:bg-fill-secondary">
      {content}
    </Pressable>
  );
}
