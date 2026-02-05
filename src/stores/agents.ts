import { create } from 'zustand';
import type { AgentSummary, ChatMessage, ThinkingLevel } from '../lib/gateway/types';

type AgentMap = Record<string, AgentSummary>;

type AgentsState = {
  agentsById: AgentMap;
  agentOrder: string[];
  chatsByAgentId: Record<string, ChatMessage[]>;
  hydrateAgents: (list: AgentSummary[]) => void;
  setAgentStatus: (id: string, status: AgentSummary['status'], error?: string | null) => void;
  setAgentLastMessage: (id: string, text: string | null) => void;
  setAgentSettings: (id: string, settings: { model: string; thinking: ThinkingLevel }) => void;
  appendChatMessage: (message: ChatMessage) => void;
  appendStreamingChunk: (agentId: string, chunk: string) => void;
  clearTokenSensitiveDataOnDisconnect: () => void;
};

export const useAgentsStore = create<AgentsState>((set) => ({
  agentsById: {},
  agentOrder: [],
  chatsByAgentId: {},
  hydrateAgents: (list) =>
    set(() => {
      const agentsById = list.reduce<AgentMap>((acc, agent) => {
        acc[agent.id] = agent;
        return acc;
      }, {});
      return {
        agentsById,
        agentOrder: list.map((agent) => agent.id)
      };
    }),
  setAgentStatus: (id, status, error = null) =>
    set((state) => {
      const agent = state.agentsById[id];
      if (!agent) return state;
      return {
        agentsById: {
          ...state.agentsById,
          [id]: {
            ...agent,
            status,
            error,
            lastUpdatedAt: Date.now()
          }
        }
      };
    }),
  setAgentLastMessage: (id, text) =>
    set((state) => {
      const agent = state.agentsById[id];
      if (!agent) return state;
      return {
        agentsById: {
          ...state.agentsById,
          [id]: {
            ...agent,
            lastMessage: text,
            lastUpdatedAt: Date.now()
          }
        }
      };
    }),
  setAgentSettings: (id, settings) =>
    set((state) => {
      const agent = state.agentsById[id];
      if (!agent) return state;
      return {
        agentsById: {
          ...state.agentsById,
          [id]: {
            ...agent,
            ...settings,
            lastUpdatedAt: Date.now()
          }
        }
      };
    }),
  appendChatMessage: (message) =>
    set((state) => {
      const messages = state.chatsByAgentId[message.agentId] ?? [];
      return {
        chatsByAgentId: {
          ...state.chatsByAgentId,
          [message.agentId]: [...messages, message]
        }
      };
    }),
  appendStreamingChunk: (agentId, chunk) =>
    set((state) => {
      const messages = state.chatsByAgentId[agentId] ?? [];
      const last = messages[messages.length - 1];
      if (!last || last.role !== 'agent') {
        const newMessage: ChatMessage = {
          id: `stream-${agentId}-${Date.now()}`,
          agentId,
          role: 'agent',
          text: chunk,
          ts: Date.now()
        };
        return {
          chatsByAgentId: {
            ...state.chatsByAgentId,
            [agentId]: [...messages, newMessage]
          }
        };
      }

      const updated = [...messages];
      updated[updated.length - 1] = {
        ...last,
        text: `${last.text}${chunk}`,
        ts: Date.now()
      };

      return {
        chatsByAgentId: {
          ...state.chatsByAgentId,
          [agentId]: updated
        }
      };
    }),
  clearTokenSensitiveDataOnDisconnect: () =>
    set(() => ({
      chatsByAgentId: {}
    }))
}));
