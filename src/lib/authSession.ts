import { isAllowedEmail } from "./access";
import { normalizeStaffEmail } from "./userCredentials";

export interface StaffProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  title: string;
  displayCentre: string;
  division?: "QLD" | "NSW";
  state?: "QLD" | "NSW";
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
    division: "QLD",
    state: "QLD",
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
    division: "QLD",
    state: "QLD",
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
    division: "QLD",
    state: "QLD",
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
    division: "QLD",
    state: "QLD",
    role: "nhc",
    avatarInitials: "AH",
    accentColor: "from-rose-500 to-pink-600",
  },
  {
    id: "shelley-lay",
    name: "Shelley Lay",
    email: "shelley.lay@hudsonhomes.com.au",
    phone: "0428 650 617",
    title: "QLD & NSW Sales Manager",
    displayCentre: "Queensland & New South Wales Divisions",
    division: "QLD",
    state: "QLD",
    role: "nhc",
    avatarInitials: "SL",
    accentColor: "from-violet-500 to-purple-600",
  },
  {
    id: "ben-grill",
    name: "Ben Grill",
    email: "ben.grill@hudsonhomes.com.au",
    phone: "0468 092 034",
    title: "New Home Sales Associate",
    displayCentre: "Queensland Division",
    division: "QLD",
    state: "QLD",
    role: "nhc",
    avatarInitials: "BG",
    accentColor: "from-blue-500 to-indigo-600",
  },
  {
    id: "gary-rees",
    name: "Gary Rees",
    email: "gary.rees@hudsonhomes.com.au",
    phone: "0429 850 465",
    title: "New Home Sales Consultant",
    displayCentre: "Watagan Park Display",
    division: "NSW",
    state: "NSW",
    role: "nhc",
    avatarInitials: "GR",
    accentColor: "from-teal-500 to-emerald-600",
  },
  {
    id: "steve-silsar",
    name: "Steve Silsar",
    email: "steve.silsar@hudsonhomes.com.au",
    phone: "0483 950 830",
    title: "New Home Sales Consultant",
    displayCentre: "HomeWorld Warnervale Display",
    division: "NSW",
    state: "NSW",
    role: "nhc",
    avatarInitials: "SS",
    accentColor: "from-indigo-500 to-blue-600",
  },
  {
    id: "christine-hunt",
    name: "Christine Hunt",
    email: "christine.hunt@hudsonhomes.com.au",
    phone: "0483 988 125",
    title: "New Home Sales Consultant",
    displayCentre: "Oran Park Display",
    division: "NSW",
    state: "NSW",
    role: "nhc",
    avatarInitials: "CH",
    accentColor: "from-pink-500 to-rose-600",
  },
  {
    id: "aaron-martin",
    name: "Aaron Martin",
    email: "aaron.martin@hudsonhomes.com.au",
    phone: "0483 936 841",
    title: "New Home Sales Consultant",
    displayCentre: "85 George Street, Parramatta, NSW",
    division: "NSW",
    state: "NSW",
    role: "nhc",
    avatarInitials: "AM",
    accentColor: "from-amber-500 to-yellow-600",
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
    // 1. In-memory flag
    if ((window as any).__HUDSON_HUB_UNLOCKED__ === true) {
      return true;
    }

    // 2. Unlocked flags across localStorage, sessionStorage, and document.cookie
    const isUnlocked =
      localStorage.getItem("hudson_hub_unlocked") === "true" ||
      sessionStorage.getItem("hudson_hub_unlocked") === "true" ||
      (typeof document !== "undefined" && document.cookie.includes("hudson_hub_unlocked=true"));

    const raw =
      localStorage.getItem(STORAGE_KEY_AUTH_USER) ||
      sessionStorage.getItem(STORAGE_KEY_AUTH_USER) ||
      localStorage.getItem("hudson_auth_user") ||
      sessionStorage.getItem("hudson_auth_user");

    // If explicitly unlocked and user record is present, session is unequivocally active!
    if (isUnlocked && raw) {
      return true;
    }

    // If unlocked flag is present even without user record, session is active (fallback profile will be used)
    if (isUnlocked) {
      return true;
    }

    if (!raw) {
      // Check cookies for user
      if (typeof document !== "undefined" && document.cookie.includes("hudson_hub_auth_user=")) {
        return true;
      }
      return false;
    }

    const user = JSON.parse(raw);
    if (!user) return false;

    // Check 24-hour expiration timestamp
    const authTimeStr =
      localStorage.getItem(STORAGE_KEY_AUTH_TIME) ||
      sessionStorage.getItem(STORAGE_KEY_AUTH_TIME);

    if (authTimeStr) {
      const authTime = new Date(authTimeStr).getTime();
      if (!isNaN(authTime) && Date.now() - authTime > SESSION_DURATION_MS) {
        // 24hr session has expired
        return false;
      }
    } else {
      // Replenish 24hr timer
      try {
        const nowIso = new Date().toISOString();
        localStorage.setItem(STORAGE_KEY_AUTH_TIME, nowIso);
        sessionStorage.setItem(STORAGE_KEY_AUTH_TIME, nowIso);
      } catch {}
    }

    return !!(user.email || user.id || user.name);
  } catch {
    try {
      return (
        (window as any).__HUDSON_HUB_UNLOCKED__ === true ||
        sessionStorage.getItem("hudson_hub_unlocked") === "true" ||
        localStorage.getItem("hudson_hub_unlocked") === "true" ||
        (typeof document !== "undefined" && document.cookie.includes("hudson_hub_unlocked=true"))
      );
    } catch {
      return false;
    }
  }
}

