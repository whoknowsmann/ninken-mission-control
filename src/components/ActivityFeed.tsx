import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useActivityStore } from '../stores/activity';
import { useAgentsStore } from '../stores/agents';
import type { ActivityType } from '../lib/gateway/types';
import { ActivityItem } from './ActivityItem';

const types: (ActivityType | 'all')[] = ['all', 'run_started', 'run_ended', 'chat', 'tool', 'error', 'presence', 'heartbeat', 'settings'];

export function ActivityFeed() {
  const { items, filter, setFilter } = useActivityStore();
  const agents = useAgentsStore(useShallow((state) => state.agentOrder.map((id) => state.agentsById[id])));

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const agentMatch = filter.selectedAgentId === 'all' || item.agentId === filter.selectedAgentId;
      const typeMatch = filter.selectedTypes.includes('all') || filter.selectedTypes.includes(item.type);
      return agentMatch && typeMatch;
    });
  }, [filter.selectedAgentId, filter.selectedTypes, items]);

  return (
    <section className="mt-6 rounded-[var(--border-radius)] border border-white/10 bg-[var(--bg-card)] p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-[0.2em] text-[var(--text-primary)]">ACTIVITY FEED</h2>
        <div className="flex gap-2">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-3 py-2 text-xs text-[var(--text-primary)]">
              Agent: {filter.selectedAgentId === 'all' ? 'All' : agents.find((agent) => agent.id === filter.selectedAgentId)?.name}
              <ChevronDownIcon />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="rounded-lg border border-white/10 bg-[var(--bg-modal)] p-1 text-sm" sideOffset={8}>
                <DropdownMenu.Item className="rounded px-2 py-1.5 outline-none hover:bg-white/10" onSelect={() => setFilter({ selectedAgentId: 'all' })}>
                  All
                </DropdownMenu.Item>
                {agents.map((agent) => (
                  <DropdownMenu.Item
                    key={agent.id}
                    className="rounded px-2 py-1.5 outline-none hover:bg-white/10"
                    onSelect={() => setFilter({ selectedAgentId: agent.id })}
                  >
                    {agent.name}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-3 py-2 text-xs text-[var(--text-primary)]">
              Type: {filter.selectedTypes[0]}
              <ChevronDownIcon />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="rounded-lg border border-white/10 bg-[var(--bg-modal)] p-1 text-sm" sideOffset={8}>
                {types.map((type) => (
                  <DropdownMenu.Item
                    key={type}
                    className="rounded px-2 py-1.5 outline-none hover:bg-white/10"
                    onSelect={() => setFilter({ selectedTypes: [type] as typeof filter.selectedTypes })}
                  >
                    {type}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
      <ul className="space-y-2">{filtered.map((item) => <ActivityItem key={item.id} item={item} />)}</ul>
    </section>
  );
}
