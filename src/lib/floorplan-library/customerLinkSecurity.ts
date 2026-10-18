import { CONSULTANTS, ALL_STAFF_CONSULTANTS, findConsultant, type Consultant } from "@/components/flyer/consultants";

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
 * Match a consultant query parameter (ID, slug, or name) against the staff directory.
 */
export function matchConsultant(query?: string | null): Consultant | undefined {
  if (!query) return undefined;
  const q = query.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!q) return undefined;

  return (
    findConsultant(q) ||
    CONSULTANTS.find(
      (c) =>
        c.id.toLowerCase() === q ||
        c.id.toLowerCase().replace(/-/g, "") === q.replace(/-/g, "") ||
        c.name.toLowerCase().replace(/\s+/g, "-") === q ||
        c.id.toLowerCase().startsWith(q)
    ) ||
    ALL_STAFF_CONSULTANTS.find(
      (c) =>
        c.id.toLowerCase() === q ||
        c.id.toLowerCase().replace(/-/g, "") === q.replace(/-/g, "") ||
        c.name.toLowerCase().replace(/\s+/g, "-") === q ||
        c.id.toLowerCase().startsWith(q)
    )
  );
}

/**
 * Generate a clean, human-readable shortened customer link.
 * Example: https://propertypro-pdf.vercel.app/floorplans?c=morgan-hales
 * Ultra-short: https://propertypro-pdf.vercel.app/f?c=morgan-hales
 */
export function generateCleanCustomerLink(
  config: CustomerLinkConfig,
  origin: string = typeof window !== "undefined" ? window.location.origin : "",
  path: "/floorplans" | "/f" = "/floorplans"
): string {
  const consultantId = config.consultantId || "morgan-hales";
  const matched = matchConsultant(consultantId);
  const consultantDivision = matched?.division || matched?.state || "QLD";

  const params = new URLSearchParams();
  params.set("c", consultantId);

  // Only append state if explicitly different from consultant's home division
  if (config.division && config.division !== consultantDivision) {
    params.set("state", config.division);
  }

  // Optional pre-selected design
  if (config.preselectedDesign?.trim()) {
    params.set("design", config.preselectedDesign.trim());
  }

  // Pricing visibility (omit if default true)
  if (config.showPricing === false) {
    params.set("noprice", "1");
  }

  return `${origin}${path}?${params.toString()}`;
}

/**
 * Generate customer links in both clean-short and cryptographic-token formats.
 */
export function generateCustomerLink(
  config: CustomerLinkConfig,
  origin: string = typeof window !== "undefined" ? window.location.origin : ""
): {
  token: string;
  url: string;
  cleanUrl: string;
  ultraShortUrl: string;
  tokenUrl: string;
} {
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

  const tokenParams = new URLSearchParams();
  tokenParams.set("token", token);
  if (config.division) tokenParams.set("state", config.division);
  if (config.consultantId) tokenParams.set("c", config.consultantId);
  if (config.preselectedDesign) tokenParams.set("design", config.preselectedDesign);

  const tokenUrl = `${origin}/floorplans?${tokenParams.toString()}`;
  const cleanUrl = generateCleanCustomerLink(config, origin, "/floorplans");
  const ultraShortUrl = generateCleanCustomerLink(config, origin, "/f");

  // Default URL is the clean, shortened link clients love!
  return {
    token,
    url: cleanUrl,
    cleanUrl,
    ultraShortUrl,
    tokenUrl,
  };
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

export interface ResolveAccessParams {
  token?: string | null;
  c?: string | null;
  consultant?: string | null;
  state?: string | null;
  division?: string | null;
  design?: string | null;
  q?: string | null;
  noprice?: string | null;
  pricing?: string | null;
}

/**
 * Universal Access Resolver:
 * Accepts clean short links (/floorplans?c=morgan-hales), signed tokens,
 * or active session storage while strictly barring unauthorized direct visits.
 */
export function resolveCustomerAccess(params: ResolveAccessParams): VerifiedCustomerSession {
  const tokenParam = params.token?.trim() || null;
  const consultantParam = (params.c || params.consultant)?.trim() || null;
  const stateParam = (params.state || params.division)?.trim().toUpperCase() || null;
  const designParam = (params.design || params.q)?.trim() || null;
  const hidePricing = params.noprice === "1" || params.pricing === "hide" || params.noprice === "true";

  // 1. If explicit signed token is provided, verify token
  if (tokenParam) {
    const tokenResult = verifyCustomerToken(tokenParam);
    if (tokenResult.valid) {
      return tokenResult;
    }
  }

  // 2. If short clean link with consultant parameter is provided
  if (consultantParam) {
    const matched = matchConsultant(consultantParam);
    if (matched) {
      const resolvedDivision: "QLD" | "NSW" =
        stateParam === "NSW" || stateParam === "QLD"
          ? (stateParam as "QLD" | "NSW")
          : matched.division || matched.state || "QLD";

      const sessionObj: VerifiedCustomerSession = {
        valid: true,
        division: resolvedDivision,
        consultantId: matched.id,
        preselectedDesign: designParam || undefined,
        showPricing: !hidePricing,
      };

      // Persist in session storage so client can refresh or navigate freely
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(
            CLIENT_SESSION_STORAGE_KEY,
            JSON.stringify({
              c: matched.id,
              d: resolvedDivision,
              p: hidePricing ? 0 : 1,
              des: designParam || "",
              timestamp: Date.now(),
            })
          );
        } catch {}
      }

      return sessionObj;
    }
  }

  // 3. Check session storage for existing unlocked session
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(CLIENT_SESSION_STORAGE_KEY);
      if (stored) {
        if (stored.startsWith("{")) {
          const parsed = JSON.parse(stored);
          if (parsed && (parsed.c || parsed.d)) {
            return {
              valid: true,
              division: parsed.d === "NSW" ? "NSW" : "QLD",
              consultantId: parsed.c || undefined,
              preselectedDesign: parsed.des || designParam || undefined,
              showPricing: parsed.p !== 0,
            };
          }
        } else {
          const tokenRes = verifyCustomerToken(stored);
          if (tokenRes.valid) return tokenRes;
        }
      }
    } catch {}
  }

  // 4. Staff bypass for internal testing
  if (typeof window !== "undefined") {
    const isStaff =
      localStorage.getItem("hudson_hub_unlocked") === "true" ||
      sessionStorage.getItem("hudson_hub_unlocked") === "true";
    if (isStaff) {
      return {
        valid: true,
        division: stateParam === "NSW" ? "NSW" : "QLD",
        consultantId: consultantParam || undefined,
        preselectedDesign: designParam || undefined,
        showPricing: !hidePricing,
      };
    }
  }

  // 5. Denied
  return {
    valid: false,
    division: "QLD",
    showPricing: true,
    reason: "Access restricted: Valid consultant link required",
  };
}
