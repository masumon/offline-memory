import { buildMarkdown, buildJson, buildTasksCsv, buildMemoriesCsv, buildCsv } from '../src/services/export-format';
import type { Task } from '../src/types/task-model';
import type { Memory } from '../src/types/memory-model';

const task = (over: Partial<Task> = {}): Task => ({
  id: 't1', title: 'Call the supplier', notes: null, status: 'INBOX', priority: 'MEDIUM',
  dueAt: null, plannedDate: null, completedAt: null, recurrence: null,
  createdAt: '2026-09-01T04:00:00.000Z', updatedAt: '2026-09-01T04:00:00.000Z', ...over,
});
const memory = (over: Partial<Memory> = {}): Memory => ({
  id: 'm1', title: null, content: 'wifi password is hunter2', kind: 'FACT', source: 'USER',
  tags: [], importance: 3, archived: false,
  createdAt: '2026-09-01T04:00:00.000Z', updatedAt: '2026-09-01T04:00:00.000Z', lastAccessedAt: null, ...over,
});

describe('export-format', () => {
  it('markdown groups tasks by status and marks completed ones', () => {
    const md = buildMarkdown(
      [task({ id: 'a', title: 'Open task' }), task({ id: 'b', title: 'Done task', status: 'COMPLETED' })],
      [],
      '2026-09-02T10:00:00.000Z',
    );
    expect(md).toContain('## Tasks (2)');
    expect(md).toContain('### Inbox');
    expect(md).toContain('- [ ] **Open task**');
    expect(md).toContain('### Completed');
    expect(md).toContain('- [x] **Done task**');
  });

  it('markdown renders task meta and multi-line notes as quotes', () => {
    const md = buildMarkdown([task({ title: 'X', priority: 'HIGH', dueAt: '2026-09-03T03:00:00.000Z', notes: 'line one\nline two' })], [], '2026-09-02T10:00:00.000Z');
    expect(md).toMatch(/\*\*X\*\* — high · due 2026-09-03/);
    expect(md).toContain('  > line one');
    expect(md).toContain('  > line two');
  });

  it('markdown groups memories by kind with title and tags', () => {
    const md = buildMarkdown([], [memory({ title: 'Home wifi', tags: ['home', 'net'] })], '2026-09-02T10:00:00.000Z');
    expect(md).toContain('## Memories (1)');
    expect(md).toContain('### Fact');
    expect(md).toContain('**Home wifi** — wifi password is hunter2 _(#home #net)_');
  });

  it('json is valid and round-trips the rows', () => {
    const parsed = JSON.parse(buildJson([task()], [memory({ tags: ['x'] })], '2026-09-02T10:00:00.000Z'));
    expect(parsed.format).toBe('export/v1');
    expect(parsed.counts).toEqual({ tasks: 1, memories: 1 });
    expect(parsed.tasks[0].title).toBe('Call the supplier');
    expect(parsed.memories[0].tags).toEqual(['x']);
  });

  it('csv escapes commas, quotes and newlines (RFC 4180 quoting)', () => {
    const csv = buildTasksCsv([task({ title: 'a, "b"', notes: 'has\nnewline' })]);
    expect(csv.split('\n')[0]).toBe('id,title,notes,status,priority,dueAt,plannedDate,completedAt,recurrence,createdAt,updatedAt');
    expect(csv).toContain('"a, ""b"""');
    expect(csv).toContain('"has\nnewline"');
  });

  it('csv memories row carries tags joined and archived flag', () => {
    const line = buildMemoriesCsv([memory({ tags: ['a', 'b'], archived: true })]).split('\n')[1];
    expect(line).toContain('a b');
    expect(line).toContain('yes');
  });

  it('buildCsv labels the two tables', () => {
    const csv = buildCsv([task()], [memory()]);
    expect(csv).toContain('# TASKS');
    expect(csv).toContain('# MEMORIES');
  });
});
