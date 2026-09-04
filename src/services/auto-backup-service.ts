import { Directory, File, Paths } from 'expo-file-system';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import type { SQLiteDatabase } from 'expo-sqlite';
import { bytesToBase64, createBackupArchive } from './backup-archive-service';

// Opt-in weekly safety net: once a week (checked on launch) write a full archive. Always
// keeps a rolling few copies in the app's private document dir (survives an in-app
// mishap, pairs with Trash). If the user has picked a folder via the system picker, a
// copy also lands there — that one survives an uninstall / can be moved to a PC.
// Auto copies use their own filename prefix so pruning never touches a manual backup or
// any other file in the chosen folder.

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const KEEP = 3;
const AUTO_PREFIX = 'offline-memory-autobackup-';
export const LAST_AUTO_BACKUP_KEY = 'lastAutoBackupAt';

export type AutoBackupResult = { ran: boolean; folderWritten: boolean; folderError?: string };

export async function runAutoBackup(db: SQLiteDatabase, folderUri: string | null = null, opts: { force?: boolean; now?: number } = {}): Promise<AutoBackupResult> {
  const now = opts.now ?? Date.now();
  try {
    if (!opts.force) {
      const row = await db.getFirstAsync<{ value: string }>(
        `SELECT value FROM app_preferences WHERE key = '${LAST_AUTO_BACKUP_KEY}'`,
      );
      const last = row ? Date.parse(row.value) : NaN;
      if (Number.isFinite(last) && now - last < WEEK_MS) return { ran: false, folderWritten: false };
    }

    const archive = await createBackupArchive(db);
    const stamp = archive.createdAt.replace(/[:.]/gu, '-');
    const name = `${AUTO_PREFIX}${stamp}.zip`;

    // 1. Private rolling copy (always).
    const file = new File(Paths.document, name);
    file.create({ intermediates: true, overwrite: true });
    file.write(archive.bytes);
    prunePrivate();

    // 2. Chosen-folder copy (best-effort — never fail the whole run if the folder is gone).
    let folderWritten = false;
    let folderError: string | undefined;
    if (folderUri) {
      try {
        const b64 = bytesToBase64(archive.bytes);
        const fileUri = await StorageAccessFramework.createFileAsync(folderUri, `${AUTO_PREFIX}${stamp}`, 'application/zip');
        await StorageAccessFramework.writeAsStringAsync(fileUri, b64, { encoding: 'base64' });
        folderWritten = true;
        await pruneFolder(folderUri);
      } catch (e) {
        folderError = e instanceof Error ? e.message : String(e);
      }
    }

    await db.runAsync(
      `INSERT INTO app_preferences (key, value) VALUES ('${LAST_AUTO_BACKUP_KEY}', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      new Date(now).toISOString(),
    );
    return { ran: true, folderWritten, folderError };
  } catch (e) {
    return { ran: false, folderWritten: false, folderError: e instanceof Error ? e.message : undefined };
  }
}

function prunePrivate(): void {
  try {
    const entries = new Directory(Paths.document)
      .list()
      .filter((e): e is File => e instanceof File && e.name.startsWith(AUTO_PREFIX));
    entries.sort((a, b) => (a.name < b.name ? 1 : -1)); // name embeds an ISO stamp → reverse = newest first
    for (const stale of entries.slice(KEEP)) {
      try { stale.delete(); } catch { /* ignore a locked/removed file */ }
    }
  } catch { /* directory listing is best-effort */ }
}

async function pruneFolder(folderUri: string): Promise<void> {
  try {
    // readDirectoryAsync returns content:// URIs whose last segment is the URL-encoded
    // display name — match on our own prefix only, so nothing else in the folder is touched.
    const uris = await StorageAccessFramework.readDirectoryAsync(folderUri);
    const mine = uris.filter((u) => decodeURIComponent(u).includes(AUTO_PREFIX)).sort().reverse();
    for (const stale of mine.slice(KEEP)) {
      try { await StorageAccessFramework.deleteAsync(stale); } catch { /* ignore */ }
    }
  } catch { /* listing unsupported on some OEMs — leave the folder alone */ }
}
