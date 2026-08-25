import type { SQLiteDatabase } from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { listAttachments, type Attachment } from './attachment-service';

export type AttachmentReconciliationReport = { missingDatabaseFiles: string[]; orphanFiles: string[]; removedDatabaseRows: number; removedOrphanFiles: number };

export async function reconcileAttachmentStorage(db: SQLiteDatabase): Promise<AttachmentReconciliationReport> {
  const directory = FileSystem.documentDirectory;
  if (!directory) throw new Error('Local document storage is unavailable');
  const attachmentDirectory = `${directory}attachments/`;
  const report: AttachmentReconciliationReport = { missingDatabaseFiles: [], orphanFiles: [], removedDatabaseRows: 0, removedOrphanFiles: 0 };
  let files: string[] = [];
  try { files = await FileSystem.readDirectoryAsync(attachmentDirectory); } catch { return report; }
  const rows = await db.getAllAsync<{ id:string; uri:string }>('SELECT id, uri FROM attachments ORDER BY id ASC');
  const known = new Set<string>();
  for (const row of rows) {
    known.add(row.uri);
    try {
      const info = await FileSystem.getInfoAsync(row.uri);
      if (!info.exists) {
        report.missingDatabaseFiles.push(row.id);
        await db.runAsync('DELETE FROM attachments WHERE id=?', row.id);
        report.removedDatabaseRows += 1;
      }
    } catch {
      report.missingDatabaseFiles.push(row.id);
    }
  }
  for (const filename of files) {
    const uri = `${attachmentDirectory}${filename}`;
    if (known.has(uri)) continue;
    report.orphanFiles.push(uri);
    try { await FileSystem.deleteAsync(uri, { idempotent: true }); report.removedOrphanFiles += 1; } catch { /* leave inaccessible orphan for the next reconciliation */ }
  }
  return report;
}

export async function findBrokenAttachmentReferences(db: SQLiteDatabase): Promise<Attachment[]> {
  const owners = await db.getAllAsync<{ owner_type:'TASK'|'MEMORY'; owner_id:string; id:string; name:string; mime_type:string; size:number|null; uri:string; created_at:string }>('SELECT owner_type, owner_id, id, name, mime_type, size, uri, created_at FROM attachments ORDER BY created_at DESC');
  const broken: Attachment[] = [];
  for (const row of owners) {
    try { const info = await FileSystem.getInfoAsync(row.uri); if (!info.exists) broken.push({ id:row.id, ownerType:row.owner_type, ownerId:row.owner_id, name:row.name, mimeType:row.mime_type, size:row.size, uri:row.uri, createdAt:row.created_at }); } catch { broken.push({ id:row.id, ownerType:row.owner_type, ownerId:row.owner_id, name:row.name, mimeType:row.mime_type, size:row.size, uri:row.uri, createdAt:row.created_at }); }
  }
  return broken;
}
