import { test } from 'node:test';
import { CompanionDriver } from '../../support/companion-driver';

test('an operation failure after admission remains visible even without a runtime lastError', async () => {
  const app = new CompanionDriver();
  try {
    await app.startCompanion();
    await app.send('Check the connection');
    await app.agentFailsAfterAdmission('Operation failed after admission');

    // The server deliberately sanitizes unclassified exceptions on operation events.
    await app.expectVisibleError('The server operation failed.');
    await app.expectComposerAvailable();
  } finally { await app.dispose(); }
});
