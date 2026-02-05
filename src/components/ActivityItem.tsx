import type { ActivityItem as ActivityModel } from '../lib/gateway/types';

export function ActivityItem({ item }: { item: ActivityModel }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-3">
      <div className="mb-1 flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>{new Date(item.ts).toLocaleTimeString()}</span>
        <span className="uppercase">{item.type}</span>
      </div>
      <p className="text-sm text-[var(--text-primary)]">
        <span className="mr-1 text-[var(--accent)]">{item.agentName}:</span>
        {item.summary}
      </p>
    </div>
  );
}
