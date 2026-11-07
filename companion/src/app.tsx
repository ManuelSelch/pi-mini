import { useEffect, useState } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { PiClient } from '@manuelselch/pi-sdk';
import { Conversation } from './conversation/app/conversation';
import { watchNativeSmoke } from './conversation/app/native-smoke';
import { createNativeTransport } from './conversation/infra/native-transport';
import { emptyView } from './conversation/domain/view';
import { CompanionView } from './conversation/ui/components/companion-view';
import { ConversationContainer } from './conversation/ui/containers/conversation-container';

export function App() {
  const [conversation, setConversation] = useState<Conversation>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    let cancelled = false;
    let active: Conversation | undefined;
    let stopSmoke: (() => void) | undefined;
    const start = async () => {
      if (!isTauri()) throw new Error('Launch the native companion with npm run dev. The browser preview cannot connect to its private backend.');
      const info = await invoke<{ endpoint: string; projectPath: string }>('backend_info');
      const smoke = await invoke<'startup' | 'model' | null>('smoke_mode');
      if (cancelled) return;
      active = new Conversation(new PiClient({ endpoint: info.endpoint, transport: createNativeTransport() }), info.projectPath);
      setConversation(active);
      if (smoke) stopSmoke = watchNativeSmoke(active, smoke);
      active.start();
    };
    void start().catch((error: unknown) => {
      if (cancelled) return;
      const message = error instanceof Error ? error.message : String(error);
      setError(message);
      if (isTauri()) void invoke('smoke_mode').then((mode) => { if (mode) return invoke('finish_smoke', { report: { error: message } }); });
    });
    return () => { cancelled = true; stopSmoke?.(); active?.dispose(); };
  }, []);
  const drag = () => { void getCurrentWindow().startDragging().catch((error: unknown) => conversation?.reportError(error)); };
  if (conversation) return <ConversationContainer conversation={conversation} onDrag={drag}/>;
  return <CompanionView view={{ ...emptyView, error, status: error ? 'error' : 'connecting' }} composer={null} onDrag={drag} onSend={() => {}} onAnswer={() => {}} onCancel={() => {}} onTakeControl={() => {}}/>;
}
