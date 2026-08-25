jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///documents/',
  makeDirectoryAsync: jest.fn(),
  copyAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { addAttachments, removeAttachmentsForOwner, type Attachment } from '../src/services/attachment-service';

const getDocumentAsync = DocumentPicker.getDocumentAsync as jest.Mock;
const makeDirectoryAsync = FileSystem.makeDirectoryAsync as jest.Mock;
const copyAsync = FileSystem.copyAsync as jest.Mock;
const deleteAsync = FileSystem.deleteAsync as jest.Mock;

type FakeDb = {
  getFirstAsync: jest.Mock;
  getAllAsync: jest.Mock;
  runAsync: jest.Mock;
  execAsync: jest.Mock;
};

function createDb(): FakeDb {
  return {
    getFirstAsync: jest.fn().mockResolvedValue({ id: 'owner-1' }),
    getAllAsync: jest.fn().mockResolvedValue([]),
    runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
    execAsync: jest.fn().mockResolvedValue(undefined),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  makeDirectoryAsync.mockResolvedValue(undefined);
  copyAsync.mockResolvedValue(undefined);
  deleteAsync.mockResolvedValue(undefined);
});

describe('attachment lifecycle safety', () => {
  it('copies every selected file before inserting metadata', async () => {
    const db = createDb();
    getDocumentAsync.mockResolvedValue({ canceled: false, assets: [
      { name: 'photo.jpg', uri: 'picker://photo', mimeType: 'image/jpeg', size: 10 },
      { name: 'notes.pdf', uri: 'picker://notes', mimeType: 'application/pdf', size: 20 },
    ] });

    const created = await addAttachments(db as never, 'TASK', 'owner-1');

    expect(created).toHaveLength(2);
    expect(copyAsync).toHaveBeenCalledTimes(2);
    expect(db.execAsync).toHaveBeenCalledWith('BEGIN IMMEDIATE TRANSACTION;');
    expect(db.execAsync).toHaveBeenCalledWith('COMMIT;');
    expect(db.runAsync).toHaveBeenCalledTimes(2);
    expect(deleteAsync).not.toHaveBeenCalled();
  });

  it('removes copied files and writes no metadata when copying fails', async () => {
    const db = createDb();
    getDocumentAsync.mockResolvedValue({ canceled: false, assets: [
      { name: 'first.txt', uri: 'picker://first', mimeType: 'text/plain', size: 10 },
      { name: 'second.txt', uri: 'picker://second', mimeType: 'text/plain', size: 20 },
    ] });
    copyAsync.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('copy failed'));

    await expect(addAttachments(db as never, 'TASK', 'owner-1')).rejects.toThrow('copy failed');
    expect(deleteAsync).toHaveBeenCalledTimes(1);
    expect(db.runAsync).not.toHaveBeenCalled();
  });

  it('rolls back metadata and removes copied files when the database insert fails', async () => {
    const db = createDb();
    getDocumentAsync.mockResolvedValue({ canceled: false, assets: [
      { name: 'notes.txt', uri: 'picker://notes', mimeType: 'text/plain', size: 10 },
    ] });
    db.runAsync.mockRejectedValueOnce(new Error('insert failed'));

    await expect(addAttachments(db as never, 'TASK', 'owner-1')).rejects.toThrow('insert failed');
    expect(db.execAsync).toHaveBeenCalledWith('ROLLBACK;');
    expect(deleteAsync).toHaveBeenCalledTimes(1);
  });

  it('deletes attachment files before deleting their metadata', async () => {
    const db = createDb();
    const item: Attachment = {
      id: 'attachment-1', ownerType: 'MEMORY', ownerId: 'owner-1', name: 'photo.jpg',
      mimeType: 'image/jpeg', size: 10, uri: 'file:///documents/photo.jpg', createdAt: '2026-08-25T00:00:00.000Z',
    };
    db.getAllAsync.mockResolvedValue([{
      id: item.id, owner_type: item.ownerType, owner_id: item.ownerId, name: item.name,
      mime_type: item.mimeType, size: item.size, uri: item.uri, created_at: item.createdAt,
    }]);

    const removed = await removeAttachmentsForOwner(db as never, 'MEMORY', 'owner-1');

    expect(removed).toBe(1);
    expect(deleteAsync).toHaveBeenCalledWith(item.uri, { idempotent: true });
    expect(db.runAsync).toHaveBeenCalledWith('DELETE FROM attachments WHERE owner_type=? AND owner_id=?', 'MEMORY', 'owner-1');
  });
});
