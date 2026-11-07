import { test, beforeEach, afterEach } from 'node:test';
import { PackagingDriver } from './support/packaging-driver.mjs';

let app;
beforeEach(() => { app = new PackagingDriver(); });
afterEach(async () => { await app.dispose(); });

// Real packaged WebView/SDK smoke; no model calls or browser automation.
// Builds run via test:packaging; each scenario uses an isolated installation.
test('the installed app starts its private backend without the checkout or system Node', async () => {
  await app.buildAndInstallApp();
  await app.makeCheckoutAndSystemNodeUnavailable();
  await app.launchInstalledApp();

  await app.expectCompanionReadyWithPrivateBackend();
  await app.expectStandardPiConfigurationAvailable();
});

test('a relocated app remains independently launchable', async () => {
  await app.buildAndRelocateApp();
  await app.makeCheckoutAndSystemNodeUnavailable();
  await app.launchRelocatedApp();

  await app.expectCompanionReadyWithPrivateBackend();
});

test('quitting the installed app stops only its own backend', async () => {
  await app.launchInstalledAppWithUnrelatedService();
  await app.quitApp();

  await app.expectOwnedBackendStopped();
  await app.expectUnrelatedServiceUnaffected();
});
