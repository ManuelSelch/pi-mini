import type { PiClient } from '@manuelselch/pi-sdk';

/** An accepted receipt is not completion: keep the composer locked until success. */
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
    if (outcome.outcome === 'completed') resolve();
    else reject(new Error(outcome.error?.message ?? 'Pi Mini initialization failed.'));
  };
  const unsubscribe = client.onMessage((message) => {
    if (message.type !== 'event' || message.event !== 'operation.finished' || message.sessionId !== sessionId) return;
    outcomes.set(message.data.operationId, message.data);
    check();
  });
  const stopConnection = client.subscribe((state) => {
    if (state.connection.phase !== 'ready') reject(new Error('Pi Mini initialization interrupted; nothing was resent. Quit and relaunch to create a new session.'));
  });
  // The shared server publishes completion after its session/catalogue refresh.
  // A normal user environment can exceed 15 seconds even when the action succeeds.
  const timeout = setTimeout(() => reject(new Error('Pi Mini initialization timed out: the server did not report completion within 60 seconds. The outcome is unknown; nothing was resent. Quit and relaunch Pi Mini to try a fresh session.')), 60_000);
  try {
    const result = await client.runExtensionAction(sessionId, 'pi-mini.initialize');
    operationId = result.operationId;
    check();
    await finished;
  } finally {
    clearTimeout(timeout);
    unsubscribe();
    stopConnection();
  }
}
