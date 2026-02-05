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
2. Enter a valid WebSocket URL (`ws://` or `wss://`).
3. Enter your gateway token.
4. Choose whether to remember token locally.
5. Click **Connect**.

On successful connect the app will:

- open a WebSocket connection
- send an auth frame (`{"type":"auth","token":"..."}`) by default
- call `agents.list` and hydrate agent cards
- subscribe to event frames (`presence`, `heartbeat`, `chat`, `agent`)

## Gateway protocol expectations

The client uses a JSON-RPC-like envelope over WebSocket:

- RPC request: `{"id":"<uuid>","type":"rpc","method":"agents.list","params":{...}}`
- RPC result: `{"id":"<uuid>","type":"rpc_result","result":{...}}`
- RPC error: `{"id":"<uuid>","type":"rpc_error","error":{"message":"...","code":"..."}}`
- Push event: `{"type":"event","event":"chat","data":{...}}`

Supported RPC calls in UI wiring:

- `agents.list`
- `chat.send`
- `chat.abort`
- `sessions.patch`

A fallback mode can be enabled with `VITE_USE_MOCK_GATEWAY=true`.

## Troubleshooting

- **Connection timeout**: verify host/port reachability and check gateway URL scheme (`ws://` or `wss://`).
- **Auth failures**: verify token value and gateway auth expectations.
- **Unexpected disconnect/reconnect**: the client reconnects with exponential backoff and stale-connection detection.
- **No chat output**: confirm gateway emits `chat` event frames with either message payloads or streaming chunk deltas.

## Notes

- Token values are not logged and are not included in surfaced UI errors.
