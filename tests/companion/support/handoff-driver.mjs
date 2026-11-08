function pending() {
  throw new Error('Not implemented: Pi Chat handoff is deferred to the next step');
}

export class HandoffDriver {
  connectNormalPiChat() {
    pending();
  }
  launchCompanionWithHandoffReady() {
    pending();
  }
  completeConversationTurn(_question, _answer) {
    pending();
  }
  clickSessionTitle() {
    pending();
  }
  expectNoHandoffConfirmationScreen() {
    pending();
  }
  expectPiChatControlsSameRuntimeAndTranscript() {
    pending();
  }
  expectCompanionPausedWithoutAutomaticTakeover() {
    pending();
  }
  expectNormalPiChatUnaffected() {
    pending();
  }
  refreshHandoffPiChat() {
    pending();
  }
  launchCompanionWithUnsupportedPiChat() {
    pending();
  }
  expectTitleHandoffUnavailable() {
    pending();
  }
  expectCompanionStillControlsSameSession() {
    pending();
  }
  expectNoBrowserLaunchOrTranscriptCopy() {
    pending();
  }
  launchCompanionWithFailingBrowserLaunch() {
    pending();
  }
  expectPlainHandoffError() {
    pending();
  }
  clickTakeControl() {
    pending();
  }
  expectLatestAssistant(_text) {
    pending();
  }
  expectSameSessionAndSingleSubmission(_text) {
    pending();
  }
  openPiChatWithMissingHandoffTarget() {
    pending();
  }
  expectMissingTargetErrorInPiChat() {
    pending();
  }
  expectNoReplacementConversation() {
    pending();
  }
  dispose() {
    pending();
  }
}
