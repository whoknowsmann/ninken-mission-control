import { create } from 'zustand';
import type { ActivityItem, ActivityType } from '../lib/gateway/types';

interface ActivityState {
  list: ActivityItem[];
  selectedAgentId: string | 'all';
  selectedTypes: ActivityType[] | ['all'];
  addActivity: (item: ActivityItem) => void;
  setFilter: (agentId: string | 'all', types: ActivityType[] | ['all']) => void;
  clear: () => void;
}

export const useActivityStore = create<ActivityState>((set) => ({
  list: [],
  selectedAgentId: 'all',
  selectedTypes: ['all'],
  addActivity: (item) => set((state) => ({ list: [item, ...state.list] })),
  setFilter: (agentId, types) => set(() => ({ selectedAgentId: agentId, selectedTypes: types })),
  clear: () => set(() => ({ list: [] }))
}));
