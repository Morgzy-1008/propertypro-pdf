/**
 * Secure Credential & Password Management for Hudson Homes Staff
 * Handles salted SHA-256 password hashing, user registration, and authentication verification.
 */

const CREDENTIALS_STORE_KEY = "hudson_staff_credentials_v3";
const PASSWORD_SALT = "HudsonHomesEnterpriseSecuredSalt_2026_";

// Authorized Staff Whitelist Definitions
export const AUTHORIZED_EMAILS = [
  "morgan.hales@hudsonhomes.com.au",
  "jesse.jenkins@hudsonhomes.com.au",
  "adrian.baxter@hudsonhomes.com.au",
  "alyssa.hales@hudsonhomes.com.au",
  "alyssa.pippig@hudsonhomes.com.au",
  "alyssa.hales@hudsonhhomes.com.au",
  "shelley.lay@hudsonhomes.com.au",
  "ben.grill@hudsonhomes.com.au",
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
  // Alias mapping
  if (clean === "morgan@hudsonhomes.com.au") clean = "morgan.hales@hudsonhomes.com.au";
  if (clean === "jesse@hudsonhomes.com.au") clean = "jesse.jenkins@hudsonhomes.com.au";
  if (clean === "adrian@hudsonhomes.com.au") clean = "adrian.baxter@hudsonhomes.com.au";
  if (clean === "alyssa@hudsonhomes.com.au" || clean === "alyssa.pippig@hudsonhomes.com.au" || clean === "alyssa.hales@hudsonhhomes.com.au") {
    clean = "alyssa.hales@hudsonhomes.com.au";
  }
  if (clean === "shelley@hudsonhomes.com.au") clean = "shelley.lay@hudsonhomes.com.au";
  if (clean === "ben@hudsonhomes.com.au") clean = "ben.grill@hudsonhomes.com.au";
  return clean;
}

/**
 * Checks if an email is strictly part of the authorized Hudson Homes staff members.
 */
export function isAuthorizedStaffMember(email: string): boolean {
  const norm = normalizeStaffEmail(email);
  return (
    norm === "morgan.hales@hudsonhomes.com.au" ||
    norm === "jesse.jenkins@hudsonhomes.com.au" ||
    norm === "adrian.baxter@hudsonhomes.com.au" ||
    norm === "alyssa.hales@hudsonhomes.com.au" ||
    norm === "shelley.lay@hudsonhomes.com.au" ||
    norm === "ben.grill@hudsonhomes.com.au"
  );
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

function getAllCredentials(): Record<string, StoredCredential> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CREDENTIALS_STORE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveAllCredentials(creds: Record<string, StoredCredential>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CREDENTIALS_STORE_KEY, JSON.stringify(creds));
  } catch (e) {
    console.error("Failed to save credentials store:", e);
  }
}

/**
 * Checks if a user has already created their unique password.
 */
export function hasUserConfiguredPassword(email: string): boolean {
  const norm = normalizeStaffEmail(email);
  const creds = getAllCredentials();
  return !!creds[norm]?.passwordSet && !!creds[norm]?.passwordHash;
}

/**
 * Sets a new unique password for an authorized staff member.
 */
export async function setUserPassword(email: string, plaintext: string): Promise<boolean> {
  const norm = normalizeStaffEmail(email);
  if (!isAuthorizedStaffMember(norm)) {
    throw new Error("Only authorized staff members (Jesse, Alyssa, Adrian, Morgan, Shelley) may create an account.");
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
 */
export async function verifyUserPassword(email: string, plaintext: string): Promise<boolean> {
  const norm = normalizeStaffEmail(email);
  if (!isAuthorizedStaffMember(norm)) {
    return false;
  }
  const creds = getAllCredentials();
  const userCred = creds[norm];
  if (!userCred || !userCred.passwordHash) {
    return false;
  }

  const computedHash = await hashPassword(plaintext);
  return computedHash === userCred.passwordHash;
}

/**
 * Resets/clears all legacy saved passwords from previous sessions.
 */
export function purgeLegacyCredentials(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("hudson_saved_login_credential_v1");
    localStorage.removeItem("hudson_saved_login_credential_v2");
    localStorage.removeItem("hudson_saved_passwords_v1");
    localStorage.removeItem("hudson_auth_profiles");
  } catch {}
}

// Purge legacy on module load
if (typeof window !== "undefined") {
  purgeLegacyCredentials();
}
