export interface OrchestrationContext {
  lastTaskText?: string;
  lastMemoryQuery?: string;
}

export interface ResolvedContext {
  taskText?: string;
  memoryQuery?: string;
}
