# Ninken Console Prototype 0.1

A Vite + React mission control dashboard prototype for monitoring and interacting with agents (OpenClaw / Clawdbot).

## Setup

```bash
npm install
npm run dev
```

Open the app URL printed by Vite.

## Notes

- Prompt 1 uses a **mock gateway** at `src/lib/gateway/client.ts` so the UI is fully interactive without backend dependencies.
- Prompt 2 should replace that mock implementation with real native WebSocket integration while keeping UI/stores intact.
