import type { SQLiteDatabase } from 'expo-sqlite';

import {
  archiveMemory,
  createMemory,
  deleteMemory,
  getMemory,
  listMemories,
  searchMemories,
  touchMemory,
  updateMemory,
} from './memory-repository';
import type { CreateMemoryInput, Memory, UpdateMemoryInput } from '../types/memory-model';

export async function addMemory(db: SQLiteDatabase, input: CreateMemoryInput): Promise<Memory> {
  return createMemory(db, input);
}

export async function editMemory(db: SQLiteDatabase, id: string, input: UpdateMemoryInput): Promise<Memory | null> {
  if (input.content !== undefined && !input.content.trim()) throw new Error('Memory content is required');
  return updateMemory(db, id, input);
}

export async function readMemory(db: SQLiteDatabase, id: string): Promise<Memory | null> {
  const memory = await getMemory(db, id);
  if (memory && !memory.archived) await touchMemory(db, id);
  return memory;
}

export async function findMemories(db: SQLiteDatabase, query: string): Promise<Memory[]> {
  return searchMemories(db, query);
}

export async function archiveStoredMemory(db: SQLiteDatabase, id: string): Promise<Memory | null> {
  return archiveMemory(db, id);
}

export async function removeMemory(db: SQLiteDatabase, id: string): Promise<boolean> {
  return deleteMemory(db, id);
}

export async function getActiveMemories(db: SQLiteDatabase): Promise<Memory[]> {
  return listMemories(db, false);
}
