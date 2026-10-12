import { useEffect, useMemo, useRef, useState, useDeferredValue } from "react";
import { Search, Upload, Check, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  BUILT_IN_FACADES,
  loadCustomFacades,
  saveCustomFacades,
  searchFacades,
  type FacadeItem,
} from "./facadeLibrary";
import {
  facadeCategory,
  facadeGarage,
  facadePriceForDesign,
  isSingleGarageDesign,
  type FacadeGarage,
  type FacadeStorey,
} from "./facadePricing";
import { getIdbThumbnail, getIdbThumbnails, saveIdbThumbnail } from "./idbFacadeCache";
import { fileToImageDataUrl } from "./fileToImage";
import { formatAud } from "@/lib/pricing";
import { useTheme } from "@/lib/theme";

const CATEGORIES: { id: FacadeStorey | "uploaded" | "all"; label: string }[] = [
  { id: "single", label: "Single Storey" },
  { id: "double", label: "Double Storey" },
  { id: "split", label: "Split Level" },
  { id: "acreage", label: "Acreage / Ranch" },
  { id: "all", label: "All Facades" },
  { id: "uploaded", label: "Uploaded" },
];

type SortId = "alpha" | "price-asc" | "price-desc";

const SORTS: { id: SortId; label: string }[] = [
  { id: "alpha", label: "A–Z" },
  { id: "price-asc", label: "Price ↑" },
  { id: "price-desc", label: "Price ↓" },
];

function facadeBelongsToCategory(
  f: FacadeItem,
  category: FacadeStorey | "uploaded" | "design" | "all",
): boolean {
  if (category === "uploaded") return f.range === "Uploaded";
  if (f.range === "Uploaded") return false;
  if (category === "all") return true;

  const range = (f.range || "").toLowerCase();
  const tags = f.tags || [];
  const name = (f.name || "").toLowerCase();

  // Wisteria / Duplex / Dual-Occupancy specific facades belong ONLY to the design gallery when Wisteria is selected
  const isDuplexWisteria = tags.includes("duplex") || tags.includes("wisteria") || /duplex|dual[-\s]?occupancy/i.test(range);
  if (isDuplexWisteria) {
    return category === "design";
  }

  if (category === "design") return true;

  // Acreage / Ranch facades belong STRICTLY to the Acreage category tab, NEVER to standard Single Storey or Double Storey!
  const isAcreage = tags.includes("acreage") || /mulberry|ranch|acreage/i.test(range) || /mulberry|ranch|acreage/i.test(name);
  if (isAcreage) {
    return category === "acreage";
  }

  if (category === "acreage") return false;

  if (category === "split") {
    return tags.includes("split") || /split/i.test(range);
  }

  if (category === "double") {
    const isExplicitSingle =
      f.range === "Single Storey" ||
      f.range === "Single Storey (Narrow Lot)" ||
      tags.includes("single") ||
      /single[-\s]?storey|\bss\b/i.test(range) ||
      /\(single[-\s]?storey\)/i.test(name);
    if (isExplicitSingle && !/double/i.test(range) && !tags.includes("double")) {
      return false;
    }
    return f.range === "Double Storey" || f.range === "Narrow Double Storey" || tags.includes("double") || /double/i.test(range);
  }

  if (category === "single") {
    return (
      f.range === "Single Storey" ||
      f.range === "Single Storey (Narrow Lot)" ||
      tags.includes("single") ||
      /single[-\s]?storey/i.test(range)
    );
  }

  return true;
}

const INITIAL_BATCH = 12;
const BATCH_INCREMENT = 12;

// In-memory cache for synchronous 0ms thumbnail loading across dialog opens
const memoryThumbnailCache = new Map<string, string>();
const thumbnailListeners = new Map<string, Set<(src: string) => void>>();
const inFlightThumbnailPromises = new Map<string, Promise<string>>();

function subscribeThumbnail(url: string, callback: (src: string) => void): () => void {
  if (!thumbnailListeners.has(url)) {
    thumbnailListeners.set(url, new Set());
  }
  thumbnailListeners.get(url)!.add(callback);
  return () => {
    thumbnailListeners.get(url)?.delete(callback);
    if (thumbnailListeners.get(url)?.size === 0) {
      thumbnailListeners.delete(url);
    }
  };
}

function notifyThumbnail(url: string, src: string) {
  memoryThumbnailCache.set(url, src);
  const listeners = thumbnailListeners.get(url);
  if (listeners) {
    listeners.forEach((cb) => cb(src));
  }
}

// Concurrency-limited background thumbnail task queue (max 2 jobs concurrently)
let activeThumbnailJobs = 0;
const thumbnailJobQueue: Array<() => void> = [];

