import { useCallback, useEffect, useState } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { PiClient } from '@manuelselch/pi-sdk';
import { Conversation } from './conversation/app/conversation';
import { watchNativeSmoke } from './conversation/app/native-smoke';
import { watchNativeLifecycle } from './lifecycle/app/native-test';
import { useNativeLifecycle } from './lifecycle/app/use-native-lifecycle';
import { createNativeTransport } from './conversation/infra/native-transport';
import { initializeMiniSession } from './conversation/infra/initialize-mini-session';
import { emptyView } from './conversation/domain/view';
import { CompanionView } from './conversation/ui/components/companion-view';
import { ConversationContainer } from './conversation/ui/containers/conversation-container';

export function App() {
  const [conversation, setConversation] = useState<Conversation>();
  const [error, setError] = useState<string>();
  const reportLifecycleError = useCallback(
    (error: unknown) => {
      if (conversation) {
        conversation.reportError(error);
        return;
      }
      setError(error instanceof Error ? error.message : String(error));
    },
    [conversation],
  );
  const focusRequest = useNativeLifecycle(reportLifecycleError);
  useEffect(() => {
    let cancelled = false;
    let active: Conversation | undefined;
    let stopSmoke: (() => void) | undefined;
    const start = async () => {
      if (!isTauri())
        throw new Error(
          'Launch the native companion with npm run dev. The browser preview cannot connect to the shared backend.',
        );
      const info = await invoke<{ endpoint: string; projectPath: string; shared: boolean }>(
        'backend_info',
      );
      const smoke = await invoke<'startup' | 'model' | 'lifecycle' | null>('smoke_mode');
      if (cancelled) return;
      active = new Conversation(
        new PiClient({ endpoint: info.endpoint, transport: createNativeTransport() }),
        info.projectPath,
        info.shared ? initializeMiniSession : undefined,
      );
      setConversation(active);
      if (smoke === 'lifecycle')
        stopSmoke = watchNativeLifecycle(
          () => ({
            ...active!.getView(),
            phase: active!.client.getState().connection.phase,
            connectionId: active!.client.getState().connectionId,
          }),
          active.subscribe,
        );
      else if (smoke) stopSmoke = watchNativeSmoke(active, smoke);
      active.start();
    };
    void start().catch((error: unknown) => {
      if (cancelled) return;
      const message = error instanceof Error ? error.message : String(error);
      setError(message);
      if (isTauri())
        void invoke('smoke_mode').then((mode) => {
          if (mode) return invoke('finish_smoke', { report: { error: message } });
        });
    });
    return () => {
      cancelled = true;
      stopSmoke?.();
      active?.dispose();
    };
  }, []);
  const drag = () => {
    void getCurrentWindow()
      .startDragging()
      .catch((error: unknown) => conversation?.reportError(error));
  };
  if (conversation)
    return (
      <ConversationContainer
        conversation={conversation}
        onDrag={drag}
        focusRequest={focusRequest}
      />
    );
  return (
    <CompanionView
      view={{ ...emptyView, error, status: error ? 'error' : 'connecting' }}
      composer={null}
      onDrag={drag}
      onSend={() => {}}
      onAnswer={() => {}}
      onCancel={() => {}}
      onTakeControl={() => {}}
    />
  );
}
