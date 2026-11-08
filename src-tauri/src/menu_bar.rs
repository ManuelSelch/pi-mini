use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
};

pub fn install(app: &tauri::AppHandle) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "Show Pi Mini", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit Pi Mini", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let menu = Menu::with_items(app, &[&show, &separator, &quit])?;
    TrayIconBuilder::with_id("pi-mini")
        .title("π")
        .tooltip("Pi Mini")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "show" => {
                if let Err(error) = crate::lifecycle::show_and_focus(app) {
                    crate::lifecycle::report_error(app, error);
                }
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;
    Ok(())
}
