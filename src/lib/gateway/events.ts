import type { ActivityItem, AgentSummary } from './types';

export interface GatewayConnectPayload {
  agents: AgentSummary[];
  activity: ActivityItem[];
}
