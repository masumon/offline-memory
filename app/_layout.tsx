import { Stack, usePathname } from 'expo-router';
import { StatusBar, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AppProviders } from '../src/app/AppProviders';
import { useAppPreferences } from '../src/app/AppPreferences';
import { PrimaryNav } from '../src/ui/PrimaryNav';

const primaryRoutes = ['/', '/planning', '/memory', '/inbox', '/more'];
const EXPANDED_BREAKPOINT = 720;

function AppNavigator() {
  const { themeMode, colors } = useAppPreferences();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const dark = themeMode === 'dark';
  const showPrimaryNav = primaryRoutes.includes(pathname);
  const expandedNav = width >= EXPANDED_BREAKPOINT;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.background,
            paddingBottom: showPrimaryNav && !expandedNav ? 86 : 0,
            paddingLeft: showPrimaryNav && expandedNav ? 104 : 0,
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
