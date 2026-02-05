import type { GatewayEvents } from './events';
import type { ActivityItem, AgentSummary, ThinkingLevel } from './types';

const makeId = () => Math.random().toString(36).slice(2, 10);

const initialAgents = (): AgentSummary[] => [
  {
    id: 'henry',
    name: 'Henry',
    status: 'running',
    lastMessage: 'Indexing mission transcripts...',
    lastUpdatedAt: Date.now(),
    sessionKey: 'sess_henry',
    model: 'claude-sonnet-4',
    thinking: 'high',
    error: null
  },
  {
    id: 'alfred',
    name: 'Alfred',
    status: 'idle',
    lastMessage: 'Awaiting instructions.',
    lastUpdatedAt: Date.now(),
    sessionKey: 'sess_alfred',
    model: 'claude-sonnet-4',
    thinking: 'medium',
    error: null
  },
  {
    id: 'quincy',
    name: 'Quincy',
    status: 'error',
    lastMessage: 'Gateway timeout during tool call.',
    lastUpdatedAt: Date.now(),
    sessionKey: 'sess_quincy',
    model: 'claude-sonnet-4',
    thinking: 'low',
    error: 'Last run failed due to timeout.'
  }
];

const initialTimeline = (): Omit<ActivityItem, 'id'>[] => {
  const now = Date.now();
  return [
    {
      ts: now - 90_000,
      agentId: 'henry',
      agentName: 'Henry',
      type: 'run_started',
      summary: 'Started mission scan on queue A.'
    },
    {
      ts: now - 75_000,
      agentId: 'alfred',
      agentName: 'Alfred',
      type: 'presence',
      summary: 'Connected and ready.'
    },
    {
      ts: now - 60_000,
      agentId: 'quincy',
      agentName: 'Quincy',
      type: 'error',
      summary: 'Tool execution timeout while fetching logs.'
    },
    {
      ts: now - 40_000,
      agentId: 'henry',
      agentName: 'Henry',
      type: 'heartbeat',
      summary: 'Heartbeat received.'
    }
  ];
};

class MockGatewayClient {
  private events: GatewayEvents;
  private streamingTimers = new Map<string, number>();
  private connected = false;

  constructor(events: GatewayEvents) {
    this.events = events;
  }

  connect(): void {
    this.connected = true;
    this.events.onConnected?.();

    const agents = initialAgents();
    this.events.onAgentsHydrate?.(agents);

    for (const item of initialTimeline()) {
      this.events.onActivity?.({ ...item, id: makeId() });
    }
  }

  disconnect(): void {
    this.connected = false;
    this.clearTimers();
    this.events.onDisconnected?.();
  }

  stop(agent: AgentSummary): void {
    this.clearStream(agent.id);
    this.events.onAgentStatus?.(agent.id, 'idle', null);
    this.events.onActivity?.({
      id: makeId(),
      ts: Date.now(),
      agentId: agent.id,
      agentName: agent.name,
      type: 'run_ended',
      summary: 'Run ended by operator (abort).'
    });
  }

  patchSettings(agent: AgentSummary, settings: { model: string; thinking: ThinkingLevel }): void {
    this.events.onAgentSettings?.(agent.id, settings);
    this.events.onActivity?.({
      id: makeId(),
      ts: Date.now(),
      agentId: agent.id,
      agentName: agent.name,
      type: 'settings',
      summary: `Updated settings: ${settings.model}, thinking ${settings.thinking}.`,
      meta: settings
    });
  }

  sendChat(agent: AgentSummary, text: string): void {
    if (!this.connected) return;

    this.events.onChatMessage?.({
      id: makeId(),
      agentId: agent.id,
      role: 'user',
      text,
      ts: Date.now()
    });

    this.events.onActivity?.({
      id: makeId(),
      ts: Date.now(),
      agentId: agent.id,
      agentName: agent.name,
      type: 'chat',
      summary: `User sent message to ${agent.name}.`
    });

    this.events.onAgentStatus?.(agent.id, 'running', null);

    const response = `Acknowledged. ${agent.name} is processing: ${text}.\nMission context synchronized.`;
    const chunks = response.match(/.{1,14}/g) ?? [response];

    let index = 0;
    const timer = window.setInterval(() => {
      const next = chunks[index];
      if (!next) {
        this.clearStream(agent.id);
        this.events.onAgentStatus?.(agent.id, 'idle', null);
        this.events.onActivity?.({
          id: makeId(),
          ts: Date.now(),
          agentId: agent.id,
          agentName: agent.name,
          type: 'run_ended',
          summary: 'Response stream completed.'
        });
        return;
      }

      this.events.onStreamingChunk?.(agent.id, next);
      index += 1;
    }, 180);

    this.streamingTimers.set(agent.id, timer);
  }

  private clearTimers(): void {
    for (const timer of this.streamingTimers.values()) {
      window.clearInterval(timer);
    }
    this.streamingTimers.clear();
  }

  private clearStream(agentId: string): void {
    const timer = this.streamingTimers.get(agentId);
    if (timer !== undefined) {
      window.clearInterval(timer);
      this.streamingTimers.delete(agentId);
    }
  }
}

let singleton: MockGatewayClient | null = null;

export const createGatewayClient = (events: GatewayEvents): MockGatewayClient => {
  singleton ??= new MockGatewayClient(events);
  return singleton;
};
