import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PiClient } from '@manuelselch/pi-sdk';
import { initializeMiniSession } from '../../../src/conversation/infra/initialize-mini-session';

function fixture() {
  let receive: Parameters<PiClient['onMessage']>[0] | undefined;
  let connection: Parameters<PiClient['subscribe']>[0] | undefined;
  let calls = 0;
  const client = {
    onMessage: (callback: typeof receive) => { receive = callback; return () => { receive = undefined; }; },
    subscribe: (callback: typeof connection) => { connection = callback; return () => { connection = undefined; }; },
    runExtensionAction: async (id: string, action: string) => {
      calls++;
      assert.equal(id, 'session');
      assert.equal(action, 'pi-mini.initialize');
      return { state: 'accepted', operationId: 'operation' };
    },
  } as unknown as PiClient;
  const finish = (outcome: 'completed' | 'failed') => receive?.({ version: 2, type: 'event', event: 'operation.finished', serverInstanceId: 'server', sessionId: 'session', sequence: 1, data: { operationId: 'operation', requestId: 'request', ...(outcome === 'failed' ? { outcome, error: { code: 'operationFailed', message: 'Missing extension' } } : { outcome }) } });
  return { client, finish, get calls() { return calls; }, get disposed() { return !receive && !connection; } };
}

test('initialization waits for operation completion, not merely an accepted receipt', async () => {
  const app = fixture();
  let initialized = false;
  const pending = initializeMiniSession(app.client, 'session').then(() => { initialized = true; });
  await Promise.resolve();

  assert.equal(initialized, false);
  app.finish('completed');
  await pending;

  assert.equal(initialized, true);
  assert.equal(app.calls, 1);
  assert.equal(app.disposed, true);
});

test('initialization exposes failed execution and does not retry the action', async () => {
  const app = fixture();
  const pending = initializeMiniSession(app.client, 'session');
  app.finish('failed'); // Can arrive before the caller processes the receipt.

  await assert.rejects(pending, /Missing extension/);
  assert.equal(app.calls, 1);
  assert.equal(app.disposed, true);
});
