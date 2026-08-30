import type { SQLiteDatabase } from 'expo-sqlite';
import { findMemories } from './memory-service';
import { semanticSearchMemories } from './semantic-memory-service';
import { searchTasks } from './task-service';
import type { Memory } from '../types/memory-model';
import type { Task } from '../types/task-model';

export interface UnifiedSearchResult {
  tasks: Task[];
  memories: Memory[];
}

// Hybrid memory retrieval: exact/keyword hits first (they also refresh last-accessed),
// then semantically-close notes the keyword pass would have missed — including
// cross-language matches (an English query finding a Bangla note, and vice-versa).
export async function searchAll(db: SQLiteDatabase, query: string): Promise<UnifiedSearchResult> {
  const value = query.trim();
  if (!value) return { tasks: [], memories: [] };
  const [tasks, lexical, semantic] = await Promise.all([
    searchTasks(db, value, 100),
    findMemories(db, value),
    semanticSearchMemories(db, value, 12).catch(() => []),
  ]);
  const seen = new Set(lexical.map((m) => m.id));
  const memories = [...lexical, ...semantic.filter((h) => !seen.has(h.memory.id)).map((h) => h.memory)];
  return { tasks, memories };
}
