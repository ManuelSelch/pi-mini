import { test, beforeEach, afterEach } from 'node:test';
import { RemainingMvpDriver } from './support/remaining-mvp-driver.mjs';

let app;
beforeEach(() => { app = new RemainingMvpDriver(); });
afterEach(async () => { await app.dispose(); });

// Drafts: native menu-bar interactions and system presence require driver implementation.
test('menu bar restores the hidden companion without losing its draft', async () => {
  await app.launchCompanion();
  await app.enterDraft('Explain the next step');
  await app.pressGlobalShortcut();
  await app.expectCompanionHidden();
  await app.showCompanionFromMenuBar();
  await app.expectCompanionVisibleAndComposerFocused();
  await app.expectSameSessionAndDraft('Explain the next step');
});

test('companion is available from the menu bar but absent from Dock and app switcher', async () => {
  await app.launchCompanion();
  await app.expectMenuBarPresenceWithoutDockOrAppSwitcher();
});

test('menu bar Quit stops the companion-owned backend without affecting Pi Chat', async () => {
  await app.connectNormalPiChat();
  await app.launchCompanion();
  await app.quitCompanionFromMenuBar();
  await app.expectOwnedProcessAndListenerStopped();
  await app.expectNormalPiChatUnaffected();
});
