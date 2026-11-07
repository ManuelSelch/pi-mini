use std::sync::Mutex;
use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

#[derive(Default)]
pub struct LifecycleState(pub Mutex<Option<String>>);

pub fn report_error(app: &tauri::AppHandle, error: String) {
    if let Ok(mut state) = app.state::<LifecycleState>().0.lock() {
        *state = Some(error.clone());
    }
    let _ = app.emit_to("main", "companion:lifecycle-error", error);
}

pub fn show_and_focus(app: &tauri::AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("Companion window is unavailable")?;
    window.show().map_err(|error| error.to_string())?;
    #[cfg(target_os = "macos")]
    app.run_on_main_thread(|| {
        if let Some(main) = objc2::MainThreadMarker::new() {
            #[allow(deprecated)]
            objc2_app_kit::NSApplication::sharedApplication(main).activateIgnoringOtherApps(true);
        }
    }).map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())?;
    // Window focus alone does not make WKWebView the native keyboard responder.
    let webview: &tauri::Webview = window.as_ref();
    webview.set_focus().map_err(|error| error.to_string())?;
    app.emit_to("main", "companion:shown", ())
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn hide_companion(app: tauri::AppHandle) -> Result<(), String> {
    app.get_webview_window("main")
        .ok_or("Companion window is unavailable")?
        .hide()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn lifecycle_error(state: tauri::State<'_, LifecycleState>) -> Result<Option<String>, String> {
    state
        .0
        .lock()
        .map(|error| error.clone())
        .map_err(|error| error.to_string())
}

pub fn register(app: &tauri::AppHandle) {
    let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::Space);
    if let Err(error) = app.global_shortcut().register(shortcut) {
        report_error(app, format!("Cannot register Control+Option+Space: {error}. Restore Pi Mini from the menu bar instead."));
    }
}

pub fn toggle(app: &tauri::AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("Companion window is unavailable")?;
    let visible = window.is_visible().map_err(|error| error.to_string())?;
    let focused = window.is_focused().map_err(|error| error.to_string())?;
    if visible && focused {
        hide_companion(app.clone())
    } else {
        show_and_focus(app)
    }
}
