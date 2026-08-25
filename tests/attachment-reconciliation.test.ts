import type { SQLiteDatabase } from 'expo-sqlite';
import { Directory } from 'expo-file-system';
import { reconcileAttachmentStorage } from '../src/services/attachment-reconciliation-service';

jest.mock('expo-file-system', () => {
  const files = [
    Object.assign({ uri: 'file:///documents/attachments/valid.bin', exists: true }, { delete: jest.fn() }),
    Object.assign({ uri: 'file:///documents/attachments/orphan.bin', exists: true }, { delete: jest.fn() }),
  ];
  class MockFile { uri:string; exists:boolean; delete=jest.fn(); constructor(uri:string){this.uri=uri;this.exists=uri.endsWith('valid.bin');} }
  class MockDirectory { exists=true; list=jest.fn(()=>files); constructor(..._parts:string[]){} }
  return { File: MockFile, Directory: MockDirectory, Paths: { document: {} } };
});

describe('attachment reconciliation', () => {
  it('removes broken database rows and unreferenced files', async () => {
    const db = { getAllAsync: jest.fn().mockResolvedValue([{ id:'valid', uri:'file:///documents/attachments/valid.bin' },{ id:'missing', uri:'file:///documents/attachments/missing.bin' }]), runAsync: jest.fn().mockResolvedValue({ changes:1 }) } as unknown as SQLiteDatabase;
    const result = await reconcileAttachmentStorage(db);
    expect(result.removedDatabaseRows).toBe(1);
    expect(result.removedOrphanFiles).toBe(1);
    expect(db.runAsync).toHaveBeenCalledWith('DELETE FROM attachments WHERE id=?','missing');
    const orphan = (new Directory() as unknown as { list:()=>Array<{uri:string;delete:jest.Mock}> }).list()[1];
    expect(orphan.delete).toHaveBeenCalledTimes(1);
  });
});
