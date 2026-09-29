import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';

/** Fundo de concreto de toda tela: a cor do muro com dois pontilhados de textura. */
export function Wall({ children }: { children: ReactNode }) {
  return (
    <View className="flex-1 bg-wall">
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <Pattern id="wall-dark" width={9} height={9} patternUnits="userSpaceOnUse">
            <Circle cx={1} cy={1} r={1} fill="rgba(0,0,0,0.07)" />
          </Pattern>
          <Pattern id="wall-light" x={5} y={7} width={14} height={14} patternUnits="userSpaceOnUse">
            <Circle cx={1} cy={1} r={1} fill="rgba(255,255,255,0.22)" />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#wall-dark)" />
        <Rect width="100%" height="100%" fill="url(#wall-light)" />
      </Svg>
      {children}
    </View>
  );
}
