import { Stack } from 'expo-router';
import { StatusBar } from 'react-native';

import { AppProviders } from '../src/app/AppProviders';
import { useAppPreferences } from '../src/app/AppPreferences';

function AppNavigator() {
  const { themeMode } = useAppPreferences();
  const dark = themeMode === 'dark';

  return (
    <>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor={dark ? '#0B1220' : '#F8FAFC'} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <AppNavigator />
    </AppProviders>
  );
}
