import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { AgentSummary, ThinkingLevel } from '../lib/gateway/types';
import { useAgentsStore } from '../stores/agents';
import { gatewayClient } from '../lib/gateway/client';
import { ChatOutput } from './ChatOutput';
import { ChatInput } from './ChatInput';

const models = ['claude-sonnet-4', 'gpt-4.1', 'openclaw-v2'];
const thinkingLevels: ThinkingLevel[] = ['low', 'medium', 'high'];

export function AgentCardExpanded({ agent, onCollapse }: { agent: AgentSummary; onCollapse: () => void }) {
  const messages = useAgentsStore((s) => s.chatByAgent[agent.id] ?? []);

  return (
    <div className="mt-3 rounded-md border border-white/10 bg-black/10 p-3">
      <div className="mb-3 flex flex-wrap gap-2">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger className="rounded bg-white/10 px-3 py-1 text-xs">Model: {agent.model}</DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="rounded-md border border-white/10 bg-[var(--bg-modal)] p-1">
              {models.map((model) => (
                <DropdownMenu.Item key={model} className="cursor-pointer rounded px-2 py-1 text-sm outline-none hover:bg-white/10" onSelect={() => gatewayClient.patchAgentSettings(agent.id, model, agent.thinking)}>
                  {model}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger className="rounded bg-white/10 px-3 py-1 text-xs">Thinking: {agent.thinking}</DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="rounded-md border border-white/10 bg-[var(--bg-modal)] p-1">
              {thinkingLevels.map((level) => (
                <DropdownMenu.Item key={level} className="cursor-pointer rounded px-2 py-1 text-sm outline-none hover:bg-white/10" onSelect={() => gatewayClient.patchAgentSettings(agent.id, agent.model, level)}>
                  {level}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <button className="rounded bg-[var(--status-error)]/80 px-3 py-1 text-xs" onClick={() => gatewayClient.stopAgent(agent.id)}>
          Stop
        </button>
        <button className="rounded bg-white/10 px-3 py-1 text-xs" onClick={onCollapse}>
          Collapse
        </button>
      </div>

      <ChatOutput messages={messages} />
      <ChatInput onSend={(text) => gatewayClient.sendChat(agent.id, text)} />
    </div>
  );
}
