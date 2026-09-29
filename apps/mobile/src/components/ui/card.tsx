import type { ReactNode } from 'react';
import { View } from 'react-native';

/** Cartão branco (cinza-escuro no modo escuro) com os cantos contínuos do iOS. */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <View className={`mx-4 rounded-[26px] bg-surface p-5 ${className}`} style={{ borderCurve: 'continuous' }}>
      {children}
    </View>
  );
}
