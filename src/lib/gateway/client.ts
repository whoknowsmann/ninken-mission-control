import { isEventFrame, isRpcErrorFrame, isRpcResultFrame, normalizeEvent, toAgentSummary } from './events';
import type {
  AgentSummary,
  GatewayAuthFrame,
  GatewayEventFrame,
  GatewayPingFrame,
  GatewayRequestFrame,
  GatewayRpcMethod,
  GatewayWireFrame,
  NormalizedEvent
} from './types';

type ClientStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

type ConnectInput = {
  gatewayUrl: string;
  token: string;
  authMode?: 'frame' | 'per_message';
};

type ClientOptions = {
  connectTimeoutMs?: number;
  staleTimeoutMs?: number;
  pingIntervalMs?: number;
};

type EventHandler = (event: NormalizedEvent, raw: GatewayEventFrame) => void;
type StatusHandler = (status: ClientStatus, message?: string) => void;

export type GatewayClientLike = {
  connect: (input: ConnectInput) => Promise<void>;
  disconnect: () => void;
  call: <T = unknown>(method: GatewayRpcMethod | (string & {}), params?: Record<string, unknown>) => Promise<T>;
  onEvent: (handler: EventHandler) => () => void;
  onStatus: (handler: StatusHandler) => () => void;
};

const makeId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10));

const DEFAULT_CONNECT_TIMEOUT_MS = 9_000;
const DEFAULT_STALE_TIMEOUT_MS = 60_000;
const DEFAULT_PING_INTERVAL_MS = 20_000;
const BACKOFF_CAP_MS = 15_000;

const safeErrorMessage = (value: unknown) => {
  if (typeof value !== 'string' || value.length === 0) return 'Gateway request failed.';
  return value;
};

class GatewayClient implements GatewayClientLike {
  private ws: WebSocket | null = null;
  private eventHandlers = new Set<EventHandler>();
  private statusHandlers = new Set<StatusHandler>();
  private pending = new Map<string, { resolve: (value: unknown) => void; reject: (err: Error) => void; timeout: number }>();
  private token = '';
  private url = '';
  private authMode: 'frame' | 'per_message' = 'frame';
  private shouldReconnect = false;
  private manuallyDisconnected = false;
  private reconnectAttempt = 0;
  private reconnectTimer: number | null = null;
  private connectTimer: number | null = null;
  private pingTimer: number | null = null;
  private staleTimer: number | null = null;
  private lastReceivedAt = 0;
  private options: Required<ClientOptions>;

  constructor(options: ClientOptions = {}) {
    this.options = {
      connectTimeoutMs: options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS,
      staleTimeoutMs: options.staleTimeoutMs ?? DEFAULT_STALE_TIMEOUT_MS,
      pingIntervalMs: options.pingIntervalMs ?? DEFAULT_PING_INTERVAL_MS
    };
  }

