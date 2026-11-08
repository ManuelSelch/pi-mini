import { test, beforeEach, afterEach } from 'node:test';
import { RemainingMvpDriver } from './support/remaining-mvp-driver.mjs';

let app;
beforeEach(() => {
  app = new RemainingMvpDriver();
});
afterEach(async () => {
  await app.dispose();
});

// Approved native lifecycle scenarios; Pi Chat handoff is deferred separately.
// Run serially through npm run test:native (macOS event-post permission).
// Native window/shortcut/Quit boundaries are real; local keys use WebView events.
test('global shortcut shows and focuses the fixed companion; Escape preserves its draft and session', async () => {
  await app.launchCompanion();
  await app.enterDraft('Explain the next step');
  await app.pressEscape();
  await app.expectCompanionVisibleAndComposerFocused();
  await app.expectSameSessionAndDraft('Explain the next step');
  await app.pressGlobalShortcut();
  await app.expectCompanionHidden();
  await app.switchToAnotherApplication();
  await app.pressGlobalShortcut();

  await app.expectCompanionVisibleAndComposerFocused();
  await app.expectFixedWindowWithoutCollapseControls();
  await app.expectSameSessionAndDraft('Explain the next step');

  await app.pressGlobalShortcut();

  await app.expectCompanionHidden();
});

test('Escape stops a running agent without hiding the companion', async () => {
  await app.launchCompanion();
  await app.send('Help me connect');
  await app.pressEscape();

  await app.expectAgentStoppedAndWindowVisible();
  await app.expectSameSessionAndSingleSubmission('Help me connect');
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

test('explicit Quit stops only the companion-owned backend, unlike hiding its window', async () => {
  await app.connectNormalPiChat();
  await app.launchCompanion();
  await app.quitCompanion();

  await app.expectOwnedProcessAndListenerStopped();
  await app.expectNormalPiChatUnaffected();
});
