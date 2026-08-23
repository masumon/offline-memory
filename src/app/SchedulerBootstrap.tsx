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
