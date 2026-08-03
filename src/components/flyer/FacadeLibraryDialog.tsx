import { useMemo, useRef, useState } from "react";
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
import { PRE_RENDERED_FACADES } from "./preRenderedFacades.data";
import {
  facadeCategory,
  facadeGarage,
  facadePriceForDesign,
  type FacadeGarage,
  type FacadeStorey,
} from "./facadePricing";
import { fileToImageDataUrl } from "./fileToImage";
import { formatAud } from "@/lib/pricing";

const CATEGORIES: { id: FacadeStorey | "all" | "uploaded" | "design"; label: string }[] = [
  { id: "all", label: "All Facades" },
  { id: "single", label: "Single Storey" },
  { id: "double", label: "Double Storey" },
  { id: "acreage", label: "Acreage" },
  { id: "uploaded", label: "Uploaded" },
];

type SortId = "alpha" | "price-asc" | "price-desc";

const SORTS: { id: SortId; label: string }[] = [
  { id: "alpha", label: "A–Z" },
  { id: "price-asc", label: "Price ↑" },
  { id: "price-desc", label: "Price ↓" },
];

function categoryOf(f: FacadeItem): FacadeStorey | "uploaded" {
  return f.range === "Uploaded" ? "uploaded" : facadeCategory(f);
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
  type TabId = FacadeStorey | "all" | "uploaded" | "design";
  const [category, setCategory] = useState<TabId>(storey ?? "single");
  const [custom, setCustom] = useState<FacadeItem[]>(() => loadCustomFacades());
  const inputRef = useRef<HTMLInputElement>(null);

  const hasDesignFacades = !!designFacades?.length;
  const all = useMemo(
    () => {
      const map = new Map<string, FacadeItem>();
      BUILT_IN_FACADES.forEach((f) => map.set(f.id, f));
      if (designFacades) {
        designFacades.forEach((f) => {
          if (f.id && !map.has(f.id)) map.set(f.id, f);
        });
      }
      custom.forEach((f) => map.set(f.id || f.name, f));

      return Array.from(map.values()).map((f) => ({
        ...f,
        url: (f.id && PRE_RENDERED_FACADES[f.id]) ? PRE_RENDERED_FACADES[f.id] : f.url,
      }));
    },
    [designFacades, custom],
  );

  const eligible = all;

  const tabs: { id: TabId; label: string }[] = useMemo(
    () =>
      hasDesignFacades
        ? [{ id: "design", label: "Available for this design" }, ...CATEGORIES]
        : CATEGORIES,
    [hasDesignFacades],
  );

  const active: TabId = tabs.some((t) => t.id === category)
    ? category
    : hasDesignFacades
      ? "design"
      : storey ?? "single";

  const priceOf = (f: FacadeItem) =>
    f.range === "Uploaded" ? null : facadePriceForDesign(f.name, facadeCategory(f), designName);

  const results = useMemo(() => {
    const inCat =
      active === "all"
        ? eligible
        : active === "design"
          ? (designFacades ?? eligible.filter((f) => f.range !== "Uploaded"))
          : eligible.filter((f) => categoryOf(f) === active);
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="w-full" disabled={disabled}>
          <Search className="h-3.5 w-3.5" />
          {disabled ? "Select a design first" : `Browse facade library (${eligible.length})`}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Hudson facade library</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            autoFocus
            placeholder="Search by name, range or style…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4" />
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
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  active === c.id
                    ? "border-brand-gold-deep bg-brand-navy text-brand-cream"
                    : "text-muted-foreground hover:border-primary hover:text-foreground"
                }`}
              >
                {c.label} (
                {c.id === "design"
                  ? eligible.filter((f) => f.range !== "Uploaded").length
                  : eligible.filter((f) => categoryOf(f) === c.id).length}
                )
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">Sort</span>
            {SORTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSort(s.id)}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  sort === s.id
                    ? "border-brand-gold-deep bg-brand-navy text-brand-cream"
                    : "text-muted-foreground hover:border-primary hover:text-foreground"
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
                  className={`w-full overflow-hidden rounded-md border text-left transition-colors ${
                    value === f.url
                      ? "border-brand-gold-deep ring-2 ring-brand-gold"
                      : "hover:border-primary"
                  }`}
                >
                  <img
                    src={f.url}
                    alt={f.name}
                    loading="lazy"
                    className="h-28 w-full bg-muted object-cover"
                  />
                  <div className="flex items-baseline justify-between gap-2 px-2 py-1.5">
                    <span className="truncate text-xs font-medium">{f.name}</span>
                    <span className="flex-none text-[11px] font-medium text-brand-gold-deep">
                      {price === null ? "—" : price === 0 ? "Included" : `+${formatAud(price)}`}
                    </span>
                  </div>
                  {value === f.url && (
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-brand-gold p-1 text-brand-navy-deep">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </button>
                {f.range === "Uploaded" && (
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute right-1.5 top-1.5 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => persist(custom.filter((c) => c.id !== f.id))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
          {results.length === 0 && (
            <p className="col-span-3 py-8 text-center text-sm text-muted-foreground">
              No facades match “{query}”. Add renders to build out the library.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
