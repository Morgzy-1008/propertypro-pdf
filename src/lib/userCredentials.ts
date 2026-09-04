/**
 * Secure Credential & Password Management for Hudson Homes Staff
 * Handles salted SHA-256 password hashing, user registration, and authentication verification.
 */

const CREDENTIALS_STORE_KEY = "hudson_staff_credentials_v3";
const PASSWORD_SALT = "HudsonHomesEnterpriseSecuredSalt_2026_";

// Previous staff logins who already had passwords configured from earlier releases.
// These staff members should NEVER be prompted to create a new password.
export const PREV_STAFF_EMAILS = [
  "morgan.hales@hudsonhomes.com.au",
  "jesse.jenkins@hudsonhomes.com.au",
  "adrian.baxter@hudsonhomes.com.au",
  "alyssa.hales@hudsonhomes.com.au",
  "alyssa.pippig@hudsonhomes.com.au",
  "alyssa.hales@hudsonhhomes.com.au",
  "shelley.lay@hudsonhomes.com.au",
  "ben.grill@hudsonhomes.com.au",
];

// New NSW New Home Sales Consultants.
// Only these new consultants need to be prompted to create a password on their initial login.
export const NEW_STAFF_EMAILS = [
  "gary.rees@hudsonhomes.com.au",
  "steve.silsar@hudsonhomes.com.au",
  "christine.hunt@hudsonhomes.com.au",
  "aaron.martin@hudsonhomes.com.au",
];

// Complete Authorized Staff Whitelist
export const AUTHORIZED_EMAILS = [
  ...PREV_STAFF_EMAILS,
  ...NEW_STAFF_EMAILS,
];

export interface StoredCredential {
  email: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
  passwordSet: boolean;
}

/**
 * Normalizes email strings to lowercase trimmed standard format.
 */
export function normalizeStaffEmail(email?: string | null): string {
  if (!email) return "";
  let clean = email.trim().toLowerCase();

  // If user entered only their username or handle, append @hudsonhomes.com.au
  if (!clean.includes("@")) {
    clean = `${clean}@hudsonhomes.com.au`;
  }

  // Alias mapping
  if (clean === "morgzy@hudsonhomes.com.au" || clean === "morgan@hudsonhomes.com.au") {
    clean = "morgan.hales@hudsonhomes.com.au";
  }
  if (clean === "jesse@hudsonhomes.com.au") clean = "jesse.jenkins@hudsonhomes.com.au";
  if (clean === "adrian@hudsonhomes.com.au") clean = "adrian.baxter@hudsonhomes.com.au";
  if (
    clean === "alyssa@hudsonhomes.com.au" ||
    clean === "alyssa.pippig@hudsonhomes.com.au" ||
    clean === "alyssa.hales@hudsonhhomes.com.au"
  ) {
    clean = "alyssa.hales@hudsonhomes.com.au";
  }
  if (clean === "shelley@hudsonhomes.com.au") clean = "shelley.lay@hudsonhomes.com.au";
  if (clean === "ben@hudsonhomes.com.au") clean = "ben.grill@hudsonhomes.com.au";
  if (clean === "christine@hudsonhomes.com.au") clean = "christine.hunt@hudsonhomes.com.au";
  if (clean === "gary@hudsonhomes.com.au") clean = "gary.rees@hudsonhomes.com.au";
  if (clean === "steve@hudsonhomes.com.au") clean = "steve.silsar@hudsonhomes.com.au";
  if (clean === "aaron@hudsonhomes.com.au") clean = "aaron.martin@hudsonhomes.com.au";
  return clean;
}

export function isPrevStaffMember(email: string): boolean {
  const norm = normalizeStaffEmail(email);
  return PREV_STAFF_EMAILS.some((e) => normalizeStaffEmail(e) === norm);
}

export function isNewStaffMember(email: string): boolean {
  const norm = normalizeStaffEmail(email);
  return NEW_STAFF_EMAILS.some((e) => normalizeStaffEmail(e) === norm);
}

/**
 * Checks if an email is strictly part of the authorized Hudson Homes staff members.
 */
export function isAuthorizedStaffMember(email: string): boolean {
  const norm = normalizeStaffEmail(email);
  return AUTHORIZED_EMAILS.some((e) => normalizeStaffEmail(e) === norm);
}

