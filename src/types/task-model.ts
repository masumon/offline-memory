import type { TaskPriority, TaskStatus } from './index';

export interface Task {
  id: string;
  title: string;
  notes: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  plannedDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  notes?: string | null;
  priority?: TaskPriority;
  dueAt?: string | null;
  plannedDate?: string | null;
  status?: TaskStatus;
}

export interface UpdateTaskInput {
  title?: string;
  notes?: string | null;
  priority?: TaskPriority;
  dueAt?: string | null;
  plannedDate?: string | null;
  status?: TaskStatus;
}
