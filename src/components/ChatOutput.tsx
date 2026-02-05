import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../lib/gateway/types';
import clsx from 'clsx';

export function ChatOutput({ messages }: { messages: ChatMessage[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div ref={containerRef} className="h-52 overflow-y-auto rounded-lg border border-white/10 bg-black/30 p-3 font-mono text-xs">
      {messages.length === 0 ? (
        <p className="text-[var(--text-dim)]">No messages yet. Send a prompt to begin.</p>
      ) : (
        <ul className="space-y-2">
          {messages.map((message) => (
            <li key={message.id} className="space-y-1">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-[var(--text-dim)]">
                <span
                  className={clsx('font-semibold', {
                    'text-[var(--status-user)]': message.role === 'user',
                    'text-[var(--accent)]': message.role === 'agent'
                  })}
                >
                  {message.role}
                </span>
                <span>{new Date(message.ts).toLocaleTimeString()}</span>
              </div>
              <p className="whitespace-pre-wrap text-[var(--text-primary)]">{message.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
