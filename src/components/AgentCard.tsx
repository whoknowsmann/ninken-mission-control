import { useState } from 'react';
import clsx from 'clsx';
import type { AgentSummary, ThinkingLevel } from '../lib/gateway/types';
import { AgentCardExpanded } from './AgentCardExpanded';

export function AgentCard({
  agent,
  messages,
  onSendChat,
  onStop,
  onUpdateSettings
}: {
  agent: AgentSummary;
  messages: { id: string; role: 'user' | 'agent' | 'system'; text: string; ts: number }[];
  onSendChat: (agent: AgentSummary, text: string) => void;
  onStop: (agent: AgentSummary) => void;
  onUpdateSettings: (agent: AgentSummary, settings: { model: string; thinking: ThinkingLevel }) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (expanded) {
    return (
      <AgentCardExpanded
        agent={agent}
        messages={messages}
        onCollapse={() => setExpanded(false)}
        onSendChat={(text) => onSendChat(agent, text)}
        onStop={() => onStop(agent)}
        onUpdateSettings={(settings) => onUpdateSettings(agent, settings)}
      />
    );
  }

  return (
    <article
      className={clsx(
        'group cursor-pointer rounded-[var(--border-radius)] border border-white/10 bg-[var(--bg-card-idle)] p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl',
        agent.status === 'running' && 'shadow-[0_0_20px_var(--accent-glow)]'
      )}
      onClick={() => setExpanded(true)}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={clsx('h-2.5 w-2.5 rounded-full animate-pulse', {
              'bg-[var(--status-running)]': agent.status === 'running',
              'bg-[var(--status-idle)]': agent.status === 'idle' || agent.status === 'disconnected',
              'bg-[var(--status-error)]': agent.status === 'error'
            })}
          />
          <h3 className="font-semibold text-[var(--text-primary)]">{agent.name}</h3>
        </div>
        <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">{agent.status}</span>
      </div>
      <p className="text-sm text-[var(--text-muted)]">{agent.lastMessage ?? 'No recent messages.'}</p>
      <p className="mt-3 text-xs text-[var(--text-dim)]">Tap to expand</p>
    </article>
  );
}
