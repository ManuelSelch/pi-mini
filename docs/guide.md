# Pi Mini

A native SDK-backed companion, separate from the preserved mockups. The approved compact interface, real conversation, and native lifecycle
are implemented here. Control+Option+Space shows/focuses the companion and toggles
it away when already focused. Escape closes the project switcher or stops the
current run; window close hides the app without stopping work. Pi Chat handoff is explicitly deferred to the next step; the title action
stays disabled. [Current scope and deferred handoff proposal](../plans/companion-mvp/LIFECYCLE-HANDOFF.md).

## Static checks and local pipeline

Run `npm run lint`, `npm run check:format`, `npm run typecheck`, `npm run check:knip`, and `npm run check:rustfmt` for static checks. `npm run lint:fix` and `npm run format` apply automatic fixes. The local pipeline runs these checks and application/UI tests after agent changes; build, native tests, and packaging are manual suites. Native and packaging suites require macOS and the relevant system tools.

Knip retains the explicitly pinned Pi runtime packages needed by the bundled server and ignores system binaries; CSS dependencies are checked via their imports. Disposable mockups and temporary plans are excluded from formatting.

## Run locally

Requirements: macOS, Node >=22.19, Rust >=1.90, and Xcode Command Line Tools.
Configure providers/models with your existing Pi installation first.

```sh
npm ci --include=dev
# Register this checkout once: pi install /path/to/pi-mini
# Start Pi Chat's server using /pi-chat start in Pi, then:
npm run dev
```

Register this checkout as a local package in the shared server's Pi settings (`packages` array), or run `pi install /path/to/pi-mini`. The `pi.extensions` manifest in `package.json` loads the extension directly from source without copying or building it. Keep the checkout and its dependencies available. New sessions load the registered extension. After updating extension code, run `/reload` in a Pi Chat session on the shared server before relaunching Pi Mini: Pi caches extension factories between sessions in the same project. There is no `/mini-mode` user command or extra button.

Pi Mini defaults to `ws://127.0.0.1:8788/ws`. Set `PI_MINI_ENDPOINT` for another loopback port and `PI_MINI_PROJECT` for a different initial working directory. Start the shared server before Pi Mini; no private-server fallback is provided.

Or build the native executable with embedded web assets:

```sh
npm run build:native
./src-tauri/target/debug/pi-mini
```

The development executable requires Node and this checkout's installed dependencies/compiled host. `PI_MINI_NODE` can select a Node executable when `node` is not on PATH. Do not move the checkout after building without rebuilding the development executable.

To build a relocatable macOS app for the current machine's architecture:

```sh
npm run build:app
```

The app is produced at `src-tauri/target/release/bundle/macos/Pi Mini.app`. To build and install it to `/Applications`, quit the running app first and run `npm run install:app`. It bundles a checksum-verified official Node 22.22.1 runtime and production dependencies, and does not need the checkout or a system Node to start. Building downloads Node and npm packages. The build is not Developer ID signed or notarized, so macOS Gatekeeper may require explicit permission to open it. Provider configuration and credentials still come from the user's Pi installation; external tools and extensions may have their own dependencies.

Development builds include the Agentation toolbar and connect to the separately
configured local Agentation server at `http://localhost:4747`. It is not included
in production builds; avoid sensitive information in annotations.

- Fixed 360 × 380, always on top; drag the unused header area to move it.
- Type a message and press Enter; Shift+Enter inserts a newline.
- Latest assistant response is scrollable and never blindly truncated.
- Small header dot: green ready, blue thinking/running, purple question,
  amber connecting/stopping, gray superseded, red error. Hover or a screen reader
  provides the status description. Errors use plain red text.
- Required select/confirm questions have inline buttons; input/editor questions
  use the composer. Explicit selects require Submit. Cancel answers the actual
  pending prompt; stale/expired questions cannot be answered through the app.
