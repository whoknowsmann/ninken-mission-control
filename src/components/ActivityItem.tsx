import { memo } from 'react';
import type { ActivityItem as Item } from '../lib/gateway/types';

const iconByType: Record<Item['type'], string> = {
  run_started: '▶',
  run_ended: '■',
  chat: '💬',
  tool: '🧰',
  error: '⚠',
  presence: '●',
  heartbeat: '♥',
  settings: '⚙'
};

export const ActivityItem = memo(function ActivityItem({ item }: { item: Item }) {
  return (
    <li className="rounded-lg border border-white/10 bg-black/20 p-3">
      <div className="mb-1 flex items-center justify-between text-xs text-[var(--text-dim)]">
        <span>{new Date(item.ts).toLocaleTimeString()}</span>
        <span className="uppercase tracking-widest">{item.type.replace('_', ' ')}</span>
      </div>
      <p className="text-sm text-[var(--text-primary)]">
        <span className="mr-2">{iconByType[item.type]}</span>
        <span className="font-semibold text-[var(--accent)]">{item.agentName}:</span> {item.summary}
      </p>
    </li>
  );
});
