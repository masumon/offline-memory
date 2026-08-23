export type NlpIntent =
  | 'CREATE_TASK'
  | 'COMPLETE_TASK'
  | 'LIST_TASKS'
  | 'RESCHEDULE_TASK'
  | 'CREATE_MEMORY'
  | 'SEARCH_MEMORY'
  | 'UNKNOWN';

export interface DateEntity {
  raw: string;
  isoDate: string;
  confidence: number;
}

export interface TimeEntity {
  raw: string;
  minutes: number;
  confidence: number;
}

export interface NlpEntities {
  taskText?: string;
  memoryText?: string;
  query?: string;
  date?: DateEntity;
  time?: TimeEntity;
}

export interface NlpResult {
  normalizedText: string;
  tokens: string[];
  intent: NlpIntent;
  confidence: number;
  entities: NlpEntities;
}
