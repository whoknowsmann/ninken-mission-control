import type {
  AgentEventData,
  AgentStatus,
  ChatEventData,
  ChatMessage,
  GatewayEventFrame,
  GatewayInboundFrame,
  GatewayResponse,
  HeartbeatEventData,
  PresenceEventData
} from './types';

const makeId = () => Math.random().toString(36).slice(2, 10);

const asObject = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

// OpenClaw protocol uses type:"res" for responses
export const isResponseFrame = (frame: GatewayInboundFrame): frame is GatewayResponse => {
  return frame.type === 'res' && typeof frame.id === 'string';
};

export const isEventFrame = (frame: GatewayInboundFrame): frame is GatewayEventFrame => {
  return frame.type === 'event' && typeof (frame as GatewayEventFrame).event === 'string';
};

export const parseFrame = (raw: string): GatewayInboundFrame | null => {
  try {
    const parsed = JSON.parse(raw);
    // Basic validation - must have a type field
    if (!parsed || typeof parsed !== 'object' || typeof parsed.type !== 'string') {
      if (import.meta.env.DEV) {
        console.warn('[Gateway] Invalid frame - missing type:', parsed);
      }
      return null;
    }
    return parsed as GatewayInboundFrame;
  } catch {
    return null;
  }
};

export const normalizePresenceUpdates = (data: PresenceEventData): Array<{ agentId: string; status: AgentStatus; agentName?: string }> => {
  const updates: Array<{ agentId: string; status: AgentStatus; agentName?: string }> = [];

  const addUpdate = (agentId: unknown, status: unknown, agentName?: unknown) => {
    if (typeof agentId !== 'string') return;
    if (status !== 'idle' && status !== 'running' && status !== 'error' && status !== 'disconnected') return;
    updates.push({ agentId, status, agentName: typeof agentName === 'string' ? agentName : undefined });
  };

  addUpdate(data.agentId ?? data.id, data.status, data.agentName);

  for (const item of data.agents ?? []) {
    addUpdate(item.agentId ?? item.id, item.status, item.agentName ?? item.name);
  }

  return updates;
};

export const normalizeHeartbeat = (data: HeartbeatEventData): { ts: number; agentId?: string; status?: AgentStatus } => {
  const ts = typeof data.ts === 'number' ? data.ts : Date.now();
  const agentId = typeof (data.agentId ?? data.id) === 'string' ? String(data.agentId ?? data.id) : undefined;
  const status = data.status;
  return {
    ts,
    agentId,
    status: status === 'idle' || status === 'running' || status === 'error' || status === 'disconnected' ? status : undefined
  };
};

const normalizeSingleMessage = (data: Record<string, unknown>): ChatMessage | null => {
  const agentId = typeof data.agentId === 'string' ? data.agentId : typeof data.sessionKey === 'string' ? data.sessionKey : null;
  const text = typeof data.text === 'string' ? data.text : null;
  if (!agentId || !text) return null;

  const roleValue = data.role;
  const role = roleValue === 'user' || roleValue === 'agent' || roleValue === 'system' ? roleValue : 'agent';

  return {
    id: typeof data.id === 'string' ? data.id : makeId(),
    agentId,
    role,
    text,
    ts: typeof data.ts === 'number' ? data.ts : Date.now()
  };
};

export const normalizeChatEvent = (data: ChatEventData): { messages: ChatMessage[]; chunk?: { agentId: string; text: string } } => {
  const messages: ChatMessage[] = [];

  const messageObj = asObject(data.message);
  if (messageObj) {
    const normalized = normalizeSingleMessage(messageObj);
    if (normalized) messages.push(normalized);
  }

  for (const raw of data.messages ?? []) {
    const obj = asObject(raw);
    if (!obj) continue;
    const normalized = normalizeSingleMessage(obj);
    if (normalized) messages.push(normalized);
  }

  const direct = normalizeSingleMessage(data as unknown as Record<string, unknown>);
  if (direct) messages.push(direct);

  const chunkText = typeof data.chunk === 'string' ? data.chunk : typeof data.delta === 'string' ? data.delta : null;
  const chunkAgentId = typeof data.agentId === 'string' ? data.agentId : typeof data.sessionKey === 'string' ? data.sessionKey : null;

  return {
    messages,
    chunk: chunkText && chunkAgentId ? { agentId: chunkAgentId, text: chunkText } : undefined
  };
};

export const normalizeAgentEvent = (
  data: AgentEventData
): { agentId: string; event: 'run_started' | 'run_ended' | 'error'; message?: string; status?: AgentStatus } | null => {
  const agentId = typeof (data.agentId ?? data.id) === 'string' ? String(data.agentId ?? data.id) : null;
  if (!agentId) return null;

  const status = data.status;
  const normalizedStatus = status === 'idle' || status === 'running' || status === 'error' || status === 'disconnected' ? status : undefined;

  const event = data.event;
  const fromStatus = normalizedStatus === 'running' ? 'run_started' : normalizedStatus === 'idle' ? 'run_ended' : normalizedStatus === 'error' ? 'error' : null;
  const normalizedEvent = event === 'run_started' || event === 'run_ended' || event === 'error' ? event : fromStatus;

  if (!normalizedEvent) return null;

  return {
    agentId,
    event: normalizedEvent,
    message: typeof data.message === 'string' ? data.message : typeof data.error === 'string' ? data.error : undefined,
    status: normalizedStatus
  };
};
