import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Message } from '@tauri-apps/plugin-websocket';
import { createNativeTransport } from '../../../src/conversation/infra/native-transport';

function fixture() {
  let receive: ((message: Message) => void) | undefined;
  const sent: string[] = [];
  const closes: number[] = [];
  let disconnected = 0;
  let opens = 0;
  const socket = {
    addListener: (callback: (message: Message) => void) => { receive = callback; return () => { receive = undefined; }; },
    send: async (text: string) => { sent.push(text); },
    disconnect: async () => { disconnected++; },
  };
  const handlers = { open: () => { opens++; }, message: (_text: string) => {}, close: ({ code }: { code: number }) => { closes.push(code); }, error: (_error?: unknown) => {} };
  return { socket, handlers, sent, closes, receive: (message: Message) => receive?.(message), get disconnected() { return disconnected; }, get opens() { return opens; } };
}
const turn = () => new Promise<void>((resolve) => setImmediate(resolve));

test('the native adapter preserves controller replacement rather than retrying', async () => {
  const app = fixture();
  const transport = createNativeTransport(async () => app.socket)('ws://127.0.0.1:1234/ws', app.handlers);
  await turn();

  app.receive({ type: 'Close', data: { code: 4001, reason: 'Controller replaced' } });

  assert.deepEqual(app.closes, [4001]);
  assert.equal(app.disconnected, 1);
  transport.dispose();
});

test('native sends stay ordered and disposal releases the socket once', async () => {
  const app = fixture();
  const transport = createNativeTransport(async () => app.socket)('ws://127.0.0.1:1234/ws', app.handlers);
  await turn();

  transport.send('first');
  transport.send('second');
  await turn();
  transport.close();
  transport.dispose();

  assert.deepEqual(app.sent, ['first', 'second']);
  assert.equal(app.opens, 1);
  assert.equal(app.disconnected, 1);
});

test('disposing while connection is pending releases a late socket without publishing open', async () => {
  const app = fixture();
  let connect!: (socket: typeof app.socket) => void;
  const transport = createNativeTransport(() => new Promise((resolve) => { connect = resolve; }))('ws://127.0.0.1:1234/ws', app.handlers);

  transport.dispose();
  connect(app.socket);
  await turn();

  assert.equal(app.opens, 0);
  assert.equal(app.disconnected, 1);
});

test('the native adapter rejects arbitrary network destinations', () => {
  const app = fixture();
  const transport = createNativeTransport(async () => app.socket);

  for (const url of ['ws://example.com/ws', 'ws://127.0.0.1:1234/elsewhere', 'ws://user:pass@127.0.0.1/ws', 'ws://127.0.0.1/ws?endpoint=other']) assert.throws(() => transport(url, app.handlers), /loopback endpoint/);
});
