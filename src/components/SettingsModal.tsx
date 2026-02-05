import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { useConnectionStore } from '../stores/connection';

export function SettingsModal() {
  const { isSettingsOpen, closeSettings, gatewayUrl, token, rememberToken, setCredentials, connect, disconnect, status } = useConnectionStore();
  const [url, setUrl] = useState(gatewayUrl);
  const [localToken, setLocalToken] = useState(token);
  const [remember, setRemember] = useState(rememberToken);
  const [error, setError] = useState<string | null>(null);

  const onSaveConnect = async () => {
    if (!/^wss?:\/\//.test(url)) {
      setError('Gateway URL must start with ws:// or wss://');
      return;
    }
    setError(null);
    setCredentials({ gatewayUrl: url, token: localToken, rememberToken: remember });
    await connect();
    closeSettings();
  };

  return (
    <Dialog.Root open={isSettingsOpen} onOpenChange={(open) => (open ? null : closeSettings())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[min(94vw,460px)] -translate-x-1/2 -translate-y-1/2 rounded-[var(--border-radius)] border border-white/10 bg-[var(--bg-modal)] p-5 shadow-xl">
          <Dialog.Title className="mb-4 text-lg font-semibold">Gateway Settings</Dialog.Title>
          <div className="space-y-3">
            <label className="block text-sm">
              Gateway URL
              <input className="mt-1 w-full rounded border border-white/10 bg-black/20 px-3 py-2" value={url} onChange={(e) => setUrl(e.target.value)} />
            </label>
            <label className="block text-sm">
              Token
              <input type="password" className="mt-1 w-full rounded border border-white/10 bg-black/20 px-3 py-2" value={localToken} onChange={(e) => setLocalToken(e.target.value)} />
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember token
            </label>
            {error && <p className="text-sm text-[var(--status-error)]">{error}</p>}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            {status === 'connected' ? (
              <button className="rounded bg-[var(--status-error)] px-3 py-2 text-sm" onClick={disconnect}>Disconnect</button>
            ) : (
              <button className="rounded bg-[var(--accent)] px-3 py-2 text-sm text-black" onClick={onSaveConnect}>Connect</button>
            )}
            <Dialog.Close className="rounded bg-white/10 px-3 py-2 text-sm">Close</Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
