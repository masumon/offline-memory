import type { SQLiteDatabase } from 'expo-sqlite';
import { findMemories } from './memory-service';
import { searchTasks } from './task-service';
import type { Memory } from '../types/memory-model';
import type { Task } from '../types/task-model';

export interface UnifiedSearchResult {
  tasks: Task[];
  memories: Memory[];
}

export async function searchAll(db: SQLiteDatabase, query: string): Promise<UnifiedSearchResult> {
  const value = query.trim();
  if (!value) return { tasks: [], memories: [] };
  const [tasks, memories] = await Promise.all([searchTasks(db, value, 100), findMemories(db, value)]);
  return { tasks, memories };
}
