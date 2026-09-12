import type { FullQuote, QuoteSelectedLineItem } from "./quoteTypes";
import { calculateQuotePricing } from "./quoteEngine";

/**
 * Compacts and encodes a FullQuote into an ultra-compact URL-safe base64 string
 * using standard gzip CompressionStream.
 */
export async function encodeQuoteForClientLink(quote: FullQuote): Promise<string> {
  try {
    // Only include line items that are either included or marked client-selectable
    const compactLineItems = (quote.lineItems || [])
      .filter((item) => item.isIncluded || item.isClientSelectable || item.clientSelected)
      .map((item) => ({
        id: item.id,
        cat: item.category,
        n: item.name,
        d: item.description,
        u: item.unitType,
        r: item.unitRate,
        q: item.quantity,
        s: item.subtotal,
        inc: item.isIncluded,
        opt: !!item.isClientSelectable,
        sel: item.clientSelected !== false,
        dw: item.dwellingId,
      }));

    const compactPayload = {
      v: 2, // schema version
      id: quote.id,
      qn: quote.quoteNumber,
      ca: quote.createdAt,
      ua: quote.updatedAt,
      st: quote.status,
      c: quote.client,
      d: quote.design,
      sc: quote.siteConditions,
      li: compactLineItems,
      cn: quote.clientNotes || "",
    };

    const jsonStr = JSON.stringify(compactPayload);

    // Native browser/node CompressionStream
    if (typeof CompressionStream !== "undefined") {
      const cs = new CompressionStream("gzip");
      const stream = new Blob([jsonStr]).stream().pipeThrough(cs);
      const response = new Response(stream);
      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    }

    // Fallback: standard base64url if CompressionStream is unsupported
    const utf8Bytes = new TextEncoder().encode(jsonStr);
    let binary = "";
    for (let i = 0; i < utf8Bytes.length; i++) {
      binary += String.fromCharCode(utf8Bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  } catch (err) {
    console.error("Failed to encode quote for client link:", err);
    return "";
  }
}

/**
 * Decodes and hydrates a FullQuote from a compact URL-safe base64 string.
 */
export async function decodeQuoteFromClientLink(encoded: string): Promise<FullQuote | null> {
  try {
    if (!encoded || encoded.trim().length === 0) return null;

    let b64 = encoded.trim().replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";

    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    let jsonStr = "";

    // Check if gzipped (magic bytes 0x1f, 0x8b)
    if (bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b && typeof DecompressionStream !== "undefined") {
      const ds = new DecompressionStream("gzip");
      const stream = new Blob([bytes]).stream().pipeThrough(ds);
      const response = new Response(stream);
      jsonStr = await response.text();
    } else {
      jsonStr = new TextDecoder().decode(bytes);
    }

    const parsed = JSON.parse(jsonStr);
    if (!parsed || (!parsed.id && !parsed.qn)) {
      return null;
    }

    // Check if version 2 compact schema
    if (parsed.v === 2) {
      const restoredLineItems: QuoteSelectedLineItem[] = (parsed.li || []).map((it: any) => ({
        id: it.id,
        category: it.cat || "structural",
        name: it.n,
        description: it.d || "",
        unitType: it.u || "fixed",
        unitRate: it.r || 0,
        quantity: it.q || 1,
        subtotal: it.s !== undefined ? it.s : (it.q || 1) * (it.r || 0),
        isIncluded: it.inc ?? true,
        isClientSelectable: !!it.opt,
        clientSelected: it.sel ?? true,
        dwellingId: it.dw,
      }));

      const design = parsed.d;
      const site = parsed.sc;
      const pricing = calculateQuotePricing(design, site, restoredLineItems, parsed.c?.depositAmount);

      return {
        id: parsed.id,
        quoteNumber: parsed.qn || parsed.id,
        createdAt: parsed.ca || new Date().toISOString(),
        updatedAt: parsed.ua || new Date().toISOString(),
        status: parsed.st || "presented",
        client: parsed.c,
        design,
        siteConditions: site,
        lineItems: restoredLineItems,
        pricing,
        clientNotes: parsed.cn || "",
      };
    }

    // Legacy uncompressed full quote structure
    if (parsed.client && parsed.design) {
      const full = parsed as FullQuote;
      full.pricing = calculateQuotePricing(
        full.design,
        full.siteConditions,
        full.lineItems,
        full.client?.depositAmount,
      );
      return full;
    }

    return null;
  } catch (err) {
    console.error("Failed to decode quote from client link:", err);
    return null;
  }
}
