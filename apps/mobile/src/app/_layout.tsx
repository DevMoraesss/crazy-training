import '../global.css';

// Import por peso (e não pelo índice do pacote) para não embutir todos os pesos no app.
import { Archivo_400Regular } from '@expo-google-fonts/archivo/400Regular';
import { Archivo_600SemiBold } from '@expo-google-fonts/archivo/600SemiBold';
import { Archivo_800ExtraBold } from '@expo-google-fonts/archivo/800ExtraBold';
import { LeagueGothic_400Regular } from '@expo-google-fonts/league-gothic/400Regular';
import { PermanentMarker_400Regular } from '@expo-google-fonts/permanent-marker/400Regular';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // As chaves viram os nomes das famílias usados em src/theme/tokens.json.
  const [loaded, error] = useFonts({
    LeagueGothic_400Regular,
    Archivo_400Regular,
    Archivo_600SemiBold,
    Archivo_800ExtraBold,
    PermanentMarker_400Regular,
  });

  useEffect(() => {
    if (loaded || error) void SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
