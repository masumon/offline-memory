import type { PropsWithChildren } from 'react';
import { useEffect } from 'react';
import { SQLiteProvider } from 'expo-sqlite';

import { migrateDatabase } from '../database/migrations';
import { initializeNotifications } from '../services/notification.service';
import { SchedulerBootstrap } from './SchedulerBootstrap';

export function AppProviders({ children }: PropsWithChildren) {
  useEffect(() => {
    void initializeNotifications().catch(() => {
      // Notification setup is optional at startup; the Reminders screen can retry it explicitly.
    });
  }, []);

  return (
    <SQLiteProvider databaseName="offline-memory.db" onInit={migrateDatabase}>
      <SchedulerBootstrap />
      {children}
    </SQLiteProvider>
  );
}