function runWithConcurrencyLimit<T>(task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const execute = () => {
      activeThumbnailJobs++;
      task()
        .then(resolve)
        .catch(reject)
        .finally(() => {
          activeThumbnailJobs--;
          if (thumbnailJobQueue.length > 0) {
            const next = thumbnailJobQueue.shift();
            next?.();
          }
        });
    };
    if (activeThumbnailJobs < 2) {
      execute();
    } else {
      thumbnailJobQueue.push(execute);
    }
  });
}

/**
 * Dynamically downsizes full-resolution images into a crisp 15KB WebP thumbnail
 * directly in the browser via background ImageBitmap + Canvas and caches in IndexedDB and RAM.
 */
async function generateThumbnailOffThread(url: string): Promise<string> {
  // Yield to main thread first so UI interaction stays 60fps
  await new Promise((r) => setTimeout(r, 0));

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const blob = await res.blob();

    // Modern off-main-thread image decoding and downsampling
    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(blob, {
        resizeWidth: 420,
        resizeQuality: "medium",
      });
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close();
        const thumbUrl = canvas.toDataURL("image/webp", 0.82);
        return thumbUrl;
      }
      bitmap.close();
    }
  } catch {
    // Fallback to standard Image below
  }

  return new Promise<string>((resolve) => {
    if (typeof window === "undefined") return resolve(url);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const targetWidth = 420;
        const targetHeight =
          Math.round((img.naturalHeight / (img.naturalWidth || 1)) * targetWidth) || 164;
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d", { alpha: false });
        if (ctx) {
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          const thumbUrl = canvas.toDataURL("image/webp", 0.82);
          resolve(thumbUrl);
          return;
        }
      } catch {}
      resolve(url);
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });
}

async function getOrGenerateThumbnail(url: string): Promise<string> {
  if (memoryThumbnailCache.has(url)) {
    return memoryThumbnailCache.get(url)!;
  }
  if (inFlightThumbnailPromises.has(url)) {
    return inFlightThumbnailPromises.get(url)!;
  }

  const promise = (async () => {
    // 1. Check IndexedDB
    try {
      const cached = await getIdbThumbnail(url);
      if (cached) {
        notifyThumbnail(url, cached);
        return cached;
      }
    } catch {}

    // 2. Generate thumbnail dynamically via ImageBitmap + Canvas under concurrency limit
    return runWithConcurrencyLimit(async () => {
      if (memoryThumbnailCache.has(url)) {
        return memoryThumbnailCache.get(url)!;
      }
      const thumbUrl = await generateThumbnailOffThread(url);
      notifyThumbnail(url, thumbUrl);
      if (thumbUrl !== url) {
        saveIdbThumbnail(url, thumbUrl).catch(() => {});
      }
      return thumbUrl;
    });
  })();

  inFlightThumbnailPromises.set(url, promise);
  try {
    const result = await promise;
    return result;
  } finally {
    inFlightThumbnailPromises.delete(url);
  }
}

function useFacadeThumbnail(url: string): string | null {
  const [thumbSrc, setThumbSrc] = useState<string | null>(
    () => memoryThumbnailCache.get(url) || null
  );

  useEffect(() => {
    if (memoryThumbnailCache.has(url)) {
      setThumbSrc(memoryThumbnailCache.get(url)!);
      return;
    }

    const unsubscribe = subscribeThumbnail(url, (src) => {
      setThumbSrc(src);
    });

    getOrGenerateThumbnail(url).catch(() => {});

    return unsubscribe;
  }, [url]);

  return thumbSrc;
}

