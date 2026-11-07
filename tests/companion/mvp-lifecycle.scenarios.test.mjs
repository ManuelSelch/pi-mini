import { test } from 'node:test';
import { RemainingMvpDriver } from './support/remaining-mvp-driver.mjs';

// Drafts pending approval. Explicitly throwing drivers, not skipped/passing coverage.
// Run separately from the implemented conversation suite.
test('global shortcut shows and focuses the fixed companion; Escape preserves its draft and session', async () => {
  await usingMvp(async (app) => {
    await app.launchCompanion();
    await app.enterDraft('Explain the next step');
    await app.pressEscape();
    await app.expectCompanionHidden();
    await app.switchToAnotherApplication();
    await app.pressGlobalShortcut();

    await app.expectCompanionVisibleAndComposerFocused();
    await app.expectFixedWindowWithoutCollapseControls();
    await app.expectSameSessionAndDraft('Explain the next step');

    await app.pressGlobalShortcut();

    await app.expectCompanionHidden();
  });
});

test('hiding or closing the window leaves the conversation running in the background', async () => {
  await usingMvp(async (app) => {
    await app.launchCompanion();
    await app.send('Help me connect');
    await app.closeCompanionWindow();
    await app.expectCompanionHidden();
    await app.agentFinishes('Check the cable. Keep the power supply closed.');
    await app.pressGlobalShortcut();

    await app.expectLatestAssistant('Check the cable. Keep the power supply closed.');
    await app.expectSameSessionAndSingleSubmission('Help me connect');
  });
});

test('clicking the session title transfers the same conversation to Pi Chat without another confirmation', async () => {
  await usingMvp(async (app) => {
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
});

test('missing handoff support cannot open the wrong conversation or relinquish control', async () => {
  await usingMvp(async (app) => {
    await app.launchCompanionWithUnsupportedPiChat();
    await app.completeConversationTurn('Help me connect', 'Check the cable.');

    await app.expectTitleHandoffUnavailable();
    await app.expectCompanionStillControlsSameSession();
    await app.expectNoBrowserLaunchOrTranscriptCopy();
  });
});

test('a failed browser launch preserves the session and allows only explicit control recovery', async () => {
  await usingMvp(async (app) => {
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
});

test('Pi Chat reports a missing handoff target instead of creating or selecting another session', async () => {
  await usingMvp(async (app) => {
    await app.openPiChatWithMissingHandoffTarget();

    await app.expectMissingTargetErrorInPiChat();
    await app.expectNoReplacementConversation();
  });
});

test('explicit Quit stops only the companion-owned backend, unlike hiding its window', async () => {
  await usingMvp(async (app) => {
    await app.connectNormalPiChat();
    await app.launchCompanion();
    await app.quitCompanion();

    await app.expectOwnedProcessAndListenerStopped();
    await app.expectNormalPiChatUnaffected();
  });
});

async function usingMvp(scenario) {
  const app = new RemainingMvpDriver();
  try { await scenario(app); }
  finally { await app.dispose(); }
}
