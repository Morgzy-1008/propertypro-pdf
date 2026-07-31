/** Hudson staff who may hold a Package Studio account. Enforced server-side by
 * the approved_staff table (RLS) and the signup trigger on new accounts — this
 * list only drives friendly messaging in the sign-in form. */
export const ALLOWED_EMAILS = [
  "morgan.hales@hudsonhomes.com.au",
  "alyssa.pippig@hudsonhomes.com.au",
  "shelley.lay@hudsonhomes.com.au",
  "jesse.jenkins@hudsonhomes.com.au",
  "adrian.baxter@hudsonhomes.com.au",
];

// NOTE: never put a password (shared or otherwise) in this file. Client code is
// public — every staff member sets their own private password at sign-up.

/** The old shared password. It is already public, so it is only kept here to
 * detect and force a rotation the moment someone signs in with it. */
const LEGACY_SHARED_PASSWORD = "StoneBenchTop99";

export function isLegacySharedPassword(password: string) {
  return password === LEGACY_SHARED_PASSWORD;
}



/** Anyone else must request access from the account owner. */
export const ACCESS_REQUEST_EMAIL = "morgan.hales@hudsonhomes.com.au";

export function isAllowedEmail(email: string) {
  return ALLOWED_EMAILS.includes(email.trim().toLowerCase());
}
