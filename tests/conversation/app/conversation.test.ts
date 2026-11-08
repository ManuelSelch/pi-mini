import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PiClient, createWebSocketTransport } from '@manuelselch/pi-sdk';
import { Conversation } from '../../../src/conversation/app/conversation';

test('a stopped client leaves the composer unavailable with connecting status', () => {
  const client = new PiClient({
    endpoint: 'ws://127.0.0.1:1/ws',
    transport: createWebSocketTransport((url) => new WebSocket(url)),
  });
  const app = new Conversation(client, '/workspace');

  assert.equal(app.getView().canSend, false);
  assert.equal(app.getView().status, 'connecting');
  client.dispose();
});

test('connection failure is visible rather than leaving a silent empty companion', () => {
  const client = new PiClient({
    endpoint: 'ws://127.0.0.1:1/ws',
    transport: () => {
      throw new Error('Connection refused');
    },
  });
  // An explicit local startup error must be visible even before a runtime exists.
  const app = new Conversation(client, '/workspace');
  app.reportError(new Error('Backend failed to start'));

  assert.equal(app.getView().error, 'Backend failed to start');
  assert.equal(app.getView().status, 'error');
  client.dispose();
});
