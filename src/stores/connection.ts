import { create } from 'zustand';
import { clearRememberedToken, getStoredGatewayUrl, loadRememberedToken, saveGatewayUrl, saveRememberedToken } from '../lib/storage';
import type { ConnectionStatus } from '../lib/gateway/types';

type ConnectionState = {
  status: ConnectionStatus;
  gatewayUrl: string;
  token: string;
  rememberToken: boolean;
  settingsOpen: boolean;
  lastError: string | null;
  openSettings: () => void;
  closeSettings: () => void;
  setGatewayUrl: (gatewayUrl: string) => void;
  setToken: (token: string) => void;
  setRememberToken: (remember: boolean) => void;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  setStatus: (status: ConnectionStatus) => void;
  setLastError: (err: string | null) => void;
};

const rememberedToken = loadRememberedToken();

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  status: 'disconnected',
  gatewayUrl: getStoredGatewayUrl(),
  token: rememberedToken,
  rememberToken: Boolean(rememberedToken),
  settingsOpen: false,
  lastError: null,
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  setGatewayUrl: (gatewayUrl) => {
    saveGatewayUrl(gatewayUrl);
    set({ gatewayUrl });
  },
  setToken: (token) => set({ token }),
  setRememberToken: (rememberToken) => {
    set({ rememberToken });
    if (!rememberToken) {
      clearRememberedToken();
    }
  },
  connect: async () => {
    const { gatewayUrl, token, rememberToken } = get();

    if (!gatewayUrl.startsWith('ws://') && !gatewayUrl.startsWith('wss://')) {
      set({ status: 'error', lastError: 'Gateway URL must start with ws:// or wss://' });
      return false;
    }

    if (rememberToken) {
      saveRememberedToken(token);
    }

    set({ status: 'connecting', lastError: null });
    return true;
  },
  disconnect: () => {
    const { rememberToken } = get();
    if (!rememberToken) {
      clearRememberedToken();
      set({ token: '' });
    }
    set({ status: 'disconnected', lastError: null });
  },
  setStatus: (status) => set({ status }),
  setLastError: (lastError) => set({ lastError })
}));
