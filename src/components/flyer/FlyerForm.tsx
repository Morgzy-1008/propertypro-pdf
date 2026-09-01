import { useState, useEffect, useMemo } from "react";
import { X, Loader2, Plus, Sparkles, CheckCircle2 } from "lucide-react";
import { FacadeCheckModal } from "./FacadeCheckModal";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FacadeLibrary } from "./FacadeLibraryDialog";
import { facadeUpliftFor, saveFacadeUplift, loadEnhanced, loadEnhancedAsync, saveEnhanced, hasPreviousEnhanced, revertEnhanced, clearIdbEnhanced, BUILT_IN_FACADES, type FacadeItem } from "./facadeLibrary";
import { prepareFloorplan, prepareFacade, widenFacadeClientSide, preframeFacadeImage } from "./fileToImage";
import { resolvePlanRooms } from "./planRooms";
import { authHeaders } from "@/lib/api-auth";

import { facadeCategory, facadeGarage, garageFromCars, type FacadeStorey } from "./facadePricing";
import { duplexFacadesForDesign } from "./duplexFacades.data";
import { MULBERRY_FACADES } from "./acreageFacades.data";
import { HUDSON_FACADES } from "./facades.data";
import { PRE_RENDERED_FACADES } from "./preRenderedFacades.data";

import { INCLUSION_RANGES, PALETTES, defaultInclusions, baseRangeItems, type FlyerData } from "./types";
import { ESTATE_PRESETS, matchEstatePreset } from "./sitingEngine";
import { landscapingPriceFor } from "@/lib/landscaping";

import { plansForDesign, otherSizesForDesign } from "./floorplans";
import type { FloorplanRecord } from "./floorplans.data";
import { CONSULTANTS, findConsultant } from "./consultants";

import { COST_FIELDS, costsTotal, defaultCosts } from "@/lib/additionalCosts";
import {
  HOUSING_TYPES,
  designsFor,
  findDesign,
  formatAud,
  housePriceFor,
  parseAud,
  type HousingType,
} from "@/lib/pricing";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Setter = <K extends keyof FlyerData>(key: K, value: FlyerData[K]) => void;

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium tracking-wide text-slate-300">{label}</Label>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-8.5 rounded-lg border-slate-800 bg-slate-950/70 text-xs text-slate-100 placeholder:text-slate-500 focus:border-brand-gold/60 focus:ring-brand-gold/20 transition-all"
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3.5 pt-1">
      <h3 className="text-[11px] font-bold tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-brand-gold to-amber-400 uppercase">
        {title}
      </h3>
      {children}
    </div>
  );
}

function InclusionsEditor({ data, set }: { data: FlyerData; set: Setter }) {
  const [draft, setDraft] = useState("");
  const [autoFilterLand, setAutoFilterLand] = useState(true);
  const items = baseRangeItems(data);

  const update = (next: string[]) => set("inclusions", { ...data.inclusions, [data.range]: next });

  return (
    <div className="space-y-2 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 shadow-inner">
      {items.map((item, idx) => (
        <div key={`${item}-${idx}`} className="flex items-center gap-1.5">
          <Input
            value={item}
            className="h-8 rounded-md border-slate-800 bg-slate-900/80 text-xs text-slate-200 focus:border-brand-gold/50"
            onChange={(e) => {
              const next = [...items];
              next[idx] = e.target.value;
              update(next);
            }}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 flex-none text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
            onClick={() => update(items.filter((_, i) => i !== idx))}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <Input
          value={draft}
          placeholder="Add an inclusion…"
          className="h-8 rounded-md border-slate-800 bg-slate-900/80 text-xs text-slate-200 placeholder:text-slate-500 focus:border-brand-gold/50"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              e.preventDefault();
              update([...items, draft.trim()]);
              setDraft("");
            }
          }}
        />
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="h-8 w-8 flex-none border border-slate-800 bg-slate-800 text-slate-200 hover:bg-slate-700"
          disabled={!draft.trim()}
          onClick={() => {
            update([...items, draft.trim()]);
            setDraft("");
          }}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <button
        type="button"
        className="text-[11px] text-slate-400 underline-offset-2 hover:text-amber-300 hover:underline transition-colors"
        onClick={() => set("inclusions", defaultInclusions())}
      >
        Reset all ranges to the standard inclusions
      </button>
    </div>
  );
}

