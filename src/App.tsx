import { GearIcon } from '@radix-ui/react-icons';
import { ConnectionStatus } from './components/ConnectionStatus';
import { AgentCard } from './components/AgentCard';
import { ActivityFeed } from './components/ActivityFeed';
import { SettingsModal } from './components/SettingsModal';
import { useConnectionStore } from './stores/connection';
import { useAgentsStore } from './stores/agents';

function App() {
  const { status, openSettings } = useConnectionStore();
  const agents = useAgentsStore((s) => s.agentOrder.map((id) => s.agentsById[id]));

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)]">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[var(--bg-main)]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <h1 className="text-lg font-bold tracking-[0.2em]">NINKEN CONSOLE</h1>
          <div className="flex items-center gap-3">
            <ConnectionStatus status={status} />
            <button className="rounded bg-white/10 p-2 hover:bg-white/20" onClick={openSettings} aria-label="Open settings">
              <GearIcon />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-5">
        <section className="grid grid-cols-1 gap-4 min-[900px]:grid-cols-2">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </section>
        <ActivityFeed />
      </main>

      <SettingsModal />
    </div>
  );
}

export default App;
