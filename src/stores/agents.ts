import { create } from 'zustand';
import type { AgentStatus, AgentSummary, ChatMessage, ThinkingLevel } from '../lib/gateway/types';

type AgentSettings = { model: string; thinking: ThinkingLevel };

interface AgentsState {
  agentsById: Record<string, AgentSummary>;
  agentOrder: string[];
  chatByAgent: Record<string, ChatMessage[]>;
  hydrateAgents: (list: AgentSummary[]) => void;
  setAgentStatus: (id: string, status: AgentStatus, error?: string) => void;
  setAgentLastMessage: (id: string, text: string) => void;
  setAgentSettings: (id: string, settings: AgentSettings) => void;
  appendChatMessage: (message: ChatMessage) => void;
  appendStreamingChunk: (agentId: string, chunk: string) => void;
  clearTokenSensitiveDataOnDisconnect: () => void;
}

export const useAgentsStore = create<AgentsState>((set) => ({
  agentsById: {},
  agentOrder: [],
  chatByAgent: {},
  hydrateAgents: (list) =>
    set(() => ({
      agentsById: Object.fromEntries(list.map((a) => [a.id, a])),
      agentOrder: list.map((a) => a.id)
    })),
  setAgentStatus: (id, status, error) =>
    set((state) => {
      const agent = state.agentsById[id];
      if (!agent) return state;
      return {
        agentsById: {
          ...state.agentsById,
          [id]: { ...agent, status, error: error ?? null, lastUpdatedAt: Date.now() }
        }
      };
    }),
  setAgentLastMessage: (id, text) =>
    set((state) => ({
      agentsById: {
        ...state.agentsById,
        [id]: { ...state.agentsById[id], lastMessage: text, lastUpdatedAt: Date.now() }
      }
    })),
  setAgentSettings: (id, settings) =>
    set((state) => ({
      agentsById: {
        ...state.agentsById,
        [id]: { ...state.agentsById[id], ...settings, lastUpdatedAt: Date.now() }
      }
    })),
  appendChatMessage: (message) =>
    set((state) => ({
      chatByAgent: {
        ...state.chatByAgent,
        [message.agentId]: [...(state.chatByAgent[message.agentId] ?? []), message]
      }
    })),
  appendStreamingChunk: (agentId, chunk) =>
    set((state) => {
      const messages = [...(state.chatByAgent[agentId] ?? [])];
      const last = messages[messages.length - 1];
      if (last && last.role === 'agent') {
        messages[messages.length - 1] = { ...last, text: `${last.text}${chunk}`, ts: Date.now() };
      } else {
        messages.push({ id: crypto.randomUUID(), agentId, role: 'agent', text: chunk, ts: Date.now() });
      }
      return { chatByAgent: { ...state.chatByAgent, [agentId]: messages } };
    }),
  clearTokenSensitiveDataOnDisconnect: () => set(() => ({ chatByAgent: {} }))
}));
