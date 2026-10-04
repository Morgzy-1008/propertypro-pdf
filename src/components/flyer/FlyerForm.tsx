import { useState, useEffect, useMemo } from "react";
import { X, Loader2, Plus, Sparkles, CheckCircle2, Pencil, Trash2, RotateCcw, Upload, Building2 } from "lucide-react";
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

import { facadeCategory, facadeGarage, garageFromCars, facadeBaseName, isSingleGarageDesign, type FacadeStorey } from "./facadePricing";
import { isNarrowDoubleStorey } from "@/lib/quoting/facadeLookup";
import { duplexFacadesForDesign } from "./duplexFacades.data";
import { MULBERRY_FACADES } from "./acreageFacades.data";
import { HUDSON_FACADES } from "./facades.data";
import { PRE_RENDERED_FACADES } from "./preRenderedFacades.data";

import { INCLUSION_RANGES, defaultInclusions, baseRangeItems, type FlyerData } from "./types";
import { ESTATE_PRESETS, matchEstatePreset } from "./sitingEngine";
import {
  BASE_PARTNER_DEVELOPERS,
  loadAllPartnerDevelopers,
  findPartnerForEstate,
  getPartnerPreset,
  saveCustomPartner,
  updatePartnerPreset,
  resetPartnerPreset,
  deleteCustomPartner,
  type PartnerDeveloperPreset,
} from "./partnerDevelopers";
import { landscapingPriceFor } from "@/lib/landscaping";
import { AddressAutocompleteInput } from "@/components/common/AddressAutocompleteInput";

import { plansForDesign, otherSizesForDesign } from "./floorplans";
import type { FloorplanRecord } from "./floorplans.data";
import { getHudsonDimensions } from "@/lib/hudsonDimensions.data";
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
import { getActiveDivision, onDivisionChanged, type Division } from "@/lib/divisionContext";
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
  onBlur,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onBlur?: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium tracking-wide text-slate-300">{label}</Label>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="h-8.5 rounded-lg border-slate-800 bg-slate-950/70 text-xs text-slate-100 placeholder:text-slate-500 focus:border-brand-gold/60 focus:ring-brand-gold/20 transition-all"
      />
    </div>
  );
}

