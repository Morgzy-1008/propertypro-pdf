import { useState, useEffect } from "react";
import { X, Loader2, Plus, Sparkles } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FacadeLibrary } from "./FacadeLibraryDialog";
import { facadeUpliftFor, saveFacadeUplift, loadEnhanced, loadEnhancedAsync, saveEnhanced, hasPreviousEnhanced, revertEnhanced, clearIdbEnhanced, BUILT_IN_FACADES, type FacadeItem } from "./facadeLibrary";
import { prepareFloorplan, prepareFacade, widenFacadeClientSide } from "./fileToImage";
import { resolvePlanRooms } from "./planRooms";
import { authHeaders } from "@/lib/api-auth";

import { facadeCategory, facadeGarage, garageFromCars, type FacadeStorey } from "./facadePricing";
import { duplexFacadesForDesign } from "./duplexFacades.data";
import { MULBERRY_FACADES } from "./acreageFacades.data";
import { PRE_RENDERED_FACADES } from "./preRenderedFacades.data";

import { INCLUSION_RANGES, PALETTES, defaultInclusions, baseRangeItems, type FlyerData } from "./types";
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
      <Label className="text-xs tracking-wide text-muted-foreground">{label}</Label>
      <Input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-semibold tracking-[0.18em] text-brand-gold-deep uppercase">
        {title}
      </h3>
      {children}
    </div>
  );
}

