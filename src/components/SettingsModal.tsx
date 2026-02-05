import * as Dialog from '@radix-ui/react-dialog';
import { useConnectionStore } from '../stores/connection';

type Props = {
  onConnect: () => void;
  onDisconnect: () => void;
};

export function SettingsModal({ onConnect, onDisconnect }: Props) {
  const {
    settingsOpen,
    closeSettings,
    gatewayUrl,
    token,
    rememberToken,
    setGatewayUrl,
    setToken,
    setRememberToken,
    status,
    lastError
  } = useConnectionStore();

  const invalidUrl = gatewayUrl.length > 0 && !gatewayUrl.startsWith('ws://') && !gatewayUrl.startsWith('wss://');

  return (
    <Dialog.Root open={settingsOpen} onOpenChange={(open) => (open ? undefined : closeSettings())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[var(--border-radius)] border border-white/10 bg-[var(--bg-modal)] p-5 text-[var(--text-primary)] shadow-2xl">
          <Dialog.Title className="text-lg font-semibold">Gateway Settings</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-[var(--text-muted)]">
            Configure WebSocket gateway URL and auth token.
          </Dialog.Description>

          <div className="mt-4 space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--text-muted)]">Gateway URL</span>
              <input
                value={gatewayUrl}
                onChange={(event) => setGatewayUrl(event.target.value)}
                className="w-full rounded-lg border border-white/20 bg-black/20 px-3 py-2 outline-none focus:border-[var(--accent)]"
                placeholder="wss://gateway.example/ws"
              />
            </label>
            {invalidUrl && <p className="text-xs text-[var(--status-error)]">Gateway URL must start with ws:// or wss://</p>}

            <label className="block text-sm">
              <span className="mb-1 block text-[var(--text-muted)]">Token</span>
              <input
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                className="w-full rounded-lg border border-white/20 bg-black/20 px-3 py-2 outline-none focus:border-[var(--accent)]"
                placeholder="Paste token"
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <input
                type="checkbox"
                checked={rememberToken}
                onChange={(event) => setRememberToken(event.target.checked)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              Remember token on this device
            </label>

            {lastError && <p className="text-xs text-[var(--status-error)]">{lastError}</p>}
          </div>

          <div className="mt-5 flex justify-end gap-2">
            {status === 'connected' ? (
              <button onClick={onDisconnect} className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:border-white/40">
                Disconnect
              </button>
            ) : (
              <button
                disabled={invalidUrl}
                onClick={onConnect}
                className="rounded-lg border border-[var(--accent)] bg-[var(--accent)]/20 px-4 py-2 text-sm font-semibold text-[var(--accent)] disabled:opacity-60"
              >
                Connect
              </button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
