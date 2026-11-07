import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sharedServerInfo } from '../../../src/conversation/infra/host/shared-server';

test('shared-server configuration rejects non-loopback endpoints and URL credentials', async () => {
  for (const endpoint of ['ws://example.com/ws', 'wss://127.0.0.1/ws', 'ws://127.0.0.1/elsewhere', 'ws://user:password@127.0.0.1/ws', 'ws://127.0.0.1/ws?token=secret', 'ws://127.0.0.1/ws#fragment']) {
    await assert.rejects(sharedServerInfo(endpoint), /PI_MINI_ENDPOINT must be/);
  }
});