function InclusionsEditor({ data, set }: { data: FlyerData; set: Setter }) {
  const [draft, setDraft] = useState("");
  const items = baseRangeItems(data);

  const update = (next: string[]) => set("inclusions", { ...data.inclusions, [data.range]: next });

  return (
    <div className="space-y-2 rounded-md border bg-muted/40 p-3">
      {items.map((item, idx) => (
        <div key={`${item}-${idx}`} className="flex items-center gap-1.5">
          <Input
            value={item}
            className="h-8 text-xs"
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
            className="h-8 w-8 flex-none"
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
          className="h-8 text-xs"
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
          className="h-8 w-8 flex-none"
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
        className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
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
          className={`w-full rounded-md border px-3 py-2 text-left text-xs leading-tight transition-colors ${
            data.consultantId === c.id
              ? "border-brand-gold-deep bg-brand-navy text-brand-cream"
              : "text-muted-foreground hover:border-primary hover:text-foreground"
          }`}
        >
          <span className="block font-medium">{c.name}</span>
          <span className="block opacity-75">
            {c.phone} · {c.email}
          </span>
          <span className="mt-1 block opacity-75">{c.displayCentre}</span>
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

export function FlyerForm({ data, set }: { data: FlyerData; set: Setter }) {
  const designs = designsFor(data.housingType as HousingType);
  const [facadeBusy, setFacadeBusy] = useState(false);
  const [reRenderAttempts, setReRenderAttempts] = useState<Record<string, number>>({});
  const MAX_RERENDERS = 2;
  const [uplift, setUplift] = useState(0);
  const [variants, setVariants] = useState<FloorplanRecord[]>(() =>
    plansForDesign(data.designName),
  );
  const [canRevertAi, setCanRevertAi] = useState(false);

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

    // Auto-select the first compatible facade for the selected design so the flyer always shows a crisp facade
    const isDualOc = data.housingType === "dual-oc";
    const isAcreage = data.housingType === "acreage";
    const isDouble = data.housingType === "double-storey";
    
    const eligibleList = isDualOc
      ? duplexFacadesForDesign(name)
      : isAcreage
        ? MULBERRY_FACADES
        : BUILT_IN_FACADES.filter((f) => {
            const cat = facadeCategory(f);
            return isDouble ? cat === "double" : cat === "single";
          });

    if (eligibleList && eligibleList.length > 0) {
      void selectFacade(eligibleList[0]);
    } else {
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
    const amount = facadeUpliftFor(item.id, item.name, facadeCategory(item), data.designName);
    setUplift(amount);
    applyPricing(data.designName, data.range, data.landPrice, amount);

    if (forceRefresh) {
      await clearIdbEnhanced(item.id);
      setReRenderAttempts((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }));
    } else {
      setReRenderAttempts((prev) => ({ ...prev, [item.id]: 0 }));
    }

    const rawUrlToUse = item.originalUrl || item.url;

    // 1. Check for pre-rendered local static catalogue FIRST for instant zero-delay render
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

    // 2. Immediately set the original image as the active flyer facade so there is NEVER an empty frame
    set("facadeUrl", rawUrlToUse);

    // 3. Set facadeBusy = true while preparing enhanced wide crop / outpainting
    setFacadeBusy(true);
    set("facadeBusy", true);

    try {
      // 4. Trigger Google Gemini AI Outpainting on the raw Hudson Homes facade photo
      const itemCategory = facadeCategory(item);
      const targetHousingType = itemCategory === "double" ? "double-storey" : data.housingType;
      const aiUrl = await widenFacadeClientSide({
        id: item.id,
        name: item.name,
        url: rawUrlToUse,
        originalUrl: rawUrlToUse,
        housingType: targetHousingType,
        forceRefresh,
      });

      if (aiUrl && aiUrl.startsWith("data:image/")) {
        set("facadeUrl", aiUrl);
        await saveEnhanced(item.id, aiUrl, item.name);
      } else {
        const fallbackRender = await prepareFacade(rawUrlToUse, rawUrlToUse, item.id);
        if (fallbackRender) set("facadeUrl", fallbackRender);
      }
    } catch (err) {
      console.error("[AI Outpaint Error]", err);
      try {
        const fallbackRender = await prepareFacade(item.url, item.originalUrl, item.id);
        if (fallbackRender) set("facadeUrl", fallbackRender);
      } catch {
        set("facadeUrl", rawUrlToUse);
      }
    } finally {
      setFacadeBusy(false);
      set("facadeBusy", false);
    }
  };

  const handleReDoAiEnhancement = async () => {
    if (facadeBusy) return;
    const facadeId = data.facadeId || "custom";
    const attempts = reRenderAttempts[facadeId] ?? 0;
    // Removed MAX_RERENDERS restriction so the user can keep re-doing it if they don't like the AI result

    // Find original facade item details
    const matched = BUILT_IN_FACADES.find((f) => f.id === facadeId);
    const facadeItem: FacadeItem = matched ?? {
      id: facadeId,
      name: data.facadeName || "Custom",
      range: "Standard",
      tags: [],
      url: data.rawFacadeUrl || data.facadeUrl,
    };

    await selectFacade(facadeItem, true);
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

  return (
    <div className="space-y-7">
      <Section title="Location">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Suburb" value={data.suburb} onChange={(v) => set("suburb", v)} />
          <Field label="Estate" value={data.estate} onChange={(v) => set("estate", v)} />
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

        {data.designName && (
          <p className="rounded-md border bg-muted/40 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
            {data.floorplanUrl
              ? `${data.floorplanName} · ${data.beds} bed · ${data.baths} bath · ${data.cars} car · ${data.floorplanSize} m² — floorplan, specs and other sizes filled in automatically.`
              : "No published floorplan drawing found for this design yet."}
          </p>
        )}

        <Section title="Inclusions range">
          <div className="grid grid-cols-3 gap-2">
            {INCLUSION_RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => selectRange(r.id)}
                className={`rounded-md border px-2 py-2.5 text-[11px] font-medium leading-tight transition-colors ${
                  data.range === r.id
                    ? "border-brand-gold-deep bg-brand-navy text-brand-cream"
                    : "text-muted-foreground hover:border-primary hover:text-foreground"
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
                    disabled={facadeBusy || !data.facadeName}
                    onClick={handleReDoAiEnhancement}
                    className="flex-none gap-1.5 border-brand-gold-deep/50 hover:border-brand-gold hover:bg-brand-gold/10 text-xs font-medium"
                    title="Re-generate AI facade outpainting variation"
                  >
                    {facadeBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-brand-gold-deep" />
                    )}
                    Re-do AI
                  </Button>
                  {canRevertAi && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={facadeBusy}
                      onClick={handleRevertAi}
                      className="flex-none text-xs text-muted-foreground border-brand-gold-deep/30 hover:border-brand-gold hover:bg-brand-gold/5"
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
          <p className="text-[11px] leading-snug text-muted-foreground">
            Showing only the facades Hudson publishes for this{" "}
            {data.housingType === "acreage" ? "acreage (Mulberry) design" : "duplex design"}.
          </p>
        )}
        {garage && !designFacades?.length && (
          <p className="text-[11px] leading-snug text-muted-foreground">
            Filtered to {garage === 1 ? "single" : "double"} garage facades to match the{" "}
            {data.cars} car floorplan.
          </p>
        )}
        {!data.designName && (
          <p className="text-[11px] leading-snug text-muted-foreground">
            Choose a design first — the library then only shows the facades offered for it.
          </p>
        )}
        {data.facadeName && (
          <div className="space-y-1.5 rounded-md border bg-muted/40 p-3">
            <div className="flex items-center gap-2 text-xs font-medium">
              {data.facadeName} facade
              {facadeBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            </div>
            <Label className="text-[11px] tracking-wide text-muted-foreground">
              Facade upgrade cost (added to the house price)
            </Label>
            <Input
              className="h-8 text-xs"
              value={uplift ? String(uplift) : ""}
              placeholder="0"
              inputMode="numeric"
              onChange={(e) => setUpliftValue(parseAud(e.target.value))}
            />
            <p className="text-[11px] leading-snug text-muted-foreground">
              Filled in automatically from the QLD retail facade price list for the selected housing
              type. Editing it saves an override for this facade.
            </p>
          </div>
        )}
      </Section>

      <Section title="Additional costs (automated, adjustable)">
        <div className="space-y-2 rounded-md border bg-muted/40 p-3">
          <label className="flex cursor-pointer items-start gap-2 rounded-md border bg-background p-2.5">
            <input
              type="checkbox"
              className="mt-0.5 h-3.5 w-3.5 accent-current"
              checked={data.landscaping}
              onChange={(e) => toggleLandscaping(e.target.checked)}
            />
            <span className="text-[11px] font-medium leading-snug">Landscaping package</span>
          </label>
          {COST_FIELDS.map((f) => (
            <div key={f.id} className="flex items-center gap-2">
              <Label className="flex-1 text-[11px] leading-tight text-muted-foreground">
                {f.label}
              </Label>
              <Input
                className="h-8 w-28 text-xs"
                inputMode="numeric"
                value={data.costs[f.id] ? String(data.costs[f.id]) : "0"}
                onChange={(e) => setCost(f.id, parseAud(e.target.value))}
              />
            </div>
          ))}
          <div className="flex items-center justify-between border-t pt-2 text-xs font-medium">
            <span>Total additional costs</span>
            <span>{formatAud(costsTotal(data.costs))}</span>
          </div>
          <button
            type="button"
            className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
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

      <Section title="Flyer colour scheme">
        <div className="grid grid-cols-2 gap-2">
          {PALETTES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => set("palette", p.id)}
              className={`rounded-md border px-2.5 py-2 text-left text-[11px] leading-tight transition-colors ${
                data.palette === p.id
                  ? "border-brand-gold-deep bg-brand-navy text-brand-cream"
                  : "text-muted-foreground hover:border-primary hover:text-foreground"
              }`}
            >
              <span className="block font-medium">{p.label}</span>
              <span className="block opacity-70">{p.hint}</span>
            </button>
          ))}
        </div>
      </Section>


      <Section title="Consultant (footer + QR code)">
        <ConsultantPicker data={data} set={set} />
      </Section>
    </div>
  );
}
