import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(__dirname,'..');
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
describe('surgical audit final contracts',()=>{
 it('uses shared confirmation for destructive editor actions',()=>{const task=read('app/task-editor.tsx');const memory=read('app/memory-editor.tsx');expect(task).toContain('AppConfirmDialog');expect(task).not.toContain('Alert.alert');expect(memory).toContain('AppConfirmDialog');expect(memory).not.toContain('Alert.alert');});
 it('keeps editor attachment panels on persisted entities',()=>{expect(read('app/task-editor.tsx')).toContain('AttachmentPanel ownerType="TASK" ownerId={id}');expect(read('app/memory-editor.tsx')).toContain('AttachmentPanel ownerType="MEMORY"ownerId={id}');});
 it('keeps attachment lifecycle cleanup in repository deletion paths',()=>{const task=read('src/services/task-repository.ts');const memory=read('src/services/memory-repository.ts');expect(task).toContain("DELETE FROM attachments WHERE owner_type=? AND owner_id=?");expect(task).toContain("'TASK',id");expect(memory).toContain("DELETE FROM attachments WHERE owner_type=? AND owner_id=?");expect(memory).toContain("'MEMORY',id");});
 it('keeps user-facing errors localized and avoids raw exception rendering in audited editors',()=>{const task=read('app/task-editor.tsx');const memory=read('app/memory-editor.tsx');expect(task).toContain('taskCopy');expect(task).toContain('copy.saveFailed');expect(memory).toContain('memoryCopy');expect(memory).toContain('copy.unableSave');expect(task).not.toContain('error.message');expect(memory).not.toContain('error.message');});
});