function FacadeCardThumbnail({
  f,
  isHighPriority,
  isSingleGarage,
  showGarageBadge,
}: {
  f: FacadeItem;
  isHighPriority: boolean;
  isSingleGarage?: boolean;
  showGarageBadge?: boolean;
}) {
  const thumbSrc = useFacadeThumbnail(f.url);
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className="relative aspect-[210/82] w-full bg-slate-900/60 overflow-hidden"
      style={{ contentVisibility: "auto", containIntrinsicSize: "240px 95px" }}
    >
      {thumbSrc ? (
        <img
          src={thumbSrc}
          alt={f.name}
          loading={isHighPriority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={isHighPriority ? "high" : "auto"}
          onLoad={() => setLoaded(true)}
          className={`h-full w-full object-cover object-center transition-opacity duration-200 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800/40 animate-pulse">
          <div className="h-4 w-4 rounded-full border border-brand-gold/40 border-t-brand-gold animate-spin opacity-40" />
        </div>
      )}
      {f.range === "Narrow Double Storey" && (
        <span className="absolute right-1.5 top-1.5 rounded bg-cyan-950/80 border border-cyan-700/60 px-1.5 py-0.5 text-[9px] font-semibold text-cyan-300 backdrop-blur-xs">
          Narrow Double
        </span>
      )}
      {showGarageBadge && (
        <span
          className={`absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[9px] font-semibold backdrop-blur-xs border ${
            isSingleGarage
              ? "bg-emerald-950/90 border-emerald-500/70 text-emerald-300 shadow-xs"
              : "bg-slate-950/80 border-slate-700/60 text-slate-300"
          }`}
        >
          {isSingleGarage ? "✓ 1-Car Render" : "2-Car Render"}
        </span>
      )}
    </div>
  );
}

export function FacadeLibrary({
  value,
  onSelect,
  /** Restrict the library to the facades suited to the selected design. */
  storey,
  disabled,
  /** Exact facade list published for the chosen design (dual-occupancy, acreage). */
  designFacades,
  /** Selected design name — drives duplex / Mulberry facade pricing. */
  designName,
  /** Garage spaces on the selected floorplan: only matching facades are shown. */
  garage,
}: {
  value: string;
  onSelect: (item: FacadeItem) => void;
  /** Restrict the library to the facades suited to the selected design. */
  storey?: FacadeStorey | null;
  disabled?: boolean;
  /** Exact facade list published for the chosen design (dual-occupancy, acreage). */
  designFacades?: FacadeItem[] | null;
  /** Selected design name — drives duplex / Mulberry facade pricing. */
  designName?: string;
  /** Garage spaces on the selected floorplan: only matching facades are shown. */
  garage?: FacadeGarage | null;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortId>("alpha");
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_BATCH);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  type TabId = FacadeStorey | "uploaded" | "design" | "all";

  const effectiveGarage: FacadeGarage | null =
    garage ?? (designName && isSingleGarageDesign(designName) ? 1 : null);

  const initialCat: TabId =
    storey ?? (effectiveGarage === 1 ? "single" : "single");

  const [category, setCategory] = useState<TabId>(initialCat);
  const [garageFilter, setGarageFilter] = useState<"all" | "single-only">("all");
  const [custom, setCustom] = useState<FacadeItem[]>(() => loadCustomFacades());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (storey) {
      setCategory(storey);
    } else if (effectiveGarage === 1) {
      setCategory("single");
    }
  }, [storey, effectiveGarage, open]);

  useEffect(() => {
    setVisibleLimit(INITIAL_BATCH);
  }, [category, sort, query, garageFilter, open]);

  const restricted = !!designFacades?.length;
  const all = useMemo(
    () => (restricted ? [...designFacades!, ...custom] : [...BUILT_IN_FACADES, ...custom]),
    [restricted, designFacades, custom],
  );

  /** Only facades drawn with the same garage as the floorplan can be used. */
  const matchesGarage = (f: FacadeItem) => {
    if (f.range === "Uploaded" || !effectiveGarage) return true;
    const g = facadeGarage(f);
    if (effectiveGarage === 1) {
      if (garageFilter === "single-only") {
        return g === 1;
      }
      return true;
    }
    if (effectiveGarage === 2) {
      // Double car garage floorplans: NEVER single car garage facades!
      return g === 2;
    }
    return true;
  };

  const eligible = useMemo(() => all.filter(matchesGarage), [all, effectiveGarage, garageFilter]);

  const tabs: { id: TabId; label: string }[] = useMemo(() => {
    if (restricted) {
      return [
        { id: "design" as const, label: "Available for this design" },
        CATEGORIES.find((c) => c.id === "uploaded")!,
      ];
    }
    if (storey === "double") {
      return [
        { id: "double" as const, label: "Double Storey" },
        { id: "all" as const, label: "All Facades" },
        CATEGORIES.find((c) => c.id === "uploaded")!,
      ];
    }
    if (effectiveGarage === 1) {
      return [
        { id: "single" as const, label: "Single Storey" },
        { id: "all" as const, label: "All Facades" },
        CATEGORIES.find((c) => c.id === "uploaded")!,
      ];
    }
    return CATEGORIES;
  }, [restricted, effectiveGarage, storey]);

  const active: TabId = tabs.some((t) => t.id === category) ? category : tabs[0].id;

  const priceOf = (f: FacadeItem) =>
    f.range === "Uploaded" ? null : facadePriceForDesign(f.name, facadeCategory(f), designName);

  const deferredQuery = useDeferredValue(query);

  const results = useMemo(() => {
    if (!open) return [];
    const inCat = eligible.filter((f) => facadeBelongsToCategory(f, active));
    const found = searchFacades(inCat, deferredQuery);
    const sorted = [...found];
    if (sort === "alpha") {
      sorted.sort((a, b) => {
        if (effectiveGarage === 1) {
          const ga = facadeGarage(a);
          const gb = facadeGarage(b);
          if (ga === 1 && gb !== 1) return -1;
          if (ga !== 1 && gb === 1) return 1;
        }
        return a.name.localeCompare(b.name);
      });
    } else {
      sorted.sort((a, b) => {
        if (effectiveGarage === 1) {
          const ga = facadeGarage(a);
          const gb = facadeGarage(b);
          if (ga === 1 && gb !== 1) return -1;
          if (ga !== 1 && gb === 1) return 1;
        }
        const pa = priceOf(a) ?? 0;
        const pb = priceOf(b) ?? 0;
        return sort === "price-asc" ? pa - pb : pb - pa;
      });
    }
    return sorted;
  }, [open, eligible, active, deferredQuery, sort, designName, effectiveGarage]);

  const visibleResults = useMemo(() => results.slice(0, visibleLimit), [results, visibleLimit]);

  // Batch prime visible items from IndexedDB in a single query
  useEffect(() => {
    if (!open || visibleResults.length === 0) return;
    const uncachedUrls = visibleResults
      .map((f) => f.url)
      .filter((url) => !memoryThumbnailCache.has(url));

    if (uncachedUrls.length === 0) return;

    getIdbThumbnails(uncachedUrls)
      .then((batch) => {
        Object.entries(batch).forEach(([url, thumb]) => {
          notifyThumbnail(url, thumb);
        });
      })
      .catch(() => {});
  }, [open, visibleResults]);

  useEffect(() => {
    if (!open) return;
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleLimit((prev) => Math.min(prev + BATCH_INCREMENT, results.length));
        }
      },
      { rootMargin: "250px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [open, results.length, visibleLimit]);

  const persist = (items: FacadeItem[]) => {
    setCustom(items);
    saveCustomFacades(items);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const added: FacadeItem[] = [];
    for (const file of Array.from(files)) {
      const url = await fileToImageDataUrl(file);
      if (url) {
        added.push({
          id: `${Date.now()}-${file.name}`,
          name: file.name.replace(/\.[^.]+$/, ""),
          range: "Uploaded",
          tags: ["uploaded"],
          url,
        });
      }
    }
    persist([...custom, ...added]);
  };

  const tabCounts = useMemo(() => {
    if (!open) return {};
    const counts: Record<string, number> = {};
    for (const c of tabs) {
      counts[c.id] =
        c.id === "design"
          ? eligible.filter((f) => f.range !== "Uploaded").length
          : eligible.filter((f) => facadeBelongsToCategory(f, c.id)).length;
    }
    return counts;
  }, [open, tabs, eligible]);

  const { mode } = useTheme();
  const isLight = mode === "normal";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={`h-9 px-3 w-full justify-center text-xs gap-1.5 shadow-xs font-semibold rounded-lg transition-all ${
            isLight
              ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-50 hover:border-brand-gold/60 shadow-slate-200/50"
              : "border-brand-gold/40 bg-slate-900/90 text-slate-100 hover:border-brand-gold hover:bg-slate-850 hover:text-white"
          }`}
        >
          <Search className="h-3.5 w-3.5 text-brand-gold shrink-0" />
          <span>Browse facade library ({eligible.length})</span>
        </Button>
      </DialogTrigger>
      <DialogContent className={`max-w-3xl backdrop-blur-2xl shadow-2xl ${
        isLight ? "border-slate-200 bg-white text-slate-900" : "border-slate-800 bg-slate-950/95 text-slate-100"
      }`}>
        <DialogHeader>
          <DialogTitle className={`font-bold tracking-wide ${isLight ? "text-slate-900" : "text-white"}`}>
            Hudson facade library
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            autoFocus
            placeholder="Search by name, range or style…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`border text-xs focus:border-brand-gold/60 ${
              isLight
                ? "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                : "border-slate-800 bg-slate-900/80 text-slate-100 placeholder:text-slate-500"
            }`}
          />
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => inputRef.current?.click()}
            className={`border text-xs gap-1.5 flex-none font-semibold ${
              isLight
                ? "border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800"
                : "border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Upload className={`h-4 w-4 ${isLight ? "text-amber-700" : "text-brand-gold"}`} />
            Add renders
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {tabs.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                  active === c.id
                    ? isLight
                      ? "border-amber-400 bg-amber-100 text-amber-950 font-bold shadow-xs"
                      : "border-brand-gold/60 bg-gradient-to-r from-amber-500/20 to-brand-gold/15 text-amber-200 shadow-sm"
                    : isLight
                      ? "border-slate-200 bg-slate-100 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                {c.label} ({tabCounts[c.id] ?? 0})
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {effectiveGarage === 1 && (
              <div className="flex items-center gap-1">
                <span className={`text-[11px] font-medium ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                  Garage:
                </span>
                <button
                  type="button"
                  onClick={() => setGarageFilter("all")}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                    garageFilter === "all"
                      ? isLight
                        ? "border-amber-400 bg-amber-100 text-amber-950 font-bold shadow-xs"
                        : "border-brand-gold/60 bg-gradient-to-r from-amber-500/20 to-brand-gold/15 text-amber-200 shadow-sm"
                      : isLight
                        ? "border-slate-200 bg-slate-100 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                        : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setGarageFilter("single-only")}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                    garageFilter === "single-only"
                      ? isLight
                        ? "border-emerald-500 bg-emerald-100 text-emerald-950 font-bold shadow-xs"
                        : "border-emerald-500/60 bg-emerald-500/20 text-emerald-200 shadow-sm"
                      : isLight
                        ? "border-slate-200 bg-slate-100 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                        : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  1-Car Only
                </button>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className={`text-[11px] font-medium ${isLight ? "text-slate-600" : "text-slate-400"}`}>Sort</span>
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSort(s.id)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                    sort === s.id
                      ? isLight
                        ? "border-amber-400 bg-amber-100 text-amber-950 font-bold shadow-xs"
                        : "border-brand-gold/60 bg-gradient-to-r from-amber-500/20 to-brand-gold/15 text-amber-200 shadow-sm"
                      : isLight
                        ? "border-slate-200 bg-slate-100 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                        : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid max-h-[55vh] grid-cols-3 gap-3 overflow-y-auto pr-1">
          {visibleResults.map((f, idx) => {
            const price = priceOf(f);
            return (
              <div key={f.id} className="group relative">
                <button
                  type="button"
                  onClick={() => {
                    onSelect(f);
                    setOpen(false);
                  }}
                  className={`w-full overflow-hidden rounded-xl border text-left transition-all ${
                    value === f.url
                      ? isLight
                        ? "border-amber-500 ring-2 ring-amber-500/50 bg-amber-50/50 shadow-md"
                        : "border-brand-gold ring-2 ring-brand-gold/50 bg-slate-900 shadow-lg shadow-brand-gold/10"
                      : isLight
                        ? "border-slate-200 bg-white hover:border-slate-300 text-slate-900 hover:shadow-xs"
                        : "border-slate-800 bg-slate-900/80 hover:border-slate-700 text-slate-200"
                  }`}
                >
                  <FacadeCardThumbnail
                    f={f}
                    isHighPriority={idx < 6}
                    showGarageBadge={effectiveGarage === 1}
                    isSingleGarage={facadeGarage(f) === 1}
                  />
                  <div className="flex items-baseline justify-between gap-2 px-2.5 py-2">
                    <span className={`truncate text-xs font-semibold ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                      {f.name}
                    </span>
                    <span className={`flex-none text-[11px] font-bold ${isLight ? "text-amber-800" : "text-brand-gold"}`}>
                      {price === null ? "—" : price === 0 ? "Included" : `+${formatAud(price)}`}
                    </span>
                  </div>
                  {value === f.url && (
                    <span className="absolute left-2 top-2 rounded-full bg-brand-gold p-1 text-slate-950 font-bold shadow-md">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </span>
                  )}
                </button>
                {f.range === "Uploaded" && (
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className={`absolute right-1.5 top-1.5 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 ${
                      isLight
                        ? "bg-slate-100 text-slate-700 hover:text-rose-600 hover:bg-slate-200"
                        : "bg-slate-800 text-slate-200 hover:text-rose-400"
                    }`}
                    onClick={() => persist(custom.filter((c) => c.id !== f.id))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
          {visibleResults.length < results.length && (
            <div ref={loadMoreRef} className="col-span-3 py-3 flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setVisibleLimit((prev) => Math.min(prev + BATCH_INCREMENT, results.length))}
                className={`text-xs border ${
                  isLight
                    ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    : "border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white"
                }`}
              >
                Load more facades ({results.length - visibleResults.length} remaining)
              </Button>
            </div>
          )}
          {results.length === 0 && (
            <p className={`col-span-3 py-8 text-center text-sm ${isLight ? "text-slate-600" : "text-slate-400"}`}>
              No facades match “{query}”. Add renders to build out the library.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
