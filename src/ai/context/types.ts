export interface OrchestrationContext {
  lastTaskText?: string;
  lastMemoryQuery?: string;
  lastIntent?: 'CREATE_TASK' | 'COMPLETE_TASK' | 'LIST_TASKS' | 'RESCHEDULE_TASK' | 'CREATE_MEMORY' | 'SEARCH_MEMORY';
}

export interface ResolvedContext {
  taskText?: string;
  memoryQuery?: string;
}
