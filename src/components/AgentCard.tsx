import { useState } from 'react';
import clsx from 'clsx';
import type { AgentSummary } from '../lib/gateway/types';
import { AgentCardExpanded } from './AgentCardExpanded';

export function AgentCard({ agent }: { agent: AgentSummary }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <article
      className={clsx(
        'rounded-[var(--border-radius)] border p-4 transition duration-300 hover:-translate-y-[2px] hover:shadow-xl',
        agent.status === 'running' ? 'border-[var(--accent)] shadow-[0_0_20px_var(--accent-glow)] bg-[var(--bg-card)]' : 'border-white/10 bg-[var(--bg-card-idle)]'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={clsx('h-2.5 w-2.5 rounded-full animate-pulse', agent.status === 'running' ? 'bg-[var(--status-running)]' : agent.status === 'error' ? 'bg-[var(--status-error)]' : 'bg-[var(--status-idle)]')} />
            <h3 className="text-lg font-semibold">{agent.name}</h3>
            <span className="text-xs uppercase text-[var(--text-muted)]">{agent.status}</span>
          </div>
          <p className="mt-2 text-sm text-[var(--text-muted)]">{agent.lastMessage ?? 'No recent updates.'}</p>
        </div>
        <button className="rounded bg-white/10 px-3 py-1 text-xs" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Hide' : 'Expand'}
        </button>
      </div>
      {expanded && <AgentCardExpanded agent={agent} onCollapse={() => setExpanded(false)} />}
    </article>
  );
}
