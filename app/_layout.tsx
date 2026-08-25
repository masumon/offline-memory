import { Stack, usePathname } from 'expo-router';
import { StatusBar, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppProviders } from '../src/app/AppProviders';
import { useAppPreferences } from '../src/app/AppPreferences';
import { PrimaryNav } from '../src/ui/PrimaryNav';
import { getWindowSizeClass, layout } from '../src/theme';

const primaryRoutes = ['/', '/planning', '/memory', '/inbox', '/more'];

function AppNavigator() {
  const { themeMode, colors } = useAppPreferences();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const dark = themeMode === 'dark';
  const showPrimaryNav = primaryRoutes.includes(pathname);
  const windowClass = getWindowSizeClass(width);
  const expandedNav = windowClass === 'expanded';
  const compactBottomInset = showPrimaryNav && !expandedNav ? layout.compactNavHeight + insets.bottom : 0;
  const mediumHorizontalPadding = windowClass === 'medium' ? layout.regularHorizontal : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.background,
            paddingBottom: compactBottomInset,
            paddingLeft: showPrimaryNav && expandedNav ? layout.expandedNavWidth : 0,
            paddingRight: showPrimaryNav && windowClass === 'medium' ? mediumHorizontalPadding : 0,
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
