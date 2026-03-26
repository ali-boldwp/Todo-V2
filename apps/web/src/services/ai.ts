import api from './api';

export interface TaskDraft {
  projectId?: string | null;
  title?: string;
  description?: string;
  priority?: string;
  assigneeId?: string | null;
  dueDate?: string | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIChatResponse {
  reply: string;
  taskDraft: TaskDraft;
  action: 'continue' | 'create' | 'confirm' | 'error';
  suggestions?: string[];
}

export const chatWithAI = async (
  messages: ChatMessage[],
  taskDraft: TaskDraft,
  projectId?: string
): Promise<AIChatResponse> => {
  const response = await api.post('/ai/chat', { messages, taskDraft, projectId });
  return response.data;
};