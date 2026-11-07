import CoreGraphics
import Foundation

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(Data((message + "\n").utf8))
    exit(1)
}

guard CGPreflightPostEventAccess() else {
    fail("Keyboard automation is not permitted. Enable Accessibility for this test runner before running native scenarios.")
}
guard let source = CGEventSource(stateID: .hidSystemState) else { fail("Cannot create keyboard source") }
func post(_ code: CGKeyCode, down: Bool, flags: CGEventFlags) {
    guard let event = CGEvent(keyboardEventSource: source, virtualKey: code, keyDown: down) else { fail("Cannot create keyboard event") }
    event.flags = flags
    event.post(tap: .cghidEventTap)
}

// Emit complete physical chords, including modifier release. No AppKit and
// no application activation in this helper: the actual foreground app stays put.
switch CommandLine.arguments.dropFirst().first ?? "" {
case "shortcut":
    post(59, down: true, flags: .maskControl)
    post(58, down: true, flags: [.maskControl, .maskAlternate])
    post(49, down: true, flags: [.maskControl, .maskAlternate])
    post(49, down: false, flags: [.maskControl, .maskAlternate])
    post(58, down: false, flags: .maskControl)
    post(59, down: false, flags: [])
case "quit":
    post(55, down: true, flags: .maskCommand)
    post(12, down: true, flags: .maskCommand)
    post(12, down: false, flags: .maskCommand)
    post(55, down: false, flags: [])
default: fail("Unknown keyboard action")
}
