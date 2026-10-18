/**
 * Customer Link Security & Verification Engine
 * 
 * Generates and verifies tamper-evident, sandboxed customer access tokens
 * for the private client floorplan library.
 */

const CLIENT_GALLERY_SECRET = "hud_hudson_client_gallery_v2026";
export const CLIENT_SESSION_STORAGE_KEY = "hudson_client_gallery_unlocked";

export interface CustomerLinkConfig {
  division: "QLD" | "NSW";
  consultantId?: string;
  preselectedDesign?: string;
  showPricing: boolean;
  expiresInDays?: number;
}

export interface VerifiedCustomerSession {
  valid: boolean;
  division: "QLD" | "NSW";
  consultantId?: string;
  preselectedDesign?: string;
  showPricing: boolean;
  expiresAt?: number;
  reason?: string;
}

// Lightweight checksum generator
function computeChecksum(str: string): string {
  let hash = 5381;
  const combined = str + CLIENT_GALLERY_SECRET;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) + hash) + combined.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// Base64Url encode/decode safe for URLs
function base64UrlEncode(str: string): string {
  try {
    const b64 = btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch {
    return "";
  }
}

function base64UrlDecode(str: string): string {
  try {
    let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const decoded = decodeURIComponent(
      Array.prototype.map
        .call(atob(b64), (c: string) => {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );
    return decoded;
  } catch {
    return "";
  }
}

/**
 * Generate a signed customer access token and full URL
 */
export function generateCustomerLink(
  config: CustomerLinkConfig,
  origin: string = typeof window !== "undefined" ? window.location.origin : ""
): { token: string; url: string } {
  const now = Date.now();
  const days = config.expiresInDays || 90;
  const expiresAt = now + days * 24 * 60 * 60 * 1000;

  const payload = {
    d: config.division,
    c: config.consultantId || "",
    des: config.preselectedDesign || "",
    p: config.showPricing !== false ? 1 : 0,
    exp: expiresAt,
    iat: now,
  };

  const payloadString = JSON.stringify(payload);
  const sig = computeChecksum(payloadString);
  const token = `${base64UrlEncode(payloadString)}.${sig}`;

  const params = new URLSearchParams();
  params.set("token", token);
  if (config.division) params.set("state", config.division);
  if (config.consultantId) params.set("c", config.consultantId);
  if (config.preselectedDesign) params.set("design", config.preselectedDesign);

  const url = `${origin}/floorplans?${params.toString()}`;
  return { token, url };
}

/**
 * Verify a customer token from URL parameters or session
 */
export function verifyCustomerToken(tokenString?: string | null): VerifiedCustomerSession {
  if (!tokenString) {
    // Check if session storage already holds a valid unlocked token
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem(CLIENT_SESSION_STORAGE_KEY);
      if (stored) {
        return verifyCustomerToken(stored);
      }
    }
    return {
      valid: false,
      division: "NSW",
      showPricing: true,
      reason: "No access token provided",
    };
  }

  const parts = tokenString.split(".");
  if (parts.length !== 2) {
    return {
      valid: false,
      division: "NSW",
      showPricing: true,
      reason: "Malformed access token",
    };
  }

  const [encodedPayload, providedSig] = parts;
  const payloadString = base64UrlDecode(encodedPayload);
  if (!payloadString) {
    return {
      valid: false,
      division: "NSW",
      showPricing: true,
      reason: "Invalid payload encoding",
    };
  }

  // Verify signature
  const expectedSig = computeChecksum(payloadString);
  if (providedSig !== expectedSig) {
    return {
      valid: false,
      division: "NSW",
      showPricing: true,
      reason: "Security signature verification failed",
    };
  }

  try {
    const data = JSON.parse(payloadString);

    // Check expiration
    if (data.exp && Date.now() > data.exp) {
      return {
        valid: false,
        division: data.d === "QLD" ? "QLD" : "NSW",
        showPricing: data.p === 1,
        reason: "Access token has expired",
      };
    }

    // Persist verified session
    if (typeof window !== "undefined") {
      sessionStorage.setItem(CLIENT_SESSION_STORAGE_KEY, tokenString);
    }

    return {
      valid: true,
      division: data.d === "QLD" ? "QLD" : "NSW",
      consultantId: data.c || undefined,
      preselectedDesign: data.des || undefined,
      showPricing: data.p !== 0,
      expiresAt: data.exp,
    };
  } catch {
    return {
      valid: false,
      division: "NSW",
      showPricing: true,
      reason: "Corrupted token payload",
    };
  }
}
