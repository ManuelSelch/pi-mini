#[tauri::command]
fn smoke_requested() -> bool {
    std::env::args().any(|arg| arg == "--smoke-test")
}

#[tauri::command]
fn finish_smoke(app: tauri::AppHandle, report: serde_json::Value) -> Result<(), String> {
    if !smoke_requested() {
        return Err("Smoke reports are only enabled with --smoke-test".into());
    }
    println!("SPIKE_REPORT:{report}");
    app.exit(if report.get("error").is_some() { 1 } else { 0 });
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![smoke_requested, finish_smoke])
        .run(tauri::generate_context!())
        .expect("Failed to run Tauri floating-window spike");
}