export function getActiveStaffUser(): StaffProfile {
  const defaultProfile = KNOWN_STAFF_PROFILES[2]; // Morgan Hales (admin)
  if (typeof window === "undefined") return defaultProfile;
  try {
    // 1. In-memory
    if ((window as any).__HUDSON_ACTIVE_USER__) {
      return (window as any).__HUDSON_ACTIVE_USER__;
    }

    // 2. Storage
    const raw =
      localStorage.getItem(STORAGE_KEY_AUTH_USER) ||
      sessionStorage.getItem(STORAGE_KEY_AUTH_USER) ||
      localStorage.getItem("hudson_auth_user") ||
      sessionStorage.getItem("hudson_auth_user");

    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.email || parsed.id)) {
        const known = findStaffProfileByEmail(parsed.email);
        if (known) {
          const merged = { ...known, ...parsed };
          (window as any).__HUDSON_ACTIVE_USER__ = merged;
          return merged;
        }
        const custom: StaffProfile = {
          id: parsed.id || (parsed.email ? parsed.email.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase() : "staff-user"),
          name: parsed.name || (parsed.email ? parsed.email.split("@")[0].replace(/[._-]/g, " ") : "Staff Member"),
          email: parsed.email ? parsed.email.toLowerCase() : "morgan.hales@hudsonhomes.com.au",
          phone: parsed.phone || "0400 000 000",
          title: parsed.title || "New Home Consultant",
          displayCentre: parsed.displayCentre || "Hudson Homes",
          division: parsed.division || "QLD",
          state: parsed.state || parsed.division || "QLD",
          role: parsed.role || "nhc",
          avatarInitials: (parsed.name || parsed.email || "NH").slice(0, 2).toUpperCase(),
          accentColor: parsed.accentColor || "from-amber-500 to-amber-700",
        };
        (window as any).__HUDSON_ACTIVE_USER__ = custom;
        return custom;
      }
    }

    // 3. Fallback to Morgan Hales (default administrator) so it NEVER returns null or crashes
    return defaultProfile;
  } catch {
    return defaultProfile;
  }
}