  onEvent(handler: EventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  async connect({ gatewayUrl, token, authMode = 'frame' }: ConnectInput): Promise<void> {
    if (!gatewayUrl.startsWith('ws://') && !gatewayUrl.startsWith('wss://')) {
      throw new Error('Gateway URL must start with ws:// or wss://');
    }

    this.url = gatewayUrl;
    this.token = token;
    this.authMode = authMode;
    this.shouldReconnect = true;
    this.manuallyDisconnected = false;

    this.clearReconnectTimer();
    await this.openSocket();
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.manuallyDisconnected = true;
    this.clearReconnectTimer();
    this.clearTimers();
    this.rejectAllPending('Gateway disconnected.');
    if (this.ws) {
      this.ws.close(1000, 'manual_disconnect');
      this.ws = null;
    }
    this.emitStatus('disconnected');
  }

  call<T = unknown>(method: GatewayRpcMethod | (string & {}), params: Record<string, unknown> = {}): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('Gateway is not connected.'));
    }

    const id = makeId();
    const frame: GatewayRequestFrame = {
      id,
      type: 'rpc',
      method,
      params,
      ...(this.authMode === 'per_message' ? { token: this.token } : {})
    };

    return new Promise<T>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('Gateway request timed out.'));
      }, 20_000);

      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject, timeout });
      this.safeSend(frame);
    });
  }

  private async openSocket(): Promise<void> {
    this.clearTimers();

    this.emitStatus('connecting');
    this.ws = new WebSocket(this.url);

    await new Promise<void>((resolve, reject) => {
      if (!this.ws) {
        reject(new Error('Unable to create websocket.'));
        return;
      }

      this.connectTimer = window.setTimeout(() => {
        this.ws?.close(4000, 'connect_timeout');
        reject(new Error('Connection timeout.'));
      }, this.options.connectTimeoutMs);

      this.ws.onopen = () => {
        this.lastReceivedAt = Date.now();
        this.clearConnectTimer();

        if (this.authMode === 'frame' && this.token) {
          const authFrame: GatewayAuthFrame = { type: 'auth', token: this.token };
          this.safeSend(authFrame);
        }

        this.reconnectAttempt = 0;
        this.startKeepAlive();
        this.emitStatus('connected');
        resolve();
      };

      this.ws.onerror = () => {
        this.clearConnectTimer();
        this.emitStatus('error', 'Gateway connection error.');
        reject(new Error('Gateway connection error.'));
      };

      this.ws.onclose = () => {
        this.clearConnectTimer();
        this.clearTimers();
        this.rejectAllPending('Gateway disconnected.');
        this.emitStatus('disconnected');

        if (!this.manuallyDisconnected && this.shouldReconnect) {
          this.scheduleReconnect();
        }
      };

      this.ws.onmessage = (event) => {
        this.lastReceivedAt = Date.now();
        this.handleMessage(event.data);
      };
    });
  }

  private handleMessage(rawData: string): void {
    let frame: GatewayWireFrame;
    try {
      frame = JSON.parse(rawData) as GatewayWireFrame;
    } catch {
      return;
    }

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
      pending.reject(new Error(safeErrorMessage(frame.error.message)));
      return;
    }

    if (typeof frame === 'object' && frame !== null && frame.type === 'pong') {
      return;
    }

    if (isEventFrame(frame)) {
      const normalized = normalizeEvent(frame);
      for (const handler of this.eventHandlers) {
        handler(normalized, frame);
      }
    }
  }

  private emitStatus(status: ClientStatus, message?: string): void {
    for (const handler of this.statusHandlers) {
      handler(status, message);
    }
  }

  private safeSend(payload: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(payload));
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    const delay = Math.min(2 ** this.reconnectAttempt * 1000, BACKOFF_CAP_MS);
    this.reconnectAttempt += 1;

    this.reconnectTimer = window.setTimeout(async () => {
      try {
        await this.openSocket();
      } catch {
        this.scheduleReconnect();
      }
    }, delay);
  }

  private startKeepAlive(): void {
    this.clearPingTimer();
    this.clearStaleTimer();

    this.pingTimer = window.setInterval(() => {
      const ping: GatewayPingFrame = { type: 'ping', ts: Date.now() };
      this.safeSend(ping);
    }, this.options.pingIntervalMs);

    this.staleTimer = window.setInterval(() => {
      const age = Date.now() - this.lastReceivedAt;
      if (age > this.options.staleTimeoutMs) {
        this.ws?.close(4001, 'stale_connection');
      }
    }, 5_000);
  }

  private rejectAllPending(message: string): void {
    for (const pending of this.pending.values()) {
      window.clearTimeout(pending.timeout);
      pending.reject(new Error(message));
    }
    this.pending.clear();
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private clearConnectTimer(): void {
    if (this.connectTimer !== null) {
      window.clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
  }

  private clearPingTimer(): void {
    if (this.pingTimer !== null) {
      window.clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private clearStaleTimer(): void {
    if (this.staleTimer !== null) {
      window.clearInterval(this.staleTimer);
      this.staleTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearConnectTimer();
    this.clearPingTimer();
    this.clearStaleTimer();
  }
}

class MockGatewayClient implements GatewayClientLike {
  async connect(_input: ConnectInput): Promise<void> {
    return;
  }
  disconnect(): void {
    return;
  }
  onEvent(_handler: EventHandler): () => void {
    return () => undefined;
  }
  onStatus(_handler: StatusHandler): () => void {
    return () => undefined;
  }
  call<T>(_method: GatewayRpcMethod | (string & {}), _params: Record<string, unknown> = {}): Promise<T> {
    return Promise.reject(new Error('Mock gateway has no RPC support.'));
  }
}

let singleton: GatewayClientLike | null = null;

export const createGatewayClient = () => {
  if (!singleton) {
    singleton = import.meta.env.VITE_USE_MOCK_GATEWAY === 'true' ? new MockGatewayClient() : new GatewayClient();
  }
  return singleton;
};

export const parseAgentsList = (result: unknown): AgentSummary[] => {
  const list = Array.isArray(result)
    ? result
    : typeof result === 'object' && result !== null && Array.isArray((result as { agents?: unknown[] }).agents)
      ? (result as { agents: unknown[] }).agents
      : [];

  return list.map(toAgentSummary).filter((agent): agent is AgentSummary => agent !== null);
};
