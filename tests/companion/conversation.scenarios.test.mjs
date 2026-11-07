import { test, beforeEach, afterEach } from 'node:test';
import { CompanionDriver } from './support/companion-driver.mjs';

let app;
beforeEach(() => { app = new CompanionDriver(); });
afterEach(async () => { await app.dispose(); });

// Real SDK + isolated real server; controlled agent events, not a provider run.
// Protocol/application coverage does not establish native focus or visual rendering.
test('one real SDK session streams the latest assistant answer without truncation', async () => {
  await app.startCompanion();
  await app.send('Help me configure my router');
  await app.agentStartsThinking();

  await app.expectStatus('thinking');

  await app.agentStreams('Check the label on your router.');

  await app.expectLatestAssistant('Check the label on your router.');
  await app.expectNoInventedStepCount();

  await app.agentFinishes('Check the label on your router. Do not share its password.');

  await app.expectLatestAssistant('Check the label on your router. Do not share its password.');
  await app.expectStatus('idle');
  await app.expectCompanionInstructionsDelivered();
});

test('stop and run errors preserve the useful response and allow another message', async () => {
  await app.startCompanion();
  await app.send('Help me');
  await app.agentStreams('First, check the cable.');
  await app.stop();

  await app.expectAbortForSelectedSession();
  await app.expectSessionRetained();

  await app.send('Explain');
  await app.agentFails('Provider unavailable');

  await app.expectVisibleError('Provider unavailable');
  await app.expectLatestAssistant('First, check the cable.');
  await app.expectComposerAvailable();
});

test('required choices and typed answers use prompts; follow-ups remain ordinary messages', async () => {
  await app.startCompanion();
  await app.agentRequestsSelect('Connection type', ['Wi-Fi', 'Ethernet']);
  await app.choose('Ethernet');

  await app.expectPromptAnswer('Ethernet');

  await app.agentRequestsConfirm('Continue?');
  await app.choose('Yes');

  await app.expectPromptAnswer(true);

  await app.agentRequestsInput('Router model');
  await app.submitComposer('Example router');

  await app.expectPromptAnswer('Example router');

  await app.sendFollowUp('Explain');

  await app.expectNormalUserMessage('Explain');
  await app.expectNoFollowUpPromptOrTimeout();
});

test('reconnect restores the same session without replaying a message or fighting another controller', async () => {
  await app.startCompanion();
  await app.send('Check my connection');
  await app.disconnectTransport();
  await app.restoreTransport();

  await app.expectSameSessionAndFinalizedHistory();
  await app.expectMessageSentOnce('Check my connection');

  await app.replaceController();

  await app.expectStatus('superseded');
  await app.expectNoAutomaticTakeover();

  await app.explicitlyTakeControl();

  await app.expectSameSessionReady();
});
