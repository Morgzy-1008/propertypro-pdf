export interface ActivityLogItem {
  id: string;
  type: "login" | "package_edit" | "lot_edit" | "quote_created" | "tender_action";
  actorName: string;
  actorEmail?: string;
  actorRole?: string;
  description: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}

const STORAGE_KEY = "hudson_website_activity_log";

const INITIAL_DEMO_ACTIVITY: ActivityLogItem[] = [
  {
    id: "act-1",
    type: "login",
    actorName: "Morgan Hales",
    actorEmail: "morgan.hales@hudsonhomes.com.au",
    actorRole: "Admin",
    description: "Logged into Hudson Homes Staff Portal via Parramatta Head Office",
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: "act-2",
    type: "package_edit",
    actorName: "Alyssa Hales",
    actorEmail: "alyssa.hales@hudsonhomes.com.au",
    actorRole: "Senior NHC",
    description: "Updated package: Orchid 23 (s/g) · Brookhaven (Lot 1487)",
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    meta: { packageId: "alyssa-pkg-orchid 23 (s/g)-1487", price: 929900 },
  },
  {
    id: "act-3",
    type: "login",
    actorName: "Alyssa Hales",
    actorEmail: "alyssa.hales@hudsonhomes.com.au",
    actorRole: "Senior NHC",
    description: "Authenticated login session from Springfield Central Display",
    timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
  },
  {
    id: "act-4",
    type: "quote_created",
    actorName: "Jordan Mitchell",
    actorEmail: "jordan.mitchell@hudsonhomes.com.au",
    actorRole: "New Home Consultant",
    description: "Generated Builders Estimate PDF for Client: David & Sarah Miller",
    timestamp: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    meta: { design: "Amber 21", total: 785900 },
  },
  {
    id: "act-5",
    type: "lot_edit",
    actorName: "Morgan Hales",
    actorEmail: "morgan.hales@hudsonhomes.com.au",
    actorRole: "Admin",
    description: "Updated land status to Available for Lot 275 Highland Walloon",
    timestamp: new Date(Date.now() - 360 * 60 * 1000).toISOString(),
  },
];

export function getActivityLogs(): ActivityLogItem[] {
  if (typeof window === "undefined") return INITIAL_DEMO_ACTIVITY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DEMO_ACTIVITY));
      return INITIAL_DEMO_ACTIVITY;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_DEMO_ACTIVITY;
  } catch {
    return INITIAL_DEMO_ACTIVITY;
  }
}

export function logActivity(
  item: Omit<ActivityLogItem, "id" | "timestamp"> & { timestamp?: string }
): ActivityLogItem {
  const current = getActivityLogs();
  const newItem: ActivityLogItem = {
    ...item,
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: item.timestamp || new Date().toISOString(),
  };

  const updated = [newItem, ...current].slice(0, 100);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("hudson_activity_change", { detail: newItem }));
    } catch (e) {
      console.warn("[activityLog] Failed to persist activity item:", e);
    }
  }

  return newItem;
}

export function clearActivityLogs(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("hudson_activity_change"));
  }
}

export function onActivityLogged(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener("hudson_activity_change", handler);
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) callback();
  });
  return () => {
    window.removeEventListener("hudson_activity_change", handler);
  };
}
