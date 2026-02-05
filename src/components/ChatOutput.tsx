import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../lib/gateway/types';
import clsx from 'clsx';

export function ChatOutput({ messages }: { messages: ChatMessage[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [messages]);

  return (
    <div ref={ref} className="h-48 overflow-y-auto rounded-md bg-black/30 p-3 font-mono text-sm">
      {messages.length === 0 && <p className="text-[var(--text-dim)]">No messages yet.</p>}
      {messages.map((msg) => (
        <p key={msg.id} className={clsx('mb-2 leading-relaxed', msg.role === 'user' ? 'text-[var(--status-user)]' : 'text-[var(--text-primary)]')}>
          <span className="mr-2 uppercase text-[var(--text-muted)]">{msg.role}</span>
          {msg.text}
        </p>
      ))}
    </div>
  );
}
