import type { SQLiteDatabase } from 'expo-sqlite';

import type { CreateMemoryInput, Memory, UpdateMemoryInput } from '../types/memory-model';

const now = () => new Date().toISOString();
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

function normalizeTags(tags: string[] | undefined): string[] {
  return [...new Set((tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 30);
}

function rowToMemory(row: Record<string, unknown>): Memory {
  let tags: string[] = [];
  try {
    const parsed = JSON.parse(String(row.tags_json ?? '[]'));
    if (Array.isArray(parsed)) tags = parsed.filter((value): value is string => typeof value === 'string');
  } catch {
    tags = [];
  }
  return {
    id: String(row.id),
    title: row.title == null ? null : String(row.title),
    content: String(row.content),
    kind: row.kind as Memory['kind'],
    source: row.source as Memory['source'],
    tags,
    importance: Number(row.importance),
    archived: Number(row.archived) === 1,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    lastAccessedAt: row.last_accessed_at == null ? null : String(row.last_accessed_at),
  };
}

const SELECT = `SELECT id, title, content, kind, source, tags_json, importance, archived, created_at, updated_at, last_accessed_at FROM memories`;

export async function createMemory(db: SQLiteDatabase, input: CreateMemoryInput): Promise<Memory> {
  const content = input.content.trim();
  if (!content) throw new Error('Memory content is required');
  const importance = Math.min(5, Math.max(1, Math.round(input.importance ?? 3)));
  const timestamp = now();
  const id = makeId();
  await db.runAsync(
    `INSERT INTO memories (id, title, content, kind, source, tags_json, importance, archived, created_at, updated_at, last_accessed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, NULL)`,
    id,
    input.title?.trim() || null,
    content,
    input.kind ?? 'NOTE',
    input.source ?? 'USER',
    JSON.stringify(normalizeTags(input.tags)),
    importance,
    timestamp,
    timestamp,
  );
  return (await getMemory(db, id))!;
}

export async function getMemory(db: SQLiteDatabase, id: string): Promise<Memory | null> {
  const row = await db.getFirstAsync<Record<string, unknown>>(`${SELECT} WHERE id = ? LIMIT 1`, id);
  if (!row) return null;
  return rowToMemory(row);
}

export async function listMemories(db: SQLiteDatabase, includeArchived = false): Promise<Memory[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `${SELECT} WHERE archived = ? ORDER BY importance DESC, updated_at DESC`,
    includeArchived ? 1 : 0,
  );
  return rows.map(rowToMemory);
}

export async function updateMemory(db: SQLiteDatabase, id: string, input: UpdateMemoryInput): Promise<Memory | null> {
  const current = await getMemory(db, id);
  if (!current) return null;
  const timestamp = now();
  await db.runAsync(
    `UPDATE memories SET title = ?, content = ?, kind = ?, tags_json = ?, importance = ?, archived = ?, updated_at = ? WHERE id = ?`,
    input.title === undefined ? current.title : input.title?.trim() || null,
    input.content === undefined ? current.content : input.content.trim(),
    input.kind ?? current.kind,
    JSON.stringify(normalizeTags(input.tags ?? current.tags)),
    Math.min(5, Math.max(1, Math.round(input.importance ?? current.importance))),
    input.archived === undefined ? Number(current.archived) : Number(input.archived),
    timestamp,
    id,
  );
  return getMemory(db, id);
}

export async function archiveMemory(db: SQLiteDatabase, id: string): Promise<Memory | null> {
  return updateMemory(db, id, { archived: true });
}

export async function deleteMemory(db: SQLiteDatabase, id: string): Promise<boolean> {
  const result = await db.runAsync('DELETE FROM memories WHERE id = ?', id);
  return result.changes > 0;
}

export async function touchMemory(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('UPDATE memories SET last_accessed_at = ?, updated_at = updated_at WHERE id = ?', now(), id);
}

export async function searchMemories(db: SQLiteDatabase, query: string, matchAll = true): Promise<Memory[]> {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean).slice(0, 8);
  if (terms.length === 0) return listMemories(db);
  const clauses = terms.map(() => '(lower(content) LIKE ? OR lower(COALESCE(title, "")) LIKE ? OR lower(tags_json) LIKE ?)');
  const joiner = matchAll ? ' AND ' : ' OR ';
  const args = terms.flatMap((term) => [`%${term}%`, `%${term}%`, `%${term}%`]);
  const rows = await db.getAllAsync<Record<string, unknown>>(`${SELECT} WHERE archived = 0 AND (${clauses.join(joiner)}) ORDER BY importance DESC, updated_at DESC`, ...args);
  return rows.map(rowToMemory);
}
