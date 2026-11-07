# Companion MVP interface

Revision: 1
Status: in review; not yet visually approved.

## Goal and scope

Extend the earlier compact companion intent to real SDK lifecycle states without
encoding prose structure in the protocol. The user approved the first-slice
acceptance scenarios and backend isolation and requested the full MVP. This
revision supplies the remaining required UI-state review, not production code.
The earlier `mockups/companion/` revision 3 remains preserved unchanged.

## Layout and behavior

- Preserve the 360 × 380 charcoal companion, rounded corners, compact title,
  icon-only Open in Pi Chat and anchored collapse to 280 × 44.
- Show the latest assistant response, not the latest user submission. Keep all
  text available by scrolling; do not truncate or extract titles from Markdown.
- No numbered steps, progress dots, invented titles or router-specific start
  action. Guidance comes from agent instructions, not UI structure.
- One small status row: ready, thinking, running, waiting for an answer,
  reconnecting, failed or control transferred. Preserve the useful answer while
  waiting, disconnected or reporting an error.
- Required questions are a separated inline block with “Answer needed”, their
  actual question, offered options/Yes/No, and explicit cancellation. Input
  questions use the composer with a “Your answer…” placeholder. Select/confirm
  disable ordinary composer submission while awaiting the required answer.
- Optional Done / Explain / I’m stuck buttons send normal user messages. They
  are static companion affordances, not agent-generated structured actions and
  not blocking prompts. They disappear while busy, disconnected or awaiting a
  required answer. Composer remains available for other idle user messages.
- Enter submits; Shift+Enter inserts a newline. Keep an in-progress draft during
  running states. Stop cancels the simulated reply without clearing the answer.
- Failed reply exposes a concise error; another message is an explicit retry,
  never an automatic resend of uncertain work.
- Superseded control is passive until explicit Take control. No automatic
  reconnection fight. The last response remains available.
- Open in Pi Chat first asks for explicit session-and-control transfer. It is
  unavailable during running, pending questions and disconnected states. On
  success show “Pi Chat has control”; Take control here is explicit. Cancellation
  leaves the session unchanged. Actual failed-transfer handling must retain the
  session and provide explicit recovery; no implicit reclaim after ownership
  might already have changed.
- Escape hides the mock companion; Show companion restores it. Control+Option+
  Space toggles only while this browser page receives keys. Restoration focuses
  the composer. Hiding/collapse do not cancel pending local work or clear drafts.

## Direct states

`/companion-mvp/?state=` accepts: idle (default), thinking, running, select,
confirm, input, error, reconnecting, superseded, handoff, transferred, empty.
Review links are outside the companion and are not production UI. Their labels
and simulated-operation notices disclose how buttons are routed. State links
reload deterministic fake data; clicking the current link resets the state.

## Limitations

All messages, statuses, prompt submissions, process ownership and handoffs are
simulated. No SDK/backend, real permission request, credential access or session
persistence. Follow-up responses take 900 ms and explicitly identify the demo.
No real Pi Chat is launched. The production handoff requires a new Pi Chat entry
contract; this prototype does not invent or claim an existing deep link.

This is a browser approximation, not evidence of native global shortcuts,
window focus across apps, positioning, dragging, resizing, background operation,
tray behavior, or real controller transfer. The original native mockup is
unchanged. No browser automation or screenshots were requested or performed.
Agentation is development-only and supports copied annotations, not an external
annotation service.

## Approval

Await explicit approval of this revision before production UI implementation.
First-slice scenario/backend approval does not itself approve these new UI states
or the still-to-be-drafted native lifecycle and Pi Chat handoff scenarios.
