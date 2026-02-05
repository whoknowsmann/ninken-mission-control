# Ninken Console Prototype 0.1

A lightweight mission control dashboard for monitoring and interacting with agents.

## Stack

- Vite 6 + React 19 + TypeScript
- Zustand for state
- Tailwind CSS 4 and CSS variables for theming
- Radix UI (dialog + dropdown menu)

## Run locally

```bash
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal.

## Gateway setup

1. Open **Gateway Settings** from the gear icon.
2. Enter a valid `ws://` or `wss://` gateway URL.
3. Enter a token and choose whether to remember it locally.
4. Click **Connect**.

On connect, the app opens a WebSocket, sends auth (`{ "type": "auth", "token": "..." }` by default), calls `agents.list`, and hydrates the agent panel.

### RPC envelope pattern

The client uses JSON frames over WebSocket with a JSON-RPC-like structure:

- Request:
  - `{ "id": "<uuid>", "type": "rpc", "method": "agents.list", "params": {}, "token": "...optional" }`
- Success response:
  - `{ "id": "<uuid>", "type": "rpc_result", "result": { ... } }`
- Error response:
  - `{ "id": "<uuid>", "type": "rpc_error", "error": { "message": "...", "code": "...", "data": any } }`
- Event push:
  - `{ "type": "event", "event": "presence" | "heartbeat" | "chat" | "agent", "data": { ... } }`

Supported outbound RPC methods used by the UI:

- `agents.list`
- `chat.send` (`{ sessionKey, message }`)
- `chat.abort` (`{ sessionKey }`)
- `sessions.patch` (`{ key, model, thinking }`)

### Auth mode

- Default mode is auth frame on connect.
- Optional fallback mode is per-message token (`authMode: 'per_message'`) in `GatewayClient`.

### Health + reconnect behavior

- Connection attempt timeout: ~9 seconds.
- App-level ping every 20 seconds: `{ "type": "ping", "ts": <epoch_ms> }`.
- Stale connection detection: if no frames are received for 60 seconds, the client reconnects.
- Auto-reconnect backoff: `1s → 2s → 4s ...` capped at `15s`, unless user manually disconnects.

### Troubleshooting

- **Connection timeout**: verify URL is reachable and supports WebSocket upgrades.
- **Auth failures**: confirm token validity and gateway auth expectations (auth frame vs per-message token).
- **No events after connect**: check server emits `event` frames and that session keys map to the expected agents.

## Mock mode

Set `VITE_USE_MOCK_GATEWAY=true` to keep mock behavior for local demos.

## Notes

- Token values are never logged.
