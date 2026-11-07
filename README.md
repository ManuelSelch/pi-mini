# Pi Mini

A native SDK-backed companion, separate from the preserved mockups. The approved compact interface, real conversation, and native lifecycle
are implemented here. Control+Option+Space shows/focuses the companion and toggles
it away when already focused. Escape closes the project switcher or stops the
current run; window close hides the app without stopping work. Pi Chat handoff is explicitly deferred to the next step; the title action
stays disabled. [Current scope and deferred handoff proposal](plans/companion-mvp/LIFECYCLE-HANDOFF.md).

## Run locally

Requirements: macOS, Node >=22.19, Rust >=1.90, and Xcode Command Line Tools.
Configure providers/models with your existing Pi installation first.

```sh
npm ci --include=dev
npm run dev
```

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
  clears the composer draft.
- Stop aborts the run without closing its runtime or clearing the draft.
- A replaced controller does not reconnect automatically. Take control is explicit.
- Control+Option+Space shows/focuses the native window and composer from another
  app; pressing it while Pi Mini has focus hides the window.
- Escape closes the project switcher or stops the current run; it never hides the window.
  Native window close hides it, preserving the draft/session and ongoing work. A
  response can finish while hidden; restoring shows the latest useful answer.
- Pi Mini lives in the macOS menu bar as π, not in the Dock or app switcher.
  Use Show Pi Mini to restore it or Quit Pi Mini to stop its owned backend.
  Cmd+Q also quits while focused. If shortcut registration fails, use the menu bar.
- The session title's Pi Chat action is deliberately disabled until the real
  handoff entry contract exists. No mock destination or transcript-copy shortcut.

## Data and security

Native code starts one private loopback server on an ephemeral port. It never
connects to or restarts the normal Pi Chat server. The native WebSocket adapter
uses the SDK through Tauri's native socket plugin; the server's browser Origin
checks remain intact. Frontend code accepts only the native-supplied loopback
`/ws` endpoint, renders agent Markdown without raw HTML, and receives no provider credentials.

The server can execute tools with your user permissions. This is not a sandbox
or an authenticated network service. Keep it private/loopback.

Companion data defaults to macOS Application Support under `com.piagent.mini`:
separate `sessions/` and `projects.json`. The initial working directory is the
user's home folder, shown as **Quick Chats**, as in Pi Chat. Session history
writes and catalogue session reads are rooted there. At startup, project paths
from normal Pi session history and Pi Chat's pinned projects are imported into
Pi Mini's own project catalogue; normal transcript contents are not exposed in the
catalogue. Existing Pi Mini project entries remain available. `PI_MINI_PROJECT`
overrides the initial working directory. Providers, credentials,
settings, extensions and instructions use standard Pi discovery; authentication
is reused through Pi, never copied into frontend or companion-local auth files.

Each application launch creates a fresh runtime/conversation. Finalized history
is saved in companion storage, but there is no history picker or last-session
restore on a fresh app launch in this slice. Same-server reconnect preserves the
selected runtime and finalized history without replaying messages or other
mutations. A missing runtime is reported instead of silently attaching elsewhere.
An unobserved prefix of an in-flight response cannot be recovered by the SDK;
the companion suppresses recovered draft suffixes until a finalized message
arrives rather than presenting an incomplete suffix as the answer. Unexpected backend-process restart/recovery is
not implemented; quit and relaunch after a permanent backend failure.

Published dependencies are pinned: SDK 0.2.1, server 0.2.1, and that server's Pi
1.0.2/1.0.3 family. Sibling source checkouts are not runtime dependencies and were
not modified. The published server itself resolves SDK 0.2.0; no overrides or
compatibility shims are added. Installed native/real-model smoke verifies this
specific combination, not all future SDK/server versions.

## Architecture

- `src/conversation/infra/host/`: private server, isolated catalogue/history,
  standard Pi services/runtime adapter, and companion-mode instructions.
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
  graceful backend shutdown; forced termination is restricted to the owned
  child after its deadline. No broad process/port killing.

