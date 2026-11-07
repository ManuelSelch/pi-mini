import AppKit
import Foundation

NSApplication.shared.setActivationPolicy(.prohibited)
let command = CommandLine.arguments.dropFirst().first ?? ""
func fail(_ message: String) -> Never {
    FileHandle.standardError.write(Data((message + "\n").utf8))
    exit(1)
}

switch command {
case "frontmost": print(NSWorkspace.shared.frontmostApplication?.processIdentifier ?? -1)
case "other":
    guard let finder = NSRunningApplication.runningApplications(withBundleIdentifier: "com.apple.finder").first else { fail("Finder is not running") }
    guard finder.activate(options: []) else { fail("Cannot activate Finder") }
case "activate":
    guard let value = CommandLine.arguments.last, let pid = Int32(value), let app = NSRunningApplication(processIdentifier: pid), app.activate(options: []) else { fail("Cannot activate requested application") }
default: fail("Unknown native application action")
}
