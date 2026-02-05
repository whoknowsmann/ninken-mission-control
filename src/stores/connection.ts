import { create } from 'zustand';
import { clearRememberedToken, getStoredGatewayUrl, loadRememberedToken, saveGatewayUrl, saveRememberedToken } from '../lib/storage';
import type { ConnectionStatus } from '../lib/gateway/types';
import type { GatewayController } from '../lib/gateway/client';

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
  setGatewayController: (controller: GatewayController | null) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  setStatus: (status: ConnectionStatus) => void;
  setLastError: (err: string | null) => void;
};

const rememberedToken = loadRememberedToken();

let gatewayController: GatewayController | null = null;

const isValidGatewayUrl = (value: string): boolean => {
  if (!value.startsWith('ws://') && !value.startsWith('wss://')) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'ws:' || url.protocol === 'wss:';
  } catch {
    return false;
  }
};

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
  setGatewayController: (controller) => {
    gatewayController = controller;
  },
  connect: async () => {
    const { gatewayUrl, token, rememberToken } = get();

    if (!isValidGatewayUrl(gatewayUrl)) {
      set({ status: 'error', lastError: 'Gateway URL must be a valid ws:// or wss:// URL.' });
      return;
    }

    if (!gatewayController) {
      set({ status: 'error', lastError: 'Gateway client is unavailable.' });
      return;
    }

    if (rememberToken) {
      saveRememberedToken(token);
    }

    set({ status: 'connecting', lastError: null });

    try {
      await gatewayController.connect({ gatewayUrl, token });
      set({ status: 'connected', lastError: null });
    } catch {
      set({ status: 'error', lastError: 'Unable to connect to gateway.' });
      if (!rememberToken) {
        set({ token: '' });
      }
    }
  },
  disconnect: () => {
    gatewayController?.disconnect();
    const rememberToken = get().rememberToken;
    set({ status: 'disconnected', lastError: null, ...(rememberToken ? {} : { token: '' }) });
  },
  setStatus: (status) => set({ status }),
  setLastError: (lastError) => set({ lastError })
}));
