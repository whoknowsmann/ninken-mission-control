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

export type AuthMode = 'frame' | 'per_message';

export type GatewayRpcRequest<TParams = Record<string, unknown>> = {
  id: string;
  type: 'rpc';
  method: string;
  params: TParams;
  token?: string;
};

export type GatewayRpcResult<TResult = unknown> = {
  id: string;
  type: 'rpc_result';
  result: TResult;
};

export type GatewayRpcError = {
  id: string;
  type: 'rpc_error';
  error: {
    message: string;
    code?: string;
    data?: unknown;
  };
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
};

export type GatewayEventName = 'presence' | 'heartbeat' | 'chat' | 'agent' | string;

export type GatewayEventFrame<TData = Record<string, unknown>> = {
  type: 'event';
  event: GatewayEventName;
  data: TData;
};

export type GatewayInboundFrame = GatewayRpcResult | GatewayRpcError | GatewayEventFrame | GatewayPongFrame | Record<string, unknown>;

export type PresenceEventData = {
  agentId?: string;
  id?: string;
  status?: AgentStatus;
  agentName?: string;
  agents?: Array<{
    id?: string;
    agentId?: string;
    name?: string;
    agentName?: string;
    status?: AgentStatus;
  }>;
  [key: string]: unknown;
};

export type HeartbeatEventData = {
  ts?: number;
  agentId?: string;
  id?: string;
  status?: AgentStatus;
  [key: string]: unknown;
};

export type ChatEventData = {
  id?: string;
  ts?: number;
  agentId?: string;
  sessionKey?: string;
  role?: ChatRole;
  text?: string;
  message?: ChatMessage | Record<string, unknown>;
  messages?: Array<ChatMessage | Record<string, unknown>>;
  chunk?: string;
  delta?: string;
  [key: string]: unknown;
};

export type AgentEventData = {
  agentId?: string;
  id?: string;
  event?: 'run_started' | 'run_ended' | 'error' | string;
  status?: AgentStatus;
  message?: string;
  error?: string;
  [key: string]: unknown;
};

export type AgentsListItem = {
  id: string;
  name?: string;
  status?: AgentStatus;
  sessionKey?: string;
  session_key?: string;
  model?: string;
  thinking?: ThinkingLevel;
  [key: string]: unknown;
};

export type AgentsListResult = {
  agents?: AgentsListItem[];
  items?: AgentsListItem[];
};
