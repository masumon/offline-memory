import type { NlpIntent } from '../nlp/types';

export interface OrchestrationContext {
  lastTaskText?: string;
  lastMemoryQuery?: string;
  lastIntent?: Exclude<NlpIntent, 'UNKNOWN'>;
}

export interface ResolvedContext {
  taskText?: string;
  memoryQuery?: string;
}
