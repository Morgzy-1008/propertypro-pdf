/**
 * UUID Utilities for Supabase PostgreSQL UUID Columns
 * Ensures all lot, package, and entity IDs strictly comply with RFC 4122 v4 UUID format.
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Returns true if string is a strictly valid standard UUID */
export function isValidUuid(id?: string | null): boolean {
  if (!id || typeof id !== "string") return false;
  return UUID_REGEX.test(id.trim());
}

/**
 * Ensures any string is returned as a valid UUID.
 * - If already a valid UUID, returns it normalized in lowercase.
 * - If a non-UUID string (e.g. "lot-imp-1788669530047-13-ng41"), deterministically
 *   hashes it into a valid RFC 4122 v4 UUID so the same input always yields the same UUID.
 * - If empty or null, returns null.
 */
export function toValidUuid(input?: string | null): string | null {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (UUID_REGEX.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  // Deterministically hash any arbitrary string into a valid RFC 4122 v4 UUID
  let h1 = 0xdeadbeef;
  let h2 = 0x41c64e6d;
  let h3 = 0x12345678;
  let h4 = 0x87654321;

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 3812015801);
    h4 = Math.imul(h4 ^ ch, 2718281829);
  }

  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, "0");
  const rawHex = (hex(h1) + hex(h2) + hex(h3) + hex(h4)).slice(0, 32);

  // RFC 4122 v4 format: 8-4-4-4-12 with version 4 and variant a
  const p1 = rawHex.slice(0, 8);
  const p2 = rawHex.slice(8, 12);
  const p3 = "4" + rawHex.slice(13, 16);
  const p4 = "a" + rawHex.slice(17, 20);
  const p5 = rawHex.slice(20, 32);

  return `${p1}-${p2}-${p3}-${p4}-${p5}`.toLowerCase();
}

/** Generate a standard v4 UUID using crypto.randomUUID or fallback */
export function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
