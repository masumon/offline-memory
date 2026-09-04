import { Appearance, I18nManager, NativeModules, Platform } from 'react-native';
import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { getGlassTokens, getThemeAccents, getThemeColors, type GlassTokens, type ThemeAccents, type ThemeColors } from '../theme';
import { setTimeFormatPreference } from '../i18n/date-time';

type Language = 'en' | 'bn';
type ThemeMode = 'light' | 'dark';
// What the user picked. `system` follows the OS; `themeMode` above is always the resolved
// light/dark value so every screen keeps consuming exactly what it did before.
type ThemeSetting = 'light' | 'dark' | 'system';

export type QuietHours = { start: number; end: number };
export type TimeFormat = '12' | '24';
// 0 = Sunday, 1 = Monday, 6 = Saturday (the Bangladesh working-week start, and the default).
export type WeekStart = 0 | 1 | 6;
// Minutes before `dueAt` a reminder fires. 0 = at the due time.
export const REMINDER_LEADS = [0, 15, 60, 1440] as const;

type PreferencesContextValue = {
  language: Language;
  themeMode: ThemeMode;
  themeSetting: ThemeSetting;
  colors: ThemeColors;
  accents: ThemeAccents;
  glass: GlassTokens;
  onboarded: boolean;
  prefsLoaded: boolean;
  reduceMotion: boolean;
  quietHours: QuietHours | null;
  timeFormat: TimeFormat;
  weekStartsOn: WeekStart;
  reminderLeadMinutes: number;
  quickCaptureTile: boolean;
  autoBackup: boolean;
  autoBackupFolderUri: string | null;
  appLockEnabled: boolean;
  setLanguage: (language: Language) => Promise<void>;
  setThemeMode: (themeSetting: ThemeSetting) => Promise<void>;
  setReduceMotion: (value: boolean) => Promise<void>;
  setQuietHours: (value: QuietHours | null) => Promise<void>;
  setTimeFormat: (value: TimeFormat) => Promise<void>;
  setWeekStartsOn: (value: WeekStart) => Promise<void>;
  setReminderLeadMinutes: (value: number) => Promise<void>;
  setQuickCaptureTile: (value: boolean) => Promise<void>;
  setAutoBackup: (value: boolean) => Promise<void>;
  setAutoBackupFolderUri: (value: string | null) => Promise<void>;
  setAppLockPin: (pin: string | null) => Promise<void>;
  verifyAppLockPin: (pin: string) => boolean;
  applyDeviceLanguage: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
};

