import { useState } from 'react';

export function ChatInput({ onSend }: { onSend: (value: string) => void }) {
  const [value, setValue] = useState('');

  return (
    <div className="mt-3 flex gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && value.trim()) {
            onSend(value.trim());
            setValue('');
          }
        }}
        placeholder="Send message to agent..."
        className="flex-1 rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
      />
      <button
        onClick={() => {
          if (!value.trim()) return;
          onSend(value.trim());
          setValue('');
        }}
        className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-black"
      >
        Send
      </button>
    </div>
  );
}
