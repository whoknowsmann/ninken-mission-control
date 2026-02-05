import type { ActivityItem, AgentSummary, ThinkingLevel } from './types';
import { useAgentsStore } from '../../stores/agents';
import { useActivityStore } from '../../stores/activity';

const sampleAgents = (): AgentSummary[] => {
  const now = Date.now();
  return [
    {
      id: 'henry',
      name: 'Henry',
      status: 'running',
      lastMessage: 'Indexing incident patterns…',
      lastUpdatedAt: now,
      sessionKey: 'sess_henry',
      model: 'claude-sonnet-4',
      thinking: 'high',
      error: null
    },
    {
      id: 'alfred',
      name: 'Alfred',
      status: 'idle',
      lastMessage: 'Ready for the next mission.',
      lastUpdatedAt: now,
      sessionKey: 'sess_alfred',
      model: 'claude-sonnet-4',
      thinking: 'medium',
      error: null
    },
    {
      id: 'quincy',
      name: 'Quincy',
      status: 'error',
      lastMessage: 'Gateway timeout on tool run.',
      lastUpdatedAt: now,
      sessionKey: 'sess_quincy',
      model: 'claude-sonnet-4',
      thinking: 'low',
      error: 'Last run failed'
    }
  ];
};

const baseActivity = (): ActivityItem[] => [
  { id: crypto.randomUUID(), ts: Date.now() - 40_000, agentId: 'henry', agentName: 'Henry', type: 'run_started', summary: 'Started retrieval plan' },
  { id: crypto.randomUUID(), ts: Date.now() - 28_000, agentId: 'quincy', agentName: 'Quincy', type: 'error', summary: 'Tool execution failed' },
  { id: crypto.randomUUID(), ts: Date.now() - 16_000, agentId: 'alfred', agentName: 'Alfred', type: 'presence', summary: 'Heartbeat nominal' }
];

class MockGatewayClient {
  private timers = new Set<number>();

  async connect(_: { gatewayUrl: string; token: string }) {
    const agents = sampleAgents();
    useAgentsStore.getState().hydrateAgents(agents);
    useActivityStore.getState().clear();
    baseActivity().forEach((item) => useActivityStore.getState().addActivity(item));
  }

  disconnect() {
    this.timers.forEach((timer) => window.clearInterval(timer));
    this.timers.clear();
    useAgentsStore.getState().clearTokenSensitiveDataOnDisconnect();
    useActivityStore.getState().addActivity({
      id: crypto.randomUUID(),
      ts: Date.now(),
      agentId: 'system',
      agentName: 'System',
      type: 'presence',
      summary: 'Disconnected from gateway'
    });
  }

  sendChat(agentId: string, text: string) {
    const agents = useAgentsStore.getState();
    const agent = agents.agentsById[agentId];
    if (!agent) return;

    agents.appendChatMessage({ id: crypto.randomUUID(), agentId, role: 'user', text, ts: Date.now() });
    useActivityStore.getState().addActivity({
      id: crypto.randomUUID(),
      ts: Date.now(),
      agentId,
      agentName: agent.name,
      type: 'chat',
      summary: `User sent message to ${agent.name}`
    });

    const chunks = [`${agent.name} ack: `, 'processing mission context… ', 'recommend action path alpha.'];
    let idx = 0;
    const timer = window.setInterval(() => {
      const chunk = chunks[idx];
      if (!chunk) {
        window.clearInterval(timer);
        this.timers.delete(timer);
        const last = useAgentsStore.getState().chatByAgent[agentId]?.slice(-1)[0];
        if (last?.role === 'agent') useAgentsStore.getState().setAgentLastMessage(agentId, last.text);
        return;
      }
      useAgentsStore.getState().appendStreamingChunk(agentId, chunk);
      idx += 1;
    }, 450);
    this.timers.add(timer);
  }

  stopAgent(agentId: string) {
    const agent = useAgentsStore.getState().agentsById[agentId];
    if (!agent || agent.status !== 'running') return;
    useAgentsStore.getState().setAgentStatus(agentId, 'idle');
    useActivityStore.getState().addActivity({
      id: crypto.randomUUID(),
      ts: Date.now(),
      agentId,
      agentName: agent.name,
      type: 'run_ended',
      summary: `${agent.name} run aborted by operator`
    });
  }

  patchAgentSettings(agentId: string, model: string, thinking: ThinkingLevel) {
    const agent = useAgentsStore.getState().agentsById[agentId];
    if (!agent) return;
    useAgentsStore.getState().setAgentSettings(agentId, { model, thinking });
    useActivityStore.getState().addActivity({
      id: crypto.randomUUID(),
      ts: Date.now(),
      agentId,
      agentName: agent.name,
      type: 'settings',
      summary: `${agent.name} settings updated to ${model}/${thinking}`
    });
  }
}

export const gatewayClient = new MockGatewayClient();
