import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import clsx from 'clsx';
import { ChatInput } from './ChatInput';
import { ChatOutput } from './ChatOutput';
import type { AgentSummary, ThinkingLevel } from '../lib/gateway/types';

const modelOptions = ['claude-sonnet-4', 'gpt-4.1', 'gpt-4o-mini'];
const thinkingOptions: ThinkingLevel[] = ['low', 'medium', 'high'];

type Props = {
  agent: AgentSummary;
  messages: { id: string; role: 'user' | 'agent' | 'system'; text: string; ts: number }[];
  onCollapse: () => void;
  onSendChat: (text: string) => void;
  onStop: () => void;
  onUpdateSettings: (settings: { model: string; thinking: ThinkingLevel }) => void;
};

function SelectMenu({
  label,
  value,
  options,
  onSelect
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-black/20 px-3 py-2 text-xs text-[var(--text-primary)] outline-none transition hover:border-[var(--accent)]">
        <span className="text-[var(--text-muted)]">{label}:</span>
        <span>{value}</span>
        <ChevronDownIcon />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={8}
          className="min-w-40 rounded-lg border border-white/10 bg-[var(--bg-modal)] p-1 text-sm text-[var(--text-primary)] shadow-2xl"
        >
          {options.map((option) => (
            <DropdownMenu.Item
              key={option}
              onSelect={() => onSelect(option)}
              className="cursor-pointer rounded px-2 py-1.5 outline-none transition hover:bg-white/10 focus:bg-white/10"
            >
              {option}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function AgentCardExpanded({ agent, messages, onCollapse, onSendChat, onStop, onUpdateSettings }: Props) {
  return (
    <div className="space-y-3 rounded-[var(--border-radius)] border border-white/10 bg-[var(--bg-card)] p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[var(--text-primary)]">{agent.name}</h3>
        <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">{agent.status}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SelectMenu label="Model" value={agent.model} options={modelOptions} onSelect={(model) => onUpdateSettings({ model, thinking: agent.thinking })} />
        <SelectMenu
          label="Thinking"
          value={agent.thinking}
          options={thinkingOptions}
          onSelect={(thinking) => onUpdateSettings({ model: agent.model, thinking: thinking as ThinkingLevel })}
        />
        <button
          onClick={onStop}
          className={clsx('rounded-lg border px-3 py-2 text-xs font-semibold transition', {
            'border-[var(--status-error)] text-[var(--status-error)] hover:bg-[var(--status-error)]/10': agent.status === 'running',
            'cursor-not-allowed border-white/10 text-[var(--text-dim)]': agent.status !== 'running'
          })}
          disabled={agent.status !== 'running'}
        >
          Stop
        </button>
        <button
          onClick={onCollapse}
          className="rounded-lg border border-white/20 px-3 py-2 text-xs text-[var(--text-muted)] transition hover:border-white/40 hover:text-[var(--text-primary)]"
        >
          Collapse
        </button>
      </div>

      <ChatOutput messages={messages} />
      <ChatInput onSend={onSendChat} />
    </div>
  );
}
