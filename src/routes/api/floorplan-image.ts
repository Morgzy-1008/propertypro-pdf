import { createFileRoute } from "@tanstack/react-router";
import { requireStaff } from "@/lib/require-auth.server";

/** Only Hudson's own image hosts may be proxied. */
const ALLOWED_IMAGE_HOSTS = ["www.hudsonhomes.com.au", "hudsonhomes.com.au"];

function isAllowedImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Same-origin proxy for the published floorplan PNGs so the browser can read
 * their pixels on a canvas (cross-origin images taint the canvas and block the
 * whitespace trimming that makes plans fill the flyer frame).
 */
export const Route = createFileRoute("/api/floorplan-image")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const denied = await requireStaff(request);
        if (denied) return denied;

        const src = new URL(request.url).searchParams.get("url") ?? "";
        if (!isAllowedImageUrl(src)) {
          return new Response("Unsupported image source", { status: 400 });
        }

        const upstream = await fetch(src, {
          headers: {
            // The host 403s unknown clients.
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
              "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
            Accept: "image/avif,image/webp,image/png,image/*,*/*;q=0.8",
          },
        });
        if (!upstream.ok) return new Response("Could not fetch floorplan", { status: 502 });

        return new Response(await upstream.arrayBuffer(), {
          headers: {
            "Content-Type": upstream.headers.get("content-type") ?? "image/png",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
