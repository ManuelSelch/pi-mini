mod lifecycle;
mod menu_bar;
mod native_test;

use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::{mpsc, Mutex};
use std::time::{Duration, Instant};
use tauri::Manager;

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct BackendInfo {
    endpoint: String,
    project_path: String,
}

struct Backend {
    child: Mutex<Option<Child>>,
    info: Result<BackendInfo, String>,
}

impl Backend {
    fn start(data_directory: PathBuf, resource_directory: PathBuf) -> Self {
        let (node, entry) = if cfg!(debug_assertions) {
            let entry =
                PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(if native_test::requested() {
                    "../dist-host/lifecycle-fixture.mjs"
                } else {
                    "../dist-host/main.mjs"
                });
            (
                std::env::var_os("PI_MINI_NODE").unwrap_or_else(|| "node".into()),
                entry,
            )
        } else {
            let backend = resource_directory.join("backend");
            (
                backend.join("node").into_os_string(),
                backend.join("main.mjs"),
            )
        };
        let result = Command::new(node)
            .arg(entry)
            .env("PI_MINI_DATA_DIR", data_directory)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .spawn();
        let mut child = match result {
            Ok(child) => child,
            Err(error) => return Self {
                child: Mutex::new(None),
                info: Err(format!("Cannot start companion backend: {error}. Check the app's bundled runtime, or Node/PI_MINI_NODE for development.")),
            },
        };
        let stdout = child.stdout.take().expect("piped stdout");
        let (sender, receiver) = mpsc::channel();
        std::thread::spawn(move || {
            for line in BufReader::new(stdout).lines() {
                let Ok(line) = line else { break };
                if let Some(json) = line.strip_prefix("PI_MINI_READY ") {
                    let result = serde_json::from_str::<BackendInfo>(json)
                        .map_err(|error| format!("Invalid backend readiness: {error}"));
                    let _ = sender.send(result);
                } else {
                    eprintln!("{line}");
                }
            }
        });
        let info = receiver
            .recv_timeout(Duration::from_secs(20))
            .map_err(|error| format!("Companion backend did not become ready: {error}"))
            .and_then(|result| result);
        let backend = Self {
            child: Mutex::new(Some(child)),
            info,
        };
        if backend.info.is_err() {
            backend.stop();
        }
        backend
    }

    fn stop(&self) {
        let Ok(mut owned) = self.child.lock() else {
            return;
        };
        let Some(mut child) = owned.take() else {
            return;
        };
        // Dropping our sole stdin handle requests graceful server/runtime disposal.
        drop(child.stdin.take());
        let deadline = Instant::now() + Duration::from_secs(12);
        loop {
            match child.try_wait() {
                Ok(Some(_)) => return,
                Err(_) => break,
                Ok(None) if Instant::now() < deadline => {
                    std::thread::sleep(Duration::from_millis(25))
                }
                Ok(None) => break,
            }
        }
        // Terminate only the child we own; never a port, service or unrelated Node process.
        let _ = child.kill();
        let _ = child.wait();
    }
}

fn smoke_requested() -> bool {
    std::env::args()
        .any(|arg| arg == "--smoke-test" || arg == "--model-smoke" || arg == "--lifecycle-test")
}

#[tauri::command]
fn smoke_mode() -> Option<String> {
    if native_test::requested() {
        Some("lifecycle".into())
    } else if std::env::args().any(|arg| arg == "--model-smoke") {
        Some("model".into())
    } else if smoke_requested() {
        Some("startup".into())
    } else {
        None
    }
}

#[tauri::command]
fn finish_smoke(app: tauri::AppHandle, mut report: serde_json::Value) -> Result<(), String> {
    if !smoke_requested() {
        return Err("Smoke reports require an explicit smoke-test argument".into());
    }
    let window = app
        .get_webview_window("main")
        .ok_or("Missing main window")?;
    let size = window.inner_size().map_err(|error| error.to_string())?;
    let scale = window.scale_factor().map_err(|error| error.to_string())?;
    report["width"] = serde_json::json!(size.width as f64 / scale);
    report["height"] = serde_json::json!(size.height as f64 / scale);
    report["resizable"] =
        serde_json::json!(window.is_resizable().map_err(|error| error.to_string())?);
    println!("MINI_REPORT:{report}");
    app.exit(if report.get("error").is_some() { 1 } else { 0 });
    Ok(())
}

#[tauri::command]
fn backend_info(backend: tauri::State<'_, Backend>) -> Result<BackendInfo, String> {
    backend.info.clone()
}

fn main() {
    let app = tauri::Builder::default()
        .manage(lifecycle::LifecycleState::default())
        .plugin(tauri_plugin_websocket::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _, event| {
                    if event.state != tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        return;
                    }
                    if let Err(error) = lifecycle::toggle(app) {
                        lifecycle::report_error(app, error);
                    }
                })
                .build(),
        )
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                if let Err(error) = lifecycle::hide_companion(window.app_handle().clone()) {
                    lifecycle::report_error(window.app_handle(), error);
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            backend_info,
            smoke_mode,
            finish_smoke,
            native_test::lifecycle_report,
            lifecycle::hide_companion,
            lifecycle::lifecycle_error
        ])
        .setup(|app| {
            app.set_menu(tauri::menu::Menu::default(app.handle())?)?;
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            menu_bar::install(app.handle())?;
            lifecycle::register(app.handle());
            let directory = if smoke_requested() {
                PathBuf::from(
                    std::env::var_os("PI_MINI_SMOKE_DATA_DIR")
                        .ok_or("Smoke tests require a private PI_MINI_SMOKE_DATA_DIR")?,
                )
            } else {
                app.path().app_data_dir()?
            };
            let resources = app.path().resource_dir().map_err(|error| {
                format!(
                    "Cannot locate app resources: {error}; executable: {:?}",
                    std::env::current_exe()
                )
            })?;
            app.manage(Backend::start(directory, resources));
            if let Err(error) = lifecycle::show_and_focus(app.handle()) {
                lifecycle::report_error(app.handle(), error);
            }
            if native_test::requested() {
                native_test::start(app.handle().clone());
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("Failed to start Pi Mini");
    app.run(|app, event| match event {
        tauri::RunEvent::Exit => app.state::<Backend>().stop(),
        #[cfg(target_os = "macos")]
        tauri::RunEvent::Reopen { .. } => {
            if let Err(error) = lifecycle::show_and_focus(app) {
                lifecycle::report_error(app, error);
            }
        }
        _ => {}
    });
}
