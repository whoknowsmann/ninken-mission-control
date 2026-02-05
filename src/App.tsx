import { useEffect, useMemo, useRef } from 'react';
import { GearIcon } from '@radix-ui/react-icons';
import { ConnectionStatus } from './components/ConnectionStatus';
import { AgentCard } from './components/AgentCard';
import { ActivityFeed } from './components/ActivityFeed';
import { SettingsModal } from './components/SettingsModal';
import { useAgentsStore } from './stores/agents';
import { useConnectionStore } from './stores/connection';
import { useActivityStore } from './stores/activity';
import { createGatewayClient, parseAgentsList } from './lib/gateway/client';

const makeId = () => Math.random().toString(36).slice(2, 10);

function useGateway() {
  const appendChatMessage = useAgentsStore((state) => state.appendChatMessage);
  const appendStreamingChunk = useAgentsStore((state) => state.appendStreamingChunk);
  const setAgentStatus = useAgentsStore((state) => state.setAgentStatus);
  const setAgentLastMessage = useAgentsStore((state) => state.setAgentLastMessage);
  const addActivity = useActivityStore((state) => state.addActivity);
  const setStatus = useConnectionStore((state) => state.setStatus);
  const setLastError = useConnectionStore((state) => state.setLastError);
  const lastHeartbeatAt = useRef(0);

  return useMemo(() => {
    const gateway = createGatewayClient();

    gateway.onStatus((status, message) => {
      if (status === 'connected') {
        setStatus('connected');
      } else if (status === 'connecting') {
        setStatus('connecting');
      } else if (status === 'disconnected') {
        setStatus('disconnected');
      } else if (status === 'error') {
        setStatus('error');
        setLastError(message ?? 'Gateway connection error.');
      }
    });

    gateway.onEvent((normalized) => {
      for (const update of normalized.statusUpdates) {
        setAgentStatus(update.agentId, update.status, update.error ?? null);
      }

      for (const chunk of normalized.chatChunks) {
        appendStreamingChunk(chunk.agentId, chunk.text);
        const chats = useAgentsStore.getState().chatsByAgentId[chunk.agentId] ?? [];
        const lastAgent = [...chats].reverse().find((msg) => msg.role === 'agent');
        if (lastAgent) {
          setAgentLastMessage(chunk.agentId, lastAgent.text);
        }
      }

      for (const chat of normalized.chatMessages) {
        appendChatMessage(chat.message);
        setAgentLastMessage(chat.message.agentId, chat.message.text);
      }

      for (const item of normalized.activityItems) {
        if (item.type === 'heartbeat') {
          const now = Date.now();
          if (now - lastHeartbeatAt.current < 15_000) continue;
          lastHeartbeatAt.current = now;
        }
        addActivity({ ...item, id: makeId() });
      }
    });

    return gateway;
  }, [addActivity, appendChatMessage, appendStreamingChunk, setAgentLastMessage, setAgentStatus, setLastError, setStatus]);
}

export default function App() {
  const gateway = useGateway();
  const { status, gatewayUrl, token, openSettings, setLastError, connect, disconnect } = useConnectionStore();
  const clearTokenSensitiveDataOnDisconnect = useAgentsStore((state) => state.clearTokenSensitiveDataOnDisconnect);
  const setAgentStatus = useAgentsStore((state) => state.setAgentStatus);
  const setAgentSettings = useAgentsStore((state) => state.setAgentSettings);
  const appendChatMessage = useAgentsStore((state) => state.appendChatMessage);
  const agents = useAgentsStore((state) => state.agentOrder.map((id) => state.agentsById[id]));
  const chatsByAgentId = useAgentsStore((state) => state.chatsByAgentId);
  const addActivity = useActivityStore((state) => state.addActivity);

  useEffect(() => {
    return () => gateway.disconnect();
  }, [gateway]);

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
              onSendChat={async (targetAgent, text) => {
                appendChatMessage({ id: makeId(), agentId: targetAgent.id, role: 'user', text, ts: Date.now() });
                try {
                  await gateway.call('chat.send', { sessionKey: targetAgent.sessionKey, message: text });
                } catch {
                  setLastError('Unable to send chat message.');
                }
              }}
              onStop={async (targetAgent) => {
                setAgentStatus(targetAgent.id, 'idle', null);
                try {
                  await gateway.call('chat.abort', { sessionKey: targetAgent.sessionKey });
                } catch {
                  setLastError('Unable to abort run.');
                }
              }}
              onUpdateSettings={async (targetAgent, settings) => {
                setAgentSettings(targetAgent.id, settings);
                try {
                  await gateway.call('sessions.patch', { key: targetAgent.sessionKey, model: settings.model, thinking: settings.thinking });
                  addActivity({
                    id: makeId(),
                    ts: Date.now(),
                    agentId: targetAgent.id,
                    agentName: targetAgent.name,
                    type: 'settings',
                    summary: `Updated settings: ${settings.model}, thinking ${settings.thinking}.`,
                    meta: settings
                  });
                } catch {
                  setLastError('Unable to update session settings.');
                }
              }}
            />
          ))}
        </section>

        <ActivityFeed />
      </main>

      <SettingsModal
        onConnect={async () => {
          const canConnect = await connect();
          if (!canConnect) return;

          try {
            await gateway.connect({ gatewayUrl, token, authMode: 'frame' });
            const result = await gateway.call('agents.list', {});
            const agents = parseAgentsList(result);
            useAgentsStore.getState().hydrateAgents(agents);
            addActivity({
              id: makeId(),
              ts: Date.now(),
              agentId: 'gateway',
              agentName: 'Gateway',
              type: 'presence',
              summary: 'Connected to gateway.'
            });
          } catch {
            useConnectionStore.getState().setStatus('error');
            setLastError('Unable to establish gateway connection.');
          }
        }}
        onDisconnect={() => {
          gateway.disconnect();
          disconnect();
          clearTokenSensitiveDataOnDisconnect();
        }}
      />
    </div>
  );
}
