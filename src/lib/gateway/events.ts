import type {
  ActivityItem,
  AgentStatus,
  AgentStatusUpdate,
  ChatMessage,
  GatewayEventFrame,
  GatewayRpcErrorFrame,
  GatewayRpcResultFrame,
  GatewayWireFrame,
  NormalizedEvent,
  ThinkingLevel
} from './types';

const makeId = () => Math.random().toString(36).slice(2, 10);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const asString = (value: unknown): string | null => (typeof value === 'string' && value.length > 0 ? value : null);

const safeAgentStatus = (value: unknown): AgentStatus | null => {
  if (value === 'idle' || value === 'running' || value === 'error' || value === 'disconnected') {
    return value;
  }
  return null;
};

const safeThinking = (value: unknown): ThinkingLevel => {
  if (value === 'low' || value === 'medium' || value === 'high') return value;
  return 'medium';
};

export const isRpcResultFrame = (frame: GatewayWireFrame): frame is GatewayRpcResultFrame =>
  isRecord(frame) && frame.type === 'rpc_result' && typeof frame.id === 'string';

export const isRpcErrorFrame = (frame: GatewayWireFrame): frame is GatewayRpcErrorFrame =>
  isRecord(frame) && frame.type === 'rpc_error' && typeof frame.id === 'string' && isRecord(frame.error);

export const isEventFrame = (frame: GatewayWireFrame): frame is GatewayEventFrame =>
  isRecord(frame) && frame.type === 'event' && typeof frame.event === 'string';

export const toAgentSummary = (data: unknown) => {
  if (!isRecord(data)) return null;
  const id = asString(data.id) ?? asString(data.agentId);
  if (!id) return null;

  const model = asString(data.model) ?? 'unknown';
  const name = asString(data.name) ?? id;
  const status = safeAgentStatus(data.status) ?? 'idle';

  return {
    id,
    name,
    status,
    lastMessage: asString(data.lastMessage),
    lastUpdatedAt: Date.now(),
    sessionKey: asString(data.sessionKey) ?? asString(data.key) ?? id,
    model,
    thinking: safeThinking(data.thinking),
    error: asString(data.error)
  };
};

const toMessage = (payload: Record<string, unknown>): ChatMessage | null => {
  const agentId = asString(payload.agentId) ?? asString(payload.id);
  const text = asString(payload.text) ?? asString(payload.message);
  if (!agentId || text === null) return null;

  const roleValue = payload.role;
  const role = roleValue === 'user' || roleValue === 'agent' || roleValue === 'system' ? roleValue : 'agent';

  return {
    id: asString(payload.id) ?? makeId(),
    agentId,
    role,
    text,
    ts: typeof payload.ts === 'number' ? payload.ts : Date.now()
  };
};

const statusUpdateFrom = (payload: Record<string, unknown>): AgentStatusUpdate | null => {
  const agentId = asString(payload.agentId) ?? asString(payload.id);
  const status = safeAgentStatus(payload.status);
  if (!agentId || !status) return null;
  return { agentId, status, error: asString(payload.error) };
};

const makeActivity = (partial: Omit<ActivityItem, 'id'>): Omit<ActivityItem, 'id'> => partial;

export const normalizeEvent = (frame: GatewayEventFrame): NormalizedEvent => {
  const eventType = frame.event;
  const data = isRecord(frame.data) ? frame.data : {};

  const normalized: NormalizedEvent = {
    eventType,
    statusUpdates: [],
    chatChunks: [],
    chatMessages: [],
    activityItems: []
  };

  if (eventType === 'presence' || eventType === 'heartbeat') {
    const updates = Array.isArray(data.agents) ? data.agents.map((item) => (isRecord(item) ? statusUpdateFrom(item) : null)).filter(Boolean) : [];
    normalized.statusUpdates.push(...(updates as AgentStatusUpdate[]));

    const singleUpdate = statusUpdateFrom(data);
    if (singleUpdate) normalized.statusUpdates.push(singleUpdate);

    if (normalized.statusUpdates.length > 0) {
      const top = normalized.statusUpdates[0];
      normalized.activityItems.push(
        makeActivity({
          ts: Date.now(),
          agentId: top.agentId,
          agentName: asString(data.agentName) ?? top.agentId,
          type: eventType,
          summary: `${eventType === 'presence' ? 'Presence' : 'Heartbeat'} update received.`
        })
      );
    }
  }

  if (eventType === 'chat') {
    const chunk = asString(data.chunk) ?? asString(data.delta);
    const chunkAgent = asString(data.agentId) ?? asString(data.id);
    if (chunk && chunkAgent) {
      normalized.chatChunks.push({ agentId: chunkAgent, text: chunk });
    }

    const message = toMessage(data);
    if (message) {
      normalized.chatMessages.push({ message });
      normalized.activityItems.push(
        makeActivity({
          ts: Date.now(),
          agentId: message.agentId,
          agentName: asString(data.agentName) ?? message.agentId,
          type: 'chat',
          summary: `Chat event for ${message.agentId}.`
        })
      );
    }

    if (Array.isArray(data.messages)) {
      for (const item of data.messages) {
        if (!isRecord(item)) continue;
        const parsed = toMessage(item);
        if (!parsed) continue;
        normalized.chatMessages.push({ message: parsed });
      }
    }
  }

  if (eventType === 'agent') {
    const update = statusUpdateFrom(data);
    if (update) {
      normalized.statusUpdates.push(update);
    }

    const action = asString(data.action) ?? asString(data.type);
    const agentId = asString(data.agentId) ?? asString(data.id);
    if (agentId && action) {
      if (action === 'run_started') {
        normalized.statusUpdates.push({ agentId, status: 'running', error: null });
        normalized.activityItems.push(
          makeActivity({ ts: Date.now(), agentId, agentName: asString(data.agentName) ?? agentId, type: 'run_started', summary: 'Agent run started.' })
        );
      } else if (action === 'run_ended') {
        normalized.statusUpdates.push({ agentId, status: 'idle', error: null });
        normalized.activityItems.push(
          makeActivity({ ts: Date.now(), agentId, agentName: asString(data.agentName) ?? agentId, type: 'run_ended', summary: 'Agent run ended.' })
        );
      } else if (action === 'error') {
        normalized.statusUpdates.push({ agentId, status: 'error', error: asString(data.message) ?? 'Agent error' });
        normalized.activityItems.push(
          makeActivity({
            ts: Date.now(),
            agentId,
            agentName: asString(data.agentName) ?? agentId,
            type: 'error',
            summary: asString(data.message) ?? 'Agent reported an error.'
          })
        );
      }
    }
  }

  return normalized;
};
