export type TodoStatus = 'pending' | 'in-progress' | 'completed' | 'blocked';

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  status: TodoStatus;
  createdAt: string; // ISO
  completedAt?: string; // ISO
  tags?: string[];
}

export interface PlanPhase {
  id: string;
  title: string;
  description?: string;
  todos: TodoItem[];
}

export interface DevelopmentPlan {
  id: string;
  appId: number;
  conversationId: number;
  createdAt: string;
  updatedAt: string;
  title: string;
  summary?: string;
  phases: PlanPhase[];
}

export interface UnfinishedPlanBrief {
  planId: string;
  conversationId: number;
  title: string;
  remainingCount: number;
  updatedAt: string;
}