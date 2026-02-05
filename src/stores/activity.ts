import { create } from 'zustand';
import type { ActivityItem, ActivityType } from '../lib/gateway/types';

type ActivityFilter = {
  selectedAgentId: string | 'all';
  selectedTypes: ActivityType[] | ['all'];
};

type ActivityState = {
  items: ActivityItem[];
  filter: ActivityFilter;
  addActivity: (item: ActivityItem) => void;
  setFilter: (partial: Partial<ActivityFilter>) => void;
  clear: () => void;
};

export const useActivityStore = create<ActivityState>((set) => ({
  items: [],
  filter: {
    selectedAgentId: 'all',
    selectedTypes: ['all']
  },
  addActivity: (item) =>
    set((state) => ({
      items: [item, ...state.items]
    })),
  setFilter: (partial) =>
    set((state) => ({
      filter: {
        ...state.filter,
        ...partial
      }
    })),
  clear: () => set({ items: [] })
}));
