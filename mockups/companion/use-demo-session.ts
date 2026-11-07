import { useCallback, useEffect, useRef, useState } from 'react';
import { emit, listen } from '@tauri-apps/api/event';
import { native } from './native';
import { emptySession, initialSession, message, replyTo, routerSession, type Session } from './demo';

type SessionEvent = { source: string; session: Session };

export function useDemoSession() {
  const source = useRef(crypto.randomUUID());
  const [session, setSession] = useState(initialSession);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channel = useRef<BroadcastChannel | null>(null);
  const current = useRef(session);
  current.current = session;

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setBusy(false);
  }, []);

  useEffect(() => {
    const receive = (next: Session) => { cancel(); current.current = next; setSession(next); };
    if (native) {
      const subscription = listen<SessionEvent>('companion-demo-session', (event) => {
        if (event.payload.source !== source.current) receive(event.payload.session);
      });
      return () => { void subscription.then((unlisten) => unlisten()); cancel(); };
    }
    const bus = new BroadcastChannel('pi-companion-clickdummy');
    channel.current = bus;
    bus.onmessage = (event: MessageEvent<Session>) => receive(event.data);
    return () => { bus.close(); channel.current = null; cancel(); };
  }, [cancel]);

  const update = useCallback((next: Session) => {
    current.current = next;
    setSession(next);
    if (native) void emit('companion-demo-session', { source: source.current, session: next });
    else channel.current?.postMessage(next);
  }, []);

  const send = useCallback((text: string) => {
    if (!text.trim() || timer.current) return;
    const previous = current.current;
    const next = { ...previous, title: previous.messages.length ? previous.title : text.slice(0, 36), messages: [...previous.messages, message('user', text.trim())] };
    const response = replyTo(next, text.trim());
    // Local busy state intentionally does not broadcast; no real agent is running.
    update(next);
    setBusy(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      update({ ...next, step: response.step, messages: [...next.messages, message('assistant', response.text)] });
      setBusy(false);
    }, 650);
  }, [update]);

  const startRouter = () => { cancel(); update(routerSession()); };
  const newChat = () => { cancel(); update(emptySession()); };
  return { session, busy, send, cancel, startRouter, newChat };
}