function ConsultantPicker({ data, set }: { data: FlyerData; set: Setter }) {
  const choose = (id: string) => {
    const c = findConsultant(id);
    if (!c) return;
    set("consultantId", id);
    set("contactName", c.name);
    set("contactPhone", c.phone);
    set("contactEmail", c.email);
    set("contactOffice", c.displayCentre);
  };

  return (
    <div className="space-y-2">
      {CONSULTANTS.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => choose(c.id)}
          className={`w-full rounded-xl border p-3 text-left text-xs leading-tight transition-all ${
            data.consultantId === c.id
              ? "border-brand-gold/60 bg-gradient-to-r from-amber-500/15 to-brand-gold/10 text-amber-200 shadow-md shadow-brand-gold/5"
              : "border-slate-800/80 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"
          }`}
        >
          <span className="block font-semibold text-slate-200">{c.name}</span>
          <span className="block text-[11px] opacity-75 mt-0.5">
            {c.phone} · {c.email}
          </span>
          <span className="mt-1 block text-[10px] uppercase tracking-wider text-brand-gold font-medium">{c.displayCentre}</span>
        </button>
      ))}
    </div>
  );
}

/** Which facade price list applies to the selected housing type.
 *  Split-level designs can take any facade, so they aren't restricted. */
function storeyFor(type: string): FacadeStorey | null {
  if (type === "double-storey") return "double";
  if (type === "acreage") return "acreage";
  if (type === "split-level") return "split";
  return "single";
}

