import { test, beforeEach, afterEach } from 'node:test';
import { SharedServerDriver } from './support/shared-server-driver.mjs';

let app;
beforeEach(() => {
  app = new SharedServerDriver();
});
afterEach(async () => {
  await app.dispose();
});

// Real Pi extension/runtime, shared server, SDK and storage; controlled model boundary.
// Does not automate the Pi Chat browser UI.
test('a Pi Mini conversation appears in Pi Chat session history', async () => {
  await app.startPiChatServer();
  await app.startPiMini();
  await app.sendAndComplete('Help me configure my router');
  await app.takeControlInPiChat();

  await app.expectPiChatListsMiniConversation('Help me configure my router');
});

test('switching between Pi Mini and Pi Chat transfers control explicitly', async () => {
  await app.startPiChatServer();
  await app.startPiMini();
  await app.takeControlInPiChat();

  await app.expectPiMiniSuperseded();

  await app.takeControlInPiMini();

  await app.expectPiChatSuperseded();
});

test('Pi Mini sessions retain their companion instructions on the shared server', async () => {
  await app.startPiChatServer();
  await app.startPiMini();

  await app.expectCompanionInstructionsDelivered();
});

test('quitting Pi Mini leaves the shared Pi Chat server running', async () => {
  await app.startPiChatServer();
  await app.startPiMini();
  await app.quitPiMini();

  await app.expectPiChatServerAvailable();
});

test('Pi Mini reports when the shared server is unavailable', async () => {
  await app.startPiMiniWithoutPiChatServer();

  await app.expectSharedServerUnavailable();
  await app.expectNoPrivateServer();
});
