# Pi Mini — SDK conversation slice

A real native companion, separate from the preserved floating-window spike and
mockups. The approved compact interface is implemented here; the full MVP is
**not complete**: global show/hide/background behavior and real Pi Chat handoff
still await their [executable scenario approval](../tests/companion/mvp-lifecycle.scenarios.test.mjs)
and implementation. Proposed entry/control contract:
[remaining MVP design](../plans/companion-mvp/LIFECYCLE-HANDOFF.md).

## Run locally

Requirements: macOS, Node >=22.19, Rust >=1.90, and Xcode Command Line Tools.
Configure providers/models with your existing Pi installation first.

```sh
cd companion
npm ci --include=dev
npm run dev
```

Or build the native executable with embedded web assets:

```sh
npm run build:native
./src-tauri/target/debug/pi-mini
```

This is a local development executable, not a relocatable, signed or notarized
application. Node and this checkout's installed dependencies/compiled host remain
required. `PI_MINI_NODE` can select a Node executable when `node` is not on PATH.
Do not move the checkout after building without rebuilding the native executable.

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
- Stop aborts the run without closing its runtime or clearing the draft.
- A replaced controller does not reconnect automatically. Take control is explicit.
- Cmd+Q or closing this first-slice app stops its owned backend. Escape hiding,
  global Control+Option+Space and background operation are not implemented yet.
- The session title's Pi Chat action is deliberately disabled until the real
  handoff entry contract exists. No mock destination or transcript-copy shortcut.

## Data and security

Native code starts one private loopback server on an ephemeral port. It never
connects to or restarts the normal Pi Chat server. The native WebSocket adapter
uses the SDK through Tauri's native socket plugin; the server's browser Origin
checks remain intact. Frontend code accepts only the native-supplied loopback
`/ws` endpoint, renders agent text as text, and receives no provider credentials.

The server can execute tools with your user permissions. This is not a sandbox
or an authenticated network service. Keep it private/loopback.

Companion data defaults to macOS Application Support under `com.piagent.mini`:
separate `sessions/`, `projects.json`, and a default `workspace/`. Both history
writes **and catalogue reads** are explicitly rooted there; setting only the
server's `sessionsDirectory` is insufficient to isolate its default lister.
`PI_MINI_PROJECT` selects an existing workspace instead. Providers, credentials,
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
- `src-tauri/`: fixed native shell and lifecycle ownership of its Node child.
  Parent stdin EOF requests graceful shutdown; forced termination is restricted
  to the owned child after its shutdown deadline. No broad process/port killing.

Companion-mode instructions control brevity, one actionable procedural step and
waiting, optional explanation, and preservation of essential warnings. SDK and
protocol transport messages/status/questions unchanged; the UI adds no invented
step count, Markdown structure guessing, or new structured-response contract.

## Verification

```sh
npm test
npm run build:native
node --test tests/native/startup.test.mjs
```

- Five persistent approved application/protocol scenarios are at
  `../tests/companion/conversation.scenarios.test.mjs`. Drivers use real SDKs,
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
- An explicitly separate `--model-smoke` mode sends one harmless real prompt
  through that full native path and checks for a nonempty response. It requires
  `PI_MINI_SMOKE_DATA_DIR`; it is not part of routine tests because it consumes
  configured provider access. Native owner exit shuts down its backend.

Verified locally: 13 application/transport tests (including the 5 scenarios),
5 DOM tests, production web/host builds, native compilation/startup smoke, and
one native real-model conversation whose response was `Ready.`. No screenshots,
visual comparison, global-hotkey/background test or real Pi Chat handoff claimed.

`npm audit` reports 4 inherited Pi/server findings (3 moderate, 1 high, including
minimatch/undici). No upstream dependency override or unrelated upgrade was made.
A new Vitest dependency was patched to 5.1.0 before final verification.
