import type { SQLiteDatabase } from 'expo-sqlite';
import { create } from 'zustand';
import { addTask, completeTask, editTask, listTasks, removeTask } from '../services/task-service';
import { runNotificationScheduler } from '../services/scheduler-runner';
import { recordFrequentTask, recordTimePattern } from '../services/learning-service';
import { bumpStreak } from '../services/streak-service';
import type { CreateTaskInput, Task, UpdateTaskInput } from '../types/task-model';

// Reminders must exist the moment a dated task is saved — not only on the next app
// launch or 15-min tick. Best-effort and non-blocking; the scheduler itself is idempotent.
function syncRemindersIfDated(db: SQLiteDatabase, task: Task | null) {
  if (task?.dueAt && new Date(task.dueAt).getTime() > Date.now()) {
    void runNotificationScheduler(db).catch(() => {});
  }
}

// Feed the on-device learning layer so capture gets smarter (time-of-day habits,
// frequent-task chips). Fire-and-forget; never blocks or throws.
function learnFromTask(db: SQLiteDatabase, task: Task | null) {
  if (!task) return;
  void recordFrequentTask(db, task.title).catch(() => {});
  if (task.dueAt) {
    const d = new Date(task.dueAt);
    if (!Number.isNaN(d.getTime())) void recordTimePattern(db, task.title, d.getHours() * 60 + d.getMinutes()).catch(() => {});
  }
}

interface TaskStore {
  tasks: Task[]; isLoading: boolean; error: string | null;
  load: (db: SQLiteDatabase) => Promise<void>;
  create: (db: SQLiteDatabase, input: CreateTaskInput) => Promise<Task | null>;
  update: (db: SQLiteDatabase, id: string, input: UpdateTaskInput) => Promise<Task | null>;
  complete: (db: SQLiteDatabase, id: string) => Promise<Task | null>;
  remove: (db: SQLiteDatabase, id: string) => Promise<boolean>;
  clearError: () => void;
}

const STORE_LOAD_LIMIT = 500;

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [], isLoading: false, error: null,
  load: async (db) => { set({ isLoading: true, error: null }); try { set({ tasks: await listTasks(db, { limit: STORE_LOAD_LIMIT }), isLoading: false }); } catch (error) { set({ isLoading: false, error: error instanceof Error ? error.message : 'Unable to load tasks' }); } },
  create: async (db, input) => { set({ error: null }); try { const task = await addTask(db, input); set((state) => ({ tasks: [task, ...state.tasks.filter((item) => item.id !== task.id)] })); syncRemindersIfDated(db, task); learnFromTask(db, task); return task; } catch (error) { set({ error: error instanceof Error ? error.message : 'Unable to create task' }); return null; } },
  update: async (db, id, input) => { set({ error: null }); try { const task = await editTask(db, id, input); if (task) set((state) => ({ tasks: task.status === 'ARCHIVED' ? state.tasks.filter((item) => item.id !== id) : state.tasks.map((item) => item.id === id ? task : item) })); syncRemindersIfDated(db, task); return task; } catch (error) { set({ error: error instanceof Error ? error.message : 'Unable to update task' }); return null; } },
  complete: async (db, id) => { set({ error: null }); try { const task = await completeTask(db, id); if (task) { set((state) => ({ tasks: state.tasks.map((item) => item.id === id ? task : item) })); void bumpStreak(db).catch(() => {}); } return task; } catch (error) { set({ error: error instanceof Error ? error.message : 'Unable to complete task' }); return null; } },
  remove: async (db, id) => { set({ error: null }); try { const removed = await removeTask(db, id); if (removed) set((state) => ({ tasks: state.tasks.filter((item) => item.id !== id) })); return removed; } catch (error) { set({ error: error instanceof Error ? error.message : 'Unable to delete task' }); return false; } },
  clearError: () => set({ error: null }),
}));