/**
 * Computes a secure SHA-256 hex digest of the password with salt.
 */
export async function hashPassword(password: string): Promise<string> {
  const salted = `${PASSWORD_SALT}${password}`;
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const msgBuffer = new TextEncoder().encode(salted);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback simple hash for non-crypto environments
  let hash = 0;
  for (let i = 0; i < salted.length; i++) {
    const char = salted.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `fallback_hash_${Math.abs(hash)}`;
}

export function getAllCredentials(): Record<string, StoredCredential> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CREDENTIALS_STORE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveAllCredentials(creds: Record<string, StoredCredential>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CREDENTIALS_STORE_KEY, JSON.stringify(creds));
  } catch (e) {
    console.error("Failed to save credentials store:", e);
  }
}

/**
 * Checks if a user has already created their unique password.
 * All previous staff logins already had passwords and should NEVER be prompted
 * to create a new password.
 * Only new NSW consultants who haven't yet set a password return false.
 */
export function hasUserConfiguredPassword(email: string): boolean {
  const norm = normalizeStaffEmail(email);

  // Previous logins NEVER have to make a new password!
  if (isPrevStaffMember(norm)) {
    return true;
  }

  // For new consultants, check if they have configured a unique password
  const creds = getAllCredentials();
  return !!creds[norm]?.passwordSet && !!creds[norm]?.passwordHash;
}

/**
 * Sets a new unique password for an authorized staff member.
 */
export async function setUserPassword(email: string, plaintext: string): Promise<boolean> {
  const norm = normalizeStaffEmail(email);
  if (!isAuthorizedStaffMember(norm)) {
    throw new Error("Only authorized staff members may create an account.");
  }
  if (!plaintext || plaintext.length < 5) {
    throw new Error("Password must be at least 5 characters long.");
  }

  const hash = await hashPassword(plaintext);
  const creds = getAllCredentials();
  creds[norm] = {
    email: norm,
    passwordHash: hash,
    createdAt: creds[norm]?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    passwordSet: true,
  };
  saveAllCredentials(creds);
  return true;
}

/**
 * Verifies if the provided password matches the user's stored password.
 * Accepts:
 * 1. User's custom configured password hash (if set in credentials store)
 * 2. Standard Hudson Homes enterprise passwords ('Hudson2026!' or 'StoneBenchTop99') for staff logins
 */
export async function verifyUserPassword(email: string, plaintext: string): Promise<boolean> {
  const norm = normalizeStaffEmail(email);
  if (!isAuthorizedStaffMember(norm)) {
    return false;
  }

  const cleanPlaintext = (plaintext || "").trim();
  if (!cleanPlaintext) return false;

  const creds = getAllCredentials();
  const userCred = creds[norm];

  // 1. Check custom configured password hash if user set one
  if (userCred && userCred.passwordHash) {
    const computedHash = await hashPassword(cleanPlaintext);
    if (computedHash === userCred.passwordHash) {
      return true;
    }
  }

  // 2. Standard Hudson Homes enterprise passwords for staff logins
  const lowerPlain = cleanPlaintext.toLowerCase();
  if (
    cleanPlaintext === "Hudson2026!" ||
    cleanPlaintext === "StoneBenchTop99" ||
    lowerPlain === "hudson2026!" ||
    lowerPlain === "stonebenchtop99"
  ) {
    // Auto-populate into creds store if not present
    if (!userCred || !userCred.passwordHash) {
      try {
        const hash = await hashPassword(cleanPlaintext);
        creds[norm] = {
          email: norm,
          passwordHash: hash,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          passwordSet: true,
        };
        saveAllCredentials(creds);
      } catch {}
    }
    return true;
  }

  return false;
}

/**
 * Resets/clears old legacy saved passwords from obsolete sessions.
 */
export function purgeLegacyCredentials(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("hudson_saved_login_credential_v1");
    localStorage.removeItem("hudson_saved_passwords_v1");
    localStorage.removeItem("hudson_auth_profiles");
  } catch {}
}

// Purge legacy on module load
if (typeof window !== "undefined") {
  purgeLegacyCredentials();
}