- Done / Explain / I’m stuck send ordinary messages, not required prompt answers.
- Cmd+O opens the project switcher when the conversation is idle. Search known
  projects or enter an absolute path (or `~/` path); arrows and Enter select a
  folder and start a fresh session. Escape closes the switcher without hiding.
  Switching is unavailable during a run or required question; a successful switch
  clears the composer draft. Once the new session has its instructions, it becomes usable immediately; closing the previous runtime continues in the background without holding the composer closed.
- Stop aborts the run without closing its runtime or clearing the draft.
- A replaced controller does not reconnect automatically. Take control is explicit.
- Control+Option+Space shows/focuses the native window and composer from another
  app; pressing it while Pi Mini has focus hides the window.
- Escape closes the project switcher or stops the current run; it never hides the window.
  Native window close hides it, preserving the draft/session and ongoing work. A
  response can finish while hidden; restoring shows the latest useful answer.
- Pi Mini lives in the macOS menu bar as π, not in the Dock or app switcher.
  Use Show Pi Mini to restore it or Quit Pi Mini to disconnect and stop its connection helper. The shared server and conversations remain running.
  Cmd+Q also quits while focused. If shortcut registration fails, use the menu bar.
- The session title's Pi Chat action is deliberately disabled until the real
  handoff entry contract exists. No mock destination or transcript-copy shortcut.

## Data and security

Pi Mini connects to the existing Pi Chat loopback server. Its Node helper probes `/health` and supplies the endpoint to the native frontend; it never creates, restarts or stops the shared server. One controller is allowed at a time: starting Pi Mini replaces Pi Chat's connection; taking control in Pi Chat replaces Pi Mini's. Neither client automatically fights for control. The native WebSocket adapter
uses the SDK through Tauri's native socket plugin; the server's browser Origin
checks remain intact. Frontend code accepts only the native-supplied loopback
`/ws` endpoint, renders agent Markdown without raw HTML, and receives no provider credentials.

The server can execute tools with your user permissions. This is not a sandbox
or an authenticated network service. Keep it private/loopback.

New conversations use the shared server's session storage and project catalogue, so they appear in Pi Chat's history. The initial working directory defaults to the user's home folder (**Quick Chats**). Providers, credentials, settings and extensions come from the shared server's Pi environment; no credentials are copied into the frontend. Old private Pi Mini history under macOS Application Support `com.piagent.mini` is left untouched and is not migrated.

Each application launch creates a fresh runtime/conversation. Finalized history
is saved in shared storage, but there is no history picker or last-session
restore on a fresh app launch in this slice. Same-server reconnect preserves the
selected runtime and finalized history without replaying messages or other
mutations. A missing runtime is reported instead of silently attaching elsewhere.
An unobserved prefix of an in-flight response cannot be recovered by the SDK;
the companion suppresses recovered draft suffixes until a finalized message
arrives rather than presenting an incomplete suffix as the answer. Unexpected backend-process restart/recovery is
not implemented; quit and relaunch after a permanent backend failure.

Published dependencies remain pinned: SDK 0.2.1, server 0.2.1, and Pi 1.0.2/1.0.3 for local extension/build/test tooling. Production conversations run in the existing server's Pi environment. No server/SDK source changes or compatibility shims are added.

## Architecture

The [architecture diagram](architecture.drawio) tracks TypeScript imports between conversation and lifecycle layer folders. Run `npm run test:arch` to check it or `npx pi-verify architecture --write` to refresh it; review and place newly staged boxes in draw.io. The check excludes root-level files, Rust and runtime dependencies, so it is not a complete runtime architecture.

