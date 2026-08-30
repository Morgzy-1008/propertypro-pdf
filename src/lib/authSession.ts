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
    id: "morgan-hales",
    name: "Morgan Hales",
    email: "morgan.hales@hudsonhomes.com.au",
    phone: "0417 571 864",
    title: "New Home Consultant",
    displayCentre: "Flagstone Display Home",
    role: "admin",
    avatarInitials: "MH",
    accentColor: "from-amber-500 to-orange-600",
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
    id: "bernie-estimating",
    name: "Bernie (Estimating)",
    email: "estimating@hudsonhomes.com.au",
    phone: "1300 246 700",
    title: "Estimating & Tender Manager",
    displayCentre: "Queensland Head Office",
    role: "estimator",
    avatarInitials: "BE",
    accentColor: "from-purple-500 to-indigo-600",
  },
];

const STORAGE_KEY_AUTH_USER = "hudson_hub_auth_user";
const STORAGE_KEY_SAVED_LOGIN = "hudson_saved_login_credential_v1";

const listeners = new Set<(user: StaffProfile | null) => void>();

export function getActiveStaffUser(): StaffProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUTH_USER) || localStorage.getItem("hudson_auth_user");
    if (!raw) {
      // Check if saved credential exists for auto-restore
      const savedRaw = localStorage.getItem(STORAGE_KEY_SAVED_LOGIN);
      if (savedRaw) {
        const saved = JSON.parse(savedRaw);
        if (saved && saved.email) {
          const match = findStaffProfileByEmail(saved.email);
          if (match) {
            localStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(match));
            return match;
          }
        }
      }
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.email) return null;

    // Check if matches a known staff profile to guarantee updated metadata
    const known = findStaffProfileByEmail(parsed.email);
    if (known) {
      return { ...known, ...parsed };
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
  return KNOWN_STAFF_PROFILES.find((p) => p.email.toLowerCase() === clean);
}

export function setActiveStaffUser(profile: StaffProfile, remember = true): void {
  if (typeof window === "undefined") return;
  try {
    const payload = JSON.stringify(profile);
    localStorage.setItem(STORAGE_KEY_AUTH_USER, payload);
    localStorage.setItem("hudson_auth_user", payload);
    localStorage.setItem("hudson_hub_unlocked", "true");

    if (remember) {
      localStorage.setItem(
        STORAGE_KEY_SAVED_LOGIN,
        JSON.stringify({ email: profile.email, name: profile.name, savedAt: new Date().toISOString() })
      );
    }

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

export function clearActiveStaffUser(forgetSaved = false): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY_AUTH_USER);
    localStorage.removeItem("hudson_auth_user");
    localStorage.removeItem("hudson_hub_unlocked");
    if (forgetSaved) {
      localStorage.removeItem(STORAGE_KEY_SAVED_LOGIN);
    }
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
