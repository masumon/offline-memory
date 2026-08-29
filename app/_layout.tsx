import { useEffect, useRef, useState } from 'react';
import { Stack, router, usePathname } from 'expo-router';
import { Alert, BackHandler, StatusBar, useWindowDimensions } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as QuickActions from 'expo-quick-actions';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {
  HindSiliguri_400Regular,
  HindSiliguri_500Medium,
  HindSiliguri_600SemiBold,
  HindSiliguri_700Bold,
} from '@expo-google-fonts/hind-siliguri';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useSQLiteContext } from 'expo-sqlite';
import { AppProviders } from '../src/app/AppProviders';
import { useAppPreferences } from '../src/app/AppPreferences';
import { AnimatedSplash } from '../src/ui/AnimatedSplash';
import { LockGate } from '../src/ui/LockGate';
import { PrimaryNav } from '../src/ui/PrimaryNav';
import { bindOnDeviceLlmEngine } from '../src/ai/engine/on-device-llm-engine';
import { getWindowSizeClass, layout } from '../src/theme';

const primaryRoutes = ['/', '/planning', '/memory', '/inbox', '/more'];

void SplashScreen.preventAutoHideAsync().catch(() => {});

// A reminder is only useful if tapping it lands on the task. This is app-wide and
// must survive cold start (getLastNotificationResponseAsync) and warm taps (listener).
function routeFromNotification(response: Notifications.NotificationResponse | null) {
  const data = response?.notification.request.content.data as { taskId?: unknown } | undefined;
  const taskId = typeof data?.taskId === 'string' ? data.taskId : undefined;
  if (taskId) router.push({ pathname: '/task-detail', params: { id: taskId } });
}

function useNotificationRouting() {
  const handledCold = useRef(false);
  useEffect(() => {
    if (!handledCold.current) {
      handledCold.current = true;
      void Notifications.getLastNotificationResponseAsync().then(routeFromNotification).catch(() => {});
    }
    const sub = Notifications.addNotificationResponseReceivedListener(routeFromNotification);
    return () => sub.remove();
  }, []);
}

// Long-press the launcher icon → jump straight to a new task or search.
function useLauncherShortcuts() {
  const handledCold = useRef(false);
  useEffect(() => {
    const route = (action: QuickActions.Action | undefined) => {
      const href = action?.params?.href;
      if (typeof href === 'string') router.push(href as never);
    };
    void QuickActions.setItems([
      { id: 'new-task', title: 'New task', icon: 'compose', params: { href: '/task-editor' } },
      { id: 'search', title: 'Search', icon: 'search', params: { href: '/search' } },
    ]).catch(() => {});
    if (!handledCold.current) { handledCold.current = true; route(QuickActions.initial); }
    const sub = QuickActions.addListener(route);
    return () => sub.remove();
  }, []);
}

function AppNavigator() {
  useNotificationRouting();
  useLauncherShortcuts();
  const { themeMode, colors, onboarded, prefsLoaded, reduceMotion, language } = useAppPreferences();
  const db = useSQLiteContext();
  const pathname = usePathname();

  // Android back / swipe-back: from an inner screen, navigate back as usual. Only when
  // there is nothing left to go back to (root/home) do we ask before closing the app —
  // "No" just dismisses and keeps the current screen and any unsaved input intact.
  const exitPromptOpen = useRef(false);
  useEffect(() => {
    const bn = language === 'bn';
    const onBackPress = () => {
      if (router.canGoBack()) return false;
      if (exitPromptOpen.current) return true; // don't stack dialogs on repeated presses
      exitPromptOpen.current = true;
      Alert.alert(
        bn ? 'অ্যাপ বন্ধ করবেন?' : 'Close the app?',
        bn ? 'আপনি কি অ্যাপটি বন্ধ করতে চান?' : 'Do you want to close the app?',
        [
          { text: bn ? 'হ্যাঁ' : 'Yes', style: 'destructive', onPress: () => BackHandler.exitApp() },
          { text: bn ? 'না' : 'No', style: 'cancel', onPress: () => { exitPromptOpen.current = false; } },
        ],
        { cancelable: true, onDismiss: () => { exitPromptOpen.current = false; } },
      );
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [language]);

  // Let the opt-in on-device LLM engine reach the installed-model record. Harmless
  // when no model or native runtime is present — the built-in rule engine stays active.
  useEffect(() => { bindOnDeviceLlmEngine(db); }, [db]);

  // First run: send the user through onboarding before anything else renders.
  useEffect(() => {
    if (prefsLoaded && !onboarded && pathname !== '/onboarding') router.replace('/onboarding');
  }, [prefsLoaded, onboarded, pathname]);
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
          animation: reduceMotion ? 'none' : 'default',
          contentStyle: {
            backgroundColor: colors.background,
            paddingBottom: compactBottomInset,
            paddingLeft: showPrimaryNav && expandedNav ? layout.expandedNavWidth : 0,
            paddingRight: showPrimaryNav && windowClass === 'medium' ? mediumHorizontalPadding : 0,
          },
        }}
      />
      {showPrimaryNav ? <PrimaryNav /> : null}
      <LockGate>{null}</LockGate>
    </SafeAreaView>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    HindSiliguri_400Regular,
    HindSiliguri_500Medium,
    HindSiliguri_600SemiBold,
    HindSiliguri_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  // Safety net: never let a slow/failed font fetch trap the app on a blank splash.
  const [fontTimedOut, setFontTimedOut] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFontTimedOut(true), 4000);
    return () => clearTimeout(t);
  }, []);

  const canRender = fontsLoaded || Boolean(fontError) || fontTimedOut;

  // Belt-and-suspenders: AnimatedSplash dismisses itself on a timer, but if it never
  // mounts (or a refresh interrupts it), force the cover away. Runs at most once.
  const splashGuard = useRef(false);
  useEffect(() => {
    if (!canRender || splashGuard.current) return;
    splashGuard.current = true;
    const t = setTimeout(() => setSplashDone(true), 12000);
    return () => clearTimeout(t);
  }, [canRender]);

  if (!canRender) return null; // native splash (emerald + spark) stays up

  return (
    <SafeAreaProvider>
      <AppProviders>
        <AppNavigator />
        {splashDone ? null : <AnimatedSplash onFinish={() => setSplashDone(true)} />}
      </AppProviders>
    </SafeAreaProvider>
  );
}
