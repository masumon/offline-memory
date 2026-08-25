import type { SQLiteDatabase } from 'expo-sqlite';
import { zipSync } from 'fflate';
import * as FileSystem from 'expo-file-system/legacy';
import { readSQLiteBackupData } from '../backup/sqlite-reader';

export const BACKUP_ARCHIVE_FORMAT = 'offline-memory-backup-archive' as const;
export const BACKUP_ARCHIVE_VERSION = 2 as const;

type AttachmentOwner = 'TASK' | 'MEMORY';
export interface BackupArchiveAttachment {
  id: string;
  ownerType: AttachmentOwner;
  ownerId: string;
  name: string;
  mimeType: string;
  size: number | null;
  createdAt: string;
}

export interface BackupArchiveManifest {
  format: typeof BACKUP_ARCHIVE_FORMAT;
  version: typeof BACKUP_ARCHIVE_VERSION;
  createdAt: string;
  data: Record<string, unknown>;
  attachments: BackupArchiveAttachment[];
}

export interface BackupArchiveResult {
  bytes: Uint8Array;
  createdAt: string;
  attachmentCount: number;
}

type AttachmentRow = {
  id: string;
  owner_type: AttachmentOwner;
  owner_id: string;
  name: string;
  mime_type: string;
  size: number | null;
  uri: string;
  created_at: string;
};

function base64ToBytes(value: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = value.replace(/\s/gu, '');
  if (clean.length % 4 !== 0 || /[^A-Za-z0-9+/=]/u.test(clean)) throw new Error('Invalid attachment data');
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const output = new Uint8Array((clean.length / 4) * 3 - padding);
  let outputIndex = 0;
  for (let index = 0; index < clean.length; index += 4) {
    const a = alphabet.indexOf(clean[index]);
    const b = alphabet.indexOf(clean[index + 1]);
    const c = clean[index + 2] === '=' ? 0 : alphabet.indexOf(clean[index + 2]);
    const d = clean[index + 3] === '=' ? 0 : alphabet.indexOf(clean[index + 3]);
    if (a < 0 || b < 0 || c < 0 || d < 0) throw new Error('Invalid attachment data');
    const chunk = (a << 18) | (b << 12) | (c << 6) | d;
    if (outputIndex < output.length) output[outputIndex++] = (chunk >>> 16) & 0xff;
    if (outputIndex < output.length) output[outputIndex++] = (chunk >>> 8) & 0xff;
    if (outputIndex < output.length) output[outputIndex++] = chunk & 0xff;
  }
  return output;
}

function bytesToBase64(value: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let index = 0; index < value.length; index += 3) {
    const a = value[index];
    const hasB = index + 1 < value.length;
    const hasC = index + 2 < value.length;
    const b = hasB ? value[index + 1] : 0;
    const c = hasC ? value[index + 2] : 0;
    const chunk = (a << 16) | (b << 8) | c;
    output += alphabet[(chunk >>> 18) & 63];
    output += alphabet[(chunk >>> 12) & 63];
    output += hasB ? alphabet[(chunk >>> 6) & 63] : '=';
    output += hasC ? alphabet[chunk & 63] : '=';
  }
  return output;
}

function manifestJson(manifest: BackupArchiveManifest): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(manifest));
}

export async function createBackupArchive(db: SQLiteDatabase, createdAt = new Date().toISOString()): Promise<BackupArchiveResult> {
  if (!Number.isFinite(Date.parse(createdAt))) throw new Error('Backup createdAt must be a valid ISO date');
  const data = await readSQLiteBackupData(db) as unknown as Record<string, unknown>;
  const attachments = await db.getAllAsync<AttachmentRow>('SELECT id,owner_type,owner_id,name,mime_type,size,uri,created_at FROM attachments ORDER BY id ASC');
  const taskIds = new Set((data.tasks as Array<Record<string, unknown>>).map((row) => String(row.id)));
  const memoryIds = new Set((data.memories as Array<Record<string, unknown>>).map((row) => String(row.id)));
  const files: Record<string, Uint8Array | [Uint8Array, { level: number }]> = {};
  const metadata: BackupArchiveAttachment[] = [];

  for (const attachment of attachments) {
    if (attachment.owner_type === 'TASK' ? !taskIds.has(attachment.owner_id) : !memoryIds.has(attachment.owner_id)) {
      throw new Error(`Attachment references missing ${attachment.owner_type.toLowerCase()}: ${attachment.owner_id}`);
    }
    const base64 = await FileSystem.readAsStringAsync(attachment.uri, { encoding: FileSystem.EncodingType.Base64 });
    const bytes = base64ToBytes(base64);
    if (attachment.size !== null && bytes.byteLength !== attachment.size) throw new Error(`Attachment size mismatch: ${attachment.id}`);
    metadata.push({ id: attachment.id, ownerType: attachment.owner_type, ownerId: attachment.owner_id, name: attachment.name, mimeType: attachment.mime_type, size: attachment.size, createdAt: attachment.created_at });
    files[`attachments/${attachment.id}`] = [bytes, { level: 0 }];
  }

  const manifest: BackupArchiveManifest = { format: BACKUP_ARCHIVE_FORMAT, version: BACKUP_ARCHIVE_VERSION, createdAt, data, attachments: metadata };
  files['manifest.json'] = [manifestJson(manifest), { level: 6 }];
  const bytes = zipSync(files);
  return { bytes, createdAt, attachmentCount: metadata.length };
}

export function encodeBackupArchive(bytes: Uint8Array): string { return bytesToBase64(bytes); }
