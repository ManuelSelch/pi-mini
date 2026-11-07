# Companion MVP — first integration slice

Status: first-slice scenarios and backend isolation approved; first slice
implemented locally. Mockup revision 6 explicitly approved for implementation.
Native show/hide/background scenarios subsequently approved and implemented.
Real Pi Chat handoff is explicitly deferred to the next step.

## Controller ownership

The current server has one controller **per server**, not per session. Initializing
another SDK client against that endpoint replaces the existing controller. The
SDK stops retrying after replacement; this prevents fighting but does not prevent
the initial displacement.

Approved MVP resolution: launch one companion-owned loopback server process on an
ephemeral port. Do not attach automatically to Pi Chat's normal endpoint or alter
its running service. Keep companion histories/metadata separate while reusing
existing provider authentication through supported Pi configuration. Never copy
credentials into frontend state. Verify actual configuration support before
implementation; surface any required scope change rather than silently sharing
mutable session storage.

Native code owns process startup, readiness, endpoint delivery and shutdown.
Hiding the window must not shut down the process or close the runtime.
The user removed collapse/expand and user resizing during mockup review.
An explicit application quit stops the owned process cleanly. A native socket
adapter/bridge must respect the server's Origin policy; do not weaken it to let
an unrelated Tauri web origin connect.

No multi-controller protocol change or automatic take-control loop. Accidental
replacement produces a visible superseded state; taking control is explicit.

## First slice

- Create one real SDK-backed runtime and stream the latest assistant response.
- Present thinking/running/idle, stop, connection loss and errors.
- Reconnect without resending uncertain mutations; retain the selected runtime
  when present. Do not promise recovery of an unobserved streaming prefix.
- Render required select/confirm answers inline; use the composer for input.
  Required prompts use existing prompt IDs and SDK answers. Respect prompt
  expiry/cancellation from the server; do not manufacture permission prompts
  when the agent/runtime has not requested one.
- Suggested follow-ups are normal user messages, never implicit blocking prompts.
- Companion instructions request brief answers, one actionable procedural step
  followed by waiting, more explanation on request, and essential warnings.
  Preserve full answer content; no truncation, Markdown structure guessing,
  fixed step counts, or new structured-response SDK feature.

## Subsequent slices (not covered by these first-slice scenarios)

1. Global Control+Option+Space, composer focus, Escape-to-hide, background lifecycle:
   approved and implemented under `LIFECYCLE-HANDOFF.md` and the three native
   scenarios in `tests/companion/mvp-lifecycle.scenarios.test.mjs`.
2. Refine concise/guided instruction behavior using a real conversation.
3. Explicit Open in Pi Chat session-and-control handoff. Requires a new Pi Chat
   entry contract for endpoint plus runtime/session reference and deliberate
   relinquish/claim behavior. There is no current session-opening deep link.
   Do not copy a transcript, open an unrelated session, or present the mock
   full-chat window as the real application. Cross-project changes need an
   approved handoff design and scenarios first.

## Preserved and changed outcomes

- Preserve compact always-on-top companion and dragging. User explicitly
  changed the design to fixed 360 × 380 with no resizing or collapse/expand.
  Hide/restore retains draft/session; close hides and explicit Quit shuts down.
- Replace canned router progression and simulated replies with real responses.
- Remove router-only step titles/count/dots and scripted router-start action.
- Show latest **assistant** response rather than blindly showing the last
  message (which could be the user's submission).
- Replace simulated status with actual connection/run/prompt states.
- The mock handoff remains only in preserved mockup source; no misleading live
  Open in Pi Chat action until the real contract exists.
- The original spike and its pin-toggle scenarios were subsequently retired at the user's request; they did not verify the companion redesign or SDK behavior.

## Approval and evidence

First-slice executable scenarios: `tests/companion/conversation.scenarios.test.mjs`.
All five approved scenarios now have working drivers using the published SDK
and isolated real server with controlled runtime events. Catalogue tests also
seed real Pi history and verify it is not visible in the companion. Additional
unit/integration regressions protect post-admission errors and partial-stream
recovery. These tests are not a real-provider or visual-rendering claim.

The first slice was implemented independently of the mockups and subsequently moved to the repository root. Native WebView startup smoke verifies real runtime creation through
the native socket bridge and fixed dimensions/non-resizability. An explicitly
separate real-model native smoke returned “Ready.”. See `README.md`
for architecture, commands, limitations and verification details.

Approved UI: `mockups/companion-mvp/`, revision 6. User: “mockup approved.
Implement it”. Agent-owned preview stopped; owned process/listener disappearance
verified. The original revision 3 mockup remains unchanged as historical source.
No browser automation or screenshots without permission for visual review.
The first-slice title action is disabled rather than pretending to open Pi Chat;
its actual application entry contract still belongs to the subsequent handoff
slice, explicitly deferred by the user. The native lifecycle scope was later
approved (“scenarios approved. implement”) and implemented: three native scenarios
pass, including actual OS global-shortcut/Quit effects, session/draft retention,
background completion and owned cleanup. Local Enter/Escape events are exercised
inside the real WebView, not claimed as physical keyboard-entry verification.
Scenario fixture wrappers were replaced by beforeEach/afterEach as requested.
No real Pi Chat handoff is claimed or implemented.
