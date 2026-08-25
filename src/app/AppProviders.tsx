import type { PropsWithChildren } from 'react';
import { useEffect } from 'react';
import { SQLiteProvider } from 'expo-sqlite';
import { migrateDatabase } from '../database/migrations';
import { initializeNotifications } from '../services/notification.service';
import { SchedulerBootstrap } from './SchedulerBootstrap';
import { AppPreferencesProvider } from './AppPreferences';
import { AppFeedbackProvider } from '../ui/AppFeedback';

export function AppProviders({ children }: PropsWithChildren) {
  useEffect(() => { void initializeNotifications().catch(() => {}); }, []);
  return <SQLiteProvider databaseName="offline-memory.db" onInit={migrateDatabase}><AppPreferencesProvider><AppFeedbackProvider><SchedulerBootstrap />{children}</AppFeedbackProvider></AppPreferencesProvider></SQLiteProvider>;
}
