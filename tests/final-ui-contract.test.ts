import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(__dirname,'..');
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
describe('final surgical UI contracts',()=>{
 it('uses the adaptive 600/840 window contract',()=>{const theme=read('src/theme/index.ts');expect(theme).toContain('compactWindow:600');expect(theme).toContain('mediumWindow:840');expect(theme).toContain('expandedNavigation:840');});
 it('keeps attachment lifecycle cleanup at the task and memory repository boundaries',()=>{expect(read('src/services/task-repository.ts')).toContain("removeAttachmentsForOwner(db, 'TASK', id)");expect(read('src/services/memory-repository.ts')).toContain("removeAttachmentsForOwner(db, 'MEMORY', id)");});
 it('keeps modern local file APIs in attachment and backup services',()=>{expect(read('src/services/attachment-service.ts')).toContain("from 'expo-file-system'");expect(read('src/services/attachment-reconciliation-service.ts')).toContain("from 'expo-file-system'");expect(read('src/backup/file-adapter.ts')).toContain("from 'expo-file-system'");expect(read('src/services/backup-archive-service.ts')).toContain("from 'expo-file-system'");expect(read('src/services/backup-restore-archive-service.ts')).toContain("from 'expo-file-system'");});
 it('keeps destructive restore/delete behind explicit confirmation primitives where audited',()=>{expect(read('app/backup.tsx')).toContain('AppConfirmDialog');expect(read('src/ui/AttachmentPanel.tsx')).toContain('AppConfirmDialog');});
 it('keeps About in the More system group and the product privacy contract visible',()=>{expect(read('app/more.tsx')).toContain("href:'/about'");const about=read('app/about.tsx');expect(about).toContain('Privacy-first');expect(about).toContain('Offline-first');});
 it('keeps diagnostics connected to attachment reconciliation',()=>{expect(read('app/diagnostics.tsx')).toContain('reconcileAttachmentStorage');});
 it('keeps centralized Bangladesh date/time formatters available and used by Home',()=>{const source=read('src/i18n/date-time.ts');for(const name of ['formatBangladeshDate','formatBangladeshDateTime','formatBangladeshTime','formatBangladeshWeekdayDate','formatBangladeshMonthYear','formatBangladeshRelativeDate','formatBangladeshNumber'])expect(source).toContain(name);expect(read('app/index.tsx')).toContain('formatBangladeshWeekdayDate');});
 it('keeps final shared touch-target primitives at 48dp',()=>{const source=read('src/theme/index.ts');expect(source).toContain('minTouchTarget:48');expect(source).toContain('iconButtonSize:48');expect(read('src/ui/AppSurface.tsx')).toContain('minHeight:layout.minTouchTarget');});
 it('keeps search filters and branded Android notification defaults',()=>{expect(read('app/search.tsx')).toContain("type SearchFilter = 'ALL' | 'TASKS' | 'MEMORIES'");const app=read('app.json');expect(app).toContain('"defaultChannel": "task-reminders"');expect(app).toContain('"color": "#006A4E"');});
});
