import type { ReactNode } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme';

export type IconProps = { size?: number; color?: string };

function StrokeIcon({ size = 24, color = colors.ink, children }: IconProps & { children: ReactNode }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round">
      {children}
    </Svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <Rect x={3} y={5} width={18} height={16} />
      <Path d="M3 10h18M8 3v4M16 3v4" />
    </StrokeIcon>
  );
}

export function DumbbellIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <Path d="M6 7v10M3 10v4M18 7v10M21 10v4M6 12h12" />
    </StrokeIcon>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <Path d="M5 20v-6M12 20V5M19 20v-10M3 21h18" />
    </StrokeIcon>
  );
}

export function PersonIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <Circle cx={12} cy={8} r={4} />
      <Path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </StrokeIcon>
  );
}

/** Risco de marca-texto rosa sob a aba ativa. */
export function MarkerUnderline({ visible }: { visible: boolean }) {
  return (
    <Svg width={36} height={7} viewBox="0 0 36 7" opacity={visible ? 1 : 0}>
      <Path d="M2 4c7-3 12 2 19-1s9-1 13 0" stroke={colors['paper-pink']} strokeWidth={4} fill="none" strokeLinecap="round" />
    </Svg>
  );
}
