export type TaskStatus =
  | 'INBOX'
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'RESCHEDULED'
  | 'ARCHIVED'
  | 'CANCELLED';

export type TaskPriority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';

export type Intent =
  | 'CREATE_TASK'
  | 'EDIT_TASK'
  | 'COMPLETE_TASK'
  | 'RESCHEDULE_TASK'
  | 'SNOOZE_TASK'
  | 'CANCEL_TASK'
  | 'ARCHIVE_TASK'
  | 'CREATE_MEMORY'
  | 'EDIT_MEMORY'
  | 'SEARCH_MEMORY'
  | 'CREATE_PROJECT'
  | 'ADD_SUBTASK'
  | 'SHOW_TODAY'
  | 'SHOW_TOMORROW'
  | 'SHOW_UPCOMING'
  | 'SHOW_OVERDUE'
  | 'PLAN_DAY'
  | 'DAILY_REVIEW'
  | 'WEEKLY_REVIEW';

export type { CreateTaskInput, Task, UpdateTaskInput } from './task-model';
export type { CreateSubtaskInput, Subtask } from './subtask-model';
