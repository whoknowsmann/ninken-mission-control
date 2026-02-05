import clsx from 'clsx';
import type { ConnectionStatus as Status } from '../lib/gateway/types';

const statusText: Record<Status, string> = {
  connected: 'Connected',
  connecting: 'Connecting',
  disconnected: 'Disconnected',
  error: 'Error'
};

export function ConnectionStatus({ status }: { status: Status }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs uppercase tracking-widest">
      <span
        className={clsx('h-2.5 w-2.5 rounded-full', {
          'animate-pulse bg-[var(--status-running)]': status === 'connected' || status === 'connecting',
          'bg-[var(--status-idle)]': status === 'disconnected',
          'bg-[var(--status-error)]': status === 'error'
        })}
      />
      <span className="text-[var(--text-muted)]">{statusText[status]}</span>
    </div>
  );
}
