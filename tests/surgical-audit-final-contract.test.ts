import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(__dirname,'..');
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
describe('surgical audit final contracts',()=>{
 it('uses shared confirmation for destructive editor actions',()=>{const task=read('app/task-editor.tsx');const memory=read('app/memory-editor.tsx');expect(task).toContain('AppConfirmDialog');expect(task).not.toContain('Alert.alert');expect(memory).toContain('AppConfirmDialog');expect(memory).not.toContain('Alert.alert');});
 it('keeps editor attachment panels on persisted entities',()=>{expect(read('app/task-editor.tsx')).toContain('AttachmentPanel ownerType="TASK" ownerId={id}');expect(read('app/memory-editor.tsx')).toContain('AttachmentPanel ownerType="MEMORY" ownerId={id}');});
 it('keeps attachment lifecycle cleanup in repository deletion paths',()=>{expect(read('src/services/task-repository.ts')).toContain("removeAttachmentsForOwner(db, 'TASK', id)");expect(read('src/services/memory-repository.ts')).toContain("removeAttachmentsForOwner(db, 'MEMORY', id)");});
 it('keeps user-facing errors localized and avoids raw exception rendering in audited editors',()=>{expect(read('app/task-editor.tsx')).toContain('The task could not be saved.');expect(read('app/memory-editor.tsx')).toContain('The memory could not be saved.');expect(read('app/task-editor.tsx')).not.toContain('error.message');expect(read('app/memory-editor.tsx')).not.toContain('error.message');});
});
