import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('UI implementation contracts', () => {
  it('does not leave raw array styles directly on immediate Link asChild Pressable descendants', () => {
    const files = ['app/index.tsx', 'app/search.tsx', 'app/settings.tsx', 'app/more.tsx', 'app/reminders.tsx', 'app/task-editor.tsx', 'app/planning.tsx', 'app/inbox.tsx'];
    const rawArrayStyleOnLinkChild = /<Link\b[^>]*\basChild\b[^>]*>\s*<Pressable\b[^>]*style=\{\(\{\s*pressed\s*\}\)\s*=>\s*\[/;
    for (const file of files) {
      expect(read(file)).not.toMatch(rawArrayStyleOnLinkChild);
    }
  });

  it('keeps shared minimum touch target and adaptive window tokens present', () => {
    const theme = read('src/theme/index.ts');
    expect(theme).toContain('minTouchTarget:48');
    expect(theme).toContain('compactWindow:600');
    expect(theme).toContain('expandedNavigation:840');
  });

  it('keeps Bangladesh date-time formatters centralized', () => {
    const formatter = read('src/i18n/date-time.ts');
    expect(formatter).toContain('bn-BD');
    expect(formatter).toContain('formatBangladeshDateTime');
    expect(formatter).toContain('formatBangladeshRelativeDate');
  });

  it('keeps attachment panel controls at the shared tokenized touch target', () => {
    const source = read('src/ui/AttachmentPanel.tsx');
    expect(source).toContain('minHeight:control.buttonHeight');
    expect(source).toContain('minWidth:layout.minTouchTarget');
    expect(source).toContain('minHeight:layout.minTouchTarget');
    expect(source).toContain('AppConfirmDialog');
  });
});
