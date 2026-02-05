import {
  isEventFrame,
  isRpcErrorFrame,
  isRpcResultFrame,
  normalizeAgentEvent,
  normalizeChatEvent,
  normalizeHeartbeat,
  normalizePresenceUpdates,
  parseFrame
} from './events';
import type {
  ActivityItem,
  AgentSummary,
  AgentsListItem,
  AgentsListResult,
  AuthMode,
  ChatMessage,
  ConnectionStatus,
  GatewayEventFrame,
  GatewayRpcRequest,
  ThinkingLevel
} from './types';

const makeId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10));

type ConnectParams = {
  gatewayUrl: string;
  token: string;
};

type GatewayClientOptions = {
  authMode?: AuthMode;
  connectTimeoutMs?: number;
  staleAfterMs?: number;
  pingIntervalMs?: number;
};

type PendingCall = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  timeout: number;
};

export class GatewayClient {
  private ws: WebSocket | null = null;
  private token = '';
  private gatewayUrl = '';
  private authMode: AuthMode;
  private reconnectAttempt = 0;
  private shouldReconnect = false;
  private manuallyDisconnected = false;
  private connectTimeoutMs: number;
  private staleAfterMs: number;
  private pingIntervalMs: number;
  private pingTimer: number | null = null;
  private staleTimer: number | null = null;
  private connectTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private lastDataTs = 0;
  private status: ConnectionStatus = 'disconnected';
  private pending = new Map<string, PendingCall>();
  private eventHandlers = new Set<(frame: GatewayEventFrame) => void>();
  private statusHandlers = new Set<(status: ConnectionStatus, reason?: string | null) => void>();

  constructor(options: GatewayClientOptions = {}) {
    this.authMode = options.authMode ?? 'frame';
    this.connectTimeoutMs = options.connectTimeoutMs ?? 9_000;
    this.staleAfterMs = options.staleAfterMs ?? 60_000;
    this.pingIntervalMs = options.pingIntervalMs ?? 20_000;
  }

  onEvent(handler: (frame: GatewayEventFrame) => void): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  onConnectionChange(handler: (status: ConnectionStatus, reason?: string | null) => void): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  async connect({ gatewayUrl, token }: ConnectParams): Promise<void> {
    this.manuallyDisconnected = false;
    this.shouldReconnect = true;
    this.gatewayUrl = gatewayUrl;
    this.token = token;
    await this.openSocket();
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.manuallyDisconnected = true;
    this.reconnectAttempt = 0;
    this.clearTimers();
    this.rejectPending('Disconnected');
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected', null);
  }

