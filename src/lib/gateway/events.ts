import type { ActivityItem, AgentSummary, ChatMessage } from './types';

export type GatewayEvents = {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onAgentsHydrate?: (agents: AgentSummary[]) => void;
  onChatMessage?: (message: ChatMessage) => void;
  onStreamingChunk?: (agentId: string, chunk: string) => void;
  onActivity?: (item: ActivityItem) => void;
  onAgentStatus?: (agentId: string, status: AgentSummary['status'], error?: string | null) => void;
  onAgentSettings?: (agentId: string, settings: Pick<AgentSummary, 'model' | 'thinking'>) => void;
  onError?: (message: string) => void;
};
