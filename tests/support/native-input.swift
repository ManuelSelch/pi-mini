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

func describe(_ element: AXUIElement, depth: Int = 0) -> [String] {
    var role: CFTypeRef?
    let result = AXUIElementCopyAttributeValue(element, kAXRoleAttribute as CFString, &role)
    let line = "\(String(repeating: " ", count: depth))role=\(role ?? "?" as CFString) title=\(title(element)) result=\(result.rawValue)"
    if depth >= 5 { return [line] }
    return [line] + children(element).flatMap { describe($0, depth: depth + 1) }
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
    guard let item = find(bar, named: "π") else { fail("Pi Mini status item not found for PID \(pid); titles: \(children(bar).map(title))") }
    if command != "presence" {
        let wanted = command == "menu-quit" ? "Quit Pi Mini" : "Show Pi Mini"
        guard CGPreflightPostEventAccess(), let source = CGEventSource(stateID: .hidSystemState) else { fail("Mouse event permission is required") }
        var positionValue: CFTypeRef?
        var sizeValue: CFTypeRef?
        guard AXUIElementCopyAttributeValue(item, kAXPositionAttribute as CFString, &positionValue) == .success,
              AXUIElementCopyAttributeValue(item, kAXSizeAttribute as CFString, &sizeValue) == .success,
              let positionValue, let sizeValue else { fail("Cannot locate Pi Mini status item for PID \(pid)") }
        var position = CGPoint.zero
        var size = CGSize.zero
        guard AXValueGetValue(positionValue as! AXValue, .cgPoint, &position), AXValueGetValue(sizeValue as! AXValue, .cgSize, &size) else { fail("Invalid Pi Mini status item geometry for PID \(pid)") }
        let point = CGPoint(x: position.x + size.width / 2, y: position.y + size.height / 2)
        CGEvent(mouseEventSource: source, mouseType: .leftMouseDown, mouseCursorPosition: point, mouseButton: .left)?.post(tap: .cghidEventTap)
        CGEvent(mouseEventSource: source, mouseType: .leftMouseUp, mouseCursorPosition: point, mouseButton: .left)?.post(tap: .cghidEventTap)
        let deadline = Date().addingTimeInterval(3)
        var menuItem: AXUIElement?
        repeat {
            menuItem = find(application, named: wanted) ?? find(bar, named: wanted)
            if menuItem == nil { usleep(50000) }
        } while menuItem == nil && Date() < deadline
        guard let menuItem else { fail("Menu item '\(wanted)' not found for PID \(pid) after opening status item. Bar tree:\n\(describe(bar).joined(separator: "\n"))") }
        let press = AXUIElementPerformAction(menuItem, kAXPressAction as CFString)
        guard press == .success else { fail("Cannot press menu item '\(wanted)' for PID \(pid): \(press.rawValue)") }
    }
case "frontmost": print(NSWorkspace.shared.frontmostApplication?.processIdentifier ?? -1)
case "other":
    guard let finder = NSRunningApplication.runningApplications(withBundleIdentifier: "com.apple.finder").first else { fail("Finder is not running") }
    guard finder.activate(options: []) else { fail("Cannot activate Finder") }
case "activate":
    guard let value = CommandLine.arguments.last, let pid = Int32(value), let app = NSRunningApplication(processIdentifier: pid), app.activate(options: []) else { fail("Cannot activate requested application") }
default: fail("Unknown native application action")
}
