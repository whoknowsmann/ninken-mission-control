const GATEWAY_URL_KEY = 'ninken.gatewayUrl';
const TOKEN_KEY = 'ninken.token';

export const storage = {
  getGatewayUrl() {
    return localStorage.getItem(GATEWAY_URL_KEY) ?? 'ws://localhost:8080/ws';
  },
  setGatewayUrl(url: string) {
    localStorage.setItem(GATEWAY_URL_KEY, url);
  },
  getToken() {
    return localStorage.getItem(TOKEN_KEY) ?? '';
  },
  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }
};
