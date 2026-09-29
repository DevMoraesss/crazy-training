import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

type PosterProps = {
  /** Cor do papel. Para treinos, use paperFor(índice).paper. */
  paper: string;
  /** Inclinação em graus. Entre -2 e 2: mais que isso atrapalha a leitura. */
  tilt?: number;
  tape?: 'corners' | 'top' | 'none';
  className?: string;
  children: ReactNode;
};

/** O cartaz colado no muro. No máximo um cartaz grande por tela: ele é o destaque. */
export function Poster({ paper, tilt = 0, tape = 'corners', className, children }: PosterProps) {
  return (
    <View className={className} style={{ transform: [{ rotate: `${tilt}deg` }] }}>
      <View className="p-5" style={{ backgroundColor: paper }}>
        {children}
      </View>
      {tape === 'corners' ? (
        <>
          <Tape style={{ top: -10, left: -14, transform: [{ rotate: '-24deg' }] }} />
          <Tape style={{ top: -8, right: -12, transform: [{ rotate: '20deg' }] }} />
        </>
      ) : null}
      {tape === 'top' ? <Tape style={{ top: -12, left: '50%', marginLeft: -42, transform: [{ rotate: '-3deg' }] }} /> : null}
    </View>
  );
}

/** Pedaço de fita adesiva semitransparente. Só em cartazes, nunca em botões. */
export function Tape({ style }: { style: ViewStyle }) {
  return <View className="absolute h-[26px] w-[84px] bg-tape" style={style} />;
}
