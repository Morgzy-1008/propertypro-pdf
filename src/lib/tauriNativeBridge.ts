import { invoke } from "@tauri-apps/api/core";

export interface DesktopSystemInfo {
  isNativeDesktop: boolean;
  appVersion: string;
  os: string;
  arch: string;
  cpuCores: number;
  exportsRootDir: string;
  workspaceBackupDir: string;
}

export interface SavedFileResult {
  savedNatively: boolean;
  fullPath?: string;
  folderPath?: string;
  filename: string;
  fileSizeBytes?: number;
}

export interface NativeHttpResponse {
  status: number;
  ok: boolean;
  contentType: string;
  bodyText: string;
}

export type ExportFolderCategory =
  | "Facades"
  | "Quotes"
  | "Flyers"
  | "Tender Audits"
  | "Floorplans"
  | "Exports";

/**
 * Synchronously checks whether the app is currently running inside the
 * Tauri v2 Native Windows Desktop runtime.
 */
export function isTauriDesktop(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as any;
  return Boolean(w.__TAURI_INTERNALS__ || w.__TAURI__ || w.__HUDSON_FORCE_NATIVE_DESKTOP__);
}

/**
 * Fetches hardware and local directory metadata from the Rust backend when
 * running in the Tauri Windows Desktop app.
 */
export async function getNativeDesktopInfo(): Promise<DesktopSystemInfo | null> {
  if (!isTauriDesktop()) return null;
  try {
    const info = await invoke<DesktopSystemInfo>("get_native_desktop_info");
    return info;
  } catch (err) {
    console.warn("[TauriNativeBridge] get_native_desktop_info fallback:", err);
    return {
      isNativeDesktop: true,
      appVersion: "2026.1.0",
      os: "windows",
      arch: "x86_64",
      cpuCores: typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 8 : 8,
      exportsRootDir: "Documents\\Hudson Homes OS",
      workspaceBackupDir: "Documents\\Hudson Homes OS\\Workspace",
    };
  }
}

/**
 * Converts an image URL or Blob URL into a Base64 data URL if it isn't one already.
 */
async function ensureBase64DataUrl(inputUrlOrBase64: string): Promise<string> {
  if (inputUrlOrBase64.startsWith("data:")) {
    return inputUrlOrBase64;
  }
  const resp = await fetch(inputUrlOrBase64);
  const blob = await resp.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to convert blob to base64"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Saves a file (4K facade render, PDF flyer, quote, or tender audit) directly to
 * `Documents\Hudson Homes OS\<category>\<filename>` when running in the native Windows app,
 * or falls back to a standard browser download on the web.
 */
export async function saveFileNativeOrWeb(options: {
  filename: string;
  dataUrlOrBase64: string;
  category?: ExportFolderCategory;
}): Promise<SavedFileResult> {
  const { filename, dataUrlOrBase64, category = "Exports" } = options;

  if (isTauriDesktop()) {
    try {
      const b64Payload = await ensureBase64DataUrl(dataUrlOrBase64);
      const res = await invoke<{
        fullPath: string;
        folderPath: string;
        filename: string;
        fileSizeBytes: number;
      }>("native_save_export", {
        filename,
        dataBase64: b64Payload,
        category,
      });

      return {
        savedNatively: true,
        fullPath: res.fullPath,
        folderPath: res.folderPath,
        filename: res.filename,
        fileSizeBytes: res.fileSizeBytes,
      };
    } catch (err) {
      console.warn("[TauriNativeBridge] native_save_export failed, falling back to browser download:", err);
    }
  }

  // Standard Web Browser Fallback
  if (typeof document !== "undefined") {
    const link = document.createElement("a");
    link.download = filename;
    link.href = dataUrlOrBase64;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return {
    savedNatively: false,
    filename,
  };
}

/**
 * Opens Windows Explorer directly to the specified file or folder (or the root
 * `Documents\Hudson Homes OS` folder if omitted).
 */
export async function openInWindowsExplorer(path?: string): Promise<boolean> {
  if (!isTauriDesktop()) return false;
  try {
    await invoke<string>("native_open_in_explorer", {
      path: path || null,
    });
    return true;
  } catch (err) {
    console.warn("[TauriNativeBridge] native_open_in_explorer error:", err);
    return false;
  }
}

/**
 * Performs a CORS-free native HTTP GET request via the Rust backend when running
 * inside the Windows Desktop App, with automatic fallback to Jina Reader / Web Fetch
 * when running in a standard web browser.
 */
export async function fetchExternalUrlNativeOrWeb(
  url: string,
  options?: { timeoutMs?: number; useJinaOnWeb?: boolean }
): Promise<string> {
  const timeoutMs = options?.timeoutMs ?? 6000;
  const useJinaOnWeb = options?.useJinaOnWeb ?? true;

  if (isTauriDesktop()) {
    try {
      const res = await invoke<NativeHttpResponse>("native_http_fetch", {
        url,
        timeoutMs,
      });
      if (res.ok && res.bodyText) {
        return res.bodyText;
      }
    } catch (err) {
      console.warn("[TauriNativeBridge] native_http_fetch fallback:", err);
    }
  }

  try {
    const targetUrl = useJinaOnWeb ? `https://r.jina.ai/${url}` : url;
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: { Accept: "text/plain, text/html" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return "";
    return await response.text();
  } catch {
    return "";
  }
}

/**
 * Persists a workspace dataset (e.g. custom facades or tender audits) to the local
 * Windows SSD (`Documents\Hudson Homes OS\Workspace\<key>.json`) when in native desktop mode.
 */
export async function syncWorkspaceToNativeDisk(key: string, data: unknown): Promise<string | null> {
  if (!isTauriDesktop()) return null;
  try {
    const jsonPayload = JSON.stringify(data, null, 2);
    return await invoke<string>("native_save_json_workspace", {
      key,
      jsonPayload,
    });
  } catch {
    return null;
  }
}

/**
 * Loads a workspace dataset from the local Windows SSD when in native desktop mode.
 */
export async function loadWorkspaceFromNativeDisk<T>(key: string): Promise<T | null> {
  if (!isTauriDesktop()) return null;
  try {
    const raw = await invoke<string | null>("native_load_json_workspace", { key });
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
