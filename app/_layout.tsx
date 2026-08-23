import { Stack } from 'expo-router';
import { StatusBar } from 'react-native';

import { AppProviders } from '../src/app/AppProviders';

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <Stack screenOptions={{ headerShown: false }} />
    </AppProviders>
  );
}
