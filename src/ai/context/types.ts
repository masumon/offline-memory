import type { NlpIntent } from '../nlp/types';

export interface OrchestrationContext {
  lastTaskText?: string;
  lastMemoryQuery?: string;
  lastIntent?: Exclude<NlpIntent, 'UNKNOWN'>;
  /** Salient words from the last question/search — lets a terse follow-up ("আর ভিসারটা?") inherit the topic. */
  lastKeywords?: string[];
}

export interface ResolvedContext {
  taskText?: string;
  memoryQuery?: string;
}
