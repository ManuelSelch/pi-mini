# Pi Mini

A native macOS companion for the Pi Chat shared server. Open or hide it with
Control+Option+Space; closing the window leaves conversations running.

## Get started

Requires macOS, Node >=22.19, Rust >=1.90, Xcode Command Line Tools, and a
configured Pi installation.

```sh
npm ci --include=dev
# Register this checkout: pi install /path/to/pi-mini
# Start the Pi Chat server with /pi-chat start, then:
npm run dev
```

Run `npm test` for application and UI checks. Native and packaging tests require
a macOS desktop session. See the [guide](docs/guide.md) for setup, configuration,
architecture, security, builds, and verification.
