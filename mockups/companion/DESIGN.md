# Pi companion clickdummy

Revision: 1
Status: in review — no production implementation approved.

## Goal and scope

Experience a small, native, always-on-top companion while doing something else.
Isolated under this repository's `mockups/`; the original native spike and
all real Pi Chat/server/SDK projects remain unchanged.

User requested a Tauri clickdummy. This revision uses the required React,
TypeScript, Vite, Mantine and Tabler mockup stack inside a separate Tauri shell.
Agentation is development-only; the offline packaged mockup omits it.

## Visual direction

Pi Chat Classic Dark palette: charcoal surfaces, gray borders, blue accent.
Default companion 360 × 480 logical pixels; resizable down to 320 × 380.
Header stays compact: brand, pin, collapse, overflow menu. Local demo badge and
composer disclosure explicitly identify scripted content.

## Interactions and review states

- Default `/companion/`: router-setup guided session. Show the latest message,
  one step, contextual quick replies, and earlier conversation on demand.
- `/companion/?state=empty`: empty conversation. Start scripted router setup
  or send free text for an explicitly simulated reply.
- Send free text with Enter; Shift+Enter inserts a newline. Simulated thinking
  lasts 650 ms; Stop cancels that pending reply.
- Pin toggles native always-on-top. Drag header to move; drag edges to resize.
- Collapse to a 280 × 64 strip, preserving the right edge; expand restores size.
  Session and composer state survive collapse. Collapsed resizing is disabled.
- Overflow: new conversation, open in Pi Chat, close window.
- Open in Pi Chat opens a separate larger **mock** window with the same demo
  session identity and transcript. Both windows share in-memory demo messages
  through local Tauri events (BroadcastChannel in the browser preview).
- Back to companion focuses the companion and closes the mock destination.
- The full-window view is also directly accessible via
  `/companion/?view=pi-chat`. Its sidebar is illustrative, not a session manager.

## Simulated/omitted behavior

No real agent calls, credentials, network service, disk/session persistence,
settings, model selector, project chooser, file uploads, tray, global shortcut
or real Pi Chat launch. Native shell permissions are local window/event controls;
no shell execution/opener/filesystem plugins. CSP is left at Tauri's default
for this disposable mockup, not a production security configuration.

Router guidance is canned demo text, not a supported router-specific workflow.
Free-form input returns an explicit demonstration response rather than pretending
to be a live agent. Simulated busy state is local to each window; simultaneous
typing/sending in both windows is not a supported demo scenario. A remote update
cancels a locally pending fake reply. Closing the whole app loses demo state.
On browser preview, native positioning/pinning/closing are approximated; only
the Tauri app can demonstrate actual OS window behavior.

## Future integration intent — not implemented

The companion and Pi Chat should share a backend session reference, not copy
transcripts or start a replacement conversation. The real handoff needs an
explicit Pi Chat session-open URL/deep-link/action contract and the shared backend
connection/authentication. This mock does not establish that such a URL exists.
Observe backend session ownership and interactive permission/tool contracts
when implementing; mock approval does not authorize dropping existing journeys.

## Review

Main questions: Is this footprint comfortable? Is latest-answer-plus-history
enough? Does collapse help? Does switching to a larger conversation feel natural?
No production scenario or design approval is inferred from the spike approval.
TypeScript, Vite production compilation, native app bundling, Rust formatting,
npm dependency audit, and HTTP/module-serving checks passed. Native app launched
for user-led review. Native interactions and appearance have not been automated
or visually verified. No browser automation or screenshots were requested or performed.
