import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { M7BackupDocument } from './m7-format';
import { parseM7BackupDocument } from './m7-format';

const BACKUP_MIME = 'application/json';
const BACKUP_PREFIX = 'offline-memory-backup-';

export async function writeBackupFile(document: M7BackupDocument): Promise<string> {
  const filename = `${BACKUP_PREFIX}${document.createdAt.replace(/[:.]/g, '-')}.json`;
  const uri = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(document, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return uri;
}

export async function shareBackupFile(uri: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('File sharing is unavailable on this device');
  await Sharing.shareAsync(uri, { mimeType: BACKUP_MIME, dialogTitle: 'Share Offline Memory backup' });
}

export async function pickBackupFile(): Promise<M7BackupDocument | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [BACKUP_MIME, 'text/json', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const uri = result.assets[0]?.uri;
  if (!uri) throw new Error('Selected backup file has no URI');
  const contents = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
  return parseM7BackupDocument(JSON.parse(contents));
}
