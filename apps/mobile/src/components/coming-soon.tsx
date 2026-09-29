import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme';

import { Poster } from './poster';
import { Sticker } from './sticker';
import { Wall } from './wall';

/** Tela de uma aba que ainda não foi construída. */
export function ComingSoon({ title, description }: { title: string; description: string }) {
  const insets = useSafeAreaInsets();
  return (
    <Wall>
      <View className="flex-1 justify-center px-6" style={{ paddingTop: insets.top }}>
        <Poster paper={colors.xerox} tilt={-1} tape="top">
          <Text className="font-poster text-[72px] leading-[70px] text-ink">{title.toUpperCase()}</Text>
          <Text className="mt-2 font-body text-base leading-6 text-ink">{description}</Text>
        </Poster>
        <Sticker label="em breve" tilt={8} className="-mt-4 mr-2 self-end" />
      </View>
    </Wall>
  );
}
