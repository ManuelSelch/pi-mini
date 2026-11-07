function pending() {
  throw new Error('Not implemented: companion acceptance driver awaits scenario approval');
}

export class CompanionDriver {
  connectNormalPiChat() { pending(); }
  startCompanion() { pending(); }
  expectIndependentBackendAndStorage() { pending(); }
  expectNormalPiChatStillControlsItsBackend() { pending(); }
  send(_text) { pending(); }
  agentStartsThinking() { pending(); }
  expectStatus(_status) { pending(); }
  agentStreams(_text) { pending(); }
  expectLatestAssistant(_text) { pending(); }
  expectNoInventedStepCount() { pending(); }
  agentFinishes(_text) { pending(); }
  expectCompanionInstructionsDelivered() { pending(); }
  stop() { pending(); }
  expectAbortForSelectedSession() { pending(); }
  expectSessionRetained() { pending(); }
  agentFails(_message) { pending(); }
  expectVisibleError(_message) { pending(); }
  expectComposerAvailable() { pending(); }
  agentRequestsSelect(_title, _options) { pending(); }
  choose(_label) { pending(); }
  expectPromptAnswer(_answer) { pending(); }
  agentRequestsConfirm(_title) { pending(); }
  agentRequestsInput(_title) { pending(); }
  submitComposer(_text) { pending(); }
  sendFollowUp(_text) { pending(); }
  expectNormalUserMessage(_text) { pending(); }
  expectNoFollowUpPromptOrTimeout() { pending(); }
  disconnectTransport() { pending(); }
  restoreTransport() { pending(); }
  expectSameSessionAndFinalizedHistory() { pending(); }
  expectMessageSentOnce(_text) { pending(); }
  replaceController() { pending(); }
  expectNoAutomaticTakeover() { pending(); }
  explicitlyTakeControl() { pending(); }
  expectSameSessionReady() { pending(); }
  dispose() { pending(); }
}
