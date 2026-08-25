import type { SQLiteDatabase } from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { reconcileAttachmentStorage } from '../src/services/attachment-reconciliation-service';

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///documents/',
  readDirectoryAsync: jest.fn().mockResolvedValue(['orphan.bin']),
  getInfoAsync: jest.fn().mockImplementation(async (uri: string) => ({ exists: uri.endsWith('valid.bin') })),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
}));

describe('attachment reconciliation', () => {
  it('removes broken database rows and unreferenced files', async () => {
    const db = {
      getAllAsync: jest.fn().mockResolvedValue([
        { id: 'valid', uri: 'file:///documents/attachments/valid.bin' },
        { id: 'missing', uri: 'file:///documents/attachments/missing.bin' },
      ]),
      runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
    } as unknown as SQLiteDatabase;
    const result = await reconcileAttachmentStorage(db);
    expect(result.removedDatabaseRows).toBe(1);
    expect(result.removedOrphanFiles).toBe(1);
    expect(db.runAsync).toHaveBeenCalledWith('DELETE FROM attachments WHERE id=?', 'missing');
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file:///documents/attachments/orphan.bin', { idempotent: true });
  });
});
