import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPiChatExtensionRegistry } from '@manuelselch/pi-server/extensions';
import miniMode from '../../../src/conversation/infra/mini-mode';
import { companionInstructions } from '../../../src/conversation/infra/host/instructions';
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';

function session(id: string) {
  const hooks = new Map<string, Function>();
  const messages: unknown[] = [];
  const entries: object[] = [];
  let commands = 0;
  miniMode({
    on: (name: string, handler: Function) => { hooks.set(name, handler); },
    registerCommand: () => { commands++; },
    sendMessage: (message: object, options: unknown) => { messages.push({ message, options }); entries.push({ type: 'custom_message', ...message }); },
  } as unknown as ExtensionAPI);
  hooks.get('session_start')!({}, { sessionManager: { getSessionId: () => id, getBranch: () => entries } });
  return { messages, shutdown: () => hooks.get('session_shutdown')!(), commandCount: () => commands };
}

test('the action routes instructions to the requested session, once, without a command or model turn', async () => {
  const first = session('first');
  const second = session('second');
  const registry = getPiChatExtensionRegistry();
  try {
    await registry.runAction('pi-mini.initialize', { sessionId: 'first', notify() {} });
    await registry.runAction('pi-mini.initialize', { sessionId: 'first', notify() {} });

    assert.deepEqual(first.messages, [{ message: { customType: 'pi-mini-instructions', content: companionInstructions, display: false }, options: { triggerTurn: false } }]);
    assert.deepEqual(second.messages, []);
    assert.equal(first.commandCount(), 0);
    assert.equal(second.commandCount(), 0);
  } finally { first.shutdown(); second.shutdown(); }
  await assert.rejects(registry.runAction('pi-mini.initialize', { sessionId: 'first', notify() {} }), /not active/);
});
