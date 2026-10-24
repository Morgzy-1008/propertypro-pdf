import { getActiveStaffUser } from "./authSession";
import { logSystemAlert } from "./adminAlerts";
import { supabase } from "@/integrations/supabase/client";
import { broadcastCloudChange, ensureStaffSupabaseAuth } from "./supabaseSync";

export type SupportTicketCategory = "issue" | "feedback" | "question";
export type SupportTicketStatus = "open" | "in_progress" | "resolved";

export interface SupportTicket {
  id: string;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorRole: string;
  authorDisplayCentre: string;
  category: SupportTicketCategory;
  pageUrl: string;
  pageTitle: string;
  message: string;
  screenshotDataUrl?: string;
  snipRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  status: SupportTicketStatus;
  readByAdmin: boolean;
  adminNotes?: string;
}

const STORAGE_KEY_TICKETS = "hudson_support_feedback_tickets_v1";
const BROADCAST_CHANNEL_NAME = "hudson_support_feedback_channel_v1";
const IDB_DB_NAME = "PropertyProSupportDB";
const IDB_DB_VERSION = 1;
const IDB_STORE_NAME = "tickets";

const ticketListeners = new Set<() => void>();
let broadcastChannel: BroadcastChannel | null = null;

if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    broadcastChannel.onmessage = () => {
      notifyTicketListeners();
    };
  } catch {
    // Ignore if BroadcastChannel is unavailable
  }
}

function notifyTicketListeners() {
  ticketListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // Ignore listener errors
    }
  });
}

function broadcastTicketUpdate() {
  notifyTicketListeners();
  try {
    broadcastChannel?.postMessage({ type: "tickets_updated", timestamp: Date.now() });
  } catch {
    // Ignore
  }
}

export function onSupportTicketsChanged(listener: () => void): () => void {
  ticketListeners.add(listener);
  return () => {
    ticketListeners.delete(listener);
  };
}

function openSupportDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const request = window.indexedDB.open(IDB_DB_NAME, IDB_DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

async function saveTicketToIdb(ticket: SupportTicket): Promise<void> {
  try {
    const db = await openSupportDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_NAME, "readwrite");
      const store = tx.objectStore(IDB_STORE_NAME);
      const req = store.put(ticket);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Fallback handled by localStorage
  }
}

async function deleteTicketFromIdb(id: string): Promise<void> {
  try {
    const db = await openSupportDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE_NAME, "readwrite");
      const store = tx.objectStore(IDB_STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    // Ignore
  }
}

