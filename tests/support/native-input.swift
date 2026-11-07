import AppKit
import ApplicationServices
import Foundation

NSApplication.shared.setActivationPolicy(.prohibited)
let command = CommandLine.arguments.dropFirst().first ?? ""
func fail(_ message: String) -> Never {
    FileHandle.standardError.write(Data((message + "\n").utf8))
    exit(1)
}

func children(_ element: AXUIElement) -> [AXUIElement] {
    var value: CFTypeRef?
    guard AXUIElementCopyAttributeValue(element, kAXChildrenAttribute as CFString, &value) == .success else { return [] }
    return value as? [AXUIElement] ?? []
}
func title(_ element: AXUIElement) -> String {
    var value: CFTypeRef?
    AXUIElementCopyAttributeValue(element, kAXTitleAttribute as CFString, &value)
    return value as? String ?? ""
}
func find(_ element: AXUIElement, named name: String, depth: Int = 0) -> AXUIElement? {
    if title(element) == name { return element }
    if depth >= 8 { return nil }
    for child in children(element) { if let found = find(child, named: name, depth: depth + 1) { return found } }
    return nil
}

switch command {
case "presence", "menu-show", "menu-quit":
    guard let value = CommandLine.arguments.last, let pid = Int32(value), let app = NSRunningApplication(processIdentifier: pid) else { fail("Cannot find companion") }
    guard app.activationPolicy == .accessory else { fail("Companion is not a macOS accessory app") }
    guard AXIsProcessTrusted() else { fail("Accessibility permission is required for menu bar automation") }
    let application = AXUIElementCreateApplication(pid)
    var barValue: CFTypeRef?
    guard AXUIElementCopyAttributeValue(application, "AXExtrasMenuBar" as CFString, &barValue) == .success, let barValue else { fail("Cannot access companion menu bar") }
    let bar = barValue as! AXUIElement
    guard let item = find(bar, named: "π") ?? children(bar).first else { fail("Pi Mini status item not found") }
    if command != "presence" {
        guard AXUIElementPerformAction(item, kAXPressAction as CFString) == .success else { fail("Cannot open Pi Mini menu") }
        guard CGPreflightPostEventAccess(), let source = CGEventSource(stateID: .hidSystemState) else { fail("Keyboard event permission is required") }
        func key(_ code: CGKeyCode) {
            CGEvent(keyboardEventSource: source, virtualKey: code, keyDown: true)?.post(tap: .cghidEventTap)
            CGEvent(keyboardEventSource: source, virtualKey: code, keyDown: false)?.post(tap: .cghidEventTap)
            usleep(100000)
        }
        usleep(300000)
        if command == "menu-quit" { key(126) } else { key(125) }
        key(36)
    }
case "frontmost": print(NSWorkspace.shared.frontmostApplication?.processIdentifier ?? -1)
case "other":
    guard let finder = NSRunningApplication.runningApplications(withBundleIdentifier: "com.apple.finder").first else { fail("Finder is not running") }
    guard finder.activate(options: []) else { fail("Cannot activate Finder") }
case "activate":
    guard let value = CommandLine.arguments.last, let pid = Int32(value), let app = NSRunningApplication(processIdentifier: pid), app.activate(options: []) else { fail("Cannot activate requested application") }
default: fail("Unknown native application action")
}
