import { test } from 'node:test';
import { CompanionDriver } from '../../support/companion-driver';

test('reconnecting during a run does not present a suffix as a complete answer', async () => {
  const app = new CompanionDriver();
  try {
    await app.startCompanion();
    await app.send('Help me connect');
    await app.agentStreams('Check the cable.');
    await app.expectLatestAssistant('Check the cable.');
    await app.dropTransportWhileRunning();
    await app.agentStreamsWhileDisconnected(' Do not open the power supply.');
    await app.restoreTransport();
    await app.agentStreams(' Then tell me what you see.');

    await app.expectLatestAssistant('Check the cable.');

    await app.agentFinishes('Check the cable. Do not open the power supply. Then tell me what you see.');

    await app.expectLatestAssistant('Check the cable. Do not open the power supply. Then tell me what you see.');
  } finally { await app.dispose(); }
});
