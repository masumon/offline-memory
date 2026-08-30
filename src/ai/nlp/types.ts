export type NlpIntent =
  | 'CREATE_TASK'
  | 'COMPLETE_TASK'
  | 'LIST_TASKS'
  | 'RESCHEDULE_TASK'
  | 'CREATE_MEMORY'
  | 'SEARCH_MEMORY'
  | 'ANSWER_QUESTION'
  | 'HELP'
  | 'SMALL_TALK'
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

export type NlpPriority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface NlpEntities {
  taskText?: string;
  memoryText?: string;
  query?: string;
  /** The full natural-language question, kept verbatim for the retrieval + answer pipeline. */
  question?: string;
  /** Salient content words pulled from the input (interrogatives / stop-words removed). */
  keywords?: string[];
  date?: DateEntity;
  time?: TimeEntity;
  /** Priority inferred from urgency keywords ("urgent", "জরুরি", "!!!"). */
  priority?: NlpPriority;
  /** Auto-suggested tags from content nouns ("office", "ব্যাংক" → #work / #money). */
  tags?: string[];
}

export interface NlpResult {
  normalizedText: string;
  tokens: string[];
  intent: NlpIntent;
  confidence: number;
  entities: NlpEntities;
}
