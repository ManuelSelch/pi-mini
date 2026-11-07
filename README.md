# Pi Mini

The real SDK-backed companion is in [companion/](companion/README.md).
It implements the approved compact UI, real SDK conversations, and native
shortcut/show/hide/background operation. Pi Chat handoff is deferred to the next
step; its title action remains disabled.
Run it with `cd companion && npm ci --include=dev && npm run dev`.

The original spike and its existing regression tests are preserved below.
Root-level npm commands still operate on that spike, not the companion.

## Original floating-window spike

Standalone macOS native-window experiment. Scope approved in chat: compact
340 × 300 logical-pixel window, initially always on top, pin toggle, dragging,
resizing, and placeholder chat. No changes to existing Pi projects.

## Try it

Double-click **Pi Floating Spike.app** in this folder (local debug build).
No development server, Node process, or backend is needed to run the app.

- Switch to another ordinary app: this window should remain above it.
- Click **Pinned** to turn always-on-top off; click **Unpinned** to restore it.
- Drag the header to move it. Drag an edge/corner to resize it.
- Close with × or quit with Cmd+Q.
- Chat is deliberately disabled. There is no SDK, network, or credential access.

Fullscreen apps, other Spaces, multiple monitors, and system-modal windows are
exploratory: always-on-top is not a promise to cover every macOS surface.
Please verify these interactively if relevant to your intended use.

The bundled app is a local debug build, not a signed/notarized distribution.

## Develop

Requirements: Node/npm, Rust/Cargo, and Xcode Command Line Tools.

```sh
npm ci --include=dev
npm run dev
```

No frontend build framework is needed for this small experiment: Tauri embeds
plain HTML, CSS, and JavaScript from `ui/` and uses macOS's system WebView.

```sh
npm run build:debug
npm test
npm exec tauri build -- --debug --bundles app
```

The generated bundle is at
`src-tauri/target/debug/bundle/macos/Pi Floating Spike.app`.
The root-level copy is provided for convenience; after rebuilding, replace it:

```sh
ditto 'src-tauri/target/debug/bundle/macos/Pi Floating Spike.app' 'Pi Floating Spike.app'
```

`npm run build` makes a release `.app` instead. Build outputs are ignored by Git.

## Architecture and verification boundary

- `src-tauri/tauri.conf.json`: initial native size, borderless window, resizing,
  always-on-top, embedded frontend and local-content CSP.
- `src-tauri/capabilities/main.json`: permissions for local window controls.
- `ui/main.js`: pin control reads/writes the native state; the header and edge
  handlers delegate dragging/resizing to Tauri. Status shows native API errors.
  Pin state lives in the native window and resets on each launch.
- `src-tauri/src/main.rs`: minimal Tauri entry point and opt-in smoke-test reporting.
- `tests/window.scenarios.test.mjs`: three persistent acceptance scenarios using
  a test driver. Each launches a real app/WebView with `--smoke-test`; the shared
  UI toggle function exercises pin off/on on that same window. Native bounds
  queries confirm initial size and programmatic movement/resizing.

All three automated checks passed locally. JavaScript syntax, Rust formatting,
app bundle generation, and npm audit also passed.

These checks establish native API state and WebView execution, not visual
stacking against another app, physical mouse dragging, or fullscreen/Spaces
behavior. Those remain manual checks. No screenshots or browser automation
were performed. There are no existing outcomes removed or changed.
