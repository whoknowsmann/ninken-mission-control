# Ninken Console

Mission control dashboard for monitoring and interacting with OpenClaw/Clawdbot agents.

## TL;DR

- **What:** Web dashboard to monitor multiple AI agents in real-time
- **Stack:** Vite 6 + React 19 + TypeScript + Zustand + Tailwind CSS 4
- **Features:** Agent cards, streaming chat, activity feed, model/thinking controls
- **Status:** Prototype 0.1 — functional with real WebSocket gateway support
- **Created:** February 5, 2026

---

## Quick Start

```bash
npm install
npm run dev
```

Open the URL shown in terminal, click the gear icon, enter your gateway URL and token.

---

## Features

| Feature | Status |
|---------|--------|
| Agent list with status indicators | ✅ |
| Expandable agent cards | ✅ |
| Streaming chat output | ✅ |
| Send messages to agents | ✅ |
| Stop running tasks | ✅ |
| Model/thinking level switching | ✅ |
| Activity feed with filters | ✅ |
| Auto-reconnect with backoff | ✅ |
| Mock mode for demos | ✅ |

---

## Gateway Protocol

The console connects via WebSocket using JSON-RPC-style frames:

```
Request:  { "id": "<uuid>", "type": "rpc", "method": "agents.list", "params": {} }
Response: { "id": "<uuid>", "type": "rpc_result", "result": {...} }
Events:   { "type": "event", "event": "chat", "data": {...} }
```

**Supported RPC methods:**
- `agents.list` — Get all agents
- `chat.send` — Send message to agent (`{ sessionKey, message }`)
- `chat.abort` — Stop running task (`{ sessionKey }`)
- `sessions.patch` — Update model/thinking (`{ key, model, thinking }`)

**Event types:** `presence`, `heartbeat`, `chat`, `agent`

---

## Configuration

| Env Variable | Purpose |
|--------------|---------|
| `VITE_USE_MOCK_GATEWAY` | Set to `true` for offline demo mode |

---

## Project Structure

```
src/
├── components/     # React UI components
├── lib/gateway/    # WebSocket client, events, types
├── stores/         # Zustand state (agents, activity, connection)
└── styles/         # Tailwind CSS + theme variables
```

---

## Troubleshooting

- **Connection timeout:** Check gateway URL is reachable (ws:// or wss://)
- **Auth failures:** Verify token is correct
- **No events:** Confirm gateway emits `event` frames with correct session keys

---

## See Also

- [Ninken Console Prototype 0.1 Spec](https://github.com/whoknowsmann) — Original design doc
- [OpenClaw](https://github.com/openclawbot/openclaw) — Gateway reference
- [Clawdbot](https://github.com/clawdbot/clawdbot) — Agent framework

---

*Created: February 5, 2026*  
*Status: Prototype — ready for testing*
