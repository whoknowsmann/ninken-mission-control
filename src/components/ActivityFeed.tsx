import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useMemo } from 'react';
import { useActivityStore } from '../stores/activity';
import { useAgentsStore } from '../stores/agents';
import type { ActivityType } from '../lib/gateway/types';
import { ActivityItem } from './ActivityItem';

const types: (ActivityType | 'all')[] = ['all', 'run_started', 'run_ended', 'chat', 'tool', 'error', 'presence', 'heartbeat', 'settings'];

export function ActivityFeed() {
  const { list, selectedAgentId, selectedTypes, setFilter } = useActivityStore();
  const agents = useAgentsStore((s) => s.agentOrder.map((id) => s.agentsById[id]));

  const filtered = useMemo(() => {
    return list.filter((item) => {
      const agentOk = selectedAgentId === 'all' || item.agentId === selectedAgentId;
      const typeOk = selectedTypes.includes('all') || selectedTypes.includes(item.type);
      return agentOk && typeOk;
    });
  }, [list, selectedAgentId, selectedTypes]);

  return (
    <section className="mt-6 rounded-[var(--border-radius)] border border-white/10 bg-[var(--bg-card)] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold tracking-wide">ACTIVITY FEED</h2>
        <div className="flex gap-2">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger className="rounded bg-white/10 px-3 py-1 text-xs">Agent: {selectedAgentId}</DropdownMenu.Trigger>
            <DropdownMenu.Content className="rounded-md border border-white/10 bg-[var(--bg-modal)] p-1">
              <DropdownMenu.Item className="cursor-pointer rounded px-2 py-1 text-sm hover:bg-white/10" onSelect={() => setFilter('all', selectedTypes)}>all</DropdownMenu.Item>
              {agents.map((agent) => (
                <DropdownMenu.Item key={agent.id} className="cursor-pointer rounded px-2 py-1 text-sm hover:bg-white/10" onSelect={() => setFilter(agent.id, selectedTypes)}>
                  {agent.name}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Root>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger className="rounded bg-white/10 px-3 py-1 text-xs">Type: {selectedTypes[0]}</DropdownMenu.Trigger>
            <DropdownMenu.Content className="rounded-md border border-white/10 bg-[var(--bg-modal)] p-1">
              {types.map((type) => (
                <DropdownMenu.Item key={type} className="cursor-pointer rounded px-2 py-1 text-sm hover:bg-white/10" onSelect={() => setFilter(selectedAgentId, type === 'all' ? ['all'] : [type])}>
                  {type}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>
      </div>
      <div className="space-y-2">
        {filtered.map((item) => (
          <ActivityItem key={item.id} item={item} />
        ))}
        {filtered.length === 0 && <p className="text-sm text-[var(--text-muted)]">No activity matches filter.</p>}
      </div>
    </section>
  );
}
