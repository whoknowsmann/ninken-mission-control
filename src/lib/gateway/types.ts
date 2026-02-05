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

export type GatewayRpcMethod = 'agents.list' | 'chat.send' | 'chat.abort' | 'sessions.patch';

export type GatewayRequestFrame = {
  id: string;
  type: 'rpc';
  method: GatewayRpcMethod | (string & {});
  params?: Record<string, unknown>;
  token?: string;
};

export type GatewayRpcResultFrame = {
  id: string;
  type: 'rpc_result';
  result: unknown;
  [key: string]: unknown;
};

export type GatewayRpcErrorFrame = {
  id: string;
  type: 'rpc_error';
  error: {
    message?: string;
    code?: string;
    data?: unknown;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type GatewayEventType = 'presence' | 'heartbeat' | 'chat' | 'agent' | (string & {});

export type GatewayEventFrame = {
  type: 'event';
  event: GatewayEventType;
  data?: Record<string, unknown>;
  [key: string]: unknown;
};

export type GatewayAuthFrame = {
  type: 'auth';
  token: string;
};

export type GatewayPingFrame = {
  type: 'ping';
  ts: number;
};

export type GatewayPongFrame = {
  type: 'pong';
  ts?: number;
  [key: string]: unknown;
};

export type GatewayWireFrame =
  | GatewayRpcResultFrame
  | GatewayRpcErrorFrame
  | GatewayEventFrame
  | GatewayPongFrame
  | Record<string, unknown>;

export type AgentStatusUpdate = {
  agentId: string;
  status: AgentStatus;
  error?: string | null;
};

export type NormalizedChatChunk = {
  agentId: string;
  text: string;
};

export type NormalizedChatMessage = {
  message: ChatMessage;
};

export type NormalizedEvent = {
  eventType: GatewayEventType;
  statusUpdates: AgentStatusUpdate[];
  chatChunks: NormalizedChatChunk[];
  chatMessages: NormalizedChatMessage[];
  activityItems: Omit<ActivityItem, 'id'>[];
};
