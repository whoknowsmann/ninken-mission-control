export type AgentStatus = 'idle' | 'running' | 'error' | 'disconnected';
export type ThinkingLevel = 'low' | 'medium' | 'high';

export type AgentSummary = {
  id: string;
  name: string;
  status: AgentStatus;
  lastMessage: string | null;
  lastUpdatedAt: number;
  sessionKey: string;
  model: string;
  thinking: ThinkingLevel;
  error: string | null;
};

export type ChatRole = 'user' | 'agent' | 'system';

export type ChatMessage = {
  id: string;
  agentId: string;
  role: ChatRole;
  text: string;
  ts: number;
};

export type ActivityType =
  | 'run_started'
  | 'run_ended'
  | 'chat'
  | 'tool'
  | 'error'
  | 'presence'
  | 'heartbeat'
  | 'settings';

export type ActivityItem = {
  id: string;
  ts: number;
  agentId: string;
  agentName: string;
  type: ActivityType;
  summary: string;
  meta?: Record<string, unknown>;
};

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
