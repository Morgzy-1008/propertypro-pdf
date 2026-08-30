import { approveStaffEmail, getApprovedStaffEmails } from "./access";

export interface AdminAccessRequest {
  id: string;
  name: string;
  email: string;
  phone?: string;
  requestedAt: string;
  status: "pending" | "approved" | "rejected";
  deviceInfo?: string;
}

export interface AdminSystemAlert {
  id: string;
  type: "access_request" | "security_event" | "bug_report" | "runtime_error";
  severity: "info" | "warning" | "danger";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  metadata?: Record<string, any>;
}

const STORAGE_ACCESS_REQUESTS = "hudson_admin_access_requests_v1";
const STORAGE_SYSTEM_ALERTS = "hudson_admin_system_alerts_v1";

const alertListeners = new Set<() => void>();

function notifyAlertListeners() {
  alertListeners.forEach((fn) => {
    try {
      fn();
    } catch {}
  });
}

export function onAdminAlertsChanged(listener: () => void): () => void {
  alertListeners.add(listener);
  return () => {
    alertListeners.delete(listener);
  };
}

export function getAllAccessRequests(): AdminAccessRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_ACCESS_REQUESTS);
    if (!raw) return [];
    return JSON.parse(raw) as AdminAccessRequest[];
  } catch {
    return [];
  }
}

export function getPendingAccessRequests(): AdminAccessRequest[] {
  return getAllAccessRequests().filter((r) => r.status === "pending");
}

export function logAccessRequest(email: string, name?: string, phone?: string): AdminAccessRequest {
  const norm = email.trim().toLowerCase();
  const existing = getAllAccessRequests();
  const match = existing.find((r) => r.email.toLowerCase() === norm && r.status === "pending");
  if (match) {
    return match;
  }

  const newReq: AdminAccessRequest = {
    id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: name || norm.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    email: norm,
    phone: phone || "",
    requestedAt: new Date().toISOString(),
    status: "pending",
    deviceInfo: typeof navigator !== "undefined" ? navigator.userAgent : "",
  };

  const updated = [newReq, ...existing.filter((r) => r.email.toLowerCase() !== norm)];
  try {
    localStorage.setItem(STORAGE_ACCESS_REQUESTS, JSON.stringify(updated));
  } catch {}

  // Also create a high-priority system alert
  logSystemAlert(
    "access_request",
    `New Staff Login Approval Request: ${newReq.name}`,
    `${norm} is requesting access to the Hudson Homes portal.`,
    "warning",
    { requestId: newReq.id, email: norm }
  );

  notifyAlertListeners();
  return newReq;
}

export function approveAccessRequest(requestId: string): void {
  const existing = getAllAccessRequests();
  const req = existing.find((r) => r.id === requestId);
  if (!req) return;

  req.status = "approved";
  approveStaffEmail(req.email);

  try {
    localStorage.setItem(STORAGE_ACCESS_REQUESTS, JSON.stringify(existing));
  } catch {}

  logSystemAlert(
    "security_event",
    `Access Approved for ${req.name}`,
    `Morgan Hales approved access for ${req.email}.`,
    "info",
    { email: req.email }
  );

  notifyAlertListeners();
}

export function rejectAccessRequest(requestId: string): void {
  const existing = getAllAccessRequests();
  const req = existing.find((r) => r.id === requestId);
  if (!req) return;

  req.status = "rejected";
  try {
    localStorage.setItem(STORAGE_ACCESS_REQUESTS, JSON.stringify(existing));
  } catch {}

  logSystemAlert(
    "security_event",
    `Access Denied for ${req.name}`,
    `Login request for ${req.email} was rejected.`,
    "danger",
    { email: req.email }
  );

  notifyAlertListeners();
}

export function getAllSystemAlerts(): AdminSystemAlert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_SYSTEM_ALERTS);
    if (!raw) return [];
    return JSON.parse(raw) as AdminSystemAlert[];
  } catch {
    return [];
  }
}

export function getUnreadAlertCount(): number {
  return getAllSystemAlerts().filter((a) => !a.read).length;
}

export function logSystemAlert(
  type: AdminSystemAlert["type"],
  title: string,
  message: string,
  severity: AdminSystemAlert["severity"] = "info",
  metadata?: Record<string, any>
): void {
  const alerts = getAllSystemAlerts();
  const newAlert: AdminSystemAlert = {
    id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    severity,
    title,
    message,
    timestamp: new Date().toISOString(),
    read: false,
    metadata,
  };

  const updated = [newAlert, ...alerts].slice(0, 100);
  try {
    localStorage.setItem(STORAGE_SYSTEM_ALERTS, JSON.stringify(updated));
  } catch {}

  notifyAlertListeners();
}

export function markAllAlertsAsRead(): void {
  const alerts = getAllSystemAlerts();
  alerts.forEach((a) => (a.read = true));
  try {
    localStorage.setItem(STORAGE_SYSTEM_ALERTS, JSON.stringify(alerts));
  } catch {}
  notifyAlertListeners();
}

export function clearAllSystemAlerts(): void {
  try {
    localStorage.removeItem(STORAGE_SYSTEM_ALERTS);
  } catch {}
  notifyAlertListeners();
}