- `src/conversation/infra/host/main.ts` and `shared-server.ts`: connection helper and shared-server health/configuration validation. The old `server.ts`/`runtime.ts` private-host helpers remain used only by isolated regression/native lifecycle fixtures, not normal startup.
- `src/conversation/infra/mini-mode.ts`: installable Pi extension. A global `pi-mini.initialize` action routes to the correct session's Pi API using its raw Pi session ID, not a latest-session closure. It inserts one persisted custom instruction message, without a model turn, user command, UI button or transcript marker, then immediately sends a session-scoped informational acknowledgment through the existing notification channel. Startup/shutdown maintain routing; existing branch instructions prevent duplicate insertion.
- `src/conversation/infra/initialize-mini-session.ts`: SDK action admission/instruction-acknowledgment tracking. Startup and project switches unlock after the extension confirms insertion, not after `operation.finished`; the server's catalogue refresh continues in the background, as it does for Pi Chat session opening. An accepted receipt alone is insufficient. Unrelated notifications or other sessions cannot unlock the composer. Missing acknowledgments, failed operations and interrupted initialization surface errors without replay; the acknowledgment deadline is 60 seconds. Completion without acknowledgment is an error, not a legacy fallback. A timeout reports an unknown outcome, not proof that the extension is missing. Update/reload the extension along with the app; `/reload` must run in a session on the shared server, not just in an unrelated terminal Pi process.
- `src/conversation/infra/native-transport.ts`: bounded, ordered, native socket
  transport only. It preserves close code 4001; it does not own response length.
- `src/conversation/app/`: SDK state orchestration, selected runtime, latest useful
  response, prompt answers, error presentation and explicit control reclaim.
- `src/conversation/domain/`: UI-independent view values and status labels.
- `src/conversation/ui/components/`: value/callback-only Mantine/Tailwind views.
- `src/conversation/ui/containers/`: state subscription and separate ordinary
  composer drafts versus question answers.
- `src/lifecycle/app/`: native visibility/error listeners and composer-focus
  requests. Escape is handled by the conversation UI, not native visibility;
  it closes the switcher or stops a running agent without answering a prompt. Listeners, including late registrations, are
  released on unmount.
- `scripts/prepare-bundle.sh` and `src-tauri/tauri.bundle.conf.json`: build the relocatable macOS app with its own Node executable, host and production modules. Release builds resolve them from app resources; debug builds use the checkout and `PI_MINI_NODE`.
- `src-tauri/`: fixed native shell, global shortcut registration, close-to-hide,
  menu bar recovery, accessory activation, and explicit Quit lifecycle ownership of its Node child. Window
  and native WebView keyboard focus are restored before requesting composer
  focus. Hidden windows stay mounted/connected. Parent stdin EOF requests
  helper shutdown (or private fixture shutdown in explicit lifecycle tests); forced termination is restricted to the owned
  child after its deadline. No broad process/port killing.

Companion-mode instructions control brevity, one actionable procedural step and
waiting, optional explanation, and preservation of essential warnings. They are session context, not a server-wide system-prompt override, and stay with the conversation in Pi Chat. Pi Mini always creates a new conversation, including on project switches; it does not open existing history. Compaction behavior is outside this short-session feature's scope. SDK and
protocol transport messages/status/questions unchanged; the UI adds no invented
step count or new structured-response contract. Assistant responses use pi-chat's
Markdown pipeline (GFM, highlighted code and KaTeX math); local file links are
shown as text because pi-mini does not provide pi-chat's file-open action.

## Verification

The local pipeline runs quality and application/UI tests automatically; build,
native, and packaging checks are manual. `npm test` runs architecture,
application, and DOM tests. `npm run test:native` and `npm run test:packaging`
require macOS and a desktop session. Native tests run serially, change focus,
and need Accessibility and event-post permission; do not interact with the
computer during the run. Packaging tests use disposable installations.

Native tests exercise the real window and WebView with a controlled test agent;
they do not prove visual fidelity or physical text entry. Application tests use
real SDK/server components with controlled model events. DOM tests do not prove
native geometry. `npm run test:model` is a separate real-model smoke requiring
provider access and `PI_MINI_SMOKE_DATA_DIR`.

Use `npm run review` and `npm run review:open` for revision reports; these do not
run tests or collect coverage.
