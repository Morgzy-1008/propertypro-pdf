import { isAllowedEmail } from "./access";

export interface StaffProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  title: string;
  displayCentre: string;
  role: "nhc" | "admin" | "estimator";
  avatarInitials: string;
  accentColor: string;
}

export const KNOWN_STAFF_PROFILES: StaffProfile[] = [
  {
    id: "jesse-jenkins",
    name: "Jesse Jenkins",
    email: "jesse.jenkins@hudsonhomes.com.au",
    phone: "0431 292 123",
    title: "New Home Consultant",
    displayCentre: "Lilywood Landings Display Home",
    role: "nhc",
    avatarInitials: "JJ",
    accentColor: "from-cyan-500 to-blue-600",
  },
  {
    id: "adrian-baxter",
    name: "Adrian Baxter",
    email: "adrian.baxter@hudsonhomes.com.au",
    phone: "0419 232 955",
    title: "New Home Consultant",
    displayCentre: "Bahrs Scrub Display Home",
    role: "nhc",
    avatarInitials: "AB",
    accentColor: "from-emerald-500 to-teal-600",
  },
  {
    id: "morgan-hales",
    name: "Morgan Hales",
    email: "morgan.hales@hudsonhomes.com.au",
    phone: "0417 571 864",
    title: "Senior New Home Consultant & System Admin",
    displayCentre: "Flagstone Display Home",
    role: "admin",
    avatarInitials: "MH",
    accentColor: "from-amber-500 to-orange-600",
  },
  {
    id: "alyssa-hales",
    name: "Alyssa Hales",
    email: "alyssa.hales@hudsonhomes.com.au",
    phone: "0480 893 290",
    title: "New Home Consultant",
    displayCentre: "Queensland Division",
    role: "nhc",
    avatarInitials: "AH",
    accentColor: "from-rose-500 to-pink-600",
  },
  {
    id: "shelley-lay",
    name: "Shelley Lay",
    email: "shelley.lay@hudsonhomes.com.au",
    phone: "0428 650 617",
    title: "New Home Consultant",
    displayCentre: "Queensland Division",
    role: "nhc",
    avatarInitials: "SL",
    accentColor: "from-violet-500 to-purple-600",
  },
];

export const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 Hours
export const STORAGE_KEY_AUTH_USER = "hudson_hub_auth_user";
export const STORAGE_KEY_AUTH_TIME = "hudson_session_authenticated_at";
export const STORAGE_KEY_SAVED_LOGIN = "hudson_saved_login_credential_v2";

const listeners = new Set<(user: StaffProfile | null) => void>();

export function isStaffSessionActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUTH_USER) || localStorage.getItem("hudson_auth_user");
    if (!raw) return false;
    const user = JSON.parse(raw);
    if (!user || !user.email) return false;

    // Check if user email is authorized
    if (!isAllowedEmail(user.email)) return false;

    // Check 24-hour expiration timestamp
    const authTimeStr = localStorage.getItem(STORAGE_KEY_AUTH_TIME);
    if (!authTimeStr) return false;
    const authTime = new Date(authTimeStr).getTime();
    if (isNaN(authTime)) return false;

    if (Date.now() - authTime > SESSION_DURATION_MS) {
      // 24hr session has expired
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function getActiveStaffUser(): StaffProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUTH_USER) || localStorage.getItem("hudson_auth_user");
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.email) return null;

    // Match against known staff profiles
    const known = findStaffProfileByEmail(parsed.email);
    if (known) {
      return { ...known, ...parsed };
    }

    if (!isAllowedEmail(parsed.email)) {
      return null;
    }

    return {
      id: parsed.id || parsed.email.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase(),
      name: parsed.name || parsed.email.split("@")[0].replace(/[._-]/g, " "),
      email: parsed.email.toLowerCase(),
      phone: parsed.phone || "0400 000 000",
      title: parsed.title || "New Home Consultant",
      displayCentre: parsed.displayCentre || "Queensland Division",
      role: parsed.role || "nhc",
      avatarInitials: (parsed.name || parsed.email).slice(0, 2).toUpperCase(),
      accentColor: "from-amber-500 to-amber-700",
    };
  } catch {
    return null;
  }
}

export function findStaffProfileByEmail(email?: string | null): StaffProfile | undefined {
  if (!email) return undefined;
  const clean = email.trim().toLowerCase();
  // Handle alias for Alyssa Hales (alyssa.hales, alyssa.pippig)
  if (clean === "alyssa.pippig@hudsonhomes.com.au" || clean === "alyssa.hales@hudsonhhomes.com.au") {
    return KNOWN_STAFF_PROFILES.find((p) => p.id === "alyssa-hales");
  }
  return KNOWN_STAFF_PROFILES.find((p) => p.email.toLowerCase() === clean);
}

export interface SavedLoginCredential {
  email: string;
  name?: string;
  password?: string;
  savedAt: string;
}

export function getSavedLoginCredentials(): SavedLoginCredential | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SAVED_LOGIN) || localStorage.getItem("hudson_saved_login_credential_v1");
    if (!raw) return null;
    return JSON.parse(raw) as SavedLoginCredential;
  } catch {
    return null;
  }
}

export function setActiveStaffUser(
  profile: StaffProfile,
  _remember = false,
  _passwordToSave?: string
): void {
  if (typeof window === "undefined") return;
  try {
    const payload = JSON.stringify(profile);
    localStorage.setItem(STORAGE_KEY_AUTH_USER, payload);
    localStorage.setItem("hudson_auth_user", payload);
    localStorage.setItem("hudson_hub_unlocked", "true");
    localStorage.setItem(STORAGE_KEY_AUTH_TIME, new Date().toISOString());

    // Clean up any legacy saved credentials with passwords
    localStorage.removeItem(STORAGE_KEY_SAVED_LOGIN);
    localStorage.removeItem("hudson_saved_login_credential_v1");
    localStorage.removeItem("hudson_saved_passwords_v1");

    // Notify all active components
    listeners.forEach((fn) => {
      try {
        fn(profile);
      } catch (e) {
        console.error("Staff user listener error:", e);
      }
    });
  } catch (e) {
    console.error("Failed to save active staff user:", e);
  }
}

export function clearActiveStaffUser(_forgetSaved = false): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY_AUTH_USER);
    localStorage.removeItem("hudson_auth_user");
    localStorage.removeItem("hudson_hub_unlocked");
    localStorage.removeItem(STORAGE_KEY_AUTH_TIME);
    localStorage.removeItem(STORAGE_KEY_SAVED_LOGIN);
    localStorage.removeItem("hudson_saved_login_credential_v1");
    listeners.forEach((fn) => fn(null));
  } catch {}
}

export function onStaffUserChanged(listener: (user: StaffProfile | null) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isSameStaffEmail(emailA?: string | null, emailB?: string | null): boolean {
  if (!emailA || !emailB) return false;
  return emailA.trim().toLowerCase() === emailB.trim().toLowerCase();
}