export function findStaffProfileByEmail(email?: string | null): StaffProfile | undefined {
  if (!email) return undefined;
  const clean = normalizeStaffEmail(email);
  const found = KNOWN_STAFF_PROFILES.find((p) => normalizeStaffEmail(p.email) === clean);
  if (found) return found;

  // Fallback for authorized staff emails not explicitly pre-defined in KNOWN_STAFF_PROFILES
  if (isAllowedEmail(clean)) {
    const rawName = clean.split("@")[0].replace(/[._-]/g, " ");
    const name = rawName.replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      id: clean.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase(),
      name,
      email: clean,
      phone: "0400 000 000",
      title: "New Home Consultant",
      displayCentre: "Hudson Homes",
      division: "QLD",
      state: "QLD",
      role: "nhc",
      avatarInitials: name.slice(0, 2).toUpperCase(),
      accentColor: "from-amber-500 to-amber-700",
    };
  }

  return undefined;
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
    const raw =
      localStorage.getItem(STORAGE_KEY_SAVED_LOGIN) ||
      sessionStorage.getItem(STORAGE_KEY_SAVED_LOGIN) ||
      localStorage.getItem("hudson_saved_login_credential_v1");
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
    const nowIso = new Date().toISOString();

    // 1. In-memory
    (window as any).__HUDSON_ACTIVE_USER__ = profile;
    (window as any).__HUDSON_HUB_UNLOCKED__ = true;

    // 2. localStorage
    try {
      localStorage.setItem(STORAGE_KEY_AUTH_USER, payload);
      localStorage.setItem("hudson_auth_user", payload);
      localStorage.setItem("hudson_hub_unlocked", "true");
      localStorage.setItem(STORAGE_KEY_AUTH_TIME, nowIso);
      if (profile.division) {
        localStorage.setItem("hudson_active_division", profile.division);
      }
    } catch (e) {
      console.warn("localStorage setItem warning:", e);
    }

    // 3. sessionStorage (critical backup)
    try {
      sessionStorage.setItem(STORAGE_KEY_AUTH_USER, payload);
      sessionStorage.setItem("hudson_auth_user", payload);
      sessionStorage.setItem("hudson_hub_unlocked", "true");
      sessionStorage.setItem(STORAGE_KEY_AUTH_TIME, nowIso);
      if (profile.division) {
        sessionStorage.setItem("hudson_active_division", profile.division);
      }
    } catch (e) {
      console.warn("sessionStorage setItem warning:", e);
    }

    // 4. document.cookie (cross-page resilience)
    try {
      if (typeof document !== "undefined") {
        document.cookie = `hudson_hub_unlocked=true; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `hudson_hub_auth_user=${encodeURIComponent(payload)}; path=/; max-age=86400; SameSite=Lax`;
      }
    } catch (e) {
      console.warn("cookie set warning:", e);
    }

    // Clean up any legacy saved credentials with passwords
    try {
      localStorage.removeItem(STORAGE_KEY_SAVED_LOGIN);
      localStorage.removeItem("hudson_saved_login_credential_v1");
      localStorage.removeItem("hudson_saved_passwords_v1");
    } catch {}

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
    delete (window as any).__HUDSON_ACTIVE_USER__;
    delete (window as any).__HUDSON_HUB_UNLOCKED__;

    try {
      localStorage.removeItem(STORAGE_KEY_AUTH_USER);
      localStorage.removeItem("hudson_auth_user");
      localStorage.removeItem("hudson_hub_unlocked");
      localStorage.removeItem(STORAGE_KEY_AUTH_TIME);
      localStorage.removeItem(STORAGE_KEY_SAVED_LOGIN);
      localStorage.removeItem("hudson_saved_login_credential_v1");
    } catch {}

    try {
      sessionStorage.removeItem(STORAGE_KEY_AUTH_USER);
      sessionStorage.removeItem("hudson_auth_user");
      sessionStorage.removeItem("hudson_hub_unlocked");
      sessionStorage.removeItem(STORAGE_KEY_AUTH_TIME);
    } catch {}

    try {
      if (typeof document !== "undefined") {
        document.cookie = "hudson_hub_unlocked=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
        document.cookie = "hudson_hub_auth_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
      }
    } catch {}

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

export const REMUNERATION_AUTHORIZED_EMAILS = [
  "morgan.hales@hudsonhomes.com.au",
  "jesse.jenkins@hudsonhomes.com.au",
  "adrian.baxter@hudsonhomes.com.au",
];

export const REMUNERATION_AUTHORIZED_IDS = [
  "morgan-hales",
  "morgan_hales",
  "jesse-jenkins",
  "jesse_jenkins",
  "adrian-baxter",
  "adrian_baxter",
];

/**
 * Only Adrian, Jesse, and Morgan are permitted to view salary & commission features in the CRM.
 */
export function canViewRemuneration(user: StaffProfile | null | undefined): boolean {
  if (!user) return false;
  const email = (user.email || "").trim().toLowerCase();
  const id = (user.id || "").trim().toLowerCase();
  return (
    REMUNERATION_AUTHORIZED_EMAILS.includes(email) ||
    REMUNERATION_AUTHORIZED_IDS.includes(id)
  );
}
