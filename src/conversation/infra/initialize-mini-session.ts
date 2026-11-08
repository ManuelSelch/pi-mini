import type { PiClient } from '@manuelselch/pi-sdk';
import { miniInitializeAction, miniInitializedNotification } from '../domain/initialization';

/** Wait for instruction insertion, not the server's later catalogue refresh. */
export async function initializeMiniSession(client: PiClient, sessionId: string): Promise<void> {
  const outcomes = new Map<string, { outcome: string; error?: { message: string } }>();
  let operationId: string | undefined;
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const finished = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  // A disconnect can reject while the admission request is still pending.
  void finished.catch(() => {});
  const check = () => {
    const outcome = operationId ? outcomes.get(operationId) : undefined;
    if (!outcome) return;
    if (outcome.outcome === 'completed') reject(new Error('The Pi Mini extension did not acknowledge initialization. Reload the session or relaunch Pi Mini after updating the extension.'));
    else reject(new Error(outcome.error?.message ?? 'Pi Mini initialization failed.'));
  };
  const unsubscribe = client.onMessage((message) => {
    if (message.type !== 'event' || !('sessionId' in message) || message.sessionId !== sessionId) return;
    if (message.event === 'notification.created' && message.data.level === 'info' && message.data.message === miniInitializedNotification) resolve();
    if (message.event !== 'operation.finished') return;
    outcomes.set(message.data.operationId, message.data);
    check();
  });
  const stopConnection = client.subscribe((state) => {
    if (state.connection.phase !== 'ready') reject(new Error('Pi Mini initialization interrupted; nothing was resent. Quit and relaunch to create a new session.'));
  });
  const timeout = setTimeout(() => reject(new Error('Pi Mini initialization timed out: the extension did not acknowledge instruction insertion within 60 seconds. The outcome is unknown; nothing was resent. Quit and relaunch Pi Mini to try a fresh session.')), 60_000);
  try {
    const result = await client.runExtensionAction(sessionId, miniInitializeAction);
    operationId = result.operationId;
    check();
    await finished;
  } finally {
    clearTimeout(timeout);
    unsubscribe();
    stopConnection();
  }
}