Companion-mode instructions control brevity, one actionable procedural step and
waiting, optional explanation, and preservation of essential warnings. SDK and
protocol transport messages/status/questions unchanged; the UI adds no invented
step count or new structured-response contract. Assistant responses use pi-chat's
Markdown pipeline (GFM, highlighted code and KaTeX math); local file links are
shown as text because pi-mini does not provide pi-chat's file-open action.

## Verification

```sh
npm test
npm run build:native
npm run test:native
npm run test:packaging
```

- Packaging scenarios at `tests/companion/packaging.scenarios.test.mjs` build the release app and copy it into disposable Applications/relocation directories. macOS sandbox rules deny checkout reads; PATH excludes system Node and an invalid `PI_MINI_NODE` confirms release builds ignore that development override. Real WebView/SDK readiness, bundled Node ownership, standard Pi configuration-directory discovery, child shutdown and an unrelated loopback service are checked. The smoke invokes the real Tauri exit path; it does not automate the menu-bar Quit action or make a model call. These tests require a macOS desktop session and do not alter the user's checkout or installed app.
- Five persistent approved application/protocol scenarios are at
  `tests/companion/conversation.scenarios.test.mjs`. Drivers use real SDKs,
  isolated real servers and a controlled agent adapter. They do not claim to
  automate the actual Pi Chat frontend. Instruction checks construct a real Pi
  AgentSession and inspect its effective system prompt without a model call.
- Unit/DOM tests cover asynchronous operation errors, native transport disposal,
  ordered sends, controller replacement, prompts/follow-ups, composer Stop, and
  compact response/error presentation. DOM tests do not establish native geometry.
- Native smoke launches the actual executable/WebView, native WebSocket plugin,
  server and real Pi runtime. It asserts SDK readiness, runtime creation and
  fixed dimensions/non-resizability without sending a model message. It reuses
  normal provider/resource configuration but uses disposable history/workspace.
- Native menu bar scenarios are at `tests/companion/menu-bar.scenarios.test.mjs`.
  They use Accessibility and synthetic keyboard input and require an idle desktop;
  concurrent user interaction can interfere with them.
- Three approved native lifecycle scenarios are at
  `tests/companion/mvp-lifecycle.scenarios.test.mjs`. They use the real native
  window/WebView, SDK, sidecar and server with a controlled test-only agent (no
  model/credential access). The macOS helper activates another app, posts the
  actual global shortcut and Cmd+Q, and queries the real foreground application.
  Driver probes additionally assert native visibility/focus/dimensions, composer
  DOM focus, session/backend identity, draft retention, background completion,
  single submission and owned-process/listener shutdown. Input drafts and local
  Enter/Escape events are driven inside the real WebView; these are not evidence
  of physical text entry or physical Escape-key delivery. No screenshot or visual
  fidelity claim.
  Scenarios use standard beforeEach/afterEach with a fresh driver and guaranteed
  teardown, not per-scenario wrapper helpers.
- Native scenarios run serially because they temporarily change foreground focus
  and share the OS shortcut namespace. They require macOS Accessibility/event-post
  permission for the test runner; missing permission is a test failure, not a
  silent skip. The driver restores the previous app and stops only owned processes.
- `--lifecycle-test` and its private stdin/probe bridge are explicitly test-only;
  its compiled fixture is built by `test:native`, never selected on normal launch.
- An explicitly separate `--model-smoke` mode sends one harmless real prompt
  through that full native path and checks for a nonempty response. It requires
  `PI_MINI_SMOKE_DATA_DIR`; it is not part of routine tests because it consumes
  configured provider access. Native owner exit shuts down its backend.

Earlier verification covered 13 application/transport tests, 11 DOM/hook tests,
production builds, startup smoke and the three original lifecycle scenarios. The
menu bar change builds, but its latest native suite had focus/menu interaction
failures while the desktop was in use; the user reports manual testing works.
A real native-model smoke returned `Ready.` before the repository restructure.
No screenshots, visual comparison or real Pi Chat handoff claimed. Handoff's 4
unimplemented scenario drafts are retained separately and are not run or counted
as passing coverage.

`npm audit` reports 4 inherited Pi/server findings (3 moderate, 1 high, including
minimatch/undici). No upstream dependency override or unrelated upgrade was made.
A new Vitest dependency was patched to 5.1.0 before final verification.
