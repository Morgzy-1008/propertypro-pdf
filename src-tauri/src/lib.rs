use base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine as _};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::time::Duration;
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopSystemInfo {
  pub is_native_desktop: bool,
  pub app_version: String,
  pub os: String,
  pub arch: String,
  pub cpu_cores: usize,
  pub exports_root_dir: String,
  pub workspace_backup_dir: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedFileResult {
  pub full_path: String,
  pub folder_path: String,
  pub filename: String,
  pub file_size_bytes: usize,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeHttpResponse {
  pub status: u16,
  pub ok: bool,
  pub content_type: String,
  pub body_text: String,
}

/// Resolves and ensures the user's `Documents\Hudson Homes OS` directory exists.
fn resolve_hudson_root_dir() -> Result<PathBuf, String> {
  let user_profile = std::env::var("USERPROFILE")
    .or_else(|_| std::env::var("HOME"))
    .unwrap_or_else(|_| ".".to_string());

  let mut root = PathBuf::from(user_profile);
  root.push("Documents");
  root.push("Hudson Homes OS");

  for sub in &[
    "Facades",
    "Quotes",
    "Flyers",
    "Tender Audits",
    "Floorplans",
    "Workspace",
  ] {
    let mut sub_dir = root.clone();
    sub_dir.push(sub);
    if !sub_dir.exists() {
      let _ = fs::create_dir_all(&sub_dir);
    }
  }

  if !root.exists() {
    fs::create_dir_all(&root).map_err(|e| format!("Failed to create Hudson OS directory: {}", e))?;
  }

  Ok(root)
}

/// Sanitizes a filename so it is safe for Windows NTFS paths.
fn sanitize_filename(raw: &str) -> String {
  let cleaned: String = raw
    .chars()
    .map(|c| match c {
      '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '-',
      c if c.is_control() => '-',
      c => c,
    })
    .collect();

  let trimmed = cleaned.trim().trim_matches('.');
  if trimmed.is_empty() {
    "hudson-export.bin".to_string()
  } else {
    trimmed.to_string()
  }
}

#[tauri::command]
fn get_native_desktop_info() -> Result<DesktopSystemInfo, String> {
  let root = resolve_hudson_root_dir()?;
  let mut workspace_dir = root.clone();
  workspace_dir.push("Workspace");

  let cpu_cores = std::thread::available_parallelism()
    .map(|n| n.get())
    .unwrap_or(4);

  Ok(DesktopSystemInfo {
    is_native_desktop: true,
    app_version: "2026.1.0".to_string(),
    os: std::env::consts::OS.to_string(),
    arch: std::env::consts::ARCH.to_string(),
    cpu_cores,
    exports_root_dir: root.to_string_lossy().to_string(),
    workspace_backup_dir: workspace_dir.to_string_lossy().to_string(),
  })
}

#[tauri::command]
fn native_toggle_fullscreen(app: tauri::AppHandle) -> Result<bool, String> {
  if let Some(window) = app.get_webview_window("main") {
    let is_fs = window.is_fullscreen().map_err(|e| e.to_string())?;
    let target = !is_fs;
    window.set_fullscreen(target).map_err(|e| e.to_string())?;
    Ok(target)
  } else {
    Err("Main desktop window not found".to_string())
  }
}

#[tauri::command]
fn native_is_fullscreen(app: tauri::AppHandle) -> Result<bool, String> {
  if let Some(window) = app.get_webview_window("main") {
    window.is_fullscreen().map_err(|e| e.to_string())
  } else {
    Ok(false)
  }
}

#[tauri::command]
fn native_send_notification(title: String, body: String) -> Result<(), String> {
  #[cfg(target_os = "windows")]
  {
    let ps_script = format!(
      "[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null; \
       $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02); \
       $textNodes = $template.GetElementsByTagName('text'); \
       $textNodes.Item(0).AppendChild($template.CreateTextNode('{}')) > $null; \
       $textNodes.Item(1).AppendChild($template.CreateTextNode('{}')) > $null; \
       $toast = [Windows.UI.Notifications.ToastNotification]::new($template); \
       [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Hudson Sales Hub').Show($toast);",
      title.replace('\'', "''"),
      body.replace('\'', "''")
    );

    let _ = Command::new("powershell")
      .args(["-NoProfile", "-NonInteractive", "-Command", &ps_script])
      .spawn();
  }
  Ok(())
}

#[tauri::command]
fn native_save_export(
  filename: String,
  data_base64: String,
  category: Option<String>,
) -> Result<SavedFileResult, String> {
  let root = resolve_hudson_root_dir()?;
  let folder_name = category
    .as_deref()
    .map(sanitize_filename)
    .filter(|s| !s.is_empty())
    .unwrap_or_else(|| "Exports".to_string());

  let mut target_dir = root;
  target_dir.push(&folder_name);
  if !target_dir.exists() {
    fs::create_dir_all(&target_dir)
      .map_err(|e| format!("Failed to create export folder: {}", e))?;
  }

  let safe_name = sanitize_filename(&filename);
  let mut full_path = target_dir.clone();
  full_path.push(&safe_name);

  // Strip optional data URL prefix (e.g. "data:image/jpeg;base64,...")
  let clean_b64 = match data_base64.find(";base64,") {
    Some(idx) => &data_base64[(idx + 8)..],
    None => match data_base64.find(',') {
      Some(idx) if data_base64.starts_with("data:") => &data_base64[(idx + 1)..],
      _ => data_base64.as_str(),
    },
  };

  let bytes = BASE64_STANDARD
    .decode(clean_b64.trim())
    .map_err(|e| format!("Invalid base64 payload: {}", e))?;

  fs::write(&full_path, &bytes)
    .map_err(|e| format!("Failed to write file to disk: {}", e))?;

  Ok(SavedFileResult {
    full_path: full_path.to_string_lossy().to_string(),
    folder_path: target_dir.to_string_lossy().to_string(),
    filename: safe_name,
    file_size_bytes: bytes.len(),
  })
}

#[tauri::command]
fn native_open_in_explorer(path: Option<String>) -> Result<String, String> {
  let root = resolve_hudson_root_dir()?;
  let target = match path {
    Some(ref p) if !p.trim().is_empty() => PathBuf::from(p.trim()),
    _ => root,
  };

  #[cfg(target_os = "windows")]
  {
    if target.is_file() {
      Command::new("explorer.exe")
        .arg(format!("/select,{}", target.to_string_lossy()))
        .spawn()
        .map_err(|e| format!("Failed to open Windows Explorer: {}", e))?;
    } else {
      let dir_to_open = if target.exists() {
        target.clone()
      } else {
        resolve_hudson_root_dir()?
      };
      Command::new("explorer.exe")
        .arg(dir_to_open.to_string_lossy().to_string())
        .spawn()
        .map_err(|e| format!("Failed to open Windows Explorer: {}", e))?;
    }
  }

  Ok(target.to_string_lossy().to_string())
}

#[tauri::command]
fn native_http_fetch(url: String, timeout_ms: Option<u64>) -> Result<NativeHttpResponse, String> {
  if !url.starts_with("http://") && !url.starts_with("https://") {
    return Err("Only http:// and https:// URLs are permitted".to_string());
  }

  let timeout = Duration::from_millis(timeout_ms.unwrap_or(8000).clamp(1000, 30000));
  let agent = ureq::AgentBuilder::new()
    .timeout_read(timeout)
    .timeout_write(timeout)
    .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HudsonHomesOS/2026.1 Chrome/130.0.0.0 Safari/537.36")
    .build();

  match agent.get(&url).call() {
    Ok(resp) => {
      let status = resp.status();
      let content_type = resp
        .header("content-type")
        .unwrap_or("text/plain")
        .to_string();
      let body_text = resp
        .into_string()
        .unwrap_or_default();
      Ok(NativeHttpResponse {
        status,
        ok: (200..300).contains(&status),
        content_type,
        body_text,
      })
    }
    Err(ureq::Error::Status(code, resp)) => {
      let content_type = resp
        .header("content-type")
        .unwrap_or("text/plain")
        .to_string();
      let body_text = resp.into_string().unwrap_or_default();
      Ok(NativeHttpResponse {
        status: code,
        ok: false,
        content_type,
        body_text,
      })
    }
    Err(e) => Err(format!("Native HTTP request failed: {}", e)),
  }
}

#[tauri::command]
fn native_scrape_builder_website(url: String, timeout_ms: Option<u64>) -> Result<String, String> {
  let resp = native_http_fetch(url, timeout_ms)?;
  if !resp.ok {
    return Err(format!("HTTP Error {}", resp.status));
  }

  // Strip script, style, and HTML tags to extract clean text stream for AI forensic analysis
  let html = resp.body_text;
  let re_script = regex::Regex::new(r"(?is)<script.*?>.*?</script>").map_err(|e| e.to_string())?;
  let re_style = regex::Regex::new(r"(?is)<style.*?>.*?</style>").map_err(|e| e.to_string())?;
  let re_tags = regex::Regex::new(r"<[^>]+>").map_err(|e| e.to_string())?;
  let re_spaces = regex::Regex::new(r"\s+").map_err(|e| e.to_string())?;

  let no_script = re_script.replace_all(&html, " ");
  let no_style = re_style.replace_all(&no_script, " ");
  let text = re_tags.replace_all(&no_style, " ");
  let cleaned = re_spaces.replace_all(&text, " ");

  Ok(cleaned.chars().take(25000).collect())
}

#[tauri::command]
fn native_save_json_workspace(key: String, json_payload: String) -> Result<String, String> {
  let root = resolve_hudson_root_dir()?;
  let mut workspace_dir = root;
  workspace_dir.push("Workspace");
  if !workspace_dir.exists() {
    fs::create_dir_all(&workspace_dir)
      .map_err(|e| format!("Failed to create Workspace folder: {}", e))?;
  }

  let safe_key = sanitize_filename(&key);
  let filename = if safe_key.ends_with(".json") {
    safe_key
  } else {
    format!("{}.json", safe_key)
  };

  let mut file_path = workspace_dir;
  file_path.push(filename);

  fs::write(&file_path, json_payload.as_bytes())
    .map_err(|e| format!("Failed to save workspace JSON: {}", e))?;

  Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
fn native_load_json_workspace(key: String) -> Result<Option<String>, String> {
  let root = resolve_hudson_root_dir()?;
  let mut file_path = root;
  file_path.push("Workspace");

  let safe_key = sanitize_filename(&key);
  let filename = if safe_key.ends_with(".json") {
    safe_key
  } else {
    format!("{}.json", safe_key)
  };
  file_path.push(filename);

  if !file_path.exists() {
    return Ok(None);
  }

  let content = fs::read_to_string(&file_path)
    .map_err(|e| format!("Failed to read workspace JSON: {}", e))?;
  Ok(Some(content))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      get_native_desktop_info,
      native_toggle_fullscreen,
      native_is_fullscreen,
      native_send_notification,
      native_save_export,
      native_open_in_explorer,
      native_http_fetch,
      native_scrape_builder_website,
      native_save_json_workspace,
      native_load_json_workspace,
    ])
    .run(tauri::generate_context!())
    .expect("error while running Hudson Sales Hub desktop application");
}
