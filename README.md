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

## Notes

- Prompt 1 uses a **mock gateway** implementation in `src/lib/gateway/client.ts` for connectivity, activity, and chat streaming.
- Prompt 2 can replace that gateway module with real WebSocket transport without rewriting the UI.
- Token values are never logged.
