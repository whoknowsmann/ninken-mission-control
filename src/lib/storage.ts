const GATEWAY_URL_KEY = 'ninken.gatewayUrl';
const TOKEN_KEY = 'ninken.token';

export const getStoredGatewayUrl = (): string => {
  if (typeof window === 'undefined') return 'ws://localhost:8787';
  return localStorage.getItem(GATEWAY_URL_KEY) ?? 'ws://localhost:8787';
};

export const saveGatewayUrl = (value: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GATEWAY_URL_KEY, value);
};

export const saveRememberedToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
};

export const loadRememberedToken = (): string => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(TOKEN_KEY) ?? '';
};

export const clearRememberedToken = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
};
