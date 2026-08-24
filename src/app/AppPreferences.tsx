import type { PropsWithChildren } from 'react';
import { Appearance, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

type Language = 'en' | 'bn';
type ThemeMode = 'light' | 'dark';

type PreferencesContextValue = {
  language: Language;
  themeMode: ThemeMode;
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
      await db.execAsync('CREATE TABLE IF NOT EXISTS app_preferences (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)');
      const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM app_preferences WHERE key IN (\'language\', \'themeMode\')');
      if (!active) return;
      for (const row of rows) {
        if (row.key === 'language' && (row.value === 'en' || row.value === 'bn')) setLanguageState(row.value);
        if (row.key === 'themeMode' && (row.value === 'light' || row.value === 'dark')) setThemeModeState(row.value);
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
    setLanguageState(value);
    await persist('language', value);
  }, [persist]);

  const setThemeMode = useCallback(async (value: ThemeMode) => {
    setThemeModeState(value);
    await persist('themeMode', value);
  }, [persist]);

  const value = useMemo(() => ({ language, themeMode, setLanguage, setThemeMode }), [language, themeMode, setLanguage, setThemeMode]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function useAppPreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('useAppPreferences must be used inside AppPreferencesProvider');
  return context;
}
