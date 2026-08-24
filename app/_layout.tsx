import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AppProviders } from '../src/app/AppProviders';
import { useAppPreferences } from '../src/app/AppPreferences';
import { PrimaryNav } from '../src/ui/PrimaryNav';

const primaryRoutes = ['/', '/planning', '/memory', '/inbox', '/more'];

function AppNavigator() {
  const { themeMode, colors } = useAppPreferences();
  const pathname = usePathname();
  const dark = themeMode === 'dark';
  const showPrimaryNav = primaryRoutes.includes(pathname);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.background,
            paddingBottom: showPrimaryNav ? 86 : 0,
          },
        }}
      />
      {showPrimaryNav ? <PrimaryNav /> : null}
    </SafeAreaView>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProviders>
        <AppNavigator />
      </AppProviders>
    </SafeAreaProvider>
  );
}
