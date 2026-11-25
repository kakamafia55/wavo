import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { TransferProvider } from '../context/TransferProvider';
import ErrorOverlay from '../components/ErrorOverlay';
import { theme } from '../components/ui';

SplashScreen.preventAutoHideAsync();

const FONTS = {
  Cairo_400Regular: require('../../assets/fonts/Cairo_400Regular.ttf'),
  Cairo_600SemiBold: require('../../assets/fonts/Cairo_600SemiBold.ttf'),
  Cairo_700Bold: require('../../assets/fonts/Cairo_700Bold.ttf'),
  Cairo_800ExtraBold: require('../../assets/fonts/Cairo_800ExtraBold.ttf'),
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts(FONTS);

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <TransferProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.bg },
          animation: 'fade',
        }}
      />
      <ErrorOverlay />
    </TransferProvider>
  );
}
