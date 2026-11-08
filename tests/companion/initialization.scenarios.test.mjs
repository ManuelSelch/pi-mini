import { test, beforeEach, afterEach } from 'node:test';
import { SharedServerDriver } from './support/shared-server-driver.mjs';

let app;
beforeEach(() => {
  app = new SharedServerDriver();
});
afterEach(async () => {
  await app.dispose();
});

// Real extension/runtime/server/SDK. Block catalogue completion deterministically,
// not with timing sleeps. No browser rendering or model requests.
test('a new Pi Mini session becomes usable after its instructions are inserted while catalogue refresh remains pending', async () => {
  await app.startPiChatServer();
  await app.holdInitializationCatalogueRefresh();
  await app.startPiMini();

  await app.shouldBeReady();
  await app.shouldHaveInstructions();
  await app.shouldHaveCatalogueRefreshPending();
});

test('switching projects initializes the new Pi Mini session without waiting for catalogue refresh', async () => {
  await app.startPiChatServer();
  await app.startPiMini();
  await app.holdInitializationCatalogueRefresh();
  await app.switchToAnotherProject();

  await app.shouldHaveChangedProject();
  await app.shouldBeReady();
  await app.shouldHaveInstructions();
  await app.shouldHaveCatalogueRefreshPending();
});