function Section({
  title,
  children,
  id,
  extra,
}: {
  title: string;
  children: React.ReactNode;
  id?: string;
  extra?: React.ReactNode;
}) {
  return (
    <div id={id} className="space-y-3.5 pt-1 scroll-mt-14">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-bold tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-brand-gold to-amber-400 uppercase">
          {title}
        </h3>
        {extra}
      </div>
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
      {CONSULTANTS.map((c) => {
        const isSelected =
          data.consultantId === c.id ||
          (data.contactEmail && data.contactEmail.toLowerCase() === c.email.toLowerCase()) ||
          (data.contactName && data.contactName.toLowerCase() === c.name.toLowerCase());

        return (
          <button
            key={c.id}
            type="button"
            onClick={() => choose(c.id)}
            className={`w-full rounded-xl border p-3 text-left text-xs leading-tight transition-all ${
              isSelected
                ? "border-brand-gold/70 bg-gradient-to-r from-amber-500/20 to-brand-gold/15 text-amber-200 shadow-md shadow-brand-gold/10 ring-1 ring-brand-gold/50"
                : "border-slate-800/80 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="block font-semibold text-slate-200">{c.name}</span>
              {isSelected && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold border border-brand-gold/40 uppercase tracking-wider">
                  Active
                </span>
              )}
            </div>
            <span className="block text-[11px] opacity-75 mt-0.5">
              {c.phone} · {c.email}
            </span>
            <span className="mt-1 block text-[10px] uppercase tracking-wider text-brand-gold font-medium">{c.displayCentre}</span>
          </button>
        );
      })}
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

function resolveDefaultFacade(
  planCars: string | number | undefined,
  housingType: string,
  designName: string,
  currentFacadeId?: string,
  currentFacadeName?: string,
): FacadeItem | null {
  const storey = storeyFor(housingType);
  const targetGarage = garageFromCars(planCars) ?? (isSingleGarageDesign(designName, housingType) ? 1 : null);

  if (housingType === "dual-oc") {
    const list = duplexFacadesForDesign(designName);
    if (list && list.length > 0) {
      if (currentFacadeId) {
        const existing = list.find((f) => f.id === currentFacadeId);
        if (existing) return existing;
      }
      return list[0];
    }
  }

  if (housingType === "acreage") {
    if (currentFacadeId) {
      const existing = MULBERRY_FACADES.find((f) => f.id === currentFacadeId);
      if (existing) return existing;
    }
    return MULBERRY_FACADES.find((f) => f.id === "classic-ranch") || MULBERRY_FACADES[0] || null;
  }

  if (housingType === "split-level") {
    const match = HUDSON_FACADES.find((f) => f.id === "classic-cobalt");
    if (match) return match;
  }

  if (storey === "double") {
    const isNarrow = isNarrowDoubleStorey(designName);
    const targetId = isNarrow ? "classic-narrow-dg" : "classic-double-garage";
    if (currentFacadeId && currentFacadeId !== "classic" && currentFacadeId !== "classic-single-garage") {
      const existing = HUDSON_FACADES.find(
        (f) => f.id === currentFacadeId && (f.range === "Double Storey" || f.range === "Narrow Double Storey")
      );
      if (existing) return existing;
      const base = facadeBaseName(currentFacadeName || currentFacadeId);
      const match = HUDSON_FACADES.find(
        (f) => (f.range === "Double Storey" || f.range === "Narrow Double Storey") && facadeBaseName(f.name) === base
      );
      if (match) return match;
    }
    return HUDSON_FACADES.find((f) => f.id === targetId) || HUDSON_FACADES.find((f) => f.range === "Double Storey") || null;
  }

  // Single Storey
  if (targetGarage === 1) {
    if (currentFacadeId) {
      const base = facadeBaseName(currentFacadeName || currentFacadeId);
      const existing = HUDSON_FACADES.find((f) => f.id === currentFacadeId && facadeGarage(f) === 1);
      if (existing) return existing;

      const match = HUDSON_FACADES.find((f) => facadeGarage(f) === 1 && facadeBaseName(f.name) === base);
      if (match) return match;
    }
    return HUDSON_FACADES.find((f) => f.id === "classic-single-garage") || null;
  } else {
    if (currentFacadeId) {
      const base = facadeBaseName(currentFacadeName || currentFacadeId);
      const existing = HUDSON_FACADES.find((f) => f.id === currentFacadeId && facadeGarage(f) !== 1 && f.range === "Single Storey");
      if (existing) return existing;

      const match = HUDSON_FACADES.find((f) => f.range === "Single Storey" && facadeGarage(f) !== 1 && facadeBaseName(f.name) === base);
      if (match) return match;
    }
    return HUDSON_FACADES.find((f) => f.id === "classic") || null;
  }
}

export function FlyerForm({ data, set, template }: { data: FlyerData; set: Setter; template?: TemplateId }) {
  const [division, setDivision] = useState<Division>(() => getActiveDivision());

  useEffect(() => {
    return onDivisionChanged((newDiv) => {
      setDivision(newDiv);
    });
  }, []);

  const designs = useMemo(() => designsFor(data.housingType as HousingType, division), [data.housingType, division]);
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
  const [uplift, setUplift] = useState<number>(() => {
    if (!data.facadeId && !data.facadeName) return 0;
    return facadeUpliftFor(
      data.facadeId,
      data.facadeName,
      storeyFor(data.housingType) ?? undefined,
      data.designName,
    );
  });
  const [upliftInput, setUpliftInput] = useState<string>(() =>
    uplift === 0 ? "0" : String(uplift),
  );
  const [variants, setVariants] = useState<FloorplanRecord[]>(() =>
    plansForDesign(data.designName),
  );
  const [canRevertAi, setCanRevertAi] = useState(false);
  const [facadeCheckOpen, setFacadeCheckOpen] = useState(false);

  const housePriceNum = parseAud(data.housePrice);
  const landPriceNum = parseAud(data.landPrice);
  const totalPriceNum = (housePriceNum > 0 && landPriceNum > 0)
    ? housePriceNum + landPriceNum
    : parseAud(data.price);
  const hasCalculatedPrice = totalPriceNum > 0;
  const formattedTotalPrice = formatAud(totalPriceNum);

  const activeDivision = getActiveDivision();
  const [developerStateFilter, setDeveloperStateFilter] = useState<"NSW" | "QLD" | "ALL">(activeDivision);
  const [availableDevelopers, setAvailableDevelopers] = useState<PartnerDeveloperPreset[]>(() =>
    loadAllPartnerDevelopers(activeDivision)
  );

  useEffect(() => {
    const unsub = onDivisionChanged((div) => {
      setDeveloperStateFilter(div);
      setAvailableDevelopers(loadAllPartnerDevelopers(div));
    });
    return unsub;
  }, []);

  useEffect(() => {
    setAvailableDevelopers(loadAllPartnerDevelopers(developerStateFilter));
  }, [developerStateFilter]);

  const refreshDevelopers = () => {
    setAvailableDevelopers(loadAllPartnerDevelopers(developerStateFilter));
  };

  // Add Developer Partner Modal state
  const [isAddDevOpen, setIsAddDevOpen] = useState(false);
  const [newDevName, setNewDevName] = useState("");
  const [newDevState, setNewDevState] = useState<"NSW" | "QLD" | "ALL">(activeDivision);
  const [newDevLogoUrl, setNewDevLogoUrl] = useState("");
  const [newDevEstate, setNewDevEstate] = useState("");

  // Edit / Customise Developer Partner Modal state
  const [editingDev, setEditingDev] = useState<PartnerDeveloperPreset | null>(null);
  const [editDevName, setEditDevName] = useState("");
  const [editDevState, setEditDevState] = useState<"NSW" | "QLD" | "ALL">("ALL");
  const [editDevLogoUrl, setEditDevLogoUrl] = useState("");
  const [editDevEstate, setEditDevEstate] = useState("");

  const matchedPartnerSuggestion = useMemo(() => {
    return findPartnerForEstate(data.estate, data.suburb, developerStateFilter);
  }, [data.estate, data.suburb, developerStateFilter]);

  const handleSaveNewDeveloper = () => {
    if (!newDevName.trim()) {
      toast.error("Please enter a developer name");
      return;
    }
    if (!newDevLogoUrl.trim()) {
      toast.error("Please provide a developer logo (upload an image or enter a URL)");
      return;
    }
    const created = saveCustomPartner({
      name: newDevName.trim(),
      state: newDevState,
      logoUrl: newDevLogoUrl.trim(),
      defaultEstate: newDevEstate.trim() || undefined,
      matchedEstates: newDevEstate ? [newDevEstate.toLowerCase().trim()] : [],
    });
    refreshDevelopers();
    set("partnerEnabled", true);
    set("partnerDeveloperId", created.id);
    set("partnerName", created.name);
    set("partnerLogoUrl", created.logoUrl);
    setIsAddDevOpen(false);
    setNewDevName("");
    setNewDevLogoUrl("");
    setNewDevEstate("");
    toast.success(`Developer "${created.name}" created and applied to flyer!`);
  };

  const handleOpenEditDev = (dev: PartnerDeveloperPreset, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDev(dev);
    setEditDevName(dev.name);
    setEditDevState(dev.state || "ALL");
    setEditDevLogoUrl(dev.logoUrl);
    setEditDevEstate(dev.defaultEstate || "");
  };

  const handleSaveEditDev = () => {
    if (!editingDev) return;
    if (!editDevName.trim()) {
      toast.error("Developer name cannot be empty");
      return;
    }
    updatePartnerPreset(editingDev.id, {
      name: editDevName.trim(),
      state: editDevState,
      logoUrl: editDevLogoUrl.trim() || editingDev.logoUrl,
      defaultEstate: editDevEstate.trim() || undefined,
    });
    refreshDevelopers();
    if (data.partnerDeveloperId === editingDev.id) {
      set("partnerName", editDevName.trim());
      if (editDevLogoUrl.trim()) {
        set("partnerLogoUrl", editDevLogoUrl.trim());
      }
    }
    setEditingDev(null);
    toast.success(`Updated developer "${editDevName}"!`);
  };

  const handleResetDev = () => {
    if (!editingDev) return;
    resetPartnerPreset(editingDev.id);
    refreshDevelopers();
    const base = BASE_PARTNER_DEVELOPERS.find((b) => b.id === editingDev.id);
    if (base && data.partnerDeveloperId === base.id) {
      set("partnerName", base.name);
      set("partnerLogoUrl", base.logoUrl);
    }
    setEditingDev(null);
    toast.success(`Reset "${editingDev.name}" back to default factory logo.`);
  };

  const handleDeleteCustomDev = () => {
    if (!editingDev) return;
    deleteCustomPartner(editingDev.id);
    refreshDevelopers();
    if (data.partnerDeveloperId === editingDev.id) {
      set("partnerDeveloperId", "");
      set("partnerName", "");
      set("partnerLogoUrl", "");
      set("partnerEnabled", false);
    }
    setEditingDev(null);
    toast.success(`Deleted developer "${editingDev.name}".`);
  };

  useEffect(() => {
    if (data.facadeId || data.facadeName) {
      const calculated = facadeUpliftFor(
        data.facadeId,
        data.facadeName,
        storeyFor(data.housingType) ?? undefined,
        data.designName,
      );
      setUplift(calculated);
      setUpliftInput(calculated === 0 ? "0" : String(calculated));
    } else {
      setUplift(0);
      setUpliftInput("0");
    }
  }, [data.facadeId, data.facadeName, data.housingType, data.designName]);

  useEffect(() => {
    const checkRevert = async () => {
      const facadeId = data.facadeId || "custom";
      const hasPrev = await hasPreviousEnhanced(facadeId);
      setCanRevertAi(hasPrev);
    };
    checkRevert();
  }, [data.facadeId, data.facadeUrl]);

  // Auto-sync facade if floorplan/garage spaces change or if design is selected without a facade
  useEffect(() => {
    if (!data.designName && !data.cars) return;
    const g = garageFromCars(data.cars) ?? (isSingleGarageDesign(data.designName, data.housingType) ? 1 : null);
    const currentG = data.facadeId || data.facadeName || data.facadeUrl
      ? facadeGarage({ id: data.facadeId, name: data.facadeName, url: data.facadeUrl, tags: [] })
      : null;

    const needsSync =
      !data.facadeUrl ||
      (g === 1 && currentG === 2) ||
      (g === 2 && currentG === 1);

    if (needsSync) {
      const match = resolveDefaultFacade(
        data.cars,
        data.housingType,
        data.designName,
        data.facadeId,
        data.facadeName,
      );
      if (match) {
        set("facadeId", match.id);
        set("facadeName", match.name);
        set("facadeUrl", match.url);
        set("rawFacadeUrl", match.originalUrl || match.url);
        const amount = facadeUpliftFor(
          match.id,
          match.name,
          storeyFor(data.housingType) ?? undefined,
          data.designName,
        );
        setUplift(amount);
        setUpliftInput(amount === 0 ? "0" : String(amount));
        applyPricing(data.designName, data.range, data.landPrice, amount);
      }
    }
  }, [data.designName, data.cars, data.housingType]);

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
  const garage = garageFromCars(data.cars) ?? (isSingleGarageDesign(data.designName, data.housingType) ? 1 : null);

  const applyPricing = (
    designName: string,
    range: FlyerData["range"],
    landPrice: string,
    facadeUplift: number,
    costs = data.costs,
    activeDiv: Division = division,
  ) => {
    const house = housePriceFor(designName, range, activeDiv);
    if (house === null) return;
    const houseOnlyTotal = house + facadeUplift;
    const packageTotal = houseOnlyTotal + costsTotal(costs) + parseAud(landPrice);
    set("housePrice", formatAud(houseOnlyTotal));
    set("price", formatAud(packageTotal));
  };

  useEffect(() => {
    if (data.designName) {
      applyPricing(data.designName, data.range, data.landPrice, uplift, data.costs, division);
    }
  }, [division]);

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

    // Populate exact house dimensions for siting and setbacks
    const dim = getHudsonDimensions(plan.label) || getHudsonDimensions(data.designName || plan.design);
    if (dim) {
      set("houseWidthM", dim.width);
      set("houseLengthM", dim.length);
    } else if (plan.houseWidth && plan.houseLength) {
      set("houseWidthM", parseFloat(plan.houseWidth));
      set("houseLengthM", parseFloat(plan.houseLength));
    }

    // Auto-select matching facade for this plan & garage spaces
    const facade = resolveDefaultFacade(
      plan.cars,
      data.housingType,
      data.designName || plan.design,
      data.facadeId,
      data.facadeName,
    );

    let nextUplift = uplift;
    if (facade) {
      set("facadeId", facade.id);
      set("facadeName", facade.name);
      set("facadeUrl", facade.url);
      set("rawFacadeUrl", facade.originalUrl || facade.url);

      nextUplift = facadeUpliftFor(
        facade.id,
        facade.name,
        storeyFor(data.housingType) ?? undefined,
        data.designName || plan.design,
      );
      setUplift(nextUplift);
      setUpliftInput(nextUplift === 0 ? "0" : String(nextUplift));
    }

    applyPricing(data.designName || plan.design, data.range, data.landPrice, nextUplift);

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
      const dim = getHudsonDimensions(name);
      if (dim) {
        set("houseWidthM", dim.width);
        set("houseLengthM", dim.length);
      }

      const facade = resolveDefaultFacade(
        data.cars,
        data.housingType,
        name,
        data.facadeId,
        data.facadeName,
      );
      let nextUplift = uplift;
      if (facade) {
        set("facadeId", facade.id);
        set("facadeName", facade.name);
        set("facadeUrl", facade.url);
        set("rawFacadeUrl", facade.originalUrl || facade.url);
        nextUplift = facadeUpliftFor(
          facade.id,
          facade.name,
          storeyFor(data.housingType) ?? undefined,
          name,
        );
        setUplift(nextUplift);
        setUpliftInput(nextUplift === 0 ? "0" : String(nextUplift));
      }

      const costs = data.landscaping
        ? {
            ...data.costs,
            driveway: 0,
            landscaping: landscapingPriceFor(data.landSize, data.housingType, name),
          }
        : data.costs;
      applyPricing(name, data.range, data.landPrice, nextUplift, costs);
    }
    const sizes = otherSizesForDesign(name);
    set("otherSizes", sizes);
    set("showOtherSizes", sizes.length > 0);
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

  const setLandFrontage = (v: string) => {
    set("landFrontage", v);
  };

  const setHousePrice = (v: string) => {
    set("housePrice", v);
    const h = parseAud(v);
    const l = parseAud(data.landPrice);
    if (h > 0 && l > 0) {
      set("price", formatAud(h + l));
    } else if (h > 0) {
      set("price", formatAud(h));
    }
  };

  // Automatically derive landDepth from landSize / landFrontage if available
  useEffect(() => {
    const size = parseFloat(String(data.landSize || ""));
    const frontage = parseFloat(String(data.landFrontage || ""));
    if (size > 0 && frontage > 0) {
      const derivedDepth = (size / frontage).toFixed(2);
      if (String(data.landDepth) !== derivedDepth) {
        set("landDepth", derivedDepth);
      }
    }
  }, [data.landSize, data.landFrontage, data.landDepth, set]);

  // Keep total price automatically calculated whenever house price and land price are filled
  useEffect(() => {
    const h = parseAud(data.housePrice);
    const l = parseAud(data.landPrice);
    if (h > 0 && l > 0) {
      const totalStr = formatAud(h + l);
      if (data.price !== totalStr) {
        set("price", totalStr);
      }
    }
  }, [data.housePrice, data.landPrice, data.price, set]);

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
    const l = parseAud(v);
    const h = parseAud(data.housePrice);
    if (h > 0 && l > 0) {
      set("price", formatAud(h + l));
    }
    applyPricing(data.designName, data.range, v, uplift);
  };

  const setUpliftValue = (amount: number) => {
    setUplift(amount);
    setUpliftInput(amount === 0 ? "0" : String(amount));
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
    setUpliftInput(amount === 0 ? "0" : String(amount));
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

    toast.loading("Generating fresh architectural AI facade render...", { id: "ai-enhance" });

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

    // Auto-detect developer partner if matched
    const matchedPartner = findPartnerForEstate(estateQuery, suburbQuery, developerStateFilter);
    if (matchedPartner && !data.partnerEnabled) {
      set("partnerDeveloperId", matchedPartner.id);
      set("partnerName", matchedPartner.name);
      set("partnerLogoUrl", matchedPartner.logoUrl);
    }
  };

  /** Smoothly scrolls the sidebar to the target section WITHOUT scrolling the window or displacing the top task bar */
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const aside = el.closest("aside") || document.querySelector("aside");
    if (aside) {
      const asideRect = aside.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const targetTop = elRect.top - asideRect.top + aside.scrollTop - 48;
      aside.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-7 relative">
      {/* Sticky Quick-Jump Navigation Bar */}
      <div className="sticky -top-5 z-20 -mx-5 -mt-5 mb-3 border-b border-slate-800/80 bg-slate-900/95 px-4 py-2.5 backdrop-blur-xl shadow-md">
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-0.5 text-[11px]">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => scrollToSection("section-location")}
              className="px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-amber-500/20 hover:text-amber-300 text-slate-300 transition-colors whitespace-nowrap font-medium text-[11px]"
            >
              Location
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("section-partner")}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap font-medium text-[11px] ${
                data.partnerEnabled
                  ? "bg-amber-500/25 text-amber-300 border border-amber-500/40 font-semibold shadow-xs"
                  : "bg-slate-800/80 hover:bg-amber-500/20 hover:text-amber-300 text-slate-300"
              }`}
            >
              Partner
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("section-package")}
              className="px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-amber-500/20 hover:text-amber-300 text-slate-300 transition-colors whitespace-nowrap font-medium text-[11px]"
            >
              Package
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("section-facade")}
              className="px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-amber-500/20 hover:text-amber-300 text-slate-300 transition-colors whitespace-nowrap font-medium text-[11px]"
            >
              Facade
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("section-costs")}
              className="px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-amber-500/20 hover:text-amber-300 text-slate-300 transition-colors whitespace-nowrap font-medium text-[11px]"
            >
              Costs
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("section-consultant")}
              className="px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-amber-500/20 hover:text-amber-300 text-slate-300 transition-colors whitespace-nowrap font-medium text-[11px]"
            >
              Consultant
            </button>
            {(template === "siting" || template === "siting-v2") && (
              <button
                type="button"
                onClick={() => scrollToSection("section-siting")}
                className="px-2.5 py-1 rounded-md bg-amber-500/25 text-amber-300 border border-amber-500/40 hover:bg-amber-500/35 transition-colors whitespace-nowrap font-semibold text-[11px] shadow-sm"
              >
                Siting & Setbacks
              </button>
            )}
            <button
              type="button"
              onClick={() => scrollToSection("section-terms")}
              className="px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-amber-500/20 hover:text-amber-300 text-slate-300 transition-colors whitespace-nowrap font-medium text-[11px]"
            >
              Terms
            </button>
          </div>
          {hasCalculatedPrice && (
            <button
              type="button"
              onClick={() => scrollToSection("section-package")}
              className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gradient-to-r from-amber-500/25 to-brand-gold/25 border border-brand-gold/50 text-brand-gold font-bold text-xs shadow-sm hover:brightness-110 transition-all cursor-pointer"
              title="Auto-calculated package total. Click to jump to Package section"
            >
              <span className="text-[10px] text-amber-300/80 uppercase font-medium">Total:</span>
              <span className="text-amber-200">{formattedTotalPrice}</span>
            </button>
          )}
        </div>
      </div>

      <Section id="section-location" title="Location">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium tracking-wide text-slate-300">Address</Label>
            <span className="text-[10px] text-cyan-400 font-medium">Type address to auto-fill suburb &amp; estate</span>
          </div>
          <AddressAutocompleteInput
            value={data.address}
            onChange={(v) => set("address", v)}
            onSelectAddress={(item) => {
              const fullAddr = item.fullStreet || item.streetName || item.formattedAddress.split(",")[0];
              const addrWithLot = item.lotNumber ? `Lot ${item.lotNumber}, ${fullAddr}` : fullAddr;
              set("address", addrWithLot);
              if (item.lotNumber) {
                set("lotId", item.lotNumber);
              }
              if (item.suburb) {
                set("suburb", item.suburb);
                onLocationChange("suburb", item.suburb);
              }
              if (item.estate || item.suburb) {
                if (item.estate) set("estate", item.estate);
                const matched = matchEstatePreset(item.estate || "", item.suburb || "");
                if (matched && matched.id !== "standard") {
                  set("estatePreset", matched.id);
                  set("frontSetback", matched.frontSetback);
                  set("garageSetback", matched.garageSetback);
                  set("sideSetback", matched.sideSetback);
                }
              }
            }}
            placeholder="e.g. Lot 134, Sovereign Way or 31 Broad Axe Cres"
            className="border-slate-700 bg-slate-900/80 text-slate-100"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium tracking-wide text-slate-300">Suburb</Label>
            <AddressAutocompleteInput
              value={data.suburb}
              onChange={(v) => onLocationChange("suburb", v)}
              onSelectAddress={(item) => {
                if (item.suburb) {
                  set("suburb", item.suburb);
                  onLocationChange("suburb", item.suburb);
                }
                if (item.estate || item.suburb) {
                  if (item.estate) set("estate", item.estate);
                  const matched = matchEstatePreset(item.estate || "", item.suburb || "");
                  if (matched && matched.id !== "standard") {
                    set("estatePreset", matched.id);
                    set("frontSetback", matched.frontSetback);
                    set("garageSetback", matched.garageSetback);
                    set("sideSetback", matched.sideSetback);
                  }
                }
              }}
              placeholder="e.g. Flagstone / Coomera / Ripley"
              className="border-slate-700 bg-slate-900/80 text-slate-100"
            />
          </div>
          <Field label="Estate" value={data.estate} onChange={(v) => onLocationChange("estate", v)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Land m²" value={data.landSize} onChange={setLandSize} placeholder="e.g. 450" />
          <Field
            label="Frontage m"
            value={data.landFrontage}
            onChange={setLandFrontage}
            placeholder="e.g. 14"
          />
        </div>
      </Section>

      <Section
        id="section-partner"
        title="Developer Partner & Logo"
        extra={
          data.partnerEnabled && data.partnerName ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-semibold border border-amber-500/30">
              <CheckCircle2 className="w-3 h-3 text-amber-400" />
              {data.partnerName}
            </span>
          ) : null
        }
      >
        {/* Toggle Switch Card */}
        <div className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/70 shadow-sm">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-200">Enable Developer Partner Logo</span>
              {data.partnerEnabled && (
                <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300">
                  Active
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Display developer partner logo seamlessly on the RHS beside the package headline
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !data.partnerEnabled;
              set("partnerEnabled", next);
              if (next && !data.partnerDeveloperId && matchedPartnerSuggestion) {
                set("partnerDeveloperId", matchedPartnerSuggestion.id);
                set("partnerName", matchedPartnerSuggestion.name);
                set("partnerLogoUrl", matchedPartnerSuggestion.logoUrl);
              }
            }}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              data.partnerEnabled ? "bg-amber-500" : "bg-slate-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                data.partnerEnabled ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Smart Detection Banner when matching partner detected but not enabled */}
        {matchedPartnerSuggestion && !data.partnerEnabled && (
          <div className="flex items-center justify-between p-2.5 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-slate-900/60 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              <div className="text-xs text-amber-200">
                Found developer partner <strong>{matchedPartnerSuggestion.name}</strong> for {data.estate || data.suburb}!
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                set("partnerEnabled", true);
                set("partnerDeveloperId", matchedPartnerSuggestion.id);
                set("partnerName", matchedPartnerSuggestion.name);
                set("partnerLogoUrl", matchedPartnerSuggestion.logoUrl);
              }}
              className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-sm whitespace-nowrap"
            >
              1-Click Apply
            </button>
          </div>
        )}

        {/* Controls when partner is enabled */}
        {data.partnerEnabled && (
          <div className="space-y-3 pt-1">
            {/* State Personalization Tabs & Add Developer button */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-900 border border-slate-800">
                {(["NSW", "QLD", "ALL"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setDeveloperStateFilter(st)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                      developerStateFilter === st
                        ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {st === "ALL" ? "All States" : st}
                    {st === activeDivision && (
                      <span className="ml-1 text-[9px] opacity-75 font-normal">(Your State)</span>
                    )}
                  </button>
                ))}
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setNewDevState(developerStateFilter === "ALL" ? activeDivision : developerStateFilter);
                  setIsAddDevOpen(true);
                }}
                className="h-7 text-xs border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500 hover:text-slate-950 font-semibold gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Developer
              </Button>
            </div>

            {/* Developer Selector Grid */}
            <div className="space-y-1.5">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {availableDevelopers.map((dev) => {
                  const isSelected = data.partnerDeveloperId === dev.id;
                  return (
                    <div
                      key={dev.id}
                      role="button"
                      tabIndex={0}
                      data-dev-id={dev.id}
                      className={`group relative flex flex-col items-center justify-between p-2 rounded-xl border text-center transition-all cursor-pointer select-none ${
                        isSelected
                          ? "border-amber-500 bg-amber-500/20 text-amber-200 shadow-sm ring-1 ring-amber-500/50"
                          : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900/90"
                      }`}
                      onClick={() => {
                        set("partnerDeveloperId", dev.id);
                        set("partnerName", dev.name);
                        set("partnerLogoUrl", dev.logoUrl);
                        set("partnerEnabled", true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          set("partnerDeveloperId", dev.id);
                          set("partnerName", dev.name);
                          set("partnerLogoUrl", dev.logoUrl);
                          set("partnerEnabled", true);
                        }
                      }}
                    >
                      {/* Edit / Customise Button in corner */}
                      <button
                        type="button"
                        title={`Customise ${dev.name} logo & settings`}
                        onClick={(e) => handleOpenEditDev(dev, e)}
                        className="absolute top-1 right-1 p-1 rounded-md text-slate-400 hover:text-amber-300 hover:bg-slate-800/90 transition-colors z-10 opacity-70 hover:opacity-100"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>

                      {/* State or Custom badge */}
                      <div className="w-full flex items-center justify-start gap-1 mb-1">
                        {dev.isCustom && (
                          <span className="text-[8px] font-bold px-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            Custom
                          </span>
                        )}
                        {dev.isOverridden && (
                          <span className="text-[8px] font-bold px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Edited
                          </span>
                        )}
                        {dev.state && dev.state !== "ALL" && (
                          <span className="text-[8px] font-bold px-1 rounded bg-slate-800 text-slate-400">
                            {dev.state}
                          </span>
                        )}
                      </div>

                      {/* Logo preview */}
                      <div className="h-7 w-full flex items-center justify-center my-1 px-1">
                        {dev.logoUrl ? (
                          <img
                            src={dev.logoUrl}
                            alt={dev.name}
                            className="max-h-6 max-w-[85%] object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <Building2 className="w-5 h-5 text-slate-500" />
                        )}
                      </div>

                      <span className="text-[10px] font-bold truncate w-full mt-1">{dev.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Selected Logo Preview Card */}
            {data.partnerLogoUrl && (
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-800 bg-white/95 text-slate-900 shadow-inner mt-2">
                <div className="flex items-center gap-3">
                  <img
                    src={data.partnerLogoUrl}
                    alt={data.partnerName || "Partner"}
                    className="h-6.5 max-w-[130px] object-contain"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900 leading-tight">
                      {data.partnerName || "Developer Partner"}
                    </div>
                    <div className="text-[10px] text-slate-600 font-medium">
                      Automated on RHS between Hudson Homes and package name
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      const matched = availableDevelopers.find((d) => d.id === data.partnerDeveloperId);
                      if (matched) handleOpenEditDev(matched, e);
                    }}
                    className="h-7 text-xs border-slate-300 text-slate-800 hover:bg-slate-100 gap-1 font-semibold"
                  >
                    <Pencil className="w-3 h-3" />
                    Customise Logo
                  </Button>
                  <button
                    type="button"
                    title="Remove developer partner"
                    onClick={() => {
                      set("partnerDeveloperId", "");
                      set("partnerName", "");
                      set("partnerLogoUrl", "");
                      set("partnerEnabled", false);
                    }}
                    className="p-1 rounded-md text-slate-500 hover:text-red-600 hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Add New Developer Modal */}
      {isAddDevOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100">Add New Developer Partner</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddDevOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <Label className="text-xs text-slate-300">Developer Name</Label>
                <Input
                  value={newDevName}
                  onChange={(e) => setNewDevName(e.target.value)}
                  placeholder="e.g. Cedar Woods, Stockland, Lendlease"
                  className="mt-1 h-8.5 rounded-lg border-slate-800 bg-slate-900 text-xs text-slate-100"
                />
              </div>

              <div>
                <Label className="text-xs text-slate-300">State Availability</Label>
                <div className="grid grid-cols-3 gap-1.5 mt-1">
                  {(["NSW", "QLD", "ALL"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setNewDevState(st)}
                      className={`p-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        newDevState === st
                          ? "border-amber-500 bg-amber-500/20 text-amber-200"
                          : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      {st === "ALL" ? "Both / National" : `${st} Only`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs text-slate-300">Developer Logo</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={newDevLogoUrl}
                    onChange={(e) => setNewDevLogoUrl(e.target.value)}
                    placeholder="Paste image/SVG URL or upload file below..."
                    className="h-8.5 rounded-lg border-slate-800 bg-slate-900 text-xs text-slate-100 flex-1"
                  />
                  <label className="cursor-pointer shrink-0">
                    <input
                      type="file"
                      accept="image/*,.svg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          setNewDevLogoUrl(reader.result as string);
                          if (!newDevName) {
                            setNewDevName(file.name.replace(/\.[^/.]+$/, ""));
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium">
                      <Upload className="w-3.5 h-3.5" />
                      Browse
                    </div>
                  </label>
                </div>
                {newDevLogoUrl && (
                  <div className="mt-2 p-2 rounded-lg border border-slate-800 bg-white/95 flex items-center justify-center h-12">
                    <img src={newDevLogoUrl} alt="Preview" className="max-h-9 max-w-[80%] object-contain" />
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs text-slate-300">Default Estate (Optional)</Label>
                <Input
                  value={newDevEstate}
                  onChange={(e) => setNewDevEstate(e.target.value)}
                  placeholder="e.g. Flagstone, Oran Park, Aura"
                  className="mt-1 h-8.5 rounded-lg border-slate-800 bg-slate-900 text-xs text-slate-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsAddDevOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveNewDeveloper}
                className="text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
              >
                Save &amp; Apply
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Customise Developer Modal */}
      {editingDev && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100">Customise Developer: {editingDev.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingDev(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <Label className="text-xs text-slate-300">Developer Name</Label>
                <Input
                  value={editDevName}
                  onChange={(e) => setEditDevName(e.target.value)}
                  className="mt-1 h-8.5 rounded-lg border-slate-800 bg-slate-900 text-xs text-slate-100"
                />
              </div>

              <div>
                <Label className="text-xs text-slate-300">State Personalisation</Label>
                <div className="grid grid-cols-3 gap-1.5 mt-1">
                  {(["NSW", "QLD", "ALL"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setEditDevState(st)}
                      className={`p-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        editDevState === st
                          ? "border-amber-500 bg-amber-500/20 text-amber-200"
                          : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      {st === "ALL" ? "Both / National" : `${st} Only`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs text-slate-300">Replace / Customise Logo</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={editDevLogoUrl}
                    onChange={(e) => setEditDevLogoUrl(e.target.value)}
                    placeholder="Image/SVG URL or upload file below..."
                    className="h-8.5 rounded-lg border-slate-800 bg-slate-900 text-xs text-slate-100 flex-1"
                  />
                  <label className="cursor-pointer shrink-0">
                    <input
                      type="file"
                      accept="image/*,.svg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          setEditDevLogoUrl(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium">
                      <Upload className="w-3.5 h-3.5" />
                      Upload
                    </div>
                  </label>
                </div>
                {editDevLogoUrl && (
                  <div className="mt-2 p-2 rounded-lg border border-slate-800 bg-white/95 flex items-center justify-center h-14">
                    <img src={editDevLogoUrl} alt="Preview" className="max-h-10 max-w-[85%] object-contain" />
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs text-slate-300">Default Estate (Optional)</Label>
                <Input
                  value={editDevEstate}
                  onChange={(e) => setEditDevEstate(e.target.value)}
                  placeholder="e.g. Flagstone, Oran Park"
                  className="mt-1 h-8.5 rounded-lg border-slate-800 bg-slate-900 text-xs text-slate-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-slate-800 pt-3">
              <div>
                {editingDev.isOverridden && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetDev}
                    className="h-7 text-xs border-slate-700 text-slate-300 hover:bg-slate-800 gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset to Default
                  </Button>
                )}
                {editingDev.isCustom && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteCustomDev}
                    className="h-7 text-xs gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingDev(null)}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveEditDev}
                  className="text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Section
        id="section-package"
        title="Package"
        extra={
          hasCalculatedPrice ? (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-brand-gold/20 border border-brand-gold/40 text-brand-gold font-bold text-xs shadow-sm">
              <span className="text-[10px] uppercase tracking-wider text-amber-300/80 font-medium">Total:</span>
              <span className="text-amber-200">{formattedTotalPrice}</span>
            </div>
          ) : null
        }
      >
        {hasCalculatedPrice && (
          <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-slate-900/60 p-2.5 shadow-sm">
            <div className="space-y-0.5">
              <div className="text-[10px] font-bold tracking-wider text-amber-400 uppercase">
                Total Package Price
              </div>
              <div className="text-[10px] text-slate-400">
                House ({data.housePrice || "$0"}) + Land ({data.landPrice || "$0"})
              </div>
            </div>
            <div className="text-right">
              <span className="text-base sm:text-lg font-extrabold text-amber-300 tracking-tight">
                {formattedTotalPrice}
              </span>
            </div>
          </div>
        )}

        <Field label="Headline" value={data.headline} onChange={(v) => set("headline", v)} placeholder="e.g. Complete Turn-Key Package" />

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="House only price"
            value={data.housePrice}
            onChange={setHousePrice}
            onBlur={() => {
              const num = parseAud(data.housePrice);
              if (num > 0) {
                const formatted = formatAud(num);
                set("housePrice", formatted);
                const l = parseAud(data.landPrice);
                if (l > 0) set("price", formatAud(num + l));
              }
            }}
            placeholder="e.g. $435,900"
          />
          <Field
            label="Land only price"
            value={data.landPrice}
            onChange={setLandPrice}
            onBlur={() => {
              const num = parseAud(data.landPrice);
              if (num > 0) {
                const formatted = formatAud(num);
                set("landPrice", formatted);
                const h = parseAud(data.housePrice);
                if (h > 0) set("price", formatAud(h + num));
                applyPricing(data.designName, data.range, formatted, uplift);
              }
            }}
            placeholder="e.g. $350,000"
          />
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
                setUpliftInput(amount === 0 ? "0" : String(amount));
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
                {designs.map((row) => {
                  const p = housePriceFor(row.name, data.range, division);
                  return (
                    <SelectItem key={row.name} value={row.name}>
                      {row.name} — {row.m2} m² {p ? `(${formatAud(p)})` : ""}
                    </SelectItem>
                  );
                })}
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5">
            {INCLUSION_RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => selectRange(r.id)}
                className={`rounded-xl border px-2 py-2 text-center transition-all ${
                  data.range === r.id
                    ? "border-brand-gold/60 bg-gradient-to-r from-amber-500/20 to-brand-gold/15 text-amber-200 shadow-sm"
                    : "border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <span className="block text-[11px] font-bold">{r.label}</span>
                {r.code && (
                  <span className="block text-[9px] uppercase tracking-wider opacity-70 font-mono mt-0.5">
                    {r.code} Spec
                  </span>
                )}
              </button>
            ))}
          </div>
          <InclusionsEditor data={data} set={set} />
        </Section>
      </Section>

      <Section id="section-facade" title="Facade">
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
              value={upliftInput}
              placeholder="0"
              inputMode="numeric"
              onChange={(e) => {
                const val = e.target.value;
                setUpliftInput(val);
                const parsed = parseAud(val);
                setUplift(parsed);
                if (data.facadeId) saveFacadeUplift(data.facadeId, parsed);
                applyPricing(data.designName, data.range, data.landPrice, parsed);
              }}
              onBlur={() => {
                setUpliftInput(uplift === 0 ? "0" : String(uplift));
              }}
            />
            <p className="text-[11px] leading-snug text-slate-500">
              Filled in automatically from the QLD retail facade price list.
            </p>
          </div>
        )}
      </Section>

      <Section id="section-costs" title="Additional costs (automated, adjustable)">
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

      <Section id="section-consultant" title="Consultant (footer + QR code)">
        <ConsultantPicker data={data} set={set} />
      </Section>

      {(template === "siting" || template === "siting-v2") && (
        <Section id="section-siting" title="Siting & Setbacks (2-Page + Siting Plan)">
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

            {/* Wall vs OMP Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
              <div>
                <span className="text-[11px] font-semibold text-slate-200 block">
                  Setback Line
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Wall (Brickwork) or OMP (450mm eave offset)
                </span>
              </div>
              <div className="flex rounded-md border border-slate-800 bg-slate-950 p-0.5">
                <button
                  type="button"
                  onClick={() => set("setbackMeasurement", "wall")}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded transition-all ${
                    (!data.setbackMeasurement || data.setbackMeasurement === "wall")
                      ? "bg-amber-500 text-slate-950 shadow-xs"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Wall
                </button>
                <button
                  type="button"
                  onClick={() => set("setbackMeasurement", "omp")}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded transition-all ${
                    data.setbackMeasurement === "omp"
                      ? "bg-amber-500 text-slate-950 shadow-xs"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  OMP (450mm)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-400">Front Setback (m)</Label>
                <Input
                  className="h-7.5 rounded-md border-slate-800 bg-slate-900/80 text-xs text-slate-200"
                  value={data.frontSetback !== undefined ? String(data.frontSetback) : "4.5"}
                  onChange={(e) => {
                    const val = e.target.value;
                    set("frontSetback", val);
                    const f = parseFloat(val);
                    if (!isNaN(f)) {
                      const d = Number(data.landDepth) > 0 ? Number(data.landDepth) : (Number(data.landSize || 450) / Number(data.landFrontage || 14));
                      const hLen = data.houseLengthM || 20.15;
                      set("rearSetback", Number(Math.max(0, d - hLen - f).toFixed(2)));
                    }
                  }}
                  placeholder="4.5"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-400">Rear Setback (m)</Label>
                <Input
                  className="h-7.5 rounded-md border-slate-800 bg-slate-900/80 text-xs text-slate-200"
                  value={data.rearSetback !== undefined ? String(data.rearSetback) : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    set("rearSetback", val);
                    const r = parseFloat(val);
                    if (!isNaN(r)) {
                      const d = Number(data.landDepth) > 0 ? Number(data.landDepth) : (Number(data.landSize || 450) / Number(data.landFrontage || 14));
                      const hLen = data.houseLengthM || 20.15;
                      set("frontSetback", Number(Math.max(0, d - hLen - r).toFixed(2)));
                    }
                  }}
                  placeholder="e.g. 5.35"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-400">Garage Setback (m)</Label>
                <Input
                  className="h-7.5 rounded-md border-slate-800 bg-slate-900/80 text-xs text-slate-200"
                  value={data.garageSetback !== undefined ? String(data.garageSetback) : "5.5"}
                  onChange={(e) => set("garageSetback", e.target.value)}
                  placeholder="5.5"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-400">Side Setback (m)</Label>
                <Input
                  className="h-7.5 rounded-md border-slate-800 bg-slate-900/80 text-xs text-slate-200"
                  value={data.sideSetback !== undefined ? String(data.sideSetback) : "1.0"}
                  onChange={(e) => set("sideSetback", e.target.value)}
                  placeholder="1.0"
                />
              </div>
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

            {/* Changeable Site Coverage & Private Open Space Compliance Thresholds */}
            <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-slate-800/80">
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-400">Max Coverage (%)</Label>
                <Input
                  type="number"
                  className="h-7.5 rounded-md border-slate-800 bg-slate-900/80 text-xs text-slate-200"
                  value={data.maxSiteCoverage !== undefined ? String(data.maxSiteCoverage) : "60"}
                  onChange={(e) => set("maxSiteCoverage", Number(e.target.value) || 60)}
                  placeholder="60"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-400">Min POS (m²)</Label>
                <Input
                  type="number"
                  className="h-7.5 rounded-md border-slate-800 bg-slate-900/80 text-xs text-slate-200"
                  value={data.minPosM2 !== undefined ? String(data.minPosM2) : "12"}
                  onChange={(e) => set("minPosM2", Number(e.target.value) || 12)}
                  placeholder="12"
                />
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

            <div className="rounded-lg bg-slate-900/40 p-2 text-[11px] text-slate-400 border border-slate-800/60 flex items-center justify-between">
              <div>
                <span className="text-amber-300 font-semibold">Calculated Lot Depth: </span>
                {data.landSize && data.landFrontage && Number(data.landFrontage) > 0
                  ? `${(Number(data.landSize) / Number(data.landFrontage)).toFixed(2)}m (from ${data.landSize}m² / ${data.landFrontage}m)`
                  : "30.00m"}
              </div>
              <span className="text-slate-500 text-[10px]">
                {data.landSize && data.landFrontage && Number(data.landFrontage) > 0
                  ? `${data.landFrontage}m frontage × ${(Number(data.landSize) / Number(data.landFrontage)).toFixed(1)}m`
                  : ""}
              </span>
            </div>
          </div>
        </Section>
      )}

      <Section id="section-terms" title="Terms & conditions (footer)">
        <div className="space-y-2.5">
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => set("termsType", "concise")}
              className={`rounded-lg border px-2.5 py-2 text-center text-[11px] font-medium transition-all ${
                (!data.termsType || data.termsType === "concise")
                  ? "border-brand-gold/60 bg-amber-500/20 text-amber-200 shadow-sm"
                  : "border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              Concise (Clean)
            </button>
            <button
              type="button"
              onClick={() => set("termsType", "full")}
              className={`rounded-lg border px-2.5 py-2 text-center text-[11px] font-medium transition-all ${
                data.termsType === "full"
                  ? "border-brand-gold/60 bg-amber-500/20 text-amber-200 shadow-sm"
                  : "border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              Full Legal
            </button>
            <button
              type="button"
              onClick={() => set("termsType", "custom")}
              className={`rounded-lg border px-2.5 py-2 text-center text-[11px] font-medium transition-all ${
                data.termsType === "custom"
                  ? "border-brand-gold/60 bg-amber-500/20 text-amber-200 shadow-sm"
                  : "border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              Custom
            </button>
          </div>

          {data.termsType === "custom" ? (
            <textarea
              value={data.customTerms ?? ""}
              onChange={(e) => set("customTerms", e.target.value)}
              placeholder="Enter custom terms and conditions for this flyer…"
              rows={3}
              className="w-full rounded-lg border border-slate-800 bg-slate-950/70 p-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-brand-gold/60 focus:ring-brand-gold/20 transition-all outline-none"
            />
          ) : (
            <div className="rounded-lg border border-slate-800/80 bg-slate-950/50 p-2.5 text-[11px] leading-relaxed text-slate-400">
              <span className="font-semibold text-slate-300">
                {(!data.termsType || data.termsType === "concise") ? "Concise & Protective (Recommended): " : "Full Legal Text: "}
              </span>
              {(!data.termsType || data.termsType === "concise")
                ? "Compact 2-line disclaimer covering stamp duty exclusion, 450m² / M slab site costs, indicative renders, price variations & builder licence."
                : "Full 180-word comprehensive marketing legal disclaimer from legacy Hudson Homes flyers."}
            </div>
          )}
        </div>
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
