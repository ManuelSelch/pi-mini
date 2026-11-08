import { test, beforeEach, afterEach } from 'node:test';
import { HandoffDriver } from './support/handoff-driver.mjs';

let app;
beforeEach(() => {
  app = new HandoffDriver();
});
afterEach(async () => {
  await app.dispose();
});

// Deferred by the user to the next step; not implemented or approved.
// Explicitly throwing driver scaffolds, never skipped/passing coverage.
test('clicking the session title transfers the same conversation to Pi Chat without another confirmation', async () => {
  await app.connectNormalPiChat();
  await app.launchCompanionWithHandoffReady();
  await app.completeConversationTurn('Help me connect', 'Check the cable.');
  await app.clickSessionTitle();

  await app.expectNoHandoffConfirmationScreen();
  await app.expectPiChatControlsSameRuntimeAndTranscript();
  await app.expectCompanionPausedWithoutAutomaticTakeover();
  await app.expectNormalPiChatUnaffected();

  await app.refreshHandoffPiChat();

  await app.expectPiChatControlsSameRuntimeAndTranscript();
});

test('missing handoff support cannot open the wrong conversation or relinquish control', async () => {
  await app.launchCompanionWithUnsupportedPiChat();
  await app.completeConversationTurn('Help me connect', 'Check the cable.');

  await app.expectTitleHandoffUnavailable();
  await app.expectCompanionStillControlsSameSession();
  await app.expectNoBrowserLaunchOrTranscriptCopy();
});

test('a failed browser launch preserves the session and allows only explicit control recovery', async () => {
  await app.launchCompanionWithFailingBrowserLaunch();
  await app.completeConversationTurn('Help me connect', 'Check the cable.');
  await app.clickSessionTitle();

  await app.expectPlainHandoffError();
  await app.expectCompanionPausedWithoutAutomaticTakeover();

  await app.clickTakeControl();

  await app.expectCompanionStillControlsSameSession();
  await app.expectLatestAssistant('Check the cable.');
  await app.expectSameSessionAndSingleSubmission('Help me connect');
});

test('Pi Chat reports a missing handoff target instead of creating or selecting another session', async () => {
  await app.openPiChatWithMissingHandoffTarget();

  await app.expectMissingTargetErrorInPiChat();
  await app.expectNoReplacementConversation();
});
