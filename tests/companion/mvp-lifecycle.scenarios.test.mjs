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

test('hiding or closing the window leaves the conversation running in the background', async () => {
  await app.launchCompanion();
  await app.send('Help me connect');
  await app.closeCompanionWindow();
  await app.expectCompanionHidden();
  await app.agentFinishes('Check the cable. Keep the power supply closed.');
  await app.pressGlobalShortcut();

  await app.expectLatestAssistant('Check the cable. Keep the power supply closed.');
  await app.expectSameSessionAndSingleSubmission('Help me connect');
});
