/**
 * Hudson staff who may hold a Package Studio / Tender / CRM account.
 * Enforces @hudsonhomes.com.au email domain and personal admin whitelist approval.
 */
export const DEFAULT_ALLOWED_EMAILS = [
  "morgan.hales@hudsonhomes.com.au",
  "alyssa.pippig@hudsonhomes.com.au",
  "shelley.lay@hudsonhomes.com.au",
  "jesse.jenkins@hudsonhomes.com.au",
  "adrian.baxter@hudsonhomes.com.au",
];

const LOCAL_APPROVED_EMAILS_KEY = "hudson_approved_staff_emails_v1";
const TRUSTED_2FA_PREFIX = "hudson_2fa_trust_";
const PENDING_PASSWORD_SETUP_KEY = "hudson_pending_password_setup_users";

export function getApprovedStaffEmails(): string[] {
  try {
    const stored = localStorage.getItem(LOCAL_APPROVED_EMAILS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return Array.from(new Set([...DEFAULT_ALLOWED_EMAILS, ...parsed.map((e: string) => e.trim().toLowerCase())]));
      }
    }
  } catch {}
  return [...DEFAULT_ALLOWED_EMAILS];
}

export function approveStaffEmail(email: string): void {
  const norm = email.trim().toLowerCase();
  const current = getApprovedStaffEmails();
  if (!current.includes(norm)) {
    const updated = [...current, norm];
    try {
      localStorage.setItem(LOCAL_APPROVED_EMAILS_KEY, JSON.stringify(updated));
      markUserNeedsPasswordSetup(norm);
    } catch {}
  }
}

/** Legacy shared password detection for forced password rotation */
const LEGACY_SHARED_PASSWORD = "StoneBenchTop99";

export function isLegacySharedPassword(password: string): boolean {
  return password === LEGACY_SHARED_PASSWORD;
}

/** Account administrator / owner */
export const ACCESS_REQUEST_EMAIL = "morgan.hales@hudsonhomes.com.au";

/**
 * Validates whether an email is allowed to sign in.
 * Rule: Must belong to @hudsonhomes.com.au domain AND be personally approved.
 */
export function isAllowedEmail(email: string): boolean {
  const norm = email.trim().toLowerCase();
  if (!norm.endsWith("@hudsonhomes.com.au")) {
    return false;
  }
  const approved = getApprovedStaffEmails();
  return approved.includes(norm);
}

/**
 * 2FA 30-Day Device Trust Management
 */
export function isDevice2faTrusted(email: string): boolean {
  const norm = email.trim().toLowerCase();
  try {
    const key = `${TRUSTED_2FA_PREFIX}${norm}`;
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data && typeof data.expiresAt === "number") {
      if (Date.now() < data.expiresAt) {
        return true;
      } else {
        localStorage.removeItem(key);
      }
    }
  } catch {}
  return false;
}

export function setDevice2faTrusted(email: string, days: number = 30): void {
  const norm = email.trim().toLowerCase();
  try {
    const key = `${TRUSTED_2FA_PREFIX}${norm}`;
    const expiresAt = Date.now() + days * 24 * 60 * 60 * 1000;
    localStorage.setItem(key, JSON.stringify({ email: norm, expiresAt, trustedAt: new Date().toISOString() }));
  } catch {}
}

export function clearDevice2faTrust(email: string): void {
  const norm = email.trim().toLowerCase();
  try {
    localStorage.removeItem(`${TRUSTED_2FA_PREFIX}${norm}`);
  } catch {}
}

/**
 * Newly approved staff first-login password setup tracking
 */
export function markUserNeedsPasswordSetup(email: string): void {
  const norm = email.trim().toLowerCase();
  try {
    const raw = localStorage.getItem(PENDING_PASSWORD_SETUP_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(norm)) {
      list.push(norm);
      localStorage.setItem(PENDING_PASSWORD_SETUP_KEY, JSON.stringify(list));
    }
  } catch {}
}

export function isUserNeedingPasswordSetup(email: string): boolean {
  const norm = email.trim().toLowerCase();
  try {
    const raw = localStorage.getItem(PENDING_PASSWORD_SETUP_KEY);
    if (raw) {
      const list: string[] = JSON.parse(raw);
      return Array.isArray(list) && list.includes(norm);
    }
  } catch {}
  return false;
}

export function markUserPasswordConfigured(email: string): void {
  const norm = email.trim().toLowerCase();
  try {
    const raw = localStorage.getItem(PENDING_PASSWORD_SETUP_KEY);
    if (raw) {
      const list: string[] = JSON.parse(raw);
      const filtered = list.filter((e) => e !== norm);
      localStorage.setItem(PENDING_PASSWORD_SETUP_KEY, JSON.stringify(filtered));
    }
  } catch {}
}
