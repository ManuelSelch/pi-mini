import { test, beforeEach, afterEach } from 'node:test';
import { RemainingMvpDriver } from './support/remaining-mvp-driver.mjs';

let app;
beforeEach(() => {
  app = new RemainingMvpDriver();
});
afterEach(async () => {
  await app.dispose();
});

test('global shortcut hides and restores the companion with its draft', async () => {
  await app.launchCompanion();
  await app.enterDraft('Explain the next step');
  await app.pressGlobalShortcut();
  await app.expectCompanionHidden();
  await app.switchToAnotherApplication();
  await app.pressGlobalShortcut();

  await app.expectCompanionVisibleAndComposerFocused();
  await app.expectSameSessionAndDraft('Explain the next step');
});
