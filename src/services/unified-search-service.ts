import type { SQLiteDatabase } from 'expo-sqlite';
import { findMemories } from './memory-service';
import { listTasks } from './task-service';
import type { Memory } from '../types/memory-model';
import type { Task } from '../types/task-model';

export interface UnifiedSearchResult {
  tasks: Task[];
  memories: Memory[];
}

export async function searchAll(db: SQLiteDatabase, query: string): Promise<UnifiedSearchResult> {
  const value = query.trim();
  if (!value) return { tasks: [], memories: [] };
  const needle = value.toLocaleLowerCase();
  const [tasks, memories] = await Promise.all([listTasks(db), findMemories(db, value)]);
  return {
    tasks: tasks.filter((task) => task.title.toLocaleLowerCase().includes(needle) || task.notes?.toLocaleLowerCase().includes(needle)),
    memories,
  };
}
