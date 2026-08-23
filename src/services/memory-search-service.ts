import type { SQLiteDatabase } from 'expo-sqlite';
import { searchMemories } from './memory-repository';
import type { Memory } from '../types/memory-model';

export interface RankedMemory extends Memory {
  relevance: number;
}

function tokenize(value: string): string[] {
  return value.toLocaleLowerCase().split(/\s+/u).map((token) => token.trim()).filter(Boolean).slice(0, 12);
}

/** Deterministic local ranking; no network or external model is involved. */
export async function searchRankedMemories(db: SQLiteDatabase, query: string): Promise<RankedMemory[]> {
  const normalized = query.trim();
  if (!normalized) return [];

  const terms = tokenize(normalized);
  const memories = await searchMemories(db, normalized);

  return memories
    .map((memory) => {
      const title = tokenize(memory.title ?? '');
      const content = tokenize(memory.content);
      const tags = tokenize(memory.tags.join(' '));
      const matched = terms.filter((term) => title.includes(term) || content.includes(term) || tags.includes(term));
      const exactPhrase = `${memory.title ?? ''} ${memory.content}`.toLocaleLowerCase().includes(normalized.toLocaleLowerCase());
      const relevance = matched.length / Math.max(terms.length, 1) + (exactPhrase ? 1 : 0) + memory.importance * 0.05;
      return { ...memory, relevance };
    })
    .sort((a, b) => b.relevance - a.relevance || b.updatedAt.localeCompare(a.updatedAt));
}
