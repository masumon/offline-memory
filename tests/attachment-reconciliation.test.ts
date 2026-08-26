import type { SQLiteDatabase } from 'expo-sqlite';
import { Directory } from 'expo-file-system';
import { reconcileAttachmentStorage } from '../src/services/attachment-reconciliation-service';

jest.mock('expo-file-system', () => {
  class MockFile {
    uri: string;
    exists: boolean;
    delete = jest.fn();
    constructor(uri: string) {
      this.uri = uri;
      this.exists = uri.endsWith('valid.bin');
    }
  }
  const files = [
    new MockFile('file:///documents/attachments/valid.bin'),
    new MockFile('file:///documents/attachments/orphan.bin'),
  ];
  class MockDirectory {
    exists = true;
    list = jest.fn(() => files);
    constructor(..._parts: string[]) {}
  }
  return { File: MockFile, Directory: MockDirectory, Paths: { document: 'file:///documents' } };
});

describe('attachment reconciliation', () => {
  it('removes broken database rows and unreferenced files', async () => {
    const db = { getAllAsync: jest.fn().mockResolvedValue([{ id:'valid', uri:'file:///documents/attachments/valid.bin' },{ id:'missing', uri:'file:///documents/attachments/missing.bin' }]), runAsync: jest.fn().mockResolvedValue({ changes:1 }) } as unknown as SQLiteDatabase;
    const result = await reconcileAttachmentStorage(db);
    expect(result.removedDatabaseRows).toBe(1);
    expect(result.removedOrphanFiles).toBe(1);
    expect(db.runAsync).toHaveBeenCalledWith('DELETE FROM attachments WHERE id=?','missing');
    const orphan = (new Directory() as unknown as { list:()=>Array<{uri:string;delete:jest.Mock}> }).list()[1]!;
    expect(orphan.delete).toHaveBeenCalledTimes(1);
  });
});
