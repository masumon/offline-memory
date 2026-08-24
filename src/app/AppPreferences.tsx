import { Appearance } from 'react-native';
import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { getThemeColors, type ThemeColors } from '../theme';

type Language = 'en' | 'bn';
type ThemeMode = 'light' | 'dark';

type PreferencesContextValue = {
  language: Language;
  themeMode: ThemeMode;
  colors: ThemeColors;
  setLanguage: (language: Language) => Promise<void>;
  setThemeMode: (themeMode: ThemeMode) => Promise<void>;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function AppPreferencesProvider({ children }: PropsWithChildren) {
  const db = useSQLiteContext();
  const [language, setLanguageState] = useState<Language>('en');
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const rows = await db.getAllAsync<{ key: string; value: string }>("SELECT key, value FROM app_preferences WHERE key IN ('language', 'themeMode')");
        if (!active) return;
        for (const row of rows) {
          if (row.key === 'language' && (row.value === 'en' || row.value === 'bn')) setLanguageState(row.value);
          if (row.key === 'themeMode' && (row.value === 'light' || row.value === 'dark')) setThemeModeState(row.value);
        }
      } catch {
        // Preferences are non-critical; safe defaults remain active.
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
      throw new Error('Could not save language preference');
    }
  }, [language, persist]);

  const setThemeMode = useCallback(async (value: ThemeMode) => {
    const previous = themeMode;
    setThemeModeState(value);
    try {
      await persist('themeMode', value);
    } catch {
      setThemeModeState(previous);
      throw new Error('Could not save theme preference');
    }
  }, [persist, themeMode]);

  const colors = useMemo(() => getThemeColors(themeMode), [themeMode]);
  const value = useMemo(() => ({ language, themeMode, colors, setLanguage, setThemeMode }), [language, themeMode, colors, setLanguage, setThemeMode]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function useAppPreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('useAppPreferences must be used inside AppPreferencesProvider');
  return context;
}
