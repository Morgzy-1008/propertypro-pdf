## Goal

Facades should show the house as large as possible inside the flyer frame — whole roof and garage visible — with no AI-invented landscaping stretched out to the sides.

## Approach

Retire the AI "widening" step for facades and replace it with a deterministic trim-and-fit:

1. **Stop calling the widener.** In `FlyerForm.tsx`, selecting a facade sets the library render directly (no `widenFacade` call, no spinner, no uplift change). The `/api/widen-facade` route and cached renders stay in place but are no longer used by the flyer, so nothing breaks for already-cached URLs.

2. **Auto-trim the render.** Add a `prepareFacade` helper in `fileToImage.ts` mirroring the floorplan trimming that already works: fetch the render through a same-origin proxy, scan pixels, crop away the uniform background margin (sky/grass/white padding) so the bounding box is the house plus a small breathing margin (~2%). Result is cached per facade URL.

3. **Fit the trimmed house.** In `FlyerTemplates.tsx`, the `Facade` component drops the widened/non-widened branch and always renders the trimmed image with `object-contain`, centred on a neutral panel, so the house scales up to whichever edge it hits first and is never clipped. Because the padding was trimmed, the house now visually fills far more of the frame than today.

4. **Aspect handling.** Facade frames in the Express, Showcase and House Only templates keep their current heights; a subtly tinted panel behind the image (rather than harsh white) hides any leftover letterboxing on unusually tall or narrow renders.

## Technical notes

- Trimming reuses the existing `cropToContent`/pixel-scan code path already proven on floorplans, with a background-tolerance threshold tuned for photographic renders (sample the four corners, flood the margin while pixels stay within tolerance of the corner colour) instead of the ink-density logic used for line art.
- Proxy: the facade CDN needs the same-origin fetch treatment used by `/api/floorplan-image` so canvas pixel access isn't CORS-blocked; the existing `/api/facade-image/$id` route is extended (or a sibling added) to proxy Hudson-hosted facade URLs, keeping the staff-auth guard and host allowlist.
- Facade upgrade pricing, library filtering and sorting are untouched.