// Lightweight salted digest. This is casual-access protection (stops someone picking up
// an unlocked phone), NOT cryptographic security — real device-grade protection needs
// expo-local-authentication / OS keystore, which require a native rebuild.
function pinDigest(pin: string): string {
  let h = 2166136261;
  for (const ch of `om::${pin}::lock`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16);
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

// Dependency-free device-locale read so a Bangladeshi user's first launch defaults to
// Bangla instead of English (audit P0), without adding expo-localization.
function deviceLanguage(): Language {
  try {
    const tag =
      (Platform.OS === 'ios'
        ? NativeModules.SettingsManager?.settings?.AppleLocale ||
          NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
        : NativeModules.I18nManager?.localeIdentifier) ||
      (I18nManager as unknown as { getConstants?: () => { localeIdentifier?: string } }).getConstants?.().localeIdentifier ||
      '';
    return String(tag).toLowerCase().startsWith('bn') ? 'bn' : 'en';
  } catch {
    return 'en';
  }
}

export function AppPreferencesProvider({ children }: PropsWithChildren) {
  const db = useSQLiteContext();
  const [language, setLanguageState] = useState<Language>('en');
  const [themeSetting, setThemeSettingState] = useState<ThemeSetting>('light');
  const [systemScheme, setSystemScheme] = useState<ThemeMode>(() => (Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'));
  const themeMode: ThemeMode = themeSetting === 'system' ? systemScheme : themeSetting;
  const [onboarded, setOnboarded] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [reduceMotion, setReduceMotionState] = useState(false);
  const [quietHours, setQuietHoursState] = useState<QuietHours | null>(null);
  const [timeFormat, setTimeFormatState] = useState<TimeFormat>('12');
  const [weekStartsOn, setWeekStartsOnState] = useState<WeekStart>(6);
  const [reminderLeadMinutes, setReminderLeadMinutesState] = useState(0);
  const [quickCaptureTile, setQuickCaptureTileState] = useState(false);
  const [autoBackup, setAutoBackupState] = useState(false);
  const [autoBackupFolderUri, setAutoBackupFolderUriState] = useState<string | null>(null);
  const [appLockHash, setAppLockHash] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const rows = await db.getAllAsync<{ key: string; value: string }>("SELECT key, value FROM app_preferences WHERE key IN ('language', 'themeMode', 'onboarded', 'reduceMotion', 'quietHours', 'appLockHash', 'timeFormat', 'weekStartsOn', 'reminderLeadMinutes', 'quickCaptureTile', 'autoBackup', 'autoBackupFolderUri')");
        if (!active) return;
        let sawLanguage = false;
        let loadedTimeFormat: TimeFormat = '12';
        for (const row of rows) {
          if (row.key === 'language' && (row.value === 'en' || row.value === 'bn')) { setLanguageState(row.value); sawLanguage = true; }
          if (row.key === 'themeMode' && (row.value === 'light' || row.value === 'dark' || row.value === 'system')) setThemeSettingState(row.value);
          if (row.key === 'onboarded' && row.value === '1') setOnboarded(true);
          if (row.key === 'reduceMotion') setReduceMotionState(row.value === '1');
          if (row.key === 'quietHours') { const m = row.value.match(/^(\d{1,2}):(\d{1,2})$/u); if (m) setQuietHoursState({ start: Number(m[1]), end: Number(m[2]) }); }
          if (row.key === 'appLockHash' && row.value) setAppLockHash(row.value);
          if (row.key === 'timeFormat' && (row.value === '12' || row.value === '24')) { setTimeFormatState(row.value); loadedTimeFormat = row.value; }
          if (row.key === 'weekStartsOn' && (row.value === '0' || row.value === '1' || row.value === '6')) setWeekStartsOnState(Number(row.value) as WeekStart);
          if (row.key === 'reminderLeadMinutes') { const n = Number(row.value); if (Number.isFinite(n) && n >= 0) setReminderLeadMinutesState(n); }
          if (row.key === 'quickCaptureTile') setQuickCaptureTileState(row.value === '1');
          if (row.key === 'autoBackup') setAutoBackupState(row.value === '1');
          if (row.key === 'autoBackupFolderUri') setAutoBackupFolderUriState(row.value || null);
        }
        setTimeFormatPreference(loadedTimeFormat);
        if (!sawLanguage) setLanguageState(deviceLanguage());
      } catch {
        // Preferences are non-critical; safe defaults remain active.
      } finally {
        if (active) setPrefsLoaded(true);
      }
    };
    void load();
    return () => { active = false; };
  }, [db]);

  // `system` hands control back to the OS ('unspecified'); an explicit pick forces it.
  // Wait for the stored value to load first, so a dark/system user doesn't get a white
  // flash from the `light` default being pushed to the OS on the first frame.
  useEffect(() => {
    if (!prefsLoaded) return;
    Appearance.setColorScheme(themeSetting === 'system' ? 'unspecified' : themeSetting);
  }, [themeSetting, prefsLoaded]);

  // Keep the resolved scheme in step with the OS while on `system`.
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => setSystemScheme(colorScheme === 'dark' ? 'dark' : 'light'));
    return () => sub.remove();
  }, []);

  const persist = useCallback(async (key: string, value: string) => {
    await db.runAsync('INSERT INTO app_preferences (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, value);
  }, [db]);

  const setLanguage = useCallback(async (value: Language) => {
    const previous = language;
    setLanguageState(value);
    try {
      await persist('language', value);
    } catch {
      setLanguageState(previous);
    }
  }, [language, persist]);

  const setThemeMode = useCallback(async (value: ThemeSetting) => {
    const previous = themeSetting;
    setThemeSettingState(value);
    try {
      await persist('themeMode', value);
    } catch {
      setThemeSettingState(previous);
    }
  }, [persist, themeSetting]);

  const completeOnboarding = useCallback(async () => {
    setOnboarded(true);
    try { await persist('onboarded', '1'); } catch { setOnboarded(false); }
  }, [persist]);

  const setReduceMotion = useCallback(async (v: boolean) => {
    const prev = reduceMotion; setReduceMotionState(v);
    try { await persist('reduceMotion', v ? '1' : '0'); } catch { setReduceMotionState(prev); }
  }, [persist, reduceMotion]);

  const setQuietHours = useCallback(async (v: QuietHours | null) => {
    const prev = quietHours; setQuietHoursState(v);
    try { await persist('quietHours', v ? `${v.start}:${v.end}` : ''); } catch { setQuietHoursState(prev); }
  }, [persist, quietHours]);

  const setTimeFormat = useCallback(async (v: TimeFormat) => {
    const prev = timeFormat; setTimeFormatState(v); setTimeFormatPreference(v);
    try { await persist('timeFormat', v); } catch { setTimeFormatState(prev); setTimeFormatPreference(prev); }
  }, [persist, timeFormat]);

  const setWeekStartsOn = useCallback(async (v: WeekStart) => {
    const prev = weekStartsOn; setWeekStartsOnState(v);
    try { await persist('weekStartsOn', String(v)); } catch { setWeekStartsOnState(prev); }
  }, [persist, weekStartsOn]);

  const setReminderLeadMinutes = useCallback(async (v: number) => {
    const prev = reminderLeadMinutes; setReminderLeadMinutesState(v);
    try { await persist('reminderLeadMinutes', String(v)); } catch { setReminderLeadMinutesState(prev); }
  }, [persist, reminderLeadMinutes]);

  const setQuickCaptureTile = useCallback(async (v: boolean) => {
    const prev = quickCaptureTile; setQuickCaptureTileState(v);
    try { await persist('quickCaptureTile', v ? '1' : '0'); } catch { setQuickCaptureTileState(prev); }
  }, [persist, quickCaptureTile]);

  const setAutoBackup = useCallback(async (v: boolean) => {
    const prev = autoBackup; setAutoBackupState(v);
    try { await persist('autoBackup', v ? '1' : '0'); } catch { setAutoBackupState(prev); }
  }, [persist, autoBackup]);

  const setAutoBackupFolderUri = useCallback(async (v: string | null) => {
    const prev = autoBackupFolderUri; setAutoBackupFolderUriState(v);
    try { await persist('autoBackupFolderUri', v ?? ''); } catch { setAutoBackupFolderUriState(prev); }
  }, [persist, autoBackupFolderUri]);

  const applyDeviceLanguage = useCallback(async () => { await setLanguage(deviceLanguage()); }, [setLanguage]);

  const setAppLockPin = useCallback(async (pin: string | null) => {
    const next = pin ? pinDigest(pin) : null;
    const prev = appLockHash; setAppLockHash(next);
    try { await persist('appLockHash', next ?? ''); } catch { setAppLockHash(prev); }
  }, [persist, appLockHash]);
  const verifyAppLockPin = useCallback((pin: string) => appLockHash !== null && pinDigest(pin) === appLockHash, [appLockHash]);

  const colors = useMemo(() => getThemeColors(themeMode), [themeMode]);
  const accents = useMemo(() => getThemeAccents(themeMode), [themeMode]);
  const glass = useMemo(() => getGlassTokens(themeMode), [themeMode]);
  const value = useMemo(() => ({ language, themeMode, themeSetting, colors, accents, glass, onboarded, prefsLoaded, reduceMotion, quietHours, timeFormat, weekStartsOn, reminderLeadMinutes, quickCaptureTile, autoBackup, autoBackupFolderUri, appLockEnabled: appLockHash !== null, setLanguage, setThemeMode, setReduceMotion, setQuietHours, setTimeFormat, setWeekStartsOn, setReminderLeadMinutes, setQuickCaptureTile, setAutoBackup, setAutoBackupFolderUri, setAppLockPin, verifyAppLockPin, applyDeviceLanguage, completeOnboarding }), [language, themeMode, themeSetting, colors, accents, glass, onboarded, prefsLoaded, reduceMotion, quietHours, timeFormat, weekStartsOn, reminderLeadMinutes, quickCaptureTile, autoBackup, autoBackupFolderUri, appLockHash, setLanguage, setThemeMode, setReduceMotion, setQuietHours, setTimeFormat, setWeekStartsOn, setReminderLeadMinutes, setQuickCaptureTile, setAutoBackup, setAutoBackupFolderUri, setAppLockPin, verifyAppLockPin, applyDeviceLanguage, completeOnboarding]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function useAppPreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('useAppPreferences must be used inside AppPreferencesProvider');
  return context;
}
