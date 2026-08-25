import type { MemoryKind, TaskPriority, TaskStatus } from '../types';

const taskStatusBn: Record<TaskStatus, string> = {
  INBOX: 'ইনবক্স',
  PLANNED: 'পরিকল্পিত',
  IN_PROGRESS: 'চলমান',
  COMPLETED: 'সম্পন্ন',
  RESCHEDULED: 'পুনঃনির্ধারিত',
  ARCHIVED: 'আর্কাইভ',
  CANCELLED: 'বাতিল',
};

const taskPriorityBn: Record<TaskPriority, string> = {
  URGENT: 'জরুরি',
  HIGH: 'উচ্চ',
  MEDIUM: 'মাঝারি',
  LOW: 'কম',
};

const memoryKindBn: Record<MemoryKind, string> = {
  NOTE: 'নোট',
  FACT: 'তথ্য',
  PREFERENCE: 'পছন্দ',
  EVENT: 'ঘটনা',
  REFLECTION: 'পর্যালোচনা',
};

export function localizeTaskStatus(value: TaskStatus, bengali: boolean): string {
  return bengali ? taskStatusBn[value] : value.replace(/_/g, ' ');
}

export function localizeTaskPriority(value: TaskPriority, bengali: boolean): string {
  return bengali ? taskPriorityBn[value] : value.charAt(0) + value.slice(1).toLowerCase();
}

export function localizeMemoryKind(value: MemoryKind, bengali: boolean): string {
  return bengali ? memoryKindBn[value] : value.charAt(0) + value.slice(1).toLowerCase();
}
