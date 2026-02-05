import { useEffect, useMemo } from 'react';
import { GearIcon } from '@radix-ui/react-icons';
import { useShallow } from 'zustand/react/shallow';
import { ConnectionStatus } from './components/ConnectionStatus';
import { AgentCard } from './components/AgentCard';
import { ActivityFeed } from './components/ActivityFeed';
import { SettingsModal } from './components/SettingsModal';
import { useAgentsStore } from './stores/agents';
import { useConnectionStore } from './stores/connection';
import { useActivityStore } from './stores/activity';
import { createGatewayClient } from './lib/gateway/client';

function useGateway() {
  const hydrateAgents = useAgentsStore((state) => state.hydrateAgents);
  const appendChatMessage = useAgentsStore((state) => state.appendChatMessage);
  const appendStreamingChunk = useAgentsStore((state) => state.appendStreamingChunk);
  const setAgentStatus = useAgentsStore((state) => state.setAgentStatus);
  const setAgentSettings = useAgentsStore((state) => state.setAgentSettings);
  const setAgentLastMessage = useAgentsStore((state) => state.setAgentLastMessage);
  const addActivity = useActivityStore((state) => state.addActivity);
  const setStatus = useConnectionStore((state) => state.setStatus);
  const setLastError = useConnectionStore((state) => state.setLastError);

  return useMemo(
    () =>
      createGatewayClient({
        onAgentsHydrate: hydrateAgents,
        onChatMessage: (message) => {
          appendChatMessage(message);
          setAgentLastMessage(message.agentId, message.text);
        },
        onStreamingChunk: (agentId, chunk) => {
          appendStreamingChunk(agentId, chunk);
          const chats = useAgentsStore.getState().chatsByAgentId[agentId] ?? [];
          const lastAgent = [...chats].reverse().find((msg) => msg.role === 'agent');
          if (lastAgent) {
            setAgentLastMessage(agentId, `${lastAgent.text}${chunk}`);
          }
        },
        onAgentStatus: setAgentStatus,
        onActivity: addActivity,
        onAgentSettings: setAgentSettings,
        onConnectionChange: (status, reason) => {
          setStatus(status);
          if (status === 'error') {
            setLastError(reason ?? 'Gateway error.');
            addActivity({
              id: `conn-${Date.now()}`,
              ts: Date.now(),
              agentId: 'system',
              agentName: 'Gateway',
              type: 'error',
              summary: reason ?? 'Gateway error.'
            });
          }
          if ((status === 'error' || status === 'disconnected') && !useConnectionStore.getState().rememberToken) {
            useConnectionStore.getState().setToken('');
          }
        }
      }),
    [addActivity, appendChatMessage, appendStreamingChunk, hydrateAgents, setAgentLastMessage, setAgentSettings, setAgentStatus, setLastError, setStatus]
  );
}

export default function App() {
  const gateway = useGateway();
  const { status, openSettings, connect, disconnect, setGatewayController } = useConnectionStore();
  const clearTokenSensitiveDataOnDisconnect = useAgentsStore((state) => state.clearTokenSensitiveDataOnDisconnect);
  const agents = useAgentsStore(useShallow((state) => state.agentOrder.map((id) => state.agentsById[id])));
  const chatsByAgentId = useAgentsStore(useShallow((state) => state.chatsByAgentId));

  useEffect(() => {
    setGatewayController(gateway);
    return () => setGatewayController(null);
  }, [gateway, setGatewayController]);

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-6">
      <header className="mb-5 flex items-center justify-between rounded-[var(--border-radius)] border border-white/10 bg-[var(--bg-card)] px-4 py-3">
        <h1 className="text-sm font-bold tracking-[0.25em] text-[var(--text-primary)]">NINKEN CONSOLE</h1>
        <div className="flex items-center gap-2">
          <ConnectionStatus status={status} />
          <button
            onClick={openSettings}
            className="rounded-full border border-white/10 p-2 text-[var(--text-muted)] transition hover:border-white/30 hover:text-[var(--text-primary)]"
            aria-label="Open settings"
          >
            <GearIcon />
          </button>
        </div>
      </header>

      <main>
        <section className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-2">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              messages={chatsByAgentId[agent.id] ?? []}
              onSendChat={(targetAgent, text) => void gateway.sendChat(targetAgent, text)}
              onStop={(targetAgent) => void gateway.stop(targetAgent)}
              onUpdateSettings={(targetAgent, settings) => void gateway.patchSettings(targetAgent, settings)}
            />
          ))}
        </section>

        <ActivityFeed />
      </main>

      <SettingsModal
        onConnect={async () => {
          await connect();
        }}
        onDisconnect={() => {
          disconnect();
          clearTokenSensitiveDataOnDisconnect();
        }}
      />
    </div>
  );
}
