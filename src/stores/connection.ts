import { create } from 'zustand';
import { storage } from '../lib/storage';
import { gatewayClient } from '../lib/gateway/client';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

interface ConnectionStore {
  status: ConnectionState;
  gatewayUrl: string;
  token: string;
  rememberToken: boolean;
  lastError: string | null;
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  setCredentials: (payload: { gatewayUrl: string; token: string; rememberToken: boolean }) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
  status: 'disconnected',
  gatewayUrl: storage.getGatewayUrl(),
  token: '',
  rememberToken: false,
  lastError: null,
  isSettingsOpen: false,
  openSettings: () => set(() => ({ isSettingsOpen: true })),
  closeSettings: () => set(() => ({ isSettingsOpen: false })),
  setCredentials: ({ gatewayUrl, token, rememberToken }) => {
    storage.setGatewayUrl(gatewayUrl);
    if (rememberToken) storage.setToken(token);
    else storage.clearToken();
    set(() => ({ gatewayUrl, token, rememberToken }));
  },
  connect: async () => {
    const { gatewayUrl, token } = get();
    set(() => ({ status: 'connecting', lastError: null }));
    try {
      await gatewayClient.connect({ gatewayUrl, token });
      set(() => ({ status: 'connected' }));
    } catch {
      set(() => ({ status: 'error', lastError: 'Failed to connect to gateway.' }));
    }
  },
  disconnect: () => {
    gatewayClient.disconnect();
    set(() => ({ status: 'disconnected' }));
  }
}));
