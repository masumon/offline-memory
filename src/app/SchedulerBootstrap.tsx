import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { runNotificationScheduler } from '../services/scheduler-runner';

const SCHEDULER_INTERVAL_MS = 15 * 60 * 1000;

export function SchedulerBootstrap() {
  const db = useSQLiteContext();
  const running = useRef(false);

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (!active || running.current) return;
      running.current = true;
      try {
        await runNotificationScheduler(db);
      } catch {
        // Scheduling must never create an unhandled rejection or block the app. Note the
        // interval only fires while the app is foregrounded (JS timers are suspended in
        // the background) — the every-15-min tick is really "while open", plus a run on
        // every foreground transition. Actual delivery relies on the OS-scheduled
        // notifications, which fire regardless.
      } finally {
        running.current = false;
      }
    };

    void run();
    const intervalId = setInterval(() => void run(), SCHEDULER_INTERVAL_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void run();
    });

    return () => {
      active = false;
      clearInterval(intervalId);
      subscription.remove();
    };
  }, [db]);

  return null;
}
