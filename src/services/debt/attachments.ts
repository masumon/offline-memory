// Attachments for debt accounts and ledger rows (spec §80) — receipts, agreements,
// photos of a written note. Same storage shape as the task/memory attachments: the
// picked file is copied into the app's own document directory (the picker's cache copy
// is not durable) and only the metadata lives in `dr_attachments`.

import type { SQLiteDatabase } from 'expo-sqlite';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export type DebtAttachmentOwner = 'ACCOUNT' | 'TRANSACTION';

export interface DebtAttachment {
  id: string;
  ownerType: DebtAttachmentOwner;
  ownerId: string;
  name: string;
  mimeType: string;
  size: number | null;
  uri: string;
  createdAt: string;
}

interface Row {
  id: string; owner_type: string; owner_id: string; name: string;
  mime_type: string; size: number | null; uri: string; created_at: string;
}

const toAttachment = (r: Row): DebtAttachment => ({
  id: r.id, ownerType: r.owner_type as DebtAttachmentOwner, ownerId: r.owner_id, name: r.name,
  mimeType: r.mime_type, size: r.size, uri: r.uri, createdAt: r.created_at,
});

const safeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]+/gu, '_').slice(0, 160) || 'file';
const newId = () => `dra_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const attachmentDirectory = () => new Directory(Paths.document, 'attachments');

export async function listDebtAttachments(db: SQLiteDatabase, ownerType: DebtAttachmentOwner, ownerId: string): Promise<DebtAttachment[]> {
  const rows = await db.getAllAsync<Row>(
    'SELECT id, owner_type, owner_id, name, mime_type, size, uri, created_at FROM dr_attachments WHERE owner_type = ? AND owner_id = ? ORDER BY created_at DESC',
    ownerType, ownerId,
  );
  return rows.map(toAttachment);
}

/**
 * Pick one or more files and attach them. Copies first, then writes the rows — a
 * failed copy leaves no dangling row, and a failed insert cleans up the copies.
 */
export async function addDebtAttachments(db: SQLiteDatabase, ownerType: DebtAttachmentOwner, ownerId: string): Promise<DebtAttachment[]> {
  const picked = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: true, copyToCacheDirectory: true });
  if (picked.canceled || !picked.assets?.length) return [];

  const directory = attachmentDirectory();
  directory.create({ intermediates: true, idempotent: true });

  const copied: DebtAttachment[] = [];
  try {
    for (const asset of picked.assets) {
      const id = newId();
      const destination = new File(directory, `${id}-${safeName(asset.name)}`);
      new File(asset.uri).copy(destination);
      copied.push({
        id, ownerType, ownerId, name: asset.name,
        mimeType: asset.mimeType ?? 'application/octet-stream',
        size: asset.size ?? null, uri: destination.uri, createdAt: new Date().toISOString(),
      });
    }
    for (const a of copied) {
      await db.runAsync(
        'INSERT INTO dr_attachments (id, owner_type, owner_id, name, mime_type, size, uri, created_at) VALUES (?,?,?,?,?,?,?,?)',
        a.id, a.ownerType, a.ownerId, a.name, a.mimeType, a.size, a.uri, a.createdAt,
      );
    }
    return copied;
  } catch (e) {
    for (const a of copied) { try { const f = new File(a.uri); if (f.exists) f.delete(); } catch { /* best-effort */ } }
    throw e;
  }
}

export async function removeDebtAttachment(db: SQLiteDatabase, id: string): Promise<void> {
  const row = await db.getFirstAsync<{ uri: string }>('SELECT uri FROM dr_attachments WHERE id = ?', id);
  await db.runAsync('DELETE FROM dr_attachments WHERE id = ?', id);
  if (row?.uri) {
    try { const f = new File(row.uri); if (f.exists) f.delete(); } catch { /* the row is gone either way */ }
  }
}

/** Hand the file to the OS so the viewer/editor the user already has can open it. */
export async function openDebtAttachment(uri: string, mimeType: string): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(uri, { mimeType });
  return true;
}

export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
