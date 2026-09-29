import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useColors } from '@/theme';

type RestRingProps = {
  /** Fração que falta, de 0 a 1. */
  remaining: number;
  size?: number;
  children: ReactNode;
};

/** Anel do timer de descanso, como o do app Relógio: esvazia conforme o tempo passa. */
export function RestRing({ remaining, size = 260, children }: RestRingProps) {
  const colors = useColors();
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = Math.min(1, Math.max(0, remaining));
  const center = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={radius} stroke={colors.fill} strokeWidth={stroke} fill="none" />
        {fraction > 0 ? (
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={colors.tint}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference * fraction} ${circumference}`}
            transform={`rotate(-90 ${center} ${center})`}
          />
        ) : null}
      </Svg>
      <View style={StyleSheet.absoluteFill} className="items-center justify-center">
        {children}
      </View>
    </View>
  );
}
