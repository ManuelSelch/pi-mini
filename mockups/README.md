# Pi Companion mockup workspace

A standalone React + TypeScript clickdummy in a separate Tauri shell.
All data is fake; no real Pi Chat/backend integration.

## Open

Double-click **Pi Companion Mockup.app** in this directory for the offline native
clickdummy. It is a local debug build, not a signed/notarized distribution.
For the interaction guide and current review status, see
[companion/DESIGN.md](companion/DESIGN.md).

## Develop

```sh
npm ci --include=dev
npm run dev
```

Open the Vite URL with `/companion/` (or `?state=empty`).
Vite may choose another port if 5173 is busy. For native live development, start
Vite first, then `npm run native`; override Tauri's `build.devUrl` if needed.

The development browser/native preview includes Agentation. Use the toolbar to
select elements and leave notes; copy the collected Markdown and paste it into
chat. No annotation service or endpoint is configured.

```sh
npm run typecheck
npm run native:build
ditto 'src-tauri/target/debug/bundle/macos/Pi Companion Mockup.app' 'Pi Companion Mockup.app'
```

The package command builds an offline copy from the current source; later live
preview edits require rebuilding that copy. Production compilation omits Agentation.

## Boundaries

The production application is at the repository root. Build outputs, dependencies,
logs and runtime ownership records are ignored. The native app uses the macOS
system WebView and local window/event APIs. The browser version uses a local
BroadcastChannel for demo window synchronization. No backend/SDK is installed.
