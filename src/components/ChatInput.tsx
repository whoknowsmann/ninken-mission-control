import { useState } from 'react';

export function ChatInput({
  onSend,
  disabled
}: {
  onSend: (value: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState('');

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const next = value.trim();
        if (!next) return;
        onSend(next);
        setValue('');
      }}
      className="flex gap-2"
    >
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Send instruction to agent..."
        className="flex-1 rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
      />
      <button
        disabled={disabled}
        type="submit"
        className="rounded-lg border border-[var(--accent)] bg-[var(--accent)]/20 px-4 py-2 text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)]/30 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Send
      </button>
    </form>
  );
}