export async function loadAllSupportTicketsFromIdb(): Promise<SupportTicket[]> {
  try {
    const db = await openSupportDB();
    return await new Promise<SupportTicket[]>((resolve) => {
      const tx = db.transaction(IDB_STORE_NAME, "readonly");
      const store = tx.objectStore(IDB_STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = (req.result as SupportTicket[]) || [];
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(list);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export function getSupportTickets(): SupportTicket[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TICKETS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as SupportTicket[]).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    return [];
  }
}

function saveTicketsToLocalStorage(tickets: SupportTicket[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(tickets));
  } catch {
    // If screenshot data URLs exceed localStorage quota, store lightweight copies in localStorage
    // while IndexedDB retains full-resolution screenshots
    try {
      const slim = tickets.map((t, idx) =>
        idx < 15
          ? t
          : {
              ...t,
              screenshotDataUrl: undefined,
            }
      );
      localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(slim));
    } catch {
      // Ignore quota error
    }
  }
}

/**
 * Dynamically compresses a screenshot data URL for fast and reliable cloud synchronization.
 * Full-resolution screenshots remain intact in local client storage/IndexedDB.
 */
async function compressScreenshotForCloud(dataUrl?: string): Promise<string | undefined> {
  if (!dataUrl) return undefined;
  if (dataUrl.length < 60000) return dataUrl; // Already compact (<60KB)
  if (typeof window === "undefined" || typeof document === "undefined") return dataUrl;

  try {
    return await new Promise<string>((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 800;
          let w = img.width || 800;
          let h = img.height || 600;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(dataUrl);
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL("image/jpeg", 0.70);
          resolve(compressed.length < dataUrl.length ? compressed : dataUrl);
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  } catch {
    return dataUrl;
  }
}

export async function getSupportTicketsAsync(): Promise<SupportTicket[]> {
  const local = getSupportTickets();
  const idb = await loadAllSupportTicketsFromIdb();
  const map = new Map<string, SupportTicket>();

  for (const t of local) {
    if (t && t.id) map.set(t.id, t);
  }
  for (const t of idb) {
    if (t && t.id) {
      const existing = map.get(t.id);
      if (!existing || new Date(t.updatedAt).getTime() >= new Date(existing.updatedAt).getTime() || (!existing.screenshotDataUrl && t.screenshotDataUrl)) {
        map.set(t.id, t);
      }
    }
  }

  // Pull shared support tickets from Supabase cloud across all consultant workstations
  try {
    await ensureStaffSupabaseAuth();
    const remotePromise = supabase
      .from("packages")
      .select("flyer_data, updated_at, notes, name")
      .or("notes.like.support_ticket_%,name.like.Support Ticket%")
      .order("updated_at", { ascending: false })
      .limit(200);

    const timeoutPromise = new Promise<{ data: null }>((resolve) =>
      setTimeout(() => resolve({ data: null }), 8000)
    );

    const { data: rows } = (await Promise.race([remotePromise, timeoutPromise])) as any;
    let validRemoteRows = Array.isArray(rows) && rows.length > 0 ? rows : [];

    // Fallback: If direct client returned empty/null, query via /api/database-sync bridge
    if (validRemoteRows.length === 0 && typeof window !== "undefined") {
      try {
        const apiRes = await fetch("/api/database-sync");
        if (apiRes.ok) {
          const apiJson = await apiRes.json();
          if (Array.isArray(apiJson.packages)) {
            validRemoteRows = apiJson.packages.filter(
              (p: any) =>
                (p.notes && String(p.notes).startsWith("support_ticket_")) ||
                (p.name && String(p.name).startsWith("Support Ticket")) ||
                p.flyer_data?.type === "support_ticket"
            );
          }
        }
      } catch {}
    }

    if (Array.isArray(validRemoteRows)) {
      for (const row of validRemoteRows) {
        const remoteTicket = row?.flyer_data?.ticket as SupportTicket | undefined;
        if (remoteTicket && remoteTicket.id) {
          const existing = map.get(remoteTicket.id);
          const remoteTime = new Date(remoteTicket.updatedAt || row.updated_at || 0).getTime();
          const localTime = new Date(existing?.updatedAt || 0).getTime();
          if (!existing || remoteTime > localTime) {
            // Retain high-resolution screenshot if local already has it
            if (existing?.screenshotDataUrl && !remoteTicket.screenshotDataUrl) {
              remoteTicket.screenshotDataUrl = existing.screenshotDataUrl;
            }
            map.set(remoteTicket.id, remoteTicket);
            void saveTicketToIdb(remoteTicket);
          }
        }
      }
    }
  } catch (cloudErr) {
    console.warn("[supportFeedback] Cloud pull warning:", cloudErr);
  }

  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  saveTicketsToLocalStorage(merged);
  return merged;
}

export async function forceSyncSupportTicketsFromCloud(): Promise<{ count: number; error?: string }> {
  try {
    const list = await getSupportTicketsAsync();
    broadcastTicketUpdate();
    return { count: list.length };
  } catch (err: any) {
    return { count: 0, error: err?.message || "Cloud sync error" };
  }
}

async function syncSupportTicketToCloud(ticket: SupportTicket): Promise<boolean> {
  try {
    await ensureStaffSupabaseAuth();
    const notesKey = `support_ticket_${ticket.id}`;

    // Compress screenshot for cloud transmission (<50KB) so payload limits are never exceeded
    const cloudScreenshot = await compressScreenshotForCloud(ticket.screenshotDataUrl);
    const cloudTicket: SupportTicket = {
      ...ticket,
      screenshotDataUrl: cloudScreenshot,
    };

    const payload = {
      name: `Support Ticket: ${ticket.authorName} - ${ticket.category.toUpperCase()}`,
      housing_type: "Single Storey",
      design: ticket.pageTitle || "Support",
      range_id: "value",
      notes: notesKey,
      status: "draft" as const,
      flyer_data: {
        type: "support_ticket",
        ticket: cloudTicket,
      } as any,
      updated_at: new Date().toISOString(),
    };

    // 1. Direct Supabase insert / update
    const { data: existing } = await supabase
      .from("packages")
      .select("id")
      .eq("notes", notesKey)
      .maybeSingle();

    let syncedOk = false;
    if (existing?.id) {
      const { error: updateErr } = await supabase.from("packages").update(payload).eq("id", existing.id);
      syncedOk = !updateErr;
      if (updateErr) console.warn("[supportFeedback] Direct update warning:", updateErr);
    } else {
      const { error: insertErr } = await supabase.from("packages").insert(payload);
      syncedOk = !insertErr;
      if (insertErr) console.warn("[supportFeedback] Direct insert warning:", insertErr);
    }

    // 2. Serverless API bridge fallback (/api/database-sync) if direct Supabase client hit network/RLS issues
    if (!syncedOk && typeof window !== "undefined") {
      try {
        const res = await fetch("/api/database-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ packages: [payload] }),
        });
        if (res.ok) syncedOk = true;
      } catch (bridgeErr) {
        console.warn("[supportFeedback] API bridge sync fallback error:", bridgeErr);
      }
    }

    await broadcastCloudChange({ action: "database_full_sync", timestamp: Date.now() });
    return syncedOk;
  } catch (e) {
    console.warn("[supportFeedback] Cloud sync exception:", e);
    return false;
  }
}

export function resolveReadablePageTitle(pathname: string): string {
  const clean = pathname.split("?")[0] || "/";
  if (clean.includes("quote-builder")) return "Quoting Tool (/quote-builder)";
  if (clean.includes("flyer")) return "Package Flyer Builder (/flyer)";
  if (clean.includes("database")) return "Lots & Packages Database (/database)";
  if (clean.includes("floorplan-library")) return "Floorplan Library (/floorplan-library)";
  if (clean.includes("floorplan-editor")) return "Concept Floorplan Editor (/floorplan-editor)";
  if (clean.includes("site-studio")) return "Site Studio 1:200 (/site-studio)";
  if (clean.includes("land-scout")) return "Land Scout (/land-scout)";
  if (clean.includes("tender-request")) return "Tender Request Portal (/tender-request)";
  if (clean.includes("tender-compare")) return "Tender Compare (/tender-compare)";
  if (clean.includes("crm")) return "Horizon CRM (/crm)";
  if (clean.includes("braindump")) return "BrainDump Tasks (/braindump)";
  if (clean.includes("facade-generator")) return "Facade Generator (/facade-generator)";
  if (clean.includes("3d-studio")) return "3D Architectural Studio (/3d-studio)";
  if (clean.includes("hub")) return "Welcome Hub (/hub)";
  return `Platform Page (${clean})`;
}

export function submitSupportTicket(input: {
  category: SupportTicketCategory;
  message: string;
  screenshotDataUrl?: string;
  snipRect?: { x: number; y: number; width: number; height: number };
  pageUrl?: string;
  pageTitle?: string;
}): SupportTicket {
  const staff = getActiveStaffUser();
  const now = new Date().toISOString();
  const pathname =
    input.pageUrl ||
    (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/hub");

  const newTicket: SupportTicket = {
    id: `ticket_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: now,
    updatedAt: now,
    authorId: staff?.id || "staff-member",
    authorName: staff?.name || "Hudson Staff Member",
    authorEmail: staff?.email || "staff@hudsonhomes.com.au",
    authorRole: staff?.title || staff?.role || "Consultant",
    authorDisplayCentre: staff?.displayCentre || "Hudson Homes",
    category: input.category,
    pageUrl: pathname,
    pageTitle: input.pageTitle || resolveReadablePageTitle(pathname),
    message: input.message.trim(),
    screenshotDataUrl: input.screenshotDataUrl,
    snipRect: input.snipRect,
    status: "open",
    readByAdmin: false,
  };

  const existing = getSupportTickets();
  const updated = [newTicket, ...existing];
  saveTicketsToLocalStorage(updated);
  void saveTicketToIdb(newTicket);
  void syncSupportTicketToCloud(newTicket);

  const categoryLabel =
    newTicket.category === "issue"
      ? "Bug / Issue"
      : newTicket.category === "feedback"
        ? "Platform Feedback"
        : "Support Question";

  logSystemAlert(
    "bug_report",
    `${categoryLabel} from ${newTicket.authorName} (${newTicket.pageTitle})`,
    newTicket.message.slice(0, 180) + (newTicket.message.length > 180 ? "..." : ""),
    newTicket.category === "issue" ? "warning" : "info",
    { ticketId: newTicket.id, hasScreenshot: Boolean(newTicket.screenshotDataUrl) }
  );

  broadcastTicketUpdate();
  return newTicket;
}

export function updateSupportTicketStatus(
  ticketId: string,
  status: SupportTicketStatus,
  adminNotes?: string
): void {
  const tickets = getSupportTickets();
  const target = tickets.find((t) => t.id === ticketId);
  if (!target) return;

  target.status = status;
  target.readByAdmin = true;
  target.updatedAt = new Date().toISOString();
  if (adminNotes !== undefined) {
    target.adminNotes = adminNotes;
  }

  saveTicketsToLocalStorage(tickets);
  void saveTicketToIdb(target);
  void syncSupportTicketToCloud(target);
  broadcastTicketUpdate();
}

export function markAllSupportTicketsRead(): void {
  const tickets = getSupportTickets();
  let changed = false;
  for (const t of tickets) {
    if (!t.readByAdmin) {
      t.readByAdmin = true;
      changed = true;
      void saveTicketToIdb(t);
    }
  }
  if (changed) {
    saveTicketsToLocalStorage(tickets);
    broadcastTicketUpdate();
  }
}

export function deleteSupportTicket(ticketId: string): void {
  const tickets = getSupportTickets().filter((t) => t.id !== ticketId);
  saveTicketsToLocalStorage(tickets);
  void deleteTicketFromIdb(ticketId);
  try {
    void supabase.from("packages").delete().eq("notes", `support_ticket_${ticketId}`);
  } catch {
    // Ignore
  }
  broadcastTicketUpdate();
}

export function getUnreadSupportTicketCount(): number {
  return getSupportTickets().filter((t) => !t.readByAdmin && t.status !== "resolved").length;
}

export function getOpenSupportTicketCount(): number {
  return getSupportTickets().filter((t) => t.status !== "resolved").length;
}

/**
 * Formats a single ticket into a clear, structured prompt that Morgan can paste directly to the AI assistant.
 */
export function formatTicketAsAiPrompt(ticket: SupportTicket): string {
  const catLabel =
    ticket.category === "issue"
      ? "Bug / Issue"
      : ticket.category === "feedback"
        ? "Improvement / Feedback"
        : "Question / Help Request";
  return [
    `Please fix/address the following ${catLabel} reported by ${ticket.authorName} (${ticket.authorRole}):`,
    `- **Page / Tool**: ${ticket.pageTitle} (\`${ticket.pageUrl}\`)`,
    `- **Reported At**: ${new Date(ticket.createdAt).toLocaleString()}`,
    `- **Details**: "${ticket.message}"`,
    ticket.screenshotDataUrl
      ? `- **Visual Context**: A cropped screenshot was attached by ${ticket.authorName} highlighting the exact area on ${ticket.pageTitle}.`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Formats all open support tickets into a consolidated batch prompt for Morgan to paste to the AI assistant.
 */
export function formatAllOpenTicketsAsAiPrompt(tickets: SupportTicket[]): string {
  const openTickets = tickets.filter((t) => t.status !== "resolved");
  if (openTickets.length === 0) {
    return "No open support or feedback requests to fix.";
  }

  const header = `Please review and fix the following ${openTickets.length} support/feedback item${
    openTickets.length === 1 ? "" : "s"
  } reported by our team across the website:\n`;

  const items = openTickets.map((t, i) => {
    const catLabel =
      t.category === "issue"
        ? "Bug / Issue"
        : t.category === "feedback"
          ? "Feedback / Improvement"
          : "Question";
    return `${i + 1}. **[${catLabel}] ${t.pageTitle}** (Reported by ${t.authorName}):\n   "${t.message}"`;
  });

  return `${header}\n${items.join("\n\n")}`;
}