  async call<TResult = unknown, TParams = Record<string, unknown>>(method: string, params: TParams): Promise<TResult> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Gateway not connected.');
    }

    const id = makeId();
    const request: GatewayRpcRequest<TParams> = {
      id,
      type: 'rpc',
      method,
      params,
      ...(this.authMode === 'per_message' ? { token: this.token } : {})
    };

    this.ws.send(JSON.stringify(request));

    return await new Promise<TResult>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`RPC timeout: ${method}`));
      }, 15_000);

      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject, timeout });
    });
  }

  private setStatus(status: ConnectionStatus, reason?: string | null): void {
    this.status = status;
    for (const handler of this.statusHandlers) {
      handler(status, reason);
    }
  }

  private async openSocket(): Promise<void> {
    this.clearTimers();
    this.rejectPending('Reconnecting');

    this.setStatus('connecting', null);

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(this.gatewayUrl);
      this.ws = ws;

      this.connectTimer = window.setTimeout(() => {
        ws.close();
        reject(new Error('Connection timeout')); 
      }, this.connectTimeoutMs);

      ws.onopen = () => {
        this.clearConnectTimer();
        this.lastDataTs = Date.now();
        this.reconnectAttempt = 0;

        if (this.authMode === 'frame' && this.token) {
          ws.send(JSON.stringify({ type: 'auth', token: this.token }));
        }

        this.startHealthTimers();
        this.setStatus('connected', null);
        resolve();
      };

      ws.onmessage = (event) => {
        this.lastDataTs = Date.now();
        this.handleMessage(String(event.data));
      };

      ws.onerror = () => {
        this.setStatus('error', 'WebSocket error.');
      };

      ws.onclose = () => {
        this.clearTimers();
        this.ws = null;

        if (this.manuallyDisconnected) {
          this.setStatus('disconnected', null);
          return;
        }

        this.setStatus('error', 'Gateway disconnected.');

        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      };
    });
  }

  private handleMessage(raw: string): void {
    const frame = parseFrame(raw);
    if (!frame) return;

    if (frame.type === 'pong') return;

    if (isRpcResultFrame(frame)) {
      const pending = this.pending.get(frame.id);
      if (!pending) return;
      window.clearTimeout(pending.timeout);
      this.pending.delete(frame.id);
      pending.resolve(frame.result);
      return;
    }

    if (isRpcErrorFrame(frame)) {
      const pending = this.pending.get(frame.id);
      if (!pending) return;
      window.clearTimeout(pending.timeout);
      this.pending.delete(frame.id);
      pending.reject(new Error(frame.error?.message || 'Gateway RPC error'));
      return;
    }

    if (isEventFrame(frame)) {
      for (const handler of this.eventHandlers) {
        handler(frame);
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempt, 15_000);
    this.reconnectAttempt += 1;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      void this.openSocket().catch(() => {
        this.scheduleReconnect();
      });
    }, delay);
  }

  private startHealthTimers(): void {
    this.pingTimer = window.setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      this.ws.send(JSON.stringify({ type: 'ping', ts: Date.now() }));
    }, this.pingIntervalMs);

    this.staleTimer = window.setInterval(() => {
      if (Date.now() - this.lastDataTs <= this.staleAfterMs) return;
      if (this.ws) this.ws.close();
    }, 5_000);
  }

  private rejectPending(message: string): void {
    for (const [, pending] of this.pending) {
      window.clearTimeout(pending.timeout);
      pending.reject(new Error(message));
    }
    this.pending.clear();
  }

  private clearConnectTimer(): void {
    if (this.connectTimer) {
      window.clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearConnectTimer();
    if (this.pingTimer) {
      window.clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.staleTimer) {
      window.clearInterval(this.staleTimer);
      this.staleTimer = null;
    }
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

type GatewayBindings = {
  onAgentsHydrate?: (agents: AgentSummary[]) => void;
  onChatMessage?: (message: ChatMessage) => void;
  onStreamingChunk?: (agentId: string, chunk: string) => void;
  onActivity?: (item: ActivityItem) => void;
  onAgentStatus?: (agentId: string, status: AgentSummary['status'], error?: string | null) => void;
  onAgentSettings?: (agentId: string, settings: Pick<AgentSummary, 'model' | 'thinking'>) => void;
  onConnectionChange?: (status: ConnectionStatus, reason?: string | null) => void;
};

const toThinking = (value: unknown): ThinkingLevel => (value === 'low' || value === 'medium' || value === 'high' ? value : 'medium');

const mockAgents = (): AgentSummary[] => [
  {
    id: 'henry',
    name: 'Henry',
    status: 'idle',
    lastMessage: 'Awaiting instructions.',
    lastUpdatedAt: Date.now(),
    sessionKey: 'sess_henry',
    model: 'claude-sonnet-4',
    thinking: 'medium',
    error: null
  }
];


const toAgentSummary = (item: AgentsListItem): AgentSummary => ({
  id: item.id,
  name: typeof item.name === 'string' ? item.name : item.id,
  status: item.status === 'running' || item.status === 'error' || item.status === 'disconnected' ? item.status : 'idle',
  lastMessage: null,
  lastUpdatedAt: Date.now(),
  sessionKey: typeof item.sessionKey === 'string' ? item.sessionKey : typeof item.session_key === 'string' ? item.session_key : item.id,
  model: typeof item.model === 'string' ? item.model : 'claude-sonnet-4',
  thinking: toThinking(item.thinking),
  error: null
});

export type GatewayController = {
  connect: (config: { gatewayUrl: string; token: string }) => Promise<void>;
  disconnect: () => void;
  sendChat: (agent: AgentSummary, text: string) => Promise<void>;
  stop: (agent: AgentSummary) => Promise<void>;
  patchSettings: (agent: AgentSummary, settings: { model: string; thinking: ThinkingLevel }) => Promise<void>;
};

export function createGatewayClient(bindings: GatewayBindings): GatewayController {
  const useMock = import.meta.env.VITE_USE_MOCK_GATEWAY === 'true';
  const client = new GatewayClient();
  let lastHeartbeatActivityTs = 0;

  client.onConnectionChange((status, reason) => {
    bindings.onConnectionChange?.(status, reason);
  });

  client.onEvent((frame) => {
    if (frame.event === 'presence') {
      const updates = normalizePresenceUpdates(frame.data as Record<string, unknown>);
      for (const update of updates) {
        bindings.onAgentStatus?.(update.agentId, update.status, null);
      }
      bindings.onActivity?.({
        id: makeId(),
        ts: Date.now(),
        agentId: 'system',
        agentName: 'Gateway',
        type: 'presence',
        summary: 'Presence update received.'
      });
      return;
    }

    if (frame.event === 'heartbeat') {
      const heartbeat = normalizeHeartbeat(frame.data as Record<string, unknown>);
      if (heartbeat.agentId && heartbeat.status) {
        bindings.onAgentStatus?.(heartbeat.agentId, heartbeat.status, null);
      }

      if (Date.now() - lastHeartbeatActivityTs > 30_000) {
        lastHeartbeatActivityTs = Date.now();
        bindings.onActivity?.({
          id: makeId(),
          ts: Date.now(),
          agentId: 'system',
          agentName: 'Gateway',
          type: 'heartbeat',
          summary: 'Heartbeat received.'
        });
      }
      return;
    }

    if (frame.event === 'chat') {
      const chat = normalizeChatEvent(frame.data as Record<string, unknown>);
      for (const message of chat.messages) {
        bindings.onChatMessage?.(message);
      }
      if (chat.chunk) {
        bindings.onStreamingChunk?.(chat.chunk.agentId, chat.chunk.text);
      }
      bindings.onActivity?.({
        id: makeId(),
        ts: Date.now(),
        agentId: 'system',
        agentName: 'Gateway',
        type: 'chat',
        summary: 'Chat event received.'
      });
      return;
    }

    if (frame.event === 'agent') {
      const evt = normalizeAgentEvent(frame.data as Record<string, unknown>);
      if (!evt) return;
      if (evt.event === 'run_started') {
        bindings.onAgentStatus?.(evt.agentId, 'running', null);
      } else if (evt.event === 'run_ended') {
        bindings.onAgentStatus?.(evt.agentId, 'idle', null);
      } else {
        bindings.onAgentStatus?.(evt.agentId, 'error', evt.message ?? 'Agent error');
      }

      bindings.onActivity?.({
        id: makeId(),
        ts: Date.now(),
        agentId: evt.agentId,
        agentName: evt.agentId,
        type: evt.event === 'run_started' ? 'run_started' : evt.event === 'run_ended' ? 'run_ended' : 'error',
        summary: evt.message ?? `Agent event: ${evt.event}`
      });
    }
  });

  return {
    connect: async ({ gatewayUrl, token }) => {
      if (useMock) {
        bindings.onAgentsHydrate?.(mockAgents());
        bindings.onActivity?.({
          id: makeId(),
          ts: Date.now(),
          agentId: 'system',
          agentName: 'Gateway',
          type: 'presence',
          summary: 'Connected to mock gateway.'
        });
        return;
      }

      await client.connect({ gatewayUrl, token });
      const result = await client.call<AgentsListResult>('agents.list', {});
      const list = result.agents ?? result.items ?? [];
      const agents = list.filter((item): item is AgentsListItem => typeof item.id === 'string').map(toAgentSummary);
      bindings.onAgentsHydrate?.(agents);
      bindings.onActivity?.({
        id: makeId(),
        ts: Date.now(),
        agentId: 'system',
        agentName: 'Gateway',
        type: 'presence',
        summary: 'Connected to gateway.'
      });
    },
    disconnect: () => {
      if (!useMock) {
        client.disconnect();
      }
    },
    sendChat: async (agent, text) => {
      bindings.onChatMessage?.({ id: makeId(), agentId: agent.id, role: 'user', text, ts: Date.now() });
      bindings.onAgentStatus?.(agent.id, 'running', null);
      if (useMock) {
        window.setTimeout(() => {
          bindings.onStreamingChunk?.(agent.id, `Mock response to: ${text}`);
          bindings.onAgentStatus?.(agent.id, 'idle', null);
        }, 200);
        return;
      }
      await client.call('chat.send', { sessionKey: agent.sessionKey, message: text });
    },
    stop: async (agent) => {
      bindings.onAgentStatus?.(agent.id, 'idle', null);
      if (useMock) return;
      await client.call('chat.abort', { sessionKey: agent.sessionKey });
    },
    patchSettings: async (agent, settings) => {
      bindings.onAgentSettings?.(agent.id, settings);
      if (useMock) return;
      await client.call('sessions.patch', { key: agent.sessionKey, model: settings.model, thinking: settings.thinking });
    }
  };
}
