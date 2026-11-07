use crate::Backend;
use serde_json::{json, Value};
use std::io::{BufRead, Write};
use tauri::Manager;

pub fn requested() -> bool {
    std::env::args().any(|arg| arg == "--lifecycle-test")
}

#[tauri::command]
pub fn lifecycle_report(
    app: tauri::AppHandle,
    request_id: u64,
    mut report: Value,
) -> Result<(), String> {
    if !requested() {
        return Err("Native lifecycle probes require --lifecycle-test".into());
    }
    let window = app
        .get_webview_window("main")
        .ok_or("Missing main window")?;
    let size = window.inner_size().map_err(|error| error.to_string())?;
    let scale = window.scale_factor().map_err(|error| error.to_string())?;
    report["width"] = json!(size.width as f64 / scale);
    report["height"] = json!(size.height as f64 / scale);
    report["resizable"] = json!(window.is_resizable().map_err(|error| error.to_string())?);
    report["visible"] = json!(window.is_visible().map_err(|error| error.to_string())?);
    report["focused"] = json!(window.is_focused().map_err(|error| error.to_string())?);
    let backend = app.state::<Backend>();
    report["backendPid"] = json!(backend
        .child
        .lock()
        .map_err(|error| error.to_string())?
        .as_ref()
        .map(|child| child.id()));
    if let Ok(info) = &backend.info {
        report["endpoint"] = json!(info.endpoint);
    }
    println!(
        "MINI_LIFECYCLE:{}",
        json!({ "id": request_id, "report": report })
    );
    Ok(())
}

pub fn start(app: tauri::AppHandle) {
    std::thread::spawn(move || {
        for line in std::io::stdin().lock().lines() {
            let Ok(line) = line else { break };
            let Ok(command) = serde_json::from_str::<Value>(&line) else {
                continue;
            };
            let handle = app.clone();
            let _ = app.run_on_main_thread(move || {
                let id = command["id"].as_u64().unwrap_or(0);
                let result: Result<(), String> = (|| {
                    match command["action"].as_str().unwrap_or("") {
                        "quit" => handle.exit(0),
                        "close" => handle.get_webview_window("main").ok_or("Missing main window")?.close().map_err(|error| error.to_string())?,
                        "finishAgent" => {
                            let backend = handle.state::<Backend>();
                            let mut owned = backend.child.lock().map_err(|error| error.to_string())?;
                            let input = owned.as_mut().and_then(|child| child.stdin.as_mut()).ok_or("Missing fixture input")?;
                            writeln!(input, "{command}").map_err(|error| error.to_string())?;
                            input.flush().map_err(|error| error.to_string())?;
                        }
                        _ => {
                            let script = format!("window.dispatchEvent(new CustomEvent('pi-mini-native-test', {{detail:{command}}}))");
                            handle.get_webview_window("main").ok_or("Missing main window")?.eval(&script).map_err(|error| error.to_string())?;
                            return Ok(());
                        }
                    }
                    if command["action"] != "quit" {
                        lifecycle_report(handle.clone(), id, json!({}))?;
                    }
                    Ok(())
                })();
                if let Err(error) = result {
                    println!("MINI_LIFECYCLE:{}", json!({ "id": id, "report": { "error": error } }));
                }
            });
        }
        // A dead test owner must not leave this explicitly test-launched app alive.
        app.exit(0);
    });
}
