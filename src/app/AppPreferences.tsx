import { Appearance, I18nManager, NativeModules, Platform } from 'react-native';
import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { getGlassTokens, getThemeAccents, getThemeColors, type GlassTokens, type ThemeAccents, type ThemeColors } from '../theme';

type Language = 'en' | 'bn';
type ThemeMode = 'light' | 'dark';

export type QuietHours = { start: number; end: number };

type PreferencesContextValue = {
  language: Language;
  themeMode: ThemeMode;
  colors: ThemeColors;
  accents: ThemeAccents;
  glass: GlassTokens;
  onboarded: boolean;
  prefsLoaded: boolean;
  reduceMotion: boolean;
  quietHours: QuietHours | null;
  appLockEnabled: boolean;
  setLanguage: (language: Language) => Promise<void>;
  setThemeMode: (themeMode: ThemeMode) => Promise<void>;
  setReduceMotion: (value: boolean) => Promise<void>;
  setQuietHours: (value: QuietHours | null) => Promise<void>;
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
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [onboarded, setOnboarded] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [reduceMotion, setReduceMotionState] = useState(false);
  const [quietHours, setQuietHoursState] = useState<QuietHours | null>(null);
  const [appLockHash, setAppLockHash] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const rows = await db.getAllAsync<{ key: string; value: string }>("SELECT key, value FROM app_preferences WHERE key IN ('language', 'themeMode', 'onboarded', 'reduceMotion', 'quietHours', 'appLockHash')");
        if (!active) return;
        let sawLanguage = false;
        for (const row of rows) {
          if (row.key === 'language' && (row.value === 'en' || row.value === 'bn')) { setLanguageState(row.value); sawLanguage = true; }
          if (row.key === 'themeMode' && (row.value === 'light' || row.value === 'dark')) setThemeModeState(row.value);
          if (row.key === 'onboarded' && row.value === '1') setOnboarded(true);
          if (row.key === 'reduceMotion') setReduceMotionState(row.value === '1');
          if (row.key === 'quietHours') { const m = row.value.match(/^(\d{1,2}):(\d{1,2})$/u); if (m) setQuietHoursState({ start: Number(m[1]), end: Number(m[2]) }); }
          if (row.key === 'appLockHash' && row.value) setAppLockHash(row.value);
        }
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

  useEffect(() => {
    Appearance.setColorScheme(themeMode);
  }, [themeMode]);

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

  const setThemeMode = useCallback(async (value: ThemeMode) => {
    const previous = themeMode;
    setThemeModeState(value);
    try {
      await persist('themeMode', value);
    } catch {
      setThemeModeState(previous);
    }
  }, [persist, themeMode]);

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
  const value = useMemo(() => ({ language, themeMode, colors, accents, glass, onboarded, prefsLoaded, reduceMotion, quietHours, appLockEnabled: appLockHash !== null, setLanguage, setThemeMode, setReduceMotion, setQuietHours, setAppLockPin, verifyAppLockPin, applyDeviceLanguage, completeOnboarding }), [language, themeMode, colors, accents, glass, onboarded, prefsLoaded, reduceMotion, quietHours, appLockHash, setLanguage, setThemeMode, setReduceMotion, setQuietHours, setAppLockPin, verifyAppLockPin, applyDeviceLanguage, completeOnboarding]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function useAppPreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('useAppPreferences must be used inside AppPreferencesProvider');
  return context;
}
