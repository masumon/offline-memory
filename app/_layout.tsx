import { useEffect, useRef, useState } from 'react';
import { Stack, router, usePathname } from 'expo-router';
import { BackHandler, StatusBar, useWindowDimensions } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as QuickActions from 'expo-quick-actions';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {
  NotoSansBengali_400Regular,
  NotoSansBengali_500Medium,
  NotoSansBengali_600SemiBold,
  NotoSansBengali_700Bold,
} from '@expo-google-fonts/noto-sans-bengali';
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
import { AppConfirmDialog } from '../src/ui/AppFeedback';
import { AppErrorBoundary } from '../src/ui/AppErrorBoundary';
import { LockGate } from '../src/ui/LockGate';
import { PrimaryNav } from '../src/ui/PrimaryNav';
import { bindOnDeviceLlmEngine } from '../src/ai/engine/on-device-llm-engine';
import { purgeExpiredTasks } from '../src/services/task-repository';
import { purgeExpiredMemories } from '../src/services/memory-repository';
import { syncQuickCaptureTile } from '../src/services/quick-capture-notification';
import { syncDebtReminders } from '../src/services/debt/reminders';
import { runAutoBackup } from '../src/services/auto-backup-service';
import { useShareIntent } from 'expo-share-intent';
import { getWindowSizeClass, layout } from '../src/theme';

const primaryRoutes = ['/', '/planning', '/memory', '/debt', '/inbox', '/more'];

void SplashScreen.preventAutoHideAsync().catch(() => {});

// A reminder is only useful if tapping it lands on the task. This is app-wide and
// must survive cold start (getLastNotificationResponseAsync) and warm taps (listener).
function routeFromNotification(response: Notifications.NotificationResponse | null) {
  const data = response?.notification.request.content.data as { taskId?: unknown; route?: unknown } | undefined;
  const taskId = typeof data?.taskId === 'string' ? data.taskId : undefined;
  if (taskId) { router.push({ pathname: '/task-detail', params: { id: taskId } }); return; }
  // The persistent quick-capture tile carries a plain destination instead of a task id.
  const route = typeof data?.route === 'string' ? data.route : undefined;
  if (route) router.push(route as never);
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

// Text or a link shared to Offline Memory from another app opens a pre-filled new task.
function useShareCapture() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent({ resetOnBackground: true });
  useEffect(() => {
    if (!hasShareIntent) return;
    const text = (shareIntent.text ?? '').trim();
    const url = (shareIntent.webUrl ?? '').trim();
    if (text || url) {
      const title = (text || url).slice(0, 140);
      const notes = url && text && !text.includes(url) ? url : undefined;
      router.push({ pathname: '/task-editor', params: notes ? { title, notes } : { title } });
    }
    resetShareIntent();
  }, [hasShareIntent, shareIntent, resetShareIntent]);
}

// Long-press the launcher icon → jump straight to a new task, memory, search or assistant.
function useLauncherShortcuts() {
  const handledCold = useRef(false);
  useEffect(() => {
    const route = (action: QuickActions.Action | undefined) => {
      const href = action?.params?.href;
      if (typeof href === 'string') router.push(href as never);
    };
    void QuickActions.setItems([
      { id: 'new-task', title: 'New task', icon: 'compose', params: { href: '/task-editor' } },
      { id: 'new-memory', title: 'New memory', icon: 'compose', params: { href: '/memory-editor' } },
      { id: 'search', title: 'Search', icon: 'search', params: { href: '/search' } },
      { id: 'assistant', title: 'Assistant', params: { href: '/assistant' } },
    ]).catch(() => {});
    if (!handledCold.current) { handledCold.current = true; route(QuickActions.initial); }
    const sub = QuickActions.addListener(route);
    return () => sub.remove();
  }, []);
}

