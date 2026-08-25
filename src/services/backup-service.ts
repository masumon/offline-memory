import type { SQLiteDatabase } from 'expo-sqlite';
import { File } from 'expo-file-system';
import { BACKUP_V2_VERSION, createBackupV2Document, createM7BackupDocument, M7_BACKUP_VERSION, type BackupDocument, type M7BackupDocument } from '../backup/m7-format';
import { readSQLiteBackupData } from '../backup/sqlite-reader';

export const BACKUP_FORMAT_VERSION = BACKUP_V2_VERSION;
export const LEGACY_BACKUP_FORMAT_VERSION = M7_BACKUP_VERSION;
export type { BackupDocument, M7BackupDocument };

export async function createBackupDocument(
  db: SQLiteDatabase,
  readData?: (db: SQLiteDatabase) => Promise<Record<string, unknown>>,
  exportedAt = new Date().toISOString(),
): Promise<BackupDocument> {
  const data = await (readData ? readData(db) : readSQLiteBackupData(db) as unknown as Promise<Record<string, unknown>>);
  if (readData) return createM7BackupDocument(data, exportedAt);

  const attachments = Array.isArray(data.attachments) ? data.attachments as Array<Record<string, unknown>> : [];
  const manifest = attachments.map(({ uri: _uri, ...entry }) => entry) as Array<{
    id: string; owner_type: 'TASK' | 'MEMORY'; owner_id: string; name: string; mime_type: string; size: number | null; created_at: string;
  }>;
  const attachmentBinaries = [] as Array<typeof manifest[number] & { base64: string }>;
  for (const attachment of attachments) {
    const uri = attachment.uri;
    if (typeof uri !== 'string' || !uri) throw new Error(`Attachment ${String(attachment.id)} has no valid file URI`);
    const base64 = await new File(uri).base64();
    attachmentBinaries.push({
      id: String(attachment.id), owner_type: attachment.owner_type as 'TASK' | 'MEMORY', owner_id: String(attachment.owner_id),
      name: String(attachment.name), mime_type: String(attachment.mime_type), size: attachment.size === null || attachment.size === undefined ? null : Number(attachment.size),
      created_at: String(attachment.created_at), base64,
    });
  }
  return createBackupV2Document({ ...data, attachments: manifest, attachmentBinaries }, exportedAt);
}
