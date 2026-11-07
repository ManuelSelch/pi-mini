export type CompanionStatus = 'connecting' | 'idle' | 'thinking' | 'running' | 'waiting' | 'aborting' | 'error' | 'superseded';

export interface Question {
  id: string;
  kind: 'select' | 'confirm' | 'input' | 'editor';
  title: string;
  message?: string;
  body?: string;
  options: readonly string[];
  explicit: boolean;
  placeholder?: string;
  prefill?: string;
  submitLabel?: string;
  cancelLabel?: string;
}

export interface ConversationView {
  sessionId?: string;
  title: string;
  projectName: string;
  response: string;
  status: CompanionStatus;
  error?: string;
  question?: Question;
  canSend: boolean;
  canStop: boolean;
  submitting: boolean;
}

export const emptyView: ConversationView = {
  title: '', projectName: '', response: '', status: 'connecting', canSend: false, canStop: false, submitting: false,
};

export const statusLabels: Record<CompanionStatus, string> = {
  connecting: 'Connecting', idle: 'Ready', thinking: 'Thinking', running: 'Running',
  waiting: 'Waiting for your answer', aborting: 'Stopping', error: 'Error', superseded: 'Control moved to another app',
};
