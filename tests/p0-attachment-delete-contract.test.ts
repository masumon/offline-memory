import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(__dirname,'..');
const source=()=>fs.readFileSync(path.join(root,'src/services/attachment-service.ts'),'utf8');

describe('P0 attachment deletion safety',()=>{
  it('deletes attachment rows transactionally before best-effort physical cleanup',()=>{
    const value=source();
    const start=value.indexOf('export async function removeAttachmentsForOwner');
    const end=value.indexOf('export function getAvailableAttachmentStorage');
    const block=value.slice(start,end);
    expect(block).toContain('withTransactionAsync');
    expect(block.indexOf("DELETE FROM attachments")).toBeGreaterThan(-1);
    expect(block.indexOf("DELETE FROM attachments")).toBeLessThan(block.indexOf('deleteFile(item.uri)'));
  });
  it('keeps single attachment deletion database-first so failed DB mutations cannot orphan the database row',()=>{
    const value=source();
    const start=value.indexOf('export async function removeAttachment');
    const end=value.indexOf('export async function removeAttachmentsForOwner');
    const block=value.slice(start,end);
    expect(block.indexOf("DELETE FROM attachments")).toBeGreaterThan(-1);
    expect(block.indexOf("DELETE FROM attachments")).toBeLessThan(block.indexOf('deleteFile(attachment.uri)'));
  });
});
