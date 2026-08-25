import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(__dirname,'..');
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
function sourceFiles(dir:string):string[]{const absolute=path.join(root,dir);const result:string[]=[];for(const entry of fs.readdirSync(absolute,{withFileTypes:true})){const relative=path.join(dir,entry.name);if(entry.isDirectory())result.push(...sourceFiles(relative));else if(/\.(tsx?|jsx?)$/u.test(entry.name))result.push(relative)}return result}

describe('P0 surgical audit contracts',()=>{
  it('keeps task and memory deletion coupled to attachment cleanup',()=>{
    expect(read('src/services/task-repository.ts')).toContain("removeAttachmentsForOwner(db, 'TASK', id)");
    expect(read('src/services/memory-repository.ts')).toContain("removeAttachmentsForOwner(db, 'MEMORY', id)");
  });
  it('keeps attachment insertion transactional and cleans copied files on failure',()=>{
    const source=read('src/services/attachment-service.ts');
    expect(source).toContain('BEGIN IMMEDIATE TRANSACTION');
    expect(source).toContain('copiedUris');
    expect(source).toContain('cleanupFiles(copiedUris)');
    expect(source).toContain('ROLLBACK');
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
    expect(archive).toContain('attachments/${attachment.id}');
    expect(restore).toContain('attachments');
    expect(restore).toContain('base64');
    expect(restore).toContain('attachments/${attachment.id}');
  });
  it('keeps backup/restore archive validation strict',()=>{
    const archive=read('src/services/backup-archive-service.ts');
    const restore=read('src/services/backup-restore-archive-service.ts');
    expect(archive).toContain('Unsupported backup archive format');
    expect(archive).toContain('Backup attachment data is missing');
    expect(archive).toContain('Backup attachment size mismatch');
    expect(restore).toContain('Backup attachment data is missing');
    expect(restore).toContain('Backup attachment size mismatch');
  });
  it('keeps restore staging isolated from live attachment files',()=>{
    const restore=read('src/services/backup-restore-archive-service.ts');
    expect(restore).toContain('prepared');
    expect(restore).toContain('file.delete()');
    expect(restore).toContain('catch(error)');
  });
  it('keeps legacy M7/v1 restore compatibility behind the v2 archive adapter',()=>{
    const restore=read('src/services/backup-restore-archive-service.ts');
    const sqliteRestore=read('src/backup/sqlite-restore.ts');
    expect(restore).toContain("format:'offline-memory-backup',version:1");
    expect(sqliteRestore).toContain('parseM7BackupDocument');
    expect(sqliteRestore).toContain('hasAttachments');
  });
  it('does not retain the known Slot descendant array-style regression pattern anywhere under app/',()=>{
    for(const file of sourceFiles('app')){
      const source=read(file);
      expect(source).not.toMatch(/<Link[\s\S]{0,800}?asChild[\s\S]{0,400}?style=\{\(\{pressed\}\)=>\[/u);
    }
  });
});
