import type { PropsWithChildren } from 'react';
import { SQLiteProvider } from 'expo-sqlite';

import { migrateDatabase } from '../database/migrations';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SQLiteProvider databaseName="offline-memory.db" onInit={migrateDatabase}>
      {children}
    </SQLiteProvider>
  );
}
