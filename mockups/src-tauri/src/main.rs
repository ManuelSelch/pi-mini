fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("Failed to run Pi Companion mockup");
}