function AppNavigator() {
  useNotificationRouting();
  useLauncherShortcuts();
  useShareCapture();
  const { themeMode, colors, onboarded, prefsLoaded, reduceMotion, language, quickCaptureTile, autoBackup, autoBackupFolderUri, setQuickCaptureTile } = useAppPreferences();
  const db = useSQLiteContext();
  const pathname = usePathname();

  // Android back / swipe-back: from an inner screen, navigate back as usual. Only when
  // there is nothing left to go back to (root/home) do we show a branded confirm sheet
  // before closing — "Stay" just dismisses it and keeps the screen and any unsaved
  // input intact.
  const bn = language === 'bn';
  const [exitOpen, setExitOpen] = useState(false);
  const exitOpenRef = useRef(false);
  useEffect(() => { exitOpenRef.current = exitOpen; }, [exitOpen]);
  useEffect(() => {
    const onBackPress = () => {
      if (router.canGoBack()) return false;
      if (exitOpenRef.current) return true; // already asking — swallow repeat presses
      setExitOpen(true);
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, []);

  // Let the opt-in on-device LLM engine reach the installed-model record. Harmless
  // when no model or native runtime is present — the built-in rule engine stays active.
  useEffect(() => { bindOnDeviceLlmEngine(db); }, [db]);

  // Empty the trash of anything soft-deleted more than 30 days ago. Best-effort, once
  // per launch, off the critical path.
  useEffect(() => {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    void Promise.resolve().then(async () => {
      try { await purgeExpiredTasks(db, cutoff); await purgeExpiredMemories(db, cutoff); } catch { /* best-effort */ }
    });
  }, [db]);

  // Reconcile the persistent quick-capture notification with its preference, and run a
  // weekly auto-backup if that is switched on. Both are opt-in, best-effort, once per launch.
  useEffect(() => {
    if (!prefsLoaded) return;
    void syncQuickCaptureTile(quickCaptureTile, language).then((ok) => {
      // If it was switched on but notification permission was refused, don't leave the
      // toggle looking active for a tile that will never show.
      if (quickCaptureTile && !ok) void setQuickCaptureTile(false);
    }).catch(() => {});
  }, [prefsLoaded, quickCaptureTile, language, setQuickCaptureTile]);
  useEffect(() => {
    if (!prefsLoaded || !autoBackup) return;
    void Promise.resolve().then(() => runAutoBackup(db, autoBackupFolderUri)).catch(() => {});
  }, [prefsLoaded, autoBackup, autoBackupFolderUri, db]);

  // Reconcile the debt module's due-date reminders once per launch. It cancels and
  // re-schedules only its own `dr:` notifications, so it never touches task reminders.
  useEffect(() => {
    if (!prefsLoaded) return;
    void Promise.resolve().then(() => syncDebtReminders(db, new Date(), language)).catch(() => {});
  }, [db, prefsLoaded, language]);

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
      <AppConfirmDialog
        visible={exitOpen}
        icon="exit-run"
        iconTone="primary"
        title={bn ? 'অ্যাপ থেকে বেরিয়ে যাবেন?' : 'Leave Offline Memory?'}
        description={bn
          ? 'আপনার সব টাস্ক ও মেমোরি নিরাপদে এই ফোনেই সংরক্ষিত থাকবে — যেকোনো সময় ফিরে আসতে পারবেন।'
          : 'Every task and memory stays saved safely on this phone — you can come back anytime.'}
        cancelLabel={bn ? 'থেকে যাই' : 'Stay'}
        confirmLabel={bn ? 'বেরিয়ে যাই' : 'Leave'}
        confirmIcon="exit-run"
        onCancel={() => setExitOpen(false)}
        onConfirm={() => { setExitOpen(false); BackHandler.exitApp(); }}
      />
    </SafeAreaView>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    NotoSansBengali_400Regular,
    NotoSansBengali_500Medium,
    NotoSansBengali_600SemiBold,
    NotoSansBengali_700Bold,
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
        <AppErrorBoundary>
          <AppNavigator />
        </AppErrorBoundary>
        {splashDone ? null : <AnimatedSplash onFinish={() => setSplashDone(true)} />}
      </AppProviders>
    </SafeAreaProvider>
  );
}
