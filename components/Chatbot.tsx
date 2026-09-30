'use client';

import { useState } from 'react';

type Message = { role: 'user' | 'assistant'; content: string; whatsapp?: boolean };

export default function Chatbot({ whatsappUrl }: { whatsappUrl?: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! I’m the TheAstroNexus assistant. Ask me about our services, courses, pricing, bookings or anything covered by the website.' }
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next })
      });
      const data = await res.json();
      setMessages([...next, {
        role: 'assistant',
        content: data.reply || 'Please continue with our team on WhatsApp.',
        whatsapp: !!data.needsWhatsApp
      }]);
    } catch {
      setMessages([...next, { role: 'assistant', content: 'I’m having trouble connecting right now. Please continue with our team on WhatsApp.', whatsapp: true }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="chatbot">
      {open && (
        <div className="chatWindow">
          <div className="chatHeader">
            <div><b>TheAstroNexus</b><small>Website assistant</small></div>
            <button onClick={() => setOpen(false)} aria-label="Close chat">×</button>
          </div>
          <div className="chatMessages">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'chatBubble user' : 'chatBubble'}>
                {m.content}
                {m.role === 'assistant' && m.whatsapp && whatsappUrl && (
                  <a className="whatsappChat" href={whatsappUrl} target="_blank" rel="noreferrer">Chat directly on WhatsApp</a>
                )}
              </div>
            ))}
            {busy && <div className="chatBubble">Checking the website information…</div>}
          </div>
          <div className="chatActions">
            {whatsappUrl && <a className="whatsappChat" href={whatsappUrl} target="_blank" rel="noreferrer">Continue on WhatsApp</a>}
          </div>
          <div className="chatInput">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }} placeholder="Ask a question…" />
            <button onClick={send} disabled={busy || !input.trim()}>Send</button>
          </div>
        </div>
      )}
      <button className="chatLauncher" onClick={() => setOpen(!open)} aria-label="Open chat">{open ? '×' : '💬'}</button>
    </div>
  );
}