export function FlyerForm({ data, set, template }: { data: FlyerData; set: Setter; template?: TemplateId }) {
  const designs = designsFor(data.housingType as HousingType);
  const [autoFilterLand, setAutoFilterLand] = useState(true);

  const filteredDesigns = useMemo(() => {
    if (!autoFilterLand) return designs;
    const frontageNum = Number(data.landFrontage);
    const sizeNum = Number(data.landSize);
    const sideSetbackNum = Number(data.sideSetback) || 1.0;
    const frontSetbackNum = Number(data.frontSetback) || 3.8;

    return designs.filter((d) => {
      const reqFrontage = Number(d.frontage || 0);
      if (frontageNum > 0 && reqFrontage > 0) {
        if (reqFrontage + (data.isBtb ? 0.2 : sideSetbackNum * 2) > frontageNum + 0.05) return false;
      }
      return true;
    });
  }, [designs, autoFilterLand, data.landFrontage, data.landSize, data.sideSetback, data.frontSetback, data.isBtb]);
  const [facadeBusy, setFacadeBusy] = useState(false);
  const [reRenderAttempts, setReRenderAttempts] = useState<Record<string, number>>({});
  const MAX_RERENDERS = 2;
  const [uplift, setUplift] = useState(0);
  const [variants, setVariants] = useState<FloorplanRecord[]>(() =>
    plansForDesign(data.designName),
  );
  const [canRevertAi, setCanRevertAi] = useState(false);
  const [facadeCheckOpen, setFacadeCheckOpen] = useState(false);

  useEffect(() => {
    const checkRevert = async () => {
      const facadeId = data.facadeId || "custom";
      const hasPrev = await hasPreviousEnhanced(facadeId);
      setCanRevertAi(hasPrev);
    };
    checkRevert();
  }, [data.facadeId, data.facadeUrl]);

  /** Dual-occupancy designs only offer the facades shown on their design page,
   *  and the acreage range only offers the Mulberry facades. */
  const designFacades = !data.designName
    ? null
    : data.housingType === "dual-oc"
      ? duplexFacadesForDesign(data.designName)
      : data.housingType === "acreage"
        ? MULBERRY_FACADES
        : null;

  /** A single-garage plan can only take a single-garage facade, and vice versa. */
  const garage = garageFromCars(data.cars);

  const applyPricing = (
    designName: string,
    range: FlyerData["range"],
    landPrice: string,
    facadeUplift: number,
    costs = data.costs,
  ) => {
    const house = housePriceFor(designName, range);
    if (house === null) return;
    const total = house + facadeUplift + costsTotal(costs);
    set("housePrice", formatAud(total));
    set("price", formatAud(total + parseAud(landPrice)));
  };

  const setCost = (id: (typeof COST_FIELDS)[number]["id"], value: number) => {
    const next = { ...data.costs, [id]: value };
    set("costs", next);
    applyPricing(data.designName, data.range, data.landPrice, uplift, next);
  };

  const applyPlan = (plan: FloorplanRecord) => {
    set("floorplanName", plan.label);
    set("floorplanUrl", plan.url);
    set("floorplanSize", plan.size);
    set("beds", plan.beds);
    set("baths", plan.baths);
    set("cars", plan.cars);
    // NOTE: plan.frontage is the *house* width — the flyer's frontage field is
    // the land block frontage, so it is never overwritten by a design change.
    // Trim the blank page margin so the drawing fills the flyer frame.
    void prepareFloorplan(plan).then(async (trimmed) => {
      if (trimmed !== plan.url) set("floorplanUrl", trimmed);
      // Read the plan's actual room labels: a GUEST bedroom counts as a bedroom
      // and each powder room adds half a bathroom.
      const rooms = await resolvePlanRooms(plan.label, trimmed, plan.beds, plan.baths);
      set("beds", rooms.beds);
      set("baths", rooms.baths);
    });
  };


  const selectDesign = (name: string) => {
    set("designName", name);
    const plans = plansForDesign(name);
    setVariants(plans);
    if (plans.length) {
      applyPlan(plans[0]);
    } else {
      const row = findDesign(name);
      set("floorplanName", row?.name ?? name);
      set("floorplanUrl", "");
      set("floorplanSize", row ? String(row.m2) : "");
    }
    const sizes = otherSizesForDesign(name);
    set("otherSizes", sizes);
    set("showOtherSizes", sizes.length > 0);

    // Duplex and Mulberry facades are priced per design, so re-price the facade.
    const amount = data.facadeId
      ? facadeUpliftFor(
          data.facadeId,
          data.facadeName,
          storeyFor(data.housingType) ?? undefined,
          name,
        )
      : uplift;
    setUplift(amount);

    const costs = data.landscaping
      ? {
          ...data.costs,
          driveway: 0,
          landscaping: landscapingPriceFor(data.landSize, data.housingType, name),
        }
      : data.costs;
    applyPricing(name, data.range, data.landPrice, amount, costs);

    // If a facade is already selected, re-price it; otherwise keep it unselected so the flyer prompts the user to pick a facade
    if (!data.facadeId) {
      set("facadeId", "");
      set("facadeName", "");
      set("facadeUrl", "");
    }
  };

  const selectVariant = (label: string) => {
    const plan = variants.find((v) => v.label === label);
    if (plan) applyPlan(plan);
  };

  const selectRange = (range: FlyerData["range"]) => {
    set("range", range);
    applyPricing(data.designName, range, data.landPrice, uplift);
  };

  const setLandSize = (v: string) => {
    set("landSize", v);
    if (!data.landscaping) return;
    const next = {
      ...data.costs,
      driveway: 0,
      landscaping: landscapingPriceFor(v, data.housingType, data.designName),
    };
    set("costs", next);
    applyPricing(data.designName, data.range, data.landPrice, uplift, next);
  };

  const toggleLandscaping = (on: boolean) => {
    set("landscaping", on);
    const next = on
      ? {
          ...data.costs,
          driveway: 0,
          landscaping: landscapingPriceFor(data.landSize, data.housingType, data.designName),
        }
      : {
          ...data.costs,
          driveway: defaultCosts(data.housingType).driveway,
          landscaping: 0,
        };
    set("costs", next);
    applyPricing(data.designName, data.range, data.landPrice, uplift, next);
  };

  const setLandPrice = (v: string) => {
    set("landPrice", v);
    applyPricing(data.designName, data.range, v, uplift);
  };

  const setUpliftValue = (amount: number) => {
    setUplift(amount);
    if (data.facadeId) saveFacadeUplift(data.facadeId, amount);
    applyPricing(data.designName, data.range, data.landPrice, amount);
  };

  /** Select a library facade: price it, then have the render re-composed into a
   *  wide frame — the whole house kept intact and as large as possible, with
   *  fresh, consistent landscaping filling the rest of the frame. */
  const selectFacade = async (item: FacadeItem, forceRefresh = false) => {
    set("facadeId", item.id);
    set("facadeName", item.name);
    const itemCategory = facadeCategory(item);
    const targetHousingType = itemCategory === "double" ? "double-storey" : data.housingType;
    const isDouble = targetHousingType === "double-storey";

    const amount = facadeUpliftFor(item.id, item.name, itemCategory, data.designName);
    setUplift(amount);
    applyPricing(data.designName, data.range, data.landPrice, amount);

    if (forceRefresh) {
      await clearIdbEnhanced(item.id);
      setReRenderAttempts((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }));
    } else {
      setReRenderAttempts((prev) => ({ ...prev, [item.id]: 0 }));
    }

    const rawUrlToUse = item.originalUrl || item.url;

    // 1. Check for pre-rendered local static catalogue FIRST for instant 0-second load
    if (!forceRefresh) {
      const normId = item.id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const preRendered = PRE_RENDERED_FACADES[item.id] || PRE_RENDERED_FACADES[normId];
      if (preRendered) {
        set("facadeUrl", preRendered);
        setFacadeBusy(false);
        set("facadeBusy", false);
        return;
      }
      const cachedAi = await loadEnhancedAsync(item.id);
      if (cachedAi) {
        set("facadeUrl", cachedAi);
        setFacadeBusy(false);
        set("facadeBusy", false);
        return;
      }
    }

    // 2. Set facadeBusy = true while preparing Gemini AI outpainting
    setFacadeBusy(true);
    set("facadeBusy", true);

    try {
      const aiUrl = await widenFacadeClientSide({
        id: item.id,
        name: item.name,
        url: rawUrlToUse,
        originalUrl: rawUrlToUse,
        housingType: targetHousingType,
        forceRefresh,
      });

      if (aiUrl) {
        set("facadeUrl", aiUrl);
        if (aiUrl.startsWith("data:image/")) {
          await saveEnhanced(item.id, aiUrl, item.name);
        }
      } else {
        set("facadeUrl", rawUrlToUse);
      }
    } catch (err) {
      console.error("[AI Outpaint Error]", err);
      set("facadeUrl", rawUrlToUse);
    } finally {
      setFacadeBusy(false);
      set("facadeBusy", false);
    }
  };

  const handleReDoAiEnhancement = async () => {
    if (facadeBusy) return;
    const facadeId = data.facadeId || "custom";

    // Find original raw facade item details from catalog
    const matched =
      HUDSON_FACADES.find((f) => f.id === facadeId) ||
      BUILT_IN_FACADES.find((f) => f.id === facadeId);
    const rawOriginalUrl = matched?.originalUrl || matched?.url || data.rawFacadeUrl || data.facadeUrl;

    if (!rawOriginalUrl) {
      toast.info("Please select a facade from the library first.");
      return;
    }

    toast.loading("Generating fresh AI facade render with Gemini...", { id: "ai-enhance" });

    const facadeItem: FacadeItem = {
      id: facadeId,
      name: data.facadeName || matched?.name || "Custom",
      range: matched?.range || "Standard",
      tags: matched?.tags || [],
      url: rawOriginalUrl,
      originalUrl: rawOriginalUrl,
    };

    try {
      await selectFacade(facadeItem, true);
      toast.success("AI Facade render generated successfully!", { id: "ai-enhance" });
    } catch (e) {
      console.error("[handleReDoAiEnhancement error]", e);
      toast.error("Failed to generate AI render. Keeping current facade.", { id: "ai-enhance" });
    }
  };

  const handleRevertAi = async () => {
    if (facadeBusy) return;
    setFacadeBusy(true);
    set("facadeBusy", true);
    try {
      const facadeId = data.facadeId || "custom";
      const revertedUrl = await revertEnhanced(facadeId);
      if (revertedUrl) {
        set("facadeUrl", revertedUrl);
      }
    } finally {
      setFacadeBusy(false);
      set("facadeBusy", false);
    }
  };

  useEffect(() => {
    (window as any).widenFacadeClientSide = widenFacadeClientSide;
  }, []);

  const onLocationChange = (field: "suburb" | "estate", val: string) => {
    set(field, val);
    const otherVal = field === "suburb" ? data.estate : data.suburb;
    const estateQuery = field === "estate" ? val : otherVal;
    const suburbQuery = field === "suburb" ? val : otherVal;
    const matched = matchEstatePreset(estateQuery, suburbQuery);
    if (matched && matched.id !== "standard") {
      set("estatePreset", matched.id);
      set("frontSetback", matched.frontSetback);
      set("garageSetback", matched.garageSetback);
      set("sideSetback", matched.sideSetback);
    }
  };

  return (
    <div className="space-y-7">
      <Section title="Location">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Suburb" value={data.suburb} onChange={(v) => onLocationChange("suburb", v)} />
          <Field label="Estate" value={data.estate} onChange={(v) => onLocationChange("estate", v)} />
        </div>
        <Field label="Address" value={data.address} onChange={(v) => set("address", v)} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Land m²" value={data.landSize} onChange={setLandSize} />
          <Field
            label="Frontage m"
            value={data.landFrontage}
            onChange={(v) => set("landFrontage", v)}
          />
        </div>

        {/* Setback controls directly under Location when 2-Page Siting template is active */}
        {template === "siting" && (
          <div className="mt-3 space-y-3 rounded-xl border border-amber-500/30 bg-amber-950/15 p-3 shadow-inner">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-1.5">
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                Siting Setback Controls
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {ESTATE_PRESETS.find((p) => p.id === data.estatePreset)?.name || "Standard QLD"}
              </span>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] text-slate-300">Estate Preset</Label>
              <Select
                value={data.estatePreset || "standard"}
                onValueChange={(v) => {
                  set("estatePreset", v);
                  const preset = ESTATE_PRESETS.find((p) => p.id === v);
                  if (preset && v !== "custom") {
                    set("frontSetback", preset.frontSetback);
                    set("garageSetback", preset.garageSetback);
                    set("sideSetback", preset.sideSetback);
                  }
                }}
              >
                <SelectTrigger className="h-8 text-xs bg-slate-900/90 border-slate-800">
                  <SelectValue placeholder="Select Estate / Code" />
                </SelectTrigger>
                <SelectContent>
                  {ESTATE_PRESETS.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-400">Front Room / Porch (m)</Label>
                <Input
                  className="h-7.5 rounded-md border-slate-800 bg-slate-900/90 text-xs text-slate-200"
                  value={data.frontSetback !== undefined ? String(data.frontSetback) : "3.8"}
                  onChange={(e) => set("frontSetback", e.target.value)}
                  placeholder="3.8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-400">Garage Door Line (m)</Label>
                <Input
                  className="h-7.5 rounded-md border-slate-800 bg-slate-900/90 text-xs text-slate-200"
                  value={data.garageSetback !== undefined ? String(data.garageSetback) : "5.0"}
                  onChange={(e) => set("garageSetback", e.target.value)}
                  placeholder="5.0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-400">Side Setback (m)</Label>
                <Input
                  className="h-7.5 rounded-md border-slate-800 bg-slate-900/90 text-xs text-slate-200"
                  value={data.sideSetback !== undefined ? String(data.sideSetback) : "1.0"}
                  onChange={(e) => set("sideSetback", e.target.value)}
                  placeholder="1.0"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-400">Garage Orientation</Label>
                <Select
                  value={data.garageSide || "right"}
                  onValueChange={(v: "left" | "right") => set("garageSide", v)}
                >
                  <SelectTrigger className="h-7.5 text-xs bg-slate-900/90 border-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="right" className="text-xs">Right Side (Standard)</SelectItem>
                    <SelectItem value="left" className="text-xs">Left Side (Mirror)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </Section>


      <Section title="Package">
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Package price (total)"
            value={data.price}
            onChange={(v) => set("price", v)}
          />
          <Field label="Headline" value={data.headline} onChange={(v) => set("headline", v)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="House only price"
            value={data.housePrice}
            onChange={(v) => set("housePrice", v)}
          />
          <Field label="Land only price" value={data.landPrice} onChange={setLandPrice} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs tracking-wide text-muted-foreground">Housing type</Label>
            <Select
              value={data.housingType}
              onValueChange={(v) => {
                set("housingType", v);
                set("designName", "");
                set("facadeId", "");
                set("facadeName", "");
                set("facadeUrl", "");
                const base = defaultCosts(v);
                const nextCosts = data.landscaping
                  ? { ...base, driveway: 0, landscaping: landscapingPriceFor(data.landSize, v, "") }
                  : base;
                set("costs", nextCosts);
                const amount = facadeUpliftFor(
                  data.facadeId,
                  data.facadeName,
                  storeyFor(v) ?? undefined,
                );
                setUplift(amount);
                applyPricing("", data.range, data.landPrice, amount, nextCosts);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {HOUSING_TYPES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs tracking-wide text-muted-foreground">Design</Label>
            <Select value={data.designName} onValueChange={selectDesign} disabled={!designs.length}>
              <SelectTrigger>
                <SelectValue
                  placeholder={designs.length ? "Select design" : "Price list coming soon"}
                />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {designs.map((row) => (
                  <SelectItem key={row.name} value={row.name}>
                    {row.name} — {row.m2} m²
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {variants.length > 1 && (
          <div className="space-y-1.5">
            <Label className="text-xs tracking-wide text-muted-foreground">Floorplan variant</Label>
            <Select value={data.floorplanName} onValueChange={selectVariant}>
              <SelectTrigger>
                <SelectValue placeholder="Select variant" />
              </SelectTrigger>
              <SelectContent>
                {variants.map((v) => (
                  <SelectItem key={v.url} value={v.label}>
                    {v.label} — {v.beds} bed / {v.baths} bath / {v.cars} car
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Section title="Inclusions range">
          <div className="grid grid-cols-3 gap-2">
            {INCLUSION_RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => selectRange(r.id)}
                className={`rounded-xl border px-2 py-2.5 text-[11px] font-semibold leading-tight transition-all ${
                  data.range === r.id
                    ? "border-brand-gold/60 bg-gradient-to-r from-amber-500/20 to-brand-gold/15 text-amber-200 shadow-sm"
                    : "border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <InclusionsEditor data={data} set={set} />
        </Section>
      </Section>

      <Section title="Facade">
        <div className="flex gap-2">
          <div className="flex-1">
            <FacadeLibrary
              value={data.facadeUrl}
              onSelect={selectFacade}
              storey={storeyFor(data.housingType)}
              disabled={false}
              designFacades={designFacades}
              designName={data.designName}
              garage={garage}
            />
          </div>
          {(() => {
            const key = data.facadeId || "custom";
            return (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={facadeBusy || (!data.facadeUrl && !data.facadeName && !data.facadeId)}
                    onClick={() => setFacadeCheckOpen(true)}
                    className="flex-none gap-1.5 border-slate-800 bg-slate-900/80 text-amber-300 hover:border-brand-gold/50 hover:bg-brand-gold/10 text-xs font-medium cursor-pointer shadow-sm"
                    title="Audit and verify facade scale, roof clearance, and quality"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-brand-gold" />
                    Facade Check
                  </Button>
                  {canRevertAi && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={facadeBusy}
                      onClick={handleRevertAi}
                      className="flex-none text-xs text-slate-400 border-slate-800 hover:border-slate-700 hover:bg-slate-800"
                      title="Revert to previous AI generation"
                    >
                      Undo
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
        {designFacades && designFacades.length > 0 && (
          <p className="text-[11px] leading-snug text-slate-400">
            Showing only the facades Hudson publishes for this{" "}
            {data.housingType === "acreage" ? "acreage (Mulberry) design" : "duplex design"}.
          </p>
        )}
        {garage && !designFacades?.length && (
          <p className="text-[11px] leading-snug text-slate-400">
            Filtered to {garage === 1 ? "single" : "double"} garage facades to match the{" "}
            {data.cars} car floorplan.
          </p>
        )}
        {!data.designName && (
          <p className="text-[11px] leading-snug text-slate-400">
            Choose a design first — the library then only shows the facades offered for it.
          </p>
        )}
        {data.facadeName && (
          <div className="space-y-1.5 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 shadow-inner">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              {data.facadeName} facade
              {facadeBusy && <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-gold" />}
            </div>
            <Label className="text-[11px] tracking-wide text-slate-400">
              Facade upgrade cost (added to the house price)
            </Label>
            <Input
              className="h-8 rounded-lg border-slate-800 bg-slate-900/80 text-xs text-slate-100 placeholder:text-slate-500 focus:border-brand-gold/60"
              value={uplift ? String(uplift) : ""}
              placeholder="0"
              inputMode="numeric"
              onChange={(e) => setUpliftValue(parseAud(e.target.value))}
            />
            <p className="text-[11px] leading-snug text-slate-500">
              Filled in automatically from the QLD retail facade price list.
            </p>
          </div>
        )}
      </Section>

      <Section title="Additional costs (automated, adjustable)">
        <div className="space-y-2.5 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 shadow-inner">
          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 hover:border-slate-700 transition-colors">
            <input
              type="checkbox"
              className="mt-0.5 h-3.5 w-3.5 accent-amber-400 rounded"
              checked={data.landscaping}
              onChange={(e) => toggleLandscaping(e.target.checked)}
            />
            <span className="text-[11px] font-medium leading-snug text-slate-200">Landscaping package</span>
          </label>
          {COST_FIELDS.map((f) => (
            <div key={f.id} className="flex items-center gap-2">
              <Label className="flex-1 text-[11px] leading-tight text-slate-400">
                {f.label}
              </Label>
              <Input
                className="h-7.5 w-28 rounded-md border-slate-800 bg-slate-900/80 text-xs text-slate-200"
                inputMode="numeric"
                value={data.costs[f.id] ? String(data.costs[f.id]) : "0"}
                onChange={(e) => setCost(f.id, parseAud(e.target.value))}
              />
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-slate-800 pt-2 text-xs font-semibold text-slate-200">
            <span>Total additional costs</span>
            <span className="text-amber-300 font-bold">{formatAud(costsTotal(data.costs))}</span>
          </div>
          <button
            type="button"
            className="text-[11px] text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline transition-colors"
            onClick={() => {
              const base = defaultCosts(data.housingType);
              const next = data.landscaping
                ? {
                    ...base,
                    driveway: 0,
                    landscaping: landscapingPriceFor(data.landSize, data.housingType, data.designName),
                  }
                : base;
              set("costs", next);
              applyPricing(data.designName, data.range, data.landPrice, uplift, next);
            }}
          >
            Reset to the standard amounts for this housing type
          </button>
        </div>
      </Section>

      <Section title="Siting & setbacks (2-Page + Siting Plan)">
        <div className="space-y-3 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 shadow-inner">
          <div className="space-y-1.5">
            <Label className="text-xs tracking-wide text-muted-foreground">Estate Setback Preset (POD)</Label>
            <Select
              value={data.estatePreset || "standard"}
              onValueChange={(v) => {
                set("estatePreset", v);
                const preset = ESTATE_PRESETS.find((p) => p.id === v);
                if (preset && v !== "custom") {
                  set("frontSetback", preset.frontSetback);
                  set("garageSetback", preset.garageSetback);
                  set("sideSetback", preset.sideSetback);
                }
              }}
            >
              <SelectTrigger className="h-8.5 text-xs bg-slate-900/80 border-slate-800">
                <SelectValue placeholder="Select Estate / Code" />
              </SelectTrigger>
              <SelectContent>
                {ESTATE_PRESETS.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-400">Front Setback (m)</Label>
              <Input
                className="h-7.5 rounded-md border-slate-800 bg-slate-900/80 text-xs text-slate-200"
                value={data.frontSetback !== undefined ? String(data.frontSetback) : "4.5"}
                onChange={(e) => set("frontSetback", e.target.value)}
                placeholder="4.5"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-400">Garage Setback (m)</Label>
              <Input
                className="h-7.5 rounded-md border-slate-800 bg-slate-900/80 text-xs text-slate-200"
                value={data.garageSetback !== undefined ? String(data.garageSetback) : "5.5"}
                onChange={(e) => set("garageSetback", e.target.value)}
                placeholder="5.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-400">Side Setback (m)</Label>
              <Input
                className="h-7.5 rounded-md border-slate-800 bg-slate-900/80 text-xs text-slate-200"
                value={data.sideSetback !== undefined ? String(data.sideSetback) : "1.0"}
                onChange={(e) => set("sideSetback", e.target.value)}
                placeholder="1.0"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-400">Garage Orientation</Label>
              <Select
                value={data.garageSide || "right"}
                onValueChange={(v: "left" | "right") => set("garageSide", v)}
              >
                <SelectTrigger className="h-7.5 text-xs bg-slate-900/80 border-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="right" className="text-xs">Right Side (Standard)</SelectItem>
                  <SelectItem value="left" className="text-xs">Left Side (Mirror)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 hover:border-slate-700 transition-colors">
            <input
              type="checkbox"
              className="mt-0.5 h-3.5 w-3.5 accent-amber-400 rounded"
              checked={!!data.isBtb}
              onChange={(e) => set("isBtb", e.target.checked)}
            />
            <div>
              <span className="text-[11px] font-medium leading-snug text-slate-200 block">
                Built-To-Boundary (BTB) Wall
              </span>
              <span className="text-[10px] text-slate-400 block leading-tight">
                Places garage wall on side boundary (0.2m setback) to maximize yard space.
              </span>
            </div>
          </label>

          <div className="rounded-lg bg-slate-900/40 p-2 text-[11px] text-slate-400 border border-slate-800/60">
            <span className="text-amber-300 font-semibold">Calculated Lot Depth: </span>
            {data.landSize && data.landFrontage && Number(data.landFrontage) > 0
              ? `${(Number(data.landSize) / Number(data.landFrontage)).toFixed(2)}m`
              : "32.14m"}
            <span className="text-slate-500 ml-2">({data.landSize || 450}m² / {data.landFrontage || 14}m)</span>
          </div>
        </div>
      </Section>

      <Section title="Flyer colour scheme">
        <div className="grid grid-cols-2 gap-2">
          {PALETTES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => set("palette", p.id)}
              className={`rounded-xl border px-3 py-2.5 text-left text-[11px] leading-tight transition-all ${
                data.palette === p.id
                  ? "border-brand-gold/60 bg-gradient-to-r from-amber-500/20 to-brand-gold/15 text-amber-200 shadow-sm"
                  : "border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              <span className="block font-semibold text-slate-200">{p.label}</span>
              <span className="block text-[10px] opacity-70 mt-0.5">{p.hint}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Consultant (footer + QR code)">
        <ConsultantPicker data={data} set={set} />
      </Section>

      <FacadeCheckModal
        isOpen={facadeCheckOpen}
        onClose={() => setFacadeCheckOpen(false)}
        facadeUrl={data.facadeUrl}
        facadeName={data.facadeName || "Current Facade"}
        facadeId={data.facadeId || "custom"}
        housingType={data.housingType || "double"}
        onApplyNewRender={(newUrl) => {
          set("facadeUrl", newUrl);
        }}
      />
    </div>
  );
}
