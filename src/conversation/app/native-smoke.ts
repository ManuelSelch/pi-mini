import { invoke } from '@tauri-apps/api/core';
import type { Conversation } from './conversation';

/** Explicit native-test entry, never enabled on a normal launch. */
export function watchNativeSmoke(
  conversation: Conversation,
  mode: 'startup' | 'model',
): () => void {
  let finished = false;
  let sent = false;
  const finish = (report: Record<string, unknown>) => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    void invoke('finish_smoke', { report });
  };
  const timer = setTimeout(
    () =>
      finish({
        error: 'Native smoke did not finish before its deadline',
        view: conversation.getView(),
      }),
    mode === 'model' ? 120_000 : 45_000,
  );
  const unsubscribe = conversation.subscribe(() => {
    const view = conversation.getView();
    if (view.error) {
      finish({ error: view.error });
      return;
    }
    if (!view.canSend || !view.sessionId) return;
    if (mode === 'model' && !sent) {
      sent = true;
      void conversation.send('For this smoke test, do not use tools. Reply briefly with: Ready.');
      return;
    }
    if (mode === 'model' && !view.response) return;
    finish({
      phase: conversation.client.getState().connection.phase,
      sessionId: view.sessionId,
      response: view.response,
    });
  });
  return () => {
    finished = true;
    clearTimeout(timer);
    unsubscribe();
  };
}
