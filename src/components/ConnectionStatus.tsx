import type { ConnectionState } from '../stores/connection';

const colorMap: Record<ConnectionState, string> = {
  connected: 'bg-[var(--status-running)]',
  connecting: 'bg-yellow-400',
  disconnected: 'bg-[var(--status-idle)]',
  error: 'bg-[var(--status-error)]'
};

export function ConnectionStatus({ status }: { status: ConnectionState }) {
  return (
    <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
      <span className={`h-2.5 w-2.5 rounded-full ${colorMap[status]} ${status === 'connecting' ? 'animate-pulse' : ''}`} />
      <span className="uppercase tracking-wide">{status}</span>
    </div>
  );
}
