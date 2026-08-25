import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(__dirname,'..');
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('P0 surgical audit contracts',()=>{
  it('keeps task and memory deletion coupled to attachment cleanup',()=>{
    expect(read('src/services/task-repository.ts')).toContain("removeAttachmentsForOwner(db, 'TASK', id)");
    expect(read('src/services/memory-repository.ts')).toContain("removeAttachmentsForOwner(db, 'MEMORY', id)");
  });
  it('keeps attachment insertion transactional and cleans copied files on failure',()=>{
    const source=read('src/services/attachment-service.ts');
    expect(source).toContain('withTransaction');
    expect(source).toContain('copiedPaths');
    expect(source).toContain('for (const path of copiedPaths)');
  });
  it('keeps attachment storage reconciliation available for diagnostics',()=>{
    expect(read('src/services/attachment-reconciliation-service.ts')).toContain('reconcileAttachmentStorage');
    expect(read('app/diagnostics.tsx')).toContain('reconcileAttachmentStorage');
  });
  it('keeps backup archive attachment manifest and binary payload contracts',()=>{
    const archive=read('src/services/backup-archive-service.ts');
    const restore=read('src/services/backup-restore-archive-service.ts');
    expect(archive).toContain('attachments');
    expect(archive).toContain('base64');
    expect(restore).toContain('attachments');
    expect(restore).toContain('base64');
  });
  it('keeps backup/restore archive validation strict',()=>{
    const archive=read('src/services/backup-archive-service.ts');
    const restore=read('src/services/backup-restore-archive-service.ts');
    expect(archive).toContain('Unsupported backup format');
    expect(restore).toContain('Attachment payload size mismatch');
  });
  it('keeps restore staging isolated from live attachment files',()=>{
    const restore=read('src/services/backup-restore-archive-service.ts');
    expect(restore).toContain('staging');
    expect(restore).toContain('cleanup');
  });
  it('does not retain the known Slot descendant array-style regression pattern',()=>{
    for(const file of ['app/index.tsx','app/search.tsx','app/settings.tsx','app/more.tsx','app/reminders.tsx','app/inbox.tsx','app/planning.tsx','app/task-editor.tsx','app/memory-editor.tsx']){
      const source=read(file);
      expect(source).not.toMatch(/<Link[\s\S]{0,600}?asChild[\s\S]{0,300}?style=\{\(\{pressed\}\)=>\[/u);
    }
  });
});
