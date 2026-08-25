export const M7_BACKUP_VERSION = 1 as const;
export const BACKUP_V2_VERSION = 2 as const;

export interface M7BackupDocument {
  format: 'offline-memory-backup';
  version: typeof M7_BACKUP_VERSION;
  createdAt: string;
  data: Record<string, unknown>;
}

export interface AttachmentBackupEntry {
  id: string;
  owner_type: 'TASK' | 'MEMORY';
  owner_id: string;
  name: string;
  mime_type: string;
  size: number | null;
  created_at: string;
  base64: string;
}

export interface BackupV2Document {
  format: 'offline-memory-backup';
  version: typeof BACKUP_V2_VERSION;
  createdAt: string;
  data: Record<string, unknown> & {
    attachments: Array<Omit<AttachmentBackupEntry, 'base64'>>;
    attachmentBinaries: Array<AttachmentBackupEntry>;
  };
}

export type BackupDocument = M7BackupDocument | BackupV2Document;

export function createM7BackupDocument(data: Record<string, unknown>, createdAt = new Date().toISOString()): M7BackupDocument {
  if (!Number.isFinite(Date.parse(createdAt))) throw new Error('Backup createdAt must be a valid ISO date');
  return { format: 'offline-memory-backup', version: M7_BACKUP_VERSION, createdAt, data };
}

export function createBackupV2Document(data: BackupV2Document['data'], createdAt = new Date().toISOString()): BackupV2Document {
  if (!Number.isFinite(Date.parse(createdAt))) throw new Error('Backup createdAt must be a valid ISO date');
  return { format: 'offline-memory-backup', version: BACKUP_V2_VERSION, createdAt, data };
}

export function parseM7BackupDocument(input: unknown): BackupDocument {
  if (!input || typeof input !== 'object') throw new Error('Backup must be an object');
  const value = input as Record<string, unknown>;
  if (value.format !== 'offline-memory-backup') throw new Error('Unsupported backup format');
  if (value.version !== M7_BACKUP_VERSION && value.version !== BACKUP_V2_VERSION) throw new Error('Unsupported backup version');
  const createdAt = value.createdAt ?? value.exportedAt;
  if (typeof createdAt !== 'string' || !Number.isFinite(Date.parse(createdAt))) throw new Error('Backup createdAt must be a valid ISO date');
  if (!value.data || typeof value.data !== 'object' || Array.isArray(value.data)) throw new Error('Backup data must be an object');
  return { ...value, createdAt } as BackupDocument;
}
