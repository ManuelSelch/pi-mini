import { test, beforeEach, afterEach } from 'node:test';
import { RemainingMvpDriver } from './support/remaining-mvp-driver.mjs';

let app;
beforeEach(() => {
  app = new RemainingMvpDriver();
});
afterEach(async () => {
  await app.dispose();
});

test('menu bar restores the companion and quits its owned backend', async () => {
  await app.launchCompanion();
  await app.enterDraft('Explain the next step');
  await app.closeCompanionWindow();
  await app.expectCompanionHidden();
  await app.showCompanionFromMenuBar();

  await app.expectCompanionVisibleAndComposerFocused();
  await app.expectSameSessionAndDraft('Explain the next step');
  await app.quitCompanionFromMenuBar();

  await app.expectOwnedProcessAndListenerStopped();
});
