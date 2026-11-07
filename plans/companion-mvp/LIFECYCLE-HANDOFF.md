# Remaining MVP: native lifecycle; handoff deferred

Status: native lifecycle scenarios explicitly approved (“scenarios approved.
implement”) and implemented locally. The user explicitly requested skipping
Pi Chat handoff for now and doing it in the next step. No Pi Chat changes or
handoff work are in the current implementation scope.

The implemented first slice and its five approved conversation scenarios remain
unchanged. The current scope is global shortcut/focus, hide/background behavior
and explicit Quit cleanup, without another visual redesign. Approved mockup
revision 6 remains the visual baseline; the session-title action stays disabled.

## Native lifecycle

- Control+Option+Space shows and focuses the companion/composer from another
  application. If the companion already has focus, the shortcut hides it.
- Escape and a native close request hide the window without disposing React,
  the SDK client, runtime, backend process or composer draft. A run can finish
  while hidden, and restoration displays its latest useful response.
- Fixed 360 × 380; no user resizing, collapse/expand or minimized strip.
- Explicit Quit disposes the owned backend and its runtime. Normal Pi Chat is
  never stopped. Dock/application reopen can restore the hidden window.
- Failure to register the shortcut must be visible, not silently reported as
  working. No tray UI is introduced in this slice.

This changes the first slice's close-window behavior from shutdown to hiding;
explicit Quit retains shutdown behavior. Native focus/shortcut outcomes require
native-boundary verification; a DOM key event is not evidence of a global shortcut.
OS automation/accessibility limitations must be reported rather than replaced
with passing fake assertions.

## Session-and-control handoff — deferred to the next step

The following proposal is retained for later review, not approved or in scope now.

Keep the existing one-controller server/protocol and SDK unchanged. Do not add
multi-controller behavior, a prose parser or a new response format.

### New Pi Chat application entry contract

- Add an explicit session-target query parameter, `sessionId`, to Pi Chat's web
  entry. It names an already-open opaque runtime on the **same origin's backend**.
- After SDK initialization, select exactly that runtime and its authoritative
  transcript. Do not call session.create, copy a transcript, open a second
  runtime from a saved path, or silently choose another available conversation.
- A missing/invalid target produces a visible Pi Chat error. Refresh retains the
  same explicit target. Entry without this parameter retains normal Chat behavior.
- No URL-supplied arbitrary backend endpoint, credential or transcript. This is
  a new HTTP application entry contract, not an invented existing deep link.

### Companion host and title action

- Serve the explicitly configured built Pi Chat frontend from the companion's
  own ephemeral loopback server using the server's existing staticDirectory API.
  Normal Pi Chat's separate server/controller remains unaffected.
- Proposed configuration: `PI_MINI_CHAT_DIRECTORY` selects that built frontend.
  Do not silently discover/reuse an unrelated port or change the live Chat service.
- The modified Pi Chat build must ship a small handoff-capability marker. Validate
  it before enabling the title action, so an older frontend cannot ignore the
  target and open the wrong conversation. Missing/unsupported assets leave the
  action disabled and control with the companion. No compatibility fallback.
- Clicking the title is the explicit transfer action; no confirmation screen.
  Require an idle conversation with no pending required prompt, as approved.
- Relinquish the companion's SDK connection before requesting the OS to open
  the companion-origin Chat entry for that runtime. Suppress reconnect/takeover
  during handoff. Do not stop the owned backend or close the runtime.
- Gray status means control is released/elsewhere; the OS accepting an open
  request is not proof that Pi Chat initialized. Do not display a false success
  acknowledgment. The companion keeps its response and an explicit Take control
  recovery action. No new protocol acknowledgment feature is required.
- If browser launch fails after release, show a plain red error and stay paused.
  Reclaim only when the user clicks Take control; do not retry messages or create
  another conversation. After an uncertain launch outcome the same rule applies.

This requires scoped changes to Pi Chat's application entry/build/test code as
well as Pi Mini. No publication, push, live-service restart, server/SDK change or
credential migration is authorized by implementing this design. A source/build
that does not support this contract must not be treated as a successful handoff.

## Acceptance drafts and coverage

Current scope: `tests/companion/mvp-lifecycle.scenarios.test.mjs` has three approved scenarios:
- Global shortcut shows/focuses; Escape preserves the session and composer draft.
- Native window close hides; an agent run finishes in the background and is
  visible on restoration without a duplicate submission.
- Explicit Quit stops only the owned backend; normal Pi Chat remains unaffected.

Deferred: `tests/companion/handoff.scenarios.test.mjs` retains the four handoff
outcomes for the next step, including failure recovery and missing-target safety.
No existing approved conversation scenario or implemented coverage was removed.

The three native scenarios now have working drivers and run through
`npm run test:native` from the repository root after building the native executable.
Standard beforeEach/afterEach creates a fresh fixture and disposes it after each
test, including failures. Real macOS shortcut and Cmd+Q event posting verifies
those native boundaries; native window/WebView probes verify effects. Local
Enter/Escape events and draft entry are dispatched inside the real WebView, not
claimed as physical keyboard/text-entry coverage. No scenario assertion was
weakened or skipped. Native tests are serial and require OS event-post permission.

All three approved native scenarios and existing startup smoke pass locally.
The four deferred handoff drafts still explicitly throw and are not part of
implemented suites or reported passing coverage. Handoff's cross-application
entry/control contract will receive separate approval in the next step.
Preserve these executable scenarios. No screenshots/visual automation without
explicit permission; offer implemented-state comparison separately from tests.
