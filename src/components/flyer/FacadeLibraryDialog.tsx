import { useEffect, useMemo, useRef, useState } from "react";
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
  type FacadeGarage,
  type FacadeStorey,
} from "./facadePricing";
import { fileToImageDataUrl } from "./fileToImage";
import { formatAud } from "@/lib/pricing";

const CATEGORIES: { id: FacadeStorey | "uploaded"; label: string }[] = [
  { id: "single", label: "Single Storey" },
  { id: "double", label: "Double Storey" },
  { id: "split", label: "Split Level" },
  { id: "acreage", label: "Acreage / Ranch" },
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
  category: FacadeStorey | "uploaded" | "design",
): boolean {
  if (category === "uploaded") return f.range === "Uploaded";
  if (f.range === "Uploaded") return false;

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

  const isDoubleRange = range.includes("double") || tags.includes("double") || /double\s+storey/i.test(name) || /2[-\s]?stry/i.test(f.url);
  const isSingleRange = range.includes("single") || tags.includes("single") || /single\s+storey/i.test(name);

  if (category === "double") {
    return isDoubleRange && !range.includes("single");
  }

  if (category === "single") {
    return isSingleRange && !range.includes("double");
  }

  return true;
}

export function FacadeLibrary({
  value,
  onSelect,
  storey,
  disabled,
  designFacades,
  designName,
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
  type TabId = FacadeStorey | "uploaded" | "design";
  const [category, setCategory] = useState<TabId>(storey ?? "single");
  const [custom, setCustom] = useState<FacadeItem[]>(() => loadCustomFacades());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (storey) setCategory(storey);
  }, [storey]);

  const restricted = !!designFacades?.length;
  const all = useMemo(
    () => (restricted ? [...designFacades!, ...custom] : [...BUILT_IN_FACADES, ...custom]),
    [restricted, designFacades, custom],
  );

  /** Only facades drawn with the same garage as the floorplan can be used. A
   *  design-specific list is already the published gallery, so it isn't filtered. */
  const matchesGarage = (f: FacadeItem) => {
    if (restricted || f.range === "Uploaded" || !garage) return true;
    const g = facadeGarage(f);
    return g === "both" || g === garage;
  };

  const eligible = useMemo(() => all.filter(matchesGarage), [all, garage, restricted]);

  const tabs = useMemo(
    () =>
      restricted
        ? [{ id: "design" as const, label: "Available for this design" }, CATEGORIES[3]]
        : CATEGORIES,
    [restricted],
  );
  const active: TabId = tabs.some((t) => t.id === category) ? category : tabs[0].id;

  const priceOf = (f: FacadeItem) =>
    f.range === "Uploaded" ? null : facadePriceForDesign(f.name, facadeCategory(f), designName);

  const results = useMemo(() => {
    const inCat = eligible.filter((f) => facadeBelongsToCategory(f, active));
    const found = searchFacades(inCat, query);
    const sorted = [...found];
    if (sort === "alpha") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else
      sorted.sort((a, b) => {
        const pa = priceOf(a) ?? 0;
        const pb = priceOf(b) ?? 0;
        return sort === "price-asc" ? pa - pb : pb - pa;
      });
    return sorted;
  }, [eligible, active, query, sort, designName]);


  const persist = (items: FacadeItem[]) => {
    setCustom(items);
    saveCustomFacades(items);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const added: FacadeItem[] = [];
    for (const file of Array.from(files)) {
      const url = await fileToImageDataUrl(file);
      added.push({
        id: `${Date.now()}-${file.name}`,
        name: file.name.replace(/\.[^.]+$/, ""),
        range: "Uploaded",
        tags: ["uploaded"],
        url,
      });
    }
    persist([...custom, ...added]);
  };

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of tabs) {
      counts[c.id] =
        c.id === "design"
          ? eligible.filter((f) => f.range !== "Uploaded").length
          : eligible.filter((f) => facadeBelongsToCategory(f, c.id)).length;
    }
    return counts;
  }, [tabs, eligible]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="border-brand-gold/40 bg-slate-900/90 text-slate-100 hover:border-brand-gold hover:bg-slate-850 hover:text-white text-xs gap-1.5 shadow-sm"
        >
          <Search className="h-3.5 w-3.5 text-brand-gold" />
          Browse facade library ({eligible.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl border-slate-800 bg-slate-950/95 text-slate-100 backdrop-blur-2xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-white font-bold tracking-wide">Hudson facade library</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            autoFocus
            placeholder="Search by name, range or style…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-slate-800 bg-slate-900/80 text-xs text-slate-100 placeholder:text-slate-500 focus:border-brand-gold/60"
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
            className="border border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white text-xs gap-1.5 flex-none"
          >
            <Upload className="h-4 w-4 text-brand-gold" />
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
                    ? "border-brand-gold/60 bg-gradient-to-r from-amber-500/20 to-brand-gold/15 text-amber-200 shadow-sm"
                    : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                {c.label} ({tabCounts[c.id] ?? 0})
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Sort</span>
            {SORTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSort(s.id)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                  sort === s.id
                    ? "border-brand-gold/60 bg-gradient-to-r from-amber-500/20 to-brand-gold/15 text-amber-200 shadow-sm"
                    : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid max-h-[55vh] grid-cols-3 gap-3 overflow-y-auto pr-1">
          {results.map((f) => {
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
                      ? "border-brand-gold ring-2 ring-brand-gold/50 bg-slate-900 shadow-lg shadow-brand-gold/10"
                      : "border-slate-800 bg-slate-900/80 hover:border-slate-700 text-slate-200"
                  }`}
                >
                  <img
                    src={f.url}
                    alt={f.name}
                    loading="lazy"
                    className="h-28 w-full bg-slate-950 object-cover"
                  />
                  <div className="flex items-baseline justify-between gap-2 px-2.5 py-2">
                    <span className="truncate text-xs font-semibold text-slate-200">{f.name}</span>
                    <span className="flex-none text-[11px] font-bold text-brand-gold">
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
                    className="absolute right-1.5 top-1.5 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 bg-slate-800 text-slate-200 hover:text-rose-400"
                    onClick={() => persist(custom.filter((c) => c.id !== f.id))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
          {results.length === 0 && (
            <p className="col-span-3 py-8 text-center text-sm text-slate-400">
              No facades match “{query}”. Add renders to build out the library.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
