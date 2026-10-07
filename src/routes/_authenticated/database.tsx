import { CONSULTANTS } from "@/components/flyer/consultants";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { authHeaders } from "@/lib/api-auth";

import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  FileDown,
  LogOut,
  Upload,
  Pencil,
  Edit3,
  ChevronDown,
  ChevronRight,
  ArrowLeftRight,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Compass,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { StaffHeaderProfile } from "@/components/auth/StaffHeaderProfile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import logoUrl from "@/assets/hudson-homes-logo.png";
import { formatAud } from "@/lib/pricing";
import { pdfDocumentToPagesAndText, pdfPagesToDataUrls } from "@/lib/pdfPages";
import { DevelopersDialog } from "@/components/database/DevelopersDialog";
import { devKey, listDevelopers, rememberDeveloper } from "@/lib/developers";
import { parseDeveloperPriceList, extractLotsFromText, type ParsedLot } from "@/lib/parseLotList";
import {
  getLocalLots,
  getLocalPackages,
  saveLocalLots,
  saveLocalPackages,
  upsertLocalLot,
  deleteLocalLot,
  deleteLocalLotsBatch,
  upsertLocalPackage,
  deleteLocalPackage,
  deleteLocalPackagesBatch,
  getDeletedLotIds,
  getDeletedPkgIds,
  extractLotStage,
  getLotState,
  DB_SYNC_CHANNEL_NAME,
  broadcastDatabaseChange,
  type Lot,
  type Pkg,
} from "@/lib/databaseStorage";
import {
  ensureStaffSupabaseAuth,
  seedRemoteDatabaseIfEmpty,
  subscribeToCloudDatabaseSync,
  syncLotToSupabase,
  deleteLotFromSupabase,
  syncLotsBatchToSupabase,
  deleteLotsBatchFromSupabase,
  syncPackageToSupabase,
  deletePackageFromSupabase,
  syncPackagesBatchToSupabase,
  deletePackagesBatchFromSupabase,
  fetchRemoteLotsAndPackages,
  syncLocalPackagesAndLotsToSupabase,
  type SyncPayload,
} from "@/lib/supabaseSync";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useTheme } from "@/lib/theme";
import { toValidUuid, isValidUuid, generateUuid } from "@/lib/uuid";
import { buildFlyerDataFromPackage, buildCanonicalAddress } from "@/lib/packageAddress";
import {
  ExpressFlyer,
  ExpressFlyerV2,
  HouseOnlyFlyer,
  HouseOnlyFlyerV2,
  ShowcaseCover,
  ShowcaseDetails,
} from "@/components/flyer/FlyerTemplates";
import { SitingPlanPage } from "@/components/flyer/SitingPlanPage";
import { SitingPlanV2 } from "@/components/flyer/SitingPlanV2";
import { downloadA4Pdf, buildFlyerPdfFilename } from "@/lib/downloadPdf";
import type { FlyerData } from "@/components/flyer/types";

export const Route = createFileRoute("/_authenticated/database")({
  head: () => ({
    meta: [
      { title: "House & Land Database (QLD & NSW) | Hudson Homes" },
      {
        name: "description",
        content:
          "Live database of Hudson Homes QLD & NSW land lots and House & Land packages — availability, pricing and one-click flyer export.",
      },
      { property: "og:title", content: "Hudson Homes House & Land Database (QLD & NSW)" },
      {
        property: "og:description",
        content: "Every available QLD & NSW land lot and package, ready to print as a flyer.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DatabasePage,
});

const LOT_STATUS = ["available", "on_hold", "sold", "nhc_exclusive"] as const;
const PKG_STATUS = ["draft", "live", "sold", "nhc_exclusive"] as const;

/** Capital letter at the start of each word, acronyms preserved. */
function titleCase(value: string | null | undefined) {
  if (!value) return "";
  return value
    .toString()
    .split(/(\s+|\/|·)/)
    .map((part) =>
      /^[A-Za-z][A-Za-z'’-]*$/.test(part)
        ? part.length <= 3 && part === part.toUpperCase()
          ? part
          : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        : part,
    )
    .join("");
}

/** Human label for a lot/package status pill or dropdown item. */
function statusLabel(value: string) {
  if (value === "nhc_exclusive") return "NHC Exclusive";
  return titleCase(value.replace("_", " "));
}

const money = (v: number | null) => (v == null ? "—" : formatAud(Number(v)));


/** "3 hours ago" style label plus the exact local date/time. */
function lastUpdated(value: string | null) {
  if (!value) return { rel: "—", exact: "" };
  const d = new Date(value);
  const mins = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  const rel =
    mins < 1
      ? "Just now"
      : mins < 60
        ? `${mins} min ago`
        : mins < 60 * 24
          ? `${Math.round(mins / 60)} hr ago`
          : `${Math.round(mins / (60 * 24))} d ago`;
  return {
    rel,
    exact: d.toLocaleString("en-AU", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

/** Dynamic Status Tone Badges with Vivid Atmospheric Glow (Adaptive Normal / Night) */
function statusTone(value: string, isLight = false) {
  if (isLight) {
    if (value === "available" || value === "live")
      return "bg-emerald-50 text-emerald-900 border-emerald-400 font-semibold shadow-[0_0_10px_rgba(16,185,129,0.35)] ring-1 ring-emerald-400/40";
    if (value === "on_hold" || value === "draft")
      return "bg-amber-50 text-amber-950 border-amber-400 font-semibold shadow-[0_0_10px_rgba(245,158,11,0.4)] ring-1 ring-amber-400/40";
    if (value === "nhc_exclusive")
      return "bg-blue-50 text-blue-950 border-blue-400 font-semibold shadow-[0_0_10px_rgba(59,130,246,0.45)] ring-1 ring-blue-400/40";
    if (value === "sold")
      return "bg-rose-50 text-rose-950 border-rose-400 font-bold shadow-[0_0_10px_rgba(244,63,94,0.45)] ring-1 ring-rose-400/40";
    return "bg-slate-100 text-slate-700 border-slate-300";
  }
  if (value === "available" || value === "live")
    return "bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.4)] ring-1 ring-emerald-500/40";
  if (value === "on_hold" || value === "draft")
    return "bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.45)] ring-1 ring-amber-500/40";
  if (value === "nhc_exclusive")
    return "bg-blue-500/20 text-blue-300 border-blue-500/60 shadow-[0_0_12px_rgba(59,130,246,0.5)] ring-1 ring-blue-500/40";
  if (value === "sold")
    return "bg-rose-950/70 text-rose-300 border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.5)] ring-1 ring-rose-500/40 font-bold";
  return "bg-slate-800/60 text-slate-400 border-slate-800";
}

function StatusPill({ value, isLight = false }: { value: string; isLight?: boolean }) {
  const dotColor =
    value === "available" || value === "live"
      ? "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)]"
      : value === "on_hold" || value === "draft"
        ? "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.9)]"
        : value === "nhc_exclusive"
          ? "bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.9)]"
          : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize transition-all duration-300 ${statusTone(value, isLight)}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      {statusLabel(value)}
    </span>
  );
}

const emptyLotForm = {
  estate: "",
  suburb: "",
  state: "QLD" as "QLD" | "NSW",
  stage: "",
  developer: "",
  developer_contact_name: "",
  developer_contact_phone: "",
  developer_contact_email: "",
  lot_number: "",
  address: "",
  land_size: "",
  frontage: "",
  land_price: "",
  registration_date: "",
  deadline: "",
  notes: "",
};

type LotForm = typeof emptyLotForm;

function lotToForm(lot: Lot): LotForm {
  const stageMatch = lot.notes?.match(/Stage\s*([A-Za-z0-9\.\-]+)/i);
  const cleanNotes = lot.notes ? lot.notes.replace(/Stage\s*[A-Za-z0-9\.\-]+(\s*·\s*)?/i, "").trim() : "";

  return {
    estate: lot.estate ?? "",
    suburb: lot.suburb ?? "",
    state: (lot.state || getLotState(lot)) as "QLD" | "NSW",
    stage: stageMatch ? stageMatch[1] : "",
    developer: lot.developer ?? "",
    developer_contact_name: lot.developer_contact_name ?? "",
    developer_contact_phone: lot.developer_contact_phone ?? "",
    developer_contact_email: lot.developer_contact_email ?? "",
    lot_number: lot.lot_number ?? "",
    address: lot.address ?? "",
    land_size: lot.land_size == null ? "" : String(lot.land_size),
    frontage: lot.frontage == null ? "" : String(lot.frontage),
    land_price: lot.land_price == null ? "" : String(lot.land_price),
    registration_date: lot.registration_date ?? "",
    deadline: lot.deadline ?? "",
    notes: cleanNotes,
  };
}

/** Create or edit a land lot. Pass `lot` to edit an existing one. */
function LotDialog({
  onSaved,
  lot,
  trigger,
}: {
  onSaved: () => void;
  lot?: Lot;
  trigger?: React.ReactNode;
}) {
  const { mode } = useTheme();
  const isLight = mode === "normal";
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<LotForm>(lot ? lotToForm(lot) : emptyLotForm);
  const [registered, setRegistered] = useState(Boolean(lot?.titled));
  const [exclusive, setExclusive] = useState<string[]>(lot?.exclusive_consultants ?? []);

  useEffect(() => {
    if (!open) return;
    setForm(lot ? lotToForm(lot) : emptyLotForm);
    setRegistered(Boolean(lot?.titled));
    setExclusive(lot?.exclusive_consultants ?? []);
  }, [open, lot]);
  // Reuse saved developer contact details when a known developer is typed.
  useEffect(() => {
    const name = form.developer.trim();
    if (!open || !name) return;
    let cancelled = false;
    void listDevelopers().then((devs) => {
      if (cancelled) return;
      const match = devs.find((d) => devKey(d.name) === devKey(name));
      if (!match) return;
      setForm((prev) => ({
        ...prev,
        developer_contact_name: prev.developer_contact_name || match.contact_name || "",
        developer_contact_phone: prev.developer_contact_phone || match.contact_phone || "",
        developer_contact_email: prev.developer_contact_email || match.contact_email || "",
      }));
    });
    return () => {
      cancelled = true;
    };
  }, [form.developer, open]);

  const update = (key: keyof LotForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const field = (
    key: keyof LotForm,
    label: string,
    type: "text" | "number" | "date" = "text",
    disabled = false,
  ) => (
    <div className="space-y-1.5">
      <Label className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-400"}`}>{label}</Label>
      <Input
        type={type}
        disabled={disabled}
        value={form[key]}
        onChange={(e) => update(key, e.target.value)}
        className={`h-8.5 rounded-lg text-xs ${
          isLight
            ? "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-cyan-600"
            : "border-slate-800 bg-slate-900/80 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60"
        }`}
      />
    </div>
  );

  const save = async () => {
    if (!form.estate.trim() || !form.suburb.trim()) {
      toast.error("Estate and suburb are required");
      return;
    }
    setBusy(true);

    const stagePrefix = form.stage.trim() ? (form.stage.toLowerCase().startsWith("stage") ? form.stage.trim() : `Stage ${form.stage.trim()}`) : null;
    const combinedNotes = [stagePrefix, form.notes.trim()].filter(Boolean).join(" · ") || null;

    const payload = {
      estate: form.estate.trim(),
      suburb: form.suburb.trim(),
      state: form.state,
      developer: form.developer.trim(),
      developer_contact_name: form.developer_contact_name.trim() || null,
      developer_contact_phone: form.developer_contact_phone.trim() || null,
      developer_contact_email: form.developer_contact_email.trim() || null,
      lot_number: form.lot_number.trim() || null,
      address: form.address.trim() || null,
      land_size: form.land_size ? Number(form.land_size) : null,
      frontage: form.frontage ? Number(form.frontage) : null,
      land_price: form.land_price ? Number(form.land_price) : null,
      registration_date: registered ? null : (form.registration_date.trim() || null),
      titled: registered,
      deadline: form.deadline.trim() || null,
      notes: combinedNotes,
      exclusive_consultants: exclusive,
    };

    const lotId = (lot?.id && isValidUuid(lot.id))
      ? lot.id
      : (lot?.id ? toValidUuid(lot.id) : null) || generateUuid();
    const fullLot: Lot = {
      ...payload,
      id: lotId,
      status: lot?.status || "available",
      updated_at: new Date().toISOString(),
    };
    upsertLocalLot(fullLot);
    try {
      await syncLotToSupabase(fullLot);
    } catch (err) {
      console.warn("[database] syncLotToSupabase warning:", err);
    }
    if (form.developer.trim()) {
      await rememberDeveloper({
        name: form.developer,
        contact_name: form.developer_contact_name,
        contact_phone: form.developer_contact_phone,
        contact_email: form.developer_contact_email,
      });
    }
    setBusy(false);
    toast.success(lot ? "Lot updated" : "Lot added");
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            size="sm"
            className={`text-xs font-bold gap-1.5 shadow-sm ${
              isLight
                ? "bg-cyan-600 hover:bg-cyan-700 text-white"
                : "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30"
            }`}
          >
            <Plus className="h-3.5 w-3.5" /> Add land lot
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className={`max-h-[85vh] overflow-y-auto sm:max-w-2xl backdrop-blur-2xl shadow-2xl ${isLight ? "border-slate-200 bg-white text-slate-900 shadow-xl" : "border-slate-800 bg-slate-950/95 text-slate-100"}`}>
        <DialogHeader>
          <DialogTitle className={`font-bold tracking-wide ${isLight ? "text-slate-900" : "text-white"}`}>{lot ? "Edit land lot" : "New land lot"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 col-span-2 sm:col-span-1">
            <Label className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-400"}`}>State / Division *</Label>
            <Select value={form.state} onValueChange={(v: "QLD" | "NSW") => update("state", v)}>
              <SelectTrigger className={`h-8.5 rounded-lg text-xs ${
                isLight ? "border-slate-300 bg-white text-slate-900" : "border-slate-800 bg-slate-900/80 text-slate-100"
              }`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={isLight ? "border-slate-200 bg-white text-slate-800 shadow-lg" : "border-slate-800 bg-slate-900 text-slate-200"}>
                <SelectItem value="QLD">Queensland (QLD)</SelectItem>
                <SelectItem value="NSW">New South Wales (NSW)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {field("estate", "Estate *")}
          {field("suburb", "Suburb *")}
          {field("stage", "Stage / Release")}
          {field("lot_number", "Lot number")}
          {field("address", "Street Address")}
          {field("land_size", "Land size m²", "number")}
          {field("frontage", "Frontage m", "number")}
          {field("land_price", "Land price", "number")}
          <div className="space-y-1.5">
            {field("registration_date", "Registration", "date", registered)}
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 accent-cyan-400 rounded"
                checked={registered}
                onChange={(e) => setRegistered(e.target.checked)}
              />
              Already registered
            </label>
          </div>
          {field("deadline", "Deadline", "date")}
          {field("developer", "Developer")}
          {field("developer_contact_name", "Developer contact")}
          {field("developer_contact_phone", "Contact phone")}
          {field("developer_contact_email", "Contact email")}
          {field("notes", "Notes")}
        </div>
        <div className={`mt-3 rounded-xl p-3.5 ${isLight ? "border border-slate-200 bg-slate-50 text-slate-800 shadow-xs" : "border border-slate-800/80 bg-slate-900/60 text-slate-300"}`}>
          <Label className={`text-xs font-medium ${isLight ? "text-slate-700" : "text-slate-400"}`}>
            NHC Exclusive — consultants who can sell this lot
          </Label>
          <div className="mt-2 flex flex-wrap gap-3">
            {CONSULTANTS.map((c) => (
              <label key={c.id} className={`flex items-center gap-2 text-xs ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-purple-400 rounded"
                  checked={exclusive.includes(c.id)}
                  onChange={(e) =>
                    setExclusive((prev) =>
                      e.target.checked ? [...prev, c.id] : prev.filter((x) => x !== c.id),
                    )
                  }
                />
                {c.name}
              </label>
            ))}
          </div>
          <p className={`mt-2 text-[11px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
            Only used when the lot status is set to NHC Exclusive — the lot stays hidden from
            customer listings.
          </p>
        </div>

        <Button onClick={save} disabled={busy} className="mt-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold hover:from-cyan-400 text-xs shadow-md">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {lot ? "Save changes" : "Save lot"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}



/** Same lot number in the same estate + suburb = already in the database. */
const dupeKey = (estate: string, suburb: string, lotNumber: string | null | undefined) =>
  `${estate.trim().toLowerCase()}|${suburb.trim().toLowerCase()}|${(lotNumber ?? "").trim().toLowerCase()}`;

interface UploadedDoc {
  id: string;
  name: string;
  estate: string;
  suburb: string;
  stage: string;
  developer: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  lotCount: number;
  status: "processing" | "done" | "error";
  error?: string;
}

interface BatchLotRow extends ParsedLot {
  rowId: string;
  docId: string;
  docName: string;
  estate: string;
  suburb: string;
  stage: string;
  developer: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
}

/** Upload one or multiple developer price lists (PDF, image, CSV, TXT) or paste raw text and auto-create every lot. */
function ImportDialog({ onSaved, existingLots }: { onSaved: () => void; existingLots: Lot[] }) {
  const { mode: themeMode } = useTheme();
  const isLight = themeMode === "normal";
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyMessage, setBusyMessage] = useState("");
  const [mode, setMode] = useState<"file" | "paste">("file");
  const [pastedText, setPastedText] = useState("");
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [rows, setRows] = useState<BatchLotRow[]>([]);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [activeDocFilter, setActiveDocFilter] = useState<string>("ALL");

  // Quick batch inputs for checked rows
  const [batchEstate, setBatchEstate] = useState("");
  const [batchStage, setBatchStage] = useState("");

  const existingKeys = useMemo(
    () => new Set(existingLots.map((l) => dupeKey(l.estate, l.suburb, l.lot_number))),
    [existingLots],
  );

  const isDupe = (r: BatchLotRow) =>
    Boolean(r.lot_number) && existingKeys.has(dupeKey(r.estate, r.suburb, r.lot_number));

  const resetForm = () => {
    setDocs([]);
    setRows([]);
    setPicked({});
    setPastedText("");
    setActiveDocFilter("ALL");
    setBatchEstate("");
    setBatchStage("");
  };

  const processSingleFile = async (file: File): Promise<{ doc: UploadedDoc; lots: BatchLotRow[] }> => {
    const docId = generateUuid();
    const isTextFile = /\.csv$/i.test(file.name) || /\.txt$/i.test(file.name) || /\.tsv$/i.test(file.name);
    let json: { estate?: string; suburb?: string; stage?: string; developer?: string; lots: ParsedLot[] };

    if (isTextFile) {
      const text = await file.text();
      json = extractLotsFromText(text, file.name);
    } else {
      try {
        const docPages = await pdfDocumentToPagesAndText(file);
        json = await parseDeveloperPriceList(docPages);
      } catch (err) {
        console.warn("[ImportDialog] PDF parse error, using text fallback:", err);
        json = extractLotsFromText("", file.name);
      }
    }

    const docEstate = json.estate || "Hudson Estate";
    const docSuburb = json.suburb || "Queensland";
    const docStage = json.stage || "";
    const docDeveloper = json.developer || "";

    const doc: UploadedDoc = {
      id: docId,
      name: file.name,
      estate: docEstate,
      suburb: docSuburb,
      stage: docStage,
      developer: docDeveloper,
      contactName: "",
      contactPhone: "",
      contactEmail: "",
      lotCount: json.lots.length,
      status: "done",
    };

    const parsedLots = json.lots.length > 0 ? json.lots : [
      {
        lot_number: "",
        stage: docStage,
        land_size: null,
        frontage: null,
        land_price: null,
        titled: false,
        registration_date: "",
        status: "available" as const,
      }
    ];

    const lotRows: BatchLotRow[] = parsedLots.map((l) => ({
      ...l,
      rowId: generateUuid(),
      docId,
      docName: file.name,
      estate: docEstate,
      suburb: docSuburb,
      stage: l.stage || docStage,
      developer: docDeveloper,
      contactName: "",
      contactPhone: "",
      contactEmail: "",
    }));

    return { doc, lots: lotRows };
  };

  const handleFiles = async (files: FileList | File[]) => {
    if (!files.length) return;
    setBusy(true);
    const newDocs: UploadedDoc[] = [];
    const newLots: BatchLotRow[] = [];
    const newPicked: Record<string, boolean> = { ...picked };

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setBusyMessage(`Scanning price list (${i + 1}/${files.length}): ${file.name}…`);
      try {
        const res = await processSingleFile(file);
        newDocs.push(res.doc);
        newLots.push(...res.lots);
        res.lots.forEach((l) => {
          newPicked[l.rowId] = true;
        });
      } catch (e) {
        console.error("Failed to parse file:", file.name, e);
        toast.error(`Could not parse ${file.name}`);
      }
    }

    setDocs((prev) => [...prev, ...newDocs]);
    setRows((prev) => [...prev, ...newLots]);
    setPicked(newPicked);
    setBusy(false);
    setBusyMessage("");
    toast.success(`Loaded ${newDocs.length} price list${newDocs.length === 1 ? "" : "s"} with ${newLots.length} lots`);
  };

  const handleParsePastedText = () => {
    if (!pastedText.trim()) {
      toast.error("Please paste price list text or table rows first");
      return;
    }
    setBusy(true);
    setBusyMessage("Parsing pasted price list text…");
    try {
      const docId = generateUuid();
      const json = extractLotsFromText(pastedText, "Pasted Price List");
      const docEstate = json.estate || "Hudson Estate";
      const docSuburb = json.suburb || "Queensland";
      const docStage = json.stage || "";
      const docDeveloper = json.developer || "";

      const doc: UploadedDoc = {
        id: docId,
        name: "Pasted Price List",
        estate: docEstate,
        suburb: docSuburb,
        stage: docStage,
        developer: docDeveloper,
        contactName: "",
        contactPhone: "",
        contactEmail: "",
        lotCount: json.lots.length,
        status: "done",
      };

      const lotRows: BatchLotRow[] = (json.lots.length > 0 ? json.lots : [
        {
          lot_number: "",
          stage: docStage,
          land_size: null,
          frontage: null,
          land_price: null,
          titled: false,
          registration_date: "",
          status: "available" as const,
        }
      ]).map((l) => ({
        ...l,
        rowId: generateUuid(),
        docId,
        docName: "Pasted Price List",
        estate: docEstate,
        suburb: docSuburb,
        stage: l.stage || docStage,
        developer: docDeveloper,
        contactName: "",
        contactPhone: "",
        contactEmail: "",
      }));

      const newPicked = { ...picked };
      lotRows.forEach((r) => { newPicked[r.rowId] = true; });

      setDocs((prev) => [...prev, doc]);
      setRows((prev) => [...prev, ...lotRows]);
      setPicked(newPicked);
      setPastedText("");
      toast.success(`Extracted ${lotRows.length} lots from pasted text`);
    } finally {
      setBusy(false);
      setBusyMessage("");
    }
  };

  const applyDocEstateStage = (docId: string) => {
    const doc = docs.find((d) => d.id === docId);
    if (!doc) return;
    setRows((prev) =>
      prev.map((r) =>
        r.docId === docId
          ? {
              ...r,
              estate: doc.estate.trim(),
              suburb: doc.suburb.trim(),
              stage: doc.stage.trim(),
              developer: doc.developer.trim(),
            }
          : r
      )
    );
    toast.success(`Updated all lots for "${doc.name}" to ${doc.estate} · ${doc.stage || "Stage"}`);
  };

  const removeDoc = (docId: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== docId));
    setRows((prev) => prev.filter((r) => r.docId !== docId));
    if (activeDocFilter === docId) setActiveDocFilter("ALL");
  };

  const updateDoc = (docId: string, patch: Partial<UploadedDoc>) => {
    setDocs((prev) => prev.map((d) => (d.id === docId ? { ...d, ...patch } : d)));
    setRows((prev) =>
      prev.map((r) => {
        if (r.docId !== docId) return r;
        const updated = { ...r };
        if (patch.estate !== undefined) updated.estate = patch.estate;
        if (patch.suburb !== undefined) updated.suburb = patch.suburb;
        if (patch.developer !== undefined) updated.developer = patch.developer;
        if (patch.stage !== undefined && (!r.stage || r.stage === docs.find((d) => d.id === docId)?.stage)) {
          updated.stage = patch.stage;
        }
        return updated;
      })
    );
  };

  const updateRow = (rowId: string, patch: Partial<BatchLotRow>) => {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));
  };

  const removeRow = (rowId: string) => {
    setRows((prev) => prev.filter((r) => r.rowId !== rowId));
  };

  const addEmptyRow = () => {
    const defaultDoc = docs[0];
    const newRow: BatchLotRow = {
      rowId: generateUuid(),
      docId: defaultDoc?.id || "manual",
      docName: defaultDoc?.name || "Manual Entry",
      estate: defaultDoc?.estate || "Hudson Estate",
      suburb: defaultDoc?.suburb || "Queensland",
      stage: defaultDoc?.stage || "",
      developer: defaultDoc?.developer || "",
      contactName: "",
      contactPhone: "",
      contactEmail: "",
      lot_number: "",
      land_size: null,
      frontage: null,
      land_price: null,
      titled: false,
      registration_date: "",
      status: "available",
    };
    setRows((prev) => [...prev, newRow]);
    setPicked((prev) => ({ ...prev, [newRow.rowId]: true }));
  };

  const swapRowLotAndSize = (rowId: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.rowId !== rowId) return r;
        const oldLot = r.lot_number || "";
        const oldSize = r.land_size;
        const newLot = oldSize != null ? String(oldSize) : "";
        const parsedSize = parseFloat(oldLot.replace(/[^0-9.]/g, ""));
        const newSize = !isNaN(parsedSize) && parsedSize > 0 ? parsedSize : null;
        return { ...r, lot_number: newLot, land_size: newSize };
      })
    );
  };

  const swapAllRowsLotAndSize = () => {
    setRows((prev) =>
      prev.map((r) => {
        const oldLot = r.lot_number || "";
        const oldSize = r.land_size;
        const newLot = oldSize != null ? String(oldSize) : "";
        const parsedSize = parseFloat(oldLot.replace(/[^0-9.]/g, ""));
        const newSize = !isNaN(parsedSize) && parsedSize > 0 ? parsedSize : null;
        return { ...r, lot_number: newLot, land_size: newSize };
      })
    );
    toast.success("Swapped Lot # and Land Size across all rows");
  };

  const applyBatchEstateToSelected = () => {
    const val = batchEstate.trim();
    if (!val) {
      toast.error("Please enter an estate name first");
      return;
    }
    const selectedIds = new Set(filteredRows.filter((r) => picked[r.rowId]).map((r) => r.rowId));
    setRows((prev) =>
      prev.map((r) => (selectedIds.has(r.rowId) ? { ...r, estate: val } : r))
    );
    toast.success(`Updated estate to "${val}" for ${selectedIds.size} lots`);
    setBatchEstate("");
  };

  const applyBatchStageToSelected = () => {
    const val = batchStage.trim();
    if (!val) {
      toast.error("Please enter a stage (e.g. Stage 3)");
      return;
    }
    const selectedIds = new Set(filteredRows.filter((r) => picked[r.rowId]).map((r) => r.rowId));
    setRows((prev) =>
      prev.map((r) => (selectedIds.has(r.rowId) ? { ...r, stage: val } : r))
    );
    toast.success(`Updated stage to "${val}" for ${selectedIds.size} lots`);
    setBatchStage("");
  };

  const isSuspiciousInversion = (r: BatchLotRow) => {
    const lotNum = parseInt(r.lot_number || "", 10);
    if (r.land_size != null && r.land_size > 0 && r.land_size < 80 && !isNaN(lotNum) && lotNum >= 150) {
      return true;
    }
    if (r.land_size != null && r.land_size > 5000) {
      return true;
    }
    return false;
  };

  const filteredRows = useMemo(() => {
    if (activeDocFilter === "ALL") return rows;
    return rows.filter((r) => r.docId === activeDocFilter);
  }, [rows, activeDocFilter]);

  const selectedRows = useMemo(() => {
    return rows.filter((r) => picked[r.rowId] && !isDupe(r) && (r.lot_number || r.land_price));
  }, [rows, picked, existingKeys]);

  const dupeCount = rows.filter(isDupe).length;
  const validSizes = rows.map((r) => r.land_size).filter((s): s is number => typeof s === "number" && s > 0);
  const avgSize = validSizes.length ? Math.round(validSizes.reduce((a, b) => a + b, 0) / validSizes.length) : null;
  const validPrices = rows.map((r) => r.land_price).filter((p): p is number => typeof p === "number" && p > 0);
  const avgPrice = validPrices.length ? Math.round(validPrices.reduce((a, b) => a + b, 0) / validPrices.length) : null;
  const suspiciousCount = rows.filter(isSuspiciousInversion).length;

  const allFilteredChecked =
    filteredRows.length > 0 &&
    filteredRows.every((r) => isDupe(r) || picked[r.rowId]);

  const toggleAllFiltered = (checked: boolean) => {
    const next = { ...picked };
    filteredRows.forEach((r) => {
      if (!isDupe(r)) next[r.rowId] = checked;
    });
    setPicked(next);
  };

  const importAll = async () => {
    if (!selectedRows.length) {
      toast.error("No valid lots selected to import");
      return;
    }

    setBusy(true);
    setBusyMessage(`Importing ${selectedRows.length} lots across ${docs.length || 1} price lists…`);

    const newLots: Lot[] = selectedRows.map((r) => {
      const rowStage = (r.stage || "").trim();
      const stagePrefix = rowStage ? (rowStage.toLowerCase().startsWith("stage") ? rowStage : `Stage ${rowStage}`) : null;
      const combinedNotes = [stagePrefix, r.notes].filter(Boolean).join(" · ") || null;

      return {
        id: generateUuid(),
        estate: r.estate.trim() || "Hudson Estate",
        suburb: r.suburb.trim() || "Queensland",
        developer: r.developer?.trim() || null,
        developer_contact_name: r.contactName?.trim() || null,
        developer_contact_phone: r.contactPhone?.trim() || null,
        developer_contact_email: r.contactEmail?.trim() || null,
        lot_number: r.lot_number ? String(r.lot_number).trim() : null,
        address: r.address ? String(r.address).trim() : null,
        land_size: r.land_size ? Number(r.land_size) : null,
        frontage: r.frontage ? Number(r.frontage) : null,
        land_price: r.land_price ? Number(r.land_price) : null,
        registration_date: r.titled ? null : (r.registration_date ? String(r.registration_date).trim() : null),
        titled: Boolean(r.titled),
        status: (r.status ?? "available") as Lot["status"],
        exclusive_consultants: null,
        deadline: null,
        notes: combinedNotes,
        updated_at: new Date().toISOString(),
      };
    });

    const currentLots = getLocalLots();
    saveLocalLots([...newLots, ...currentLots]);

    try {
      await syncLotsBatchToSupabase(newLots);
    } catch (err) {
      console.warn("[ImportDialog] syncLotsBatchToSupabase notice:", err);
    }

    for (const d of docs) {
      if (d.developer?.trim()) {
        void rememberDeveloper({
          name: d.developer.trim(),
          contact_name: d.contactName,
          contact_phone: d.contactPhone,
          contact_email: d.contactEmail,
        });
      }
    }

    setBusy(false);
    setBusyMessage("");
    toast.success(
      `Successfully imported ${newLots.length} lots across ${docs.length || 1} price lists!${
        dupeCount ? ` (${dupeCount} duplicates skipped)` : ""
      }`
    );
    resetForm();
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className={`text-xs gap-1.5 ${
            isLight
              ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-xs"
              : "border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <Upload className="h-3.5 w-3.5 text-amber-400" /> Import price list
        </Button>
      </DialogTrigger>
      <DialogContent
        className={`max-h-[90vh] overflow-y-auto sm:max-w-5xl backdrop-blur-2xl shadow-2xl ${
          isLight ? "border-slate-200 bg-white text-slate-900 shadow-xl" : "border-slate-800 bg-slate-950/95 text-slate-100"
        }`}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <DialogTitle className={`font-bold tracking-wide ${isLight ? "text-slate-900" : "text-white"}`}>
              Bulk Import Developer Price Lists (Multi-Estate &amp; Multi-Stage)
            </DialogTitle>
          </div>
          <p className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
            Upload one or multiple price lists (PDF, CSV, TSV, images) concurrently. Assign different estates and stages per document or bulk-edit all lots before importing.
          </p>
        </DialogHeader>

        {/* Input Mode Selector */}
        <div className="flex gap-2 border-b border-slate-800/40 pb-2 text-xs">
          <Button
            size="sm"
            variant={mode === "file" ? "default" : "outline"}
            onClick={() => setMode("file")}
            className={`h-7 text-xs ${
              mode === "file"
                ? "bg-gradient-to-r from-amber-500/20 to-brand-gold/15 text-amber-200 border border-brand-gold/40"
                : "border-slate-800 bg-slate-900/60 text-slate-400"
            }`}
          >
            Upload Files (Multi-PDF / CSV / Image)
          </Button>
          <Button
            size="sm"
            variant={mode === "paste" ? "default" : "outline"}
            onClick={() => setMode("paste")}
            className={`h-7 text-xs ${
              mode === "paste"
                ? "bg-gradient-to-r from-amber-500/20 to-brand-gold/15 text-amber-200 border border-brand-gold/40"
                : "border-slate-800 bg-slate-900/60 text-slate-400"
            }`}
          >
            Paste Table Text
          </Button>
        </div>

        {mode === "file" ? (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Select one or multiple price list files (PDF, CSV, TXT, TSV, Images):</Label>
            <Input
              type="file"
              multiple
              accept="application/pdf,image/*,.csv,.txt,.tsv"
              disabled={busy}
              onChange={(e) => {
                if (e.target.files) void handleFiles(e.target.files);
              }}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              className="w-full min-h-[90px] rounded-md border p-2 text-xs font-mono"
              placeholder="Paste price list table rows here (e.g. Stage 4  Lot 101  450m2  14m  $385,000  Available  Nov 2026)"
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
            />
            <Button size="sm" onClick={handleParsePastedText} disabled={busy || !pastedText.trim()}>
              Parse Pasted Text
            </Button>
          </div>
        )}

        {busy && (
          <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md p-3">
            <Loader2 className="h-4 w-4 animate-spin text-amber-400 shrink-0" />
            <span>{busyMessage || "Scanning price lists with Hudson AI Engine & verifying columns…"}</span>
          </div>
        )}

        {/* Uploaded Documents List & Per-Document Estate/Stage Controls */}
        {docs.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                Uploaded Price Lists ({docs.length}) — Configure Estate &amp; Stage per file:
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className={`p-3 rounded-xl border ${
                    isLight ? "border-slate-200 bg-slate-50/80 shadow-xs" : "border-slate-800 bg-slate-900/60 shadow-md"
                  } space-y-2 text-xs`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold truncate max-w-[240px]" title={doc.name}>
                      📄 {doc.name}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        {rows.filter((r) => r.docId === doc.id).length} lots
                      </span>
                      <button
                        type="button"
                        onClick={() => removeDoc(doc.id)}
                        className="text-slate-400 hover:text-rose-400 p-0.5"
                        title="Remove document and its lots"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Estate</Label>
                      <Input
                        className="h-7 text-xs"
                        placeholder="Estate name"
                        value={doc.estate}
                        onChange={(e) => updateDoc(doc.id, { estate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Suburb</Label>
                      <Input
                        className="h-7 text-xs"
                        placeholder="Suburb"
                        value={doc.suburb}
                        onChange={(e) => updateDoc(doc.id, { suburb: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Stage / Release</Label>
                      <Input
                        className="h-7 text-xs"
                        placeholder="e.g. Stage 4"
                        value={doc.stage}
                        onChange={(e) => updateDoc(doc.id, { stage: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Developer</Label>
                      <Input
                        className="h-7 text-xs"
                        placeholder="Developer"
                        value={doc.developer}
                        onChange={(e) => updateDoc(doc.id, { developer: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] w-full mt-1 border-slate-700 font-medium"
                    onClick={() => applyDocEstateStage(doc.id)}
                  >
                    Apply Estate &amp; Stage to this file's lots
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lots Review Table */}
        {rows.length > 0 && (
          <div className="space-y-2 pt-2">
            {/* Intelligence & Summary Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded border bg-muted/40 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-500">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {rows.length} total lots extracted
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground font-semibold text-foreground">
                  {selectedRows.length} selected for import
                </span>
                {avgSize && (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">Avg Size: <strong className="text-foreground">{avgSize} m²</strong></span>
                  </>
                )}
                {avgPrice && (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">Avg Price: <strong className="text-foreground">{formatAud(avgPrice)}</strong></span>
                  </>
                )}
                {suspiciousCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-amber-500 font-medium px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                    <AlertTriangle className="h-3 w-3" /> {suspiciousCount} potential Lot/Size swap
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const next: Record<string, boolean> = {};
                    rows.forEach((r) => { next[r.rowId] = r.status === "available" || !r.status; });
                    setPicked(next);
                  }}
                  className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                >
                  Available Only
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={swapAllRowsLotAndSize}
                  className="h-6 text-[11px] px-2 text-amber-400 hover:text-amber-300 gap-1"
                  title="Swap Lot Number and Size columns for every row"
                >
                  <ArrowLeftRight className="h-3 w-3" /> Swap All Lot # &amp; Size
                </Button>
                <Button size="sm" variant="outline" onClick={addEmptyRow} className="h-6 text-[11px] px-2 gap-1">
                  <Plus className="h-3 w-3" /> Add Blank Row
                </Button>
              </div>
            </div>

            {/* Document Filter Tabs (if > 1 doc) */}
            {docs.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-muted-foreground mr-1 text-[11px]">View by file:</span>
                <button
                  type="button"
                  onClick={() => setActiveDocFilter("ALL")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    activeDocFilter === "ALL"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200"
                  }`}
                >
                  All Files ({rows.length})
                </button>
                {docs.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setActiveDocFilter(d.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all truncate max-w-[180px] ${
                      activeDocFilter === d.id
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200"
                    }`}
                    title={d.name}
                  >
                    {d.name} ({rows.filter((r) => r.docId === d.id).length})
                  </button>
                ))}
              </div>
            )}

            {/* Bulk Estate & Stage updates for checked rows */}
            <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg border bg-slate-900/40 text-xs">
              <span className="text-muted-foreground text-[11px]">Bulk edit checked lots:</span>
              <Input
                placeholder="New Estate Name"
                className="h-7 w-[140px] text-xs"
                value={batchEstate}
                onChange={(e) => setBatchEstate(e.target.value)}
              />
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={applyBatchEstateToSelected}>
                Apply Estate
              </Button>
              <Input
                placeholder="New Stage (e.g. Stage 3)"
                className="h-7 w-[140px] text-xs"
                value={batchStage}
                onChange={(e) => setBatchStage(e.target.value)}
              />
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={applyBatchStageToSelected}>
                Apply Stage
              </Button>
            </div>

            {dupeCount > 0 && (
              <p className="text-xs text-orange-400">
                {dupeCount} lot{dupeCount === 1 ? " is" : "s are"} already in the database and will be skipped.
              </p>
            )}

            {/* Interactive Lots Table */}
            <div className="max-h-[42vh] overflow-y-auto rounded-xl border">
              <table className="w-full text-xs">
                <thead className="bg-muted/70 sticky top-0 text-left text-muted-foreground z-10">
                  <tr>
                    <th className="p-2 w-8">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 cursor-pointer"
                        checked={allFilteredChecked}
                        onChange={(e) => toggleAllFiltered(e.target.checked)}
                        title="Select/Deselect All Filtered"
                      />
                    </th>
                    <th className="p-2 w-24">Document</th>
                    <th className="p-2 w-24">Estate</th>
                    <th className="p-2 w-24">Suburb</th>
                    <th className="p-2 w-20">Stage</th>
                    <th className="p-2 w-16">Lot #</th>
                    <th className="p-2 w-20">Size (m²)</th>
                    <th className="p-2 w-16">Frontage</th>
                    <th className="p-2 w-24">Price ($)</th>
                    <th className="p-2 w-24">Registration</th>
                    <th className="p-2 w-20">Status</th>
                    <th className="p-2 w-12 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredRows.map((r) => {
                    const dupe = isDupe(r);
                    const suspicious = isSuspiciousInversion(r);
                    return (
                      <tr
                        key={r.rowId}
                        className={`${dupe ? "bg-muted/40 text-muted-foreground" : ""} ${
                          suspicious ? "bg-amber-500/5" : ""
                        }`}
                      >
                        <td className="p-2">
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 cursor-pointer"
                            disabled={dupe}
                            checked={!dupe && Boolean(picked[r.rowId])}
                            onChange={(e) =>
                              setPicked((prev) => ({ ...prev, [r.rowId]: e.target.checked }))
                            }
                          />
                        </td>
                        <td className="p-1">
                          <span className="inline-block truncate max-w-[90px] text-[10px] text-muted-foreground" title={r.docName}>
                            {r.docName}
                          </span>
                        </td>
                        <td className="p-1">
                          <input
                            className="w-full rounded border px-1.5 py-0.5 text-xs font-semibold"
                            value={r.estate}
                            onChange={(e) => updateRow(r.rowId, { estate: e.target.value })}
                          />
                        </td>
                        <td className="p-1">
                          <input
                            className="w-full rounded border px-1.5 py-0.5 text-xs"
                            value={r.suburb}
                            onChange={(e) => updateRow(r.rowId, { suburb: e.target.value })}
                          />
                        </td>
                        <td className="p-1">
                          <input
                            className="w-full rounded border px-1.5 py-0.5 text-xs"
                            placeholder="Stage 4"
                            value={r.stage || ""}
                            onChange={(e) => updateRow(r.rowId, { stage: e.target.value })}
                          />
                        </td>
                        <td className="p-1">
                          <input
                            className={`w-full rounded border px-1.5 py-0.5 text-xs font-medium ${
                              suspicious ? "border-amber-400 bg-amber-500/10" : ""
                            }`}
                            placeholder="101"
                            value={r.lot_number || ""}
                            onChange={(e) => updateRow(r.rowId, { lot_number: e.target.value })}
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            className={`w-full rounded border px-1.5 py-0.5 text-xs ${
                              suspicious ? "border-amber-400 bg-amber-500/10" : ""
                            }`}
                            placeholder="450"
                            value={r.land_size ?? ""}
                            onChange={(e) =>
                              updateRow(r.rowId, { land_size: e.target.value ? parseFloat(e.target.value) : null })
                            }
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            step="0.1"
                            className="w-full rounded border px-1.5 py-0.5 text-xs"
                            placeholder="14"
                            value={r.frontage ?? ""}
                            onChange={(e) =>
                              updateRow(r.rowId, { frontage: e.target.value ? parseFloat(e.target.value) : null })
                            }
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            className="w-full rounded border px-1.5 py-0.5 text-xs font-semibold"
                            placeholder="385000"
                            value={r.land_price ?? ""}
                            onChange={(e) =>
                              updateRow(r.rowId, { land_price: e.target.value ? parseInt(e.target.value, 10) : null })
                            }
                          />
                        </td>
                        <td className="p-1">
                          <input
                            className="w-full rounded border px-1.5 py-0.5 text-xs"
                            placeholder={r.titled ? "Registered" : "Nov 2026"}
                            value={r.titled ? "Registered" : (r.registration_date || "")}
                            onChange={(e) => {
                              const v = e.target.value;
                              const isReg = /registered|titled/i.test(v);
                              updateRow(r.rowId, { titled: isReg, registration_date: isReg ? null : v });
                            }}
                          />
                        </td>
                        <td className="p-1">
                          <select
                            className="w-full rounded border px-1 py-0.5 text-xs bg-background"
                            value={r.status || "available"}
                            onChange={(e) => updateRow(r.rowId, { status: e.target.value as any })}
                          >
                            <option value="available">Available</option>
                            <option value="on_hold">On Hold</option>
                            <option value="sold">Sold</option>
                          </select>
                        </td>
                        <td className="p-1 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => swapRowLotAndSize(r.rowId)}
                              className="text-amber-400 hover:text-amber-300 p-0.5"
                              title="Swap Lot # and Size for this row"
                            >
                              <ArrowLeftRight className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeRow(r.rowId)}
                              className="text-muted-foreground hover:text-destructive p-0.5"
                              title="Remove row"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Button
              onClick={importAll}
              disabled={busy || !selectedRows.length}
              className="w-full sm:w-auto font-semibold gap-2"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              )}
              Import All {selectedRows.length} Lots across {docs.length || 1} Price Lists to Database
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DatabasePage() {
  const { mode } = useTheme();
  const isLight = mode === "normal";
  const navigate = useNavigate();
  const [tab, setTab] = useState<"lots" | "packages">("lots");
  const [stateFilter, setStateFilter] = useState<"ALL" | "QLD" | "NSW">("ALL");
  const [lots, setLots] = useState<Lot[]>([]);
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [lotSort, setLotSort] = useState<"registration" | "land_price" | "land_size">(
    "registration",
  );
  const [selLots, setSelLots] = useState<string[]>([]);
  const [selPkgs, setSelPkgs] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkRegDate, setBulkRegDate] = useState("");
  const [bulkEstate, setBulkEstate] = useState("");
  const [bulkStage, setBulkStage] = useState("");
  const [bulkPrice, setBulkPrice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [openSuburbs, setOpenSuburbs] = useState<string[]>(() => {
    const local = getLocalLots();
    return Array.from(new Set(local.map((l) => l.suburb.trim().toLowerCase())));
  });
  const isOpen = (key: string) => openSuburbs.includes(key);

  const [pkgSort, setPkgSort] = useState<
    "price_asc" | "price_desc" | "suburb" | "design" | "house_price" | "land_price"
  >("price_asc");
  const [pkgStatusFilter, setPkgStatusFilter] = useState<
    "ALL" | "live" | "draft" | "sold" | "nhc_exclusive"
  >("ALL");
  const [pkgBedFilter, setPkgBedFilter] = useState<"ALL" | "3" | "4" | "5+">("ALL");
  const [openPkgSuburbs, setOpenPkgSuburbs] = useState<string[]>(() => {
    const localP = getLocalPackages();
    const localL = getLocalLots();
    return Array.from(
      new Set(
        localP.map((p) => {
          const lot = p.lot_id ? localL.find((l) => l.id === p.lot_id) : undefined;
          return (lot?.suburb || (p.flyer_data as any)?.suburb || "General Releases")
            .trim()
            .toLowerCase();
        }),
      ),
    );
  });
  const isPkgSubOpen = (key: string) => openPkgSuburbs.includes(key);

  const [downloadingPkgId, setDownloadingPkgId] = useState<string | null>(null);
  const [activeDownloadData, setActiveDownloadData] = useState<FlyerData | null>(null);
  const printContainerRef = useRef<HTMLDivElement | null>(null);

  const [isSyncingLive, setIsSyncingLive] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("");

  const load = useCallback(async (opts?: { silent?: boolean; force?: boolean }) => {
    const isSilent = opts?.silent ?? false;
    if (!isSilent) {
      // Instant load from localStorage cache
      const localL = getLocalLots();
      const localP = getLocalPackages();
      setLots(localL);
      setPackages(localP);
      if (localL.length > 0) {
        setOpenSuburbs((prev) =>
          prev.length === 0
            ? Array.from(new Set(localL.map((l) => l.suburb.trim().toLowerCase())))
            : prev,
        );
      }
      if (localP.length > 0) {
        const pSubs = localP.map((p) => {
          const lot = p.lot_id ? localL.find((l) => l.id === p.lot_id) : undefined;
          return (lot?.suburb || (p.flyer_data as any)?.suburb || "General Releases")
            .trim()
            .toLowerCase();
        });
        setOpenPkgSuburbs((prev) => (prev.length === 0 ? Array.from(new Set(pSubs)) : prev));
      }
      if (localL.length > 0 || localP.length > 0) {
        setLoading(false);
      } else {
        setLoading(true);
      }
    }

    setIsSyncingLive(true);
    try {
      const synced = await syncLocalPackagesAndLotsToSupabase();
      if (synced) {
        setLots(synced.lots);
        setPackages(synced.packages);
        setOpenSuburbs((prev) =>
          prev.length === 0
            ? Array.from(new Set(synced.lots.map((l) => l.suburb.trim().toLowerCase())))
            : prev,
        );
        const pSubs = synced.packages.map((p) => {
          const lot = p.lot_id ? synced.lots.find((l) => l.id === p.lot_id) : undefined;
          return (lot?.suburb || (p.flyer_data as any)?.suburb || "General Releases")
            .trim()
            .toLowerCase();
        });
        setOpenPkgSuburbs((prev) => (prev.length === 0 ? Array.from(new Set(pSubs)) : prev));
        const now = new Date();
        setLastSyncTime(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      }
      if (!isSilent) {
        setSelLots([]);
        setSelPkgs([]);
      }
    } catch (e) {
      console.warn("[database] Supabase sync notice (using local storage fallback):", e);
    } finally {
      setIsSyncingLive(false);
      if (!isSilent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void load();

    // Multi-user 15-second live background sync interval across team
    const syncInterval = setInterval(() => {
      void load({ silent: true });
    }, 15000);

    // Sync immediately when consultant returns to tab
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void load({ silent: true });
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 1. Cross-tab live sync via BroadcastChannel
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(DB_SYNC_CHANNEL_NAME);
      channel.onmessage = () => {
        setLots(getLocalLots());
        setPackages(getLocalPackages());
      };
    } catch {}

    // 2. Storage & custom event listeners
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "hudson_qld_database_lots_v3" || e.key === "hudson_qld_database_packages_v3") {
        setLots(getLocalLots());
        setPackages(getLocalPackages());
      }
    };
    window.addEventListener("storage", handleStorage);

    const handleCustomChange = () => {
      setLots(getLocalLots());
      setPackages(getLocalPackages());
    };
    window.addEventListener("hudson_database_change", handleCustomChange);

    // 3. Supabase Realtime WebSocket broadcast subscription for live cross-device sync
    const unsubscribeCloud = subscribeToCloudDatabaseSync((mutation) => {
      if (mutation.action === "lot_updated") {
        setLots((prev) => {
          const exists = prev.some((l) => l.id === mutation.lot.id);
          const next = exists
            ? prev.map((l) => (l.id === mutation.lot.id ? { ...l, ...mutation.lot } : l))
            : [mutation.lot, ...prev];
          saveLocalLots(next);
          return next;
        });
      } else if (mutation.action === "lots_bulk_updated") {
        setLots((prev) => {
          const map = new Map(mutation.lots.map((l) => [l.id, l]));
          const next = prev.map((l) => (map.has(l.id) ? { ...l, ...map.get(l.id)! } : l));
          saveLocalLots(next);
          return next;
        });
      } else if (mutation.action === "lot_deleted") {
        deleteLocalLot(mutation.id);
        setLots((prev) => prev.filter((l) => l.id !== mutation.id));
      } else if (mutation.action === "lots_bulk_deleted") {
        deleteLocalLotsBatch(mutation.ids);
        const set = new Set(mutation.ids);
        setLots((prev) => prev.filter((l) => !set.has(l.id)));
      } else if (mutation.action === "package_updated") {
        setPackages((prev) => {
          const exists = prev.some((p) => p.id === mutation.package.id);
          const next = exists
            ? prev.map((p) => (p.id === mutation.package.id ? { ...p, ...mutation.package } : p))
            : [mutation.package, ...prev];
          saveLocalPackages(next);
          return next;
        });
      } else if (mutation.action === "packages_bulk_updated") {
        setPackages((prev) => {
          const map = new Map(mutation.packages.map((p) => [p.id, p]));
          const next = prev.map((p) => (map.has(p.id) ? { ...p, ...map.get(p.id)! } : p));
          saveLocalPackages(next);
          return next;
        });
      } else if (mutation.action === "package_deleted") {
        deleteLocalPackage(mutation.id);
        setPackages((prev) => prev.filter((p) => p.id !== mutation.id));
      } else if (mutation.action === "packages_bulk_deleted") {
        deleteLocalPackagesBatch(mutation.ids);
        const set = new Set(mutation.ids);
        setPackages((prev) => prev.filter((p) => !set.has(p.id)));
      } else if (mutation.action === "database_full_sync" || mutation.action === "lots_imported") {
        void fetchRemoteLotsAndPackages().then((remote) => {
          if (remote) {
            const delLots = getDeletedLotIds();
            const delPkgs = getDeletedPkgIds();
            const cleanLots = remote.lots.filter((l) => !delLots.has(l.id));
            const cleanPkgs = remote.packages.filter((p) => !delPkgs.has(p.id));
            setLots(cleanLots);
            saveLocalLots(cleanLots);
            setPackages(cleanPkgs);
            saveLocalPackages(cleanPkgs);
          }
        });
      }
    });

    return () => {
      clearInterval(syncInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      channel?.close();
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("hudson_database_change", handleCustomChange);
      unsubscribeCloud();
    };
  }, [load]);

  const lotById = useMemo(() => new Map(lots.map((l) => [l.id, l])), [lots]);
  const packagesByLot = useMemo(() => {
    const grouped = new Map<string, Pkg[]>();
    for (const pkg of packages) {
      if (!pkg.lot_id) continue;
      const list = grouped.get(pkg.lot_id) ?? [];
      list.push(pkg);
      grouped.set(pkg.lot_id, list);
    }
    return grouped;
  }, [packages]);

  // Counts by State Division
  const qldLotsCount = useMemo(() => lots.filter((l) => (l.state || getLotState(l)) === "QLD").length, [lots]);
  const nswLotsCount = useMemo(() => lots.filter((l) => (l.state || getLotState(l)) === "NSW").length, [lots]);

  const qldPkgsCount = useMemo(() => {
    return packages.filter((p) => {
      const lot = p.lot_id ? lotById.get(p.lot_id) : undefined;
      return (p.state || (lot ? getLotState(lot) : "QLD")) === "QLD";
    }).length;
  }, [packages, lotById]);

  const nswPkgsCount = useMemo(() => {
    return packages.filter((p) => {
      const lot = p.lot_id ? lotById.get(p.lot_id) : undefined;
      return (p.state || (lot ? getLotState(lot) : "NSW")) === "NSW";
    }).length;
  }, [packages, lotById]);

  const filteredLots = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = lots.filter((l) => {
      const lotState = l.state || getLotState(l);
      if (stateFilter !== "ALL" && lotState !== stateFilter) return false;
      if (!q) return true;
      return [l.estate, l.suburb, l.lot_number, l.address, l.developer, l.notes]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

    return [...list].sort((a, b) => {
      if (lotSort === "land_price") {
        return (a.land_price ?? Infinity) - (b.land_price ?? Infinity);
      }
      if (lotSort === "land_size") {
        return (b.land_size ?? 0) - (a.land_size ?? 0);
      }
      if (a.titled !== b.titled) return a.titled ? -1 : 1;
      return (a.registration_date ?? "9999").localeCompare(b.registration_date ?? "9999");
    });
  }, [lots, query, lotSort, stateFilter]);

  const stateLotGroups = useMemo(() => {
    const states: ("QLD" | "NSW")[] = stateFilter === "ALL" ? ["QLD", "NSW"] : [stateFilter];
    return states.map((st) => {
      const stateLots = filteredLots.filter((l) => (l.state || getLotState(l)) === st);
      const suburbMap = new Map<string, Lot[]>();
      stateLots.forEach((l) => {
        const key = l.suburb.trim().toLowerCase();
        const list = suburbMap.get(key) ?? [];
        list.push(l);
        suburbMap.set(key, list);
      });

      const suburbGroups = Array.from(suburbMap.entries())
        .map(([key, groupLots]) => {
          const estateMap = new Map<string, Lot[]>();
          groupLots.forEach((l) => {
            const eKey = l.estate.trim().toLowerCase();
            const list = estateMap.get(eKey) ?? [];
            list.push(l);
            estateMap.set(eKey, list);
          });
          const estates = Array.from(estateMap.entries()).map(([eKey, eLots]) => ({
            key: eKey,
            estate: eLots[0]?.estate ?? eKey,
            lots: eLots,
          }));
          return {
            key,
            label: groupLots[0]?.suburb ?? key,
            count: groupLots.length,
            estates,
          };
        })
        .sort((a, b) => a.label.localeCompare(b.label));

      return {
        state: st,
        title: st === "QLD" ? "Queensland Land Releases" : "New South Wales Land Releases",
        subtitle: st === "QLD" ? "Brisbane, Logan, Ipswich, Moreton Bay & Gold Coast" : "Sydney Metro, South Coast, Hunter & Central Coast",
        lotsCount: stateLots.length,
        suburbsCount: suburbGroups.length,
        suburbGroups,
      };
    });
  }, [filteredLots, stateFilter]);

  const filteredPackages = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = packages.filter((p) => {
      const lot = p.lot_id ? lotById.get(p.lot_id) : undefined;
      const pkgState = p.state || (lot ? getLotState(lot) : "QLD");
      if (stateFilter !== "ALL" && pkgState !== stateFilter) return false;

      // Status filter
      if (pkgStatusFilter !== "ALL" && p.status !== pkgStatusFilter) return false;

      // Bed filter
      if (pkgBedFilter !== "ALL") {
        const bedsNum = parseInt(p.beds || "0", 10);
        if (pkgBedFilter === "3" && bedsNum !== 3) return false;
        if (pkgBedFilter === "4" && bedsNum !== 4) return false;
        if (pkgBedFilter === "5+" && bedsNum < 5) return false;
      }

      if (!q) return true;
      return [
        p.name,
        p.design,
        p.facade_name,
        p.range_id,
        p.housing_type,
        lot?.estate,
        lot?.suburb,
        lot?.lot_number ? `lot ${lot.lot_number}` : "",
        (p.flyer_data as any)?.estate,
        (p.flyer_data as any)?.suburb,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

    // Apply sorting
    return [...list].sort((a, b) => {
      const lotA = a.lot_id ? lotById.get(a.lot_id) : undefined;
      const lotB = b.lot_id ? lotById.get(b.lot_id) : undefined;

      if (pkgSort === "price_asc") {
        return (a.total_price ?? Infinity) - (b.total_price ?? Infinity);
      }
      if (pkgSort === "price_desc") {
        return (b.total_price ?? 0) - (a.total_price ?? 0);
      }
      if (pkgSort === "house_price") {
        return (a.house_price ?? Infinity) - (b.house_price ?? Infinity);
      }
      if (pkgSort === "land_price") {
        return (a.land_price ?? Infinity) - (b.land_price ?? Infinity);
      }
      if (pkgSort === "design") {
        return (a.design || a.name || "").localeCompare(b.design || b.name || "");
      }
      // Default: sort by suburb, then design
      const subA = (lotA?.suburb || (a.flyer_data as any)?.suburb || "").trim().toLowerCase();
      const subB = (lotB?.suburb || (b.flyer_data as any)?.suburb || "").trim().toLowerCase();
      if (subA !== subB) return subA.localeCompare(subB);
      return (a.design || a.name || "").localeCompare(b.design || b.name || "");
    });
  }, [packages, query, stateFilter, lotById, pkgStatusFilter, pkgBedFilter, pkgSort]);

  const statePackageGroups = useMemo(() => {
    const states: ("QLD" | "NSW")[] = stateFilter === "ALL" ? ["QLD", "NSW"] : [stateFilter];
    return states.map((st) => {
      const statePackages = filteredPackages.filter((p) => {
        const lot = p.lot_id ? lotById.get(p.lot_id) : undefined;
        return (p.state || (lot ? getLotState(lot) : "QLD")) === st;
      });

      const suburbMap = new Map<string, Pkg[]>();
      statePackages.forEach((p) => {
        const lot = p.lot_id ? lotById.get(p.lot_id) : undefined;
        const sub = (lot?.suburb || (p.flyer_data as any)?.suburb || "General Releases").trim();
        const key = sub.toLowerCase();
        const list = suburbMap.get(key) ?? [];
        list.push(p);
        suburbMap.set(key, list);
      });

      const suburbGroups = Array.from(suburbMap.entries())
        .map(([key, groupPkgs]) => {
          const estateMap = new Map<string, Pkg[]>();
          groupPkgs.forEach((p) => {
            const lot = p.lot_id ? lotById.get(p.lot_id) : undefined;
            const est = (lot?.estate || (p.flyer_data as any)?.estate || "Standard Releases").trim();
            const eKey = est.toLowerCase();
            const list = estateMap.get(eKey) ?? [];
            list.push(p);
            estateMap.set(eKey, list);
          });

          const estates = Array.from(estateMap.entries()).map(([eKey, ePkgs]) => ({
            key: eKey,
            estate:
              (ePkgs[0]?.lot_id && lotById.get(ePkgs[0].lot_id)?.estate) ||
              (ePkgs[0]?.flyer_data as any)?.estate ||
              titleCase(eKey),
            packages: ePkgs,
          }));

          const prices = groupPkgs
            .map((p) => p.total_price)
            .filter((pr): pr is number => typeof pr === "number" && pr > 0);
          const minPrice = prices.length ? Math.min(...prices) : null;
          const maxPrice = prices.length ? Math.max(...prices) : null;

          const firstLot = groupPkgs.find((p) => p.lot_id && lotById.get(p.lot_id))?.lot_id;
          const label =
            (firstLot && lotById.get(firstLot)?.suburb) ||
            (groupPkgs[0]?.flyer_data as any)?.suburb ||
            titleCase(key);

          return {
            key,
            label,
            count: groupPkgs.length,
            estatesCount: estates.length,
            minPrice,
            maxPrice,
            estates,
          };
        })
        .sort((a, b) => a.label.localeCompare(b.label));

      const prices = statePackages
        .map((p) => p.total_price)
        .filter((pr): pr is number => typeof pr === "number" && pr > 0);
      const minPrice = prices.length ? Math.min(...prices) : null;
      const maxPrice = prices.length ? Math.max(...prices) : null;
      const avgPrice = prices.length
        ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
        : null;
      const liveCount = statePackages.filter((p) => p.status === "live").length;
      const draftCount = statePackages.filter((p) => p.status === "draft").length;
      const soldCount = statePackages.filter((p) => p.status === "sold").length;
      const exclCount = statePackages.filter((p) => p.status === "nhc_exclusive").length;

      return {
        state: st,
        title: st === "QLD" ? "Queensland House & Land Packages" : "New South Wales House & Land Packages",
        subtitle:
          st === "QLD"
            ? "Turnkey H&L Packages across Brisbane, Ipswich, Logan & Moreton Bay"
            : "Turnkey H&L Packages across Sydney Metro, Hunter & Illawarra",
        packagesCount: statePackages.length,
        suburbsCount: suburbGroups.length,
        liveCount,
        draftCount,
        soldCount,
        exclCount,
        minPrice,
        maxPrice,
        avgPrice,
        suburbGroups,
      };
    });
  }, [filteredPackages, stateFilter, lotById]);

  const updateLot = async (id: string, patch: Partial<Lot>) => {
    setIsSaving(true);
    setLots((prev) => {
      const existing = prev.find((l) => l.id === id) || getLocalLots().find((l) => l.id === id);
      if (!existing) return prev;
      const updatedLot: Lot = { ...existing, ...patch, updated_at: new Date().toISOString() };
      const next = prev.map((l) => (l.id === id ? updatedLot : l));
      saveLocalLots(next);
      void syncLotToSupabase(updatedLot);
      return next;
    });
    setTimeout(() => setIsSaving(false), 800);
  };

  const updatePkg = async (id: string, patch: Partial<Pkg>) => {
    setIsSaving(true);
    setPackages((prev) => {
      const existing = prev.find((p) => p.id === id) || getLocalPackages().find((p) => p.id === id);
      if (!existing) return prev;
      const updatedPkg: Pkg = { ...existing, ...patch, updated_at: new Date().toISOString() };
      const next = prev.map((p) => (p.id === id ? updatedPkg : p));
      saveLocalPackages(next);
      void syncPackageToSupabase(updatedPkg);
      return next;
    });
    setTimeout(() => setIsSaving(false), 800);
  };

  const removeLot = async (id: string) => {
    deleteLocalLot(id);
    setLots((prev) => prev.filter((l) => l.id !== id));
    setSelLots((prev) => prev.filter((x) => x !== id));
    try {
      await deleteLotFromSupabase(id);
    } catch (err) {
      console.warn("[database] deleteLotFromSupabase warning:", err);
    }
    toast.success("Lot removed");
  };

  const removePkg = async (id: string) => {
    deleteLocalPackage(id);
    setPackages((prev) => prev.filter((p) => p.id !== id));
    setSelPkgs((prev) => prev.filter((x) => x !== id));
    try {
      await deletePackageFromSupabase(id);
    } catch (err) {
      console.warn("[database] deletePackageFromSupabase warning:", err);
    }
    toast.success("Package removed");
  };

  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  /** Apply one change to every selected land lot. */
  const bulkLots = async (
    patch: Partial<Lot>,
    label: string,
  ) => {
    if (!selLots.length) return;
    setBulkBusy(true);
    setIsSaving(true);
    const selSet = new Set(selLots);
    setLots((prev) => {
      const updatedList: Lot[] = [];
      const next = prev.map((l) => {
        if (selSet.has(l.id)) {
          const updated = { ...l, ...patch, updated_at: new Date().toISOString() };
          updatedList.push(updated);
          return updated;
        }
        return l;
      });
      saveLocalLots(next);
      if (updatedList.length) {
        void syncLotsBatchToSupabase(updatedList);
      }
      return next;
    });
    setBulkBusy(false);
    setTimeout(() => setIsSaving(false), 800);
    toast.success(`${selLots.length} lots ${label}`);
  };

  const applyBulkEstate = async () => {
    const est = bulkEstate.trim();
    if (!est) {
      toast.error("Please enter an estate name");
      return;
    }
    await bulkLots({ estate: est }, `moved to ${est}`);
    setBulkEstate("");
  };

  const applyBulkStage = async () => {
    const stg = bulkStage.trim();
    if (!stg) {
      toast.error("Please enter a stage (e.g. Stage 4)");
      return;
    }
    const stagePrefix = stg.toLowerCase().startsWith("stage") ? stg : `Stage ${stg}`;
    setBulkBusy(true);
    setIsSaving(true);
    const selSet = new Set(selLots);
    setLots((prev) => {
      const updatedList: Lot[] = [];
      const next = prev.map((l) => {
        if (selSet.has(l.id)) {
          const cleanNotes = l.notes ? l.notes.replace(/Stage\s*[A-Za-z0-9\.\-]+(\s*·\s*)?/i, "").trim() : "";
          const combinedNotes = [stagePrefix, cleanNotes].filter(Boolean).join(" · ") || null;
          const updated = { ...l, notes: combinedNotes, updated_at: new Date().toISOString() };
          updatedList.push(updated);
          return updated;
        }
        return l;
      });
      saveLocalLots(next);
      if (updatedList.length) {
        void syncLotsBatchToSupabase(updatedList);
      }
      return next;
    });
    setBulkBusy(false);
    setTimeout(() => setIsSaving(false), 800);
    toast.success(`${selLots.length} lots set to ${stagePrefix}`);
    setBulkStage("");
  };

  const applyBulkPrice = async () => {
    const raw = bulkPrice.trim();
    if (!raw) {
      toast.error("Enter price adjustment (e.g. +10000, -5000, or 450000)");
      return;
    }
    const isDelta = raw.startsWith("+") || raw.startsWith("-");
    const val = parseFloat(raw.replace(/[^0-9.\-+]/g, ""));
    if (isNaN(val)) {
      toast.error("Invalid price number");
      return;
    }
    setBulkBusy(true);
    setIsSaving(true);
    const selSet = new Set(selLots);
    setLots((prev) => {
      const updatedList: Lot[] = [];
      const next = prev.map((l) => {
        if (selSet.has(l.id)) {
          const currentP = l.land_price || 0;
          const newP = isDelta ? Math.max(0, currentP + val) : Math.max(0, val);
          const updated = { ...l, land_price: newP, updated_at: new Date().toISOString() };
          updatedList.push(updated);
          return updated;
        }
        return l;
      });
      saveLocalLots(next);
      if (updatedList.length) {
        void syncLotsBatchToSupabase(updatedList);
      }
      return next;
    });
    setBulkBusy(false);
    setTimeout(() => setIsSaving(false), 800);
    toast.success(`${selLots.length} lots updated with price adjustment`);
    setBulkPrice("");
  };

  const bulkDeleteLots = async () => {
    if (!selLots.length) return;
    const count = selLots.length;
    if (!window.confirm(`Delete ${count} land lots? This cannot be undone.`)) return;
    setBulkBusy(true);
    const toDelete = [...selLots];
    deleteLocalLotsBatch(toDelete);
    setLots((prev) => prev.filter((l) => !toDelete.includes(l.id)));
    setSelLots([]);
    try {
      await deleteLotsBatchFromSupabase(toDelete);
    } catch (err) {
      console.warn("[database] deleteLotsBatchFromSupabase warning:", err);
    }
    setBulkBusy(false);
    toast.success(`Deleted ${count} lots`);
  };

  const bulkPkgs = async (patch: Partial<Pkg>, label: string) => {
    if (!selPkgs.length) return;
    setBulkBusy(true);
    const selSet = new Set(selPkgs);
    setPackages((prev) => {
      const updatedList: Pkg[] = [];
      const next = prev.map((p) => {
        if (selSet.has(p.id)) {
          const updated = { ...p, ...patch, updated_at: new Date().toISOString() };
          updatedList.push(updated);
          return updated;
        }
        return p;
      });
      saveLocalPackages(next);
      if (updatedList.length) {
        void syncPackagesBatchToSupabase(updatedList);
      }
      return next;
    });
    setBulkBusy(false);
    toast.success(`${selPkgs.length} packages ${label}`);
  };

  const bulkDeletePkgs = async () => {
    if (!selPkgs.length) return;
    const count = selPkgs.length;
    if (!window.confirm(`Delete ${count} packages? This cannot be undone.`)) return;
    setBulkBusy(true);
    const toDelete = [...selPkgs];
    deleteLocalPackagesBatch(toDelete);
    setPackages((prev) => prev.filter((p) => !toDelete.includes(p.id)));
    setSelPkgs([]);
    try {
      await deletePackagesBatchFromSupabase(toDelete);
    } catch (err) {
      console.warn("[database] deletePackagesBatchFromSupabase warning:", err);
    }
    setBulkBusy(false);
    toast.success(`Deleted ${count} packages`);
  };


  /** Hand a package (or a bare lot) to the flyer builder, pre-filled. */
  const openInFlyer = (payload: Record<string, unknown>) => {
    try {
      window.sessionStorage.setItem("hudson-flyer-handoff", JSON.stringify(payload));
    } catch {
      /* non-fatal */
    }
    navigate({ to: "/flyer" });
  };

  /** Hand a package to the flyer builder with full, canonical address and specs pre-filled */
  const openPackageInFlyer = (p: Pkg, lot?: Lot) => {
    const fullData = buildFlyerDataFromPackage(p, lot);
    openInFlyer(fullData as unknown as Record<string, unknown>);
  };

  /** Direct download of high-resolution A4 PDF straight from the database row */
  const handleDirectPdfDownload = async (p: Pkg, lot?: Lot) => {
    if (downloadingPkgId) return;
    setDownloadingPkgId(p.id);
    const flyerData = buildFlyerDataFromPackage(p, lot);
    setActiveDownloadData(flyerData);

    try {
      // Allow React to mount the printable container and wait for layout & fonts
      await new Promise((resolve) => setTimeout(resolve, 400));
      if (typeof document !== "undefined" && document.fonts) {
        await document.fonts.ready;
      }
      // Ensure all images (facade, floorplan, logo) have fully decoded before capturing
      if (printContainerRef.current) {
        const imgs = Array.from(printContainerRef.current.querySelectorAll("img"));
        await Promise.all(
          imgs.map(async (img) => {
            if (img.complete && img.naturalWidth > 0) return;
            try {
              if ("decode" in img) {
                await img.decode();
              } else {
                await new Promise<void>((res) => {
                  (img as HTMLImageElement).onload = () => res();
                  (img as HTMLImageElement).onerror = () => res();
                  setTimeout(res, 2500);
                });
              }
            } catch {
              /* non-fatal image decode warning */
            }
          })
        );
      }
      await downloadA4Pdf(printContainerRef.current || undefined, buildFlyerPdfFilename(flyerData));
      toast.success(`Downloaded flyer for ${flyerData.floorplanName || flyerData.designName}`);
    } catch (err) {
      console.error("[database] Direct PDF download error:", err);
      toast.error("Failed to generate PDF. Please try again or edit the flyer.");
    } finally {
      setDownloadingPkgId(null);
      setActiveDownloadData(null);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className={`min-h-screen ${isLight ? "bg-slate-50 text-slate-900" : "bg-slate-950 text-slate-100"} relative overflow-hidden font-sans selection:bg-brand-gold/30 flex flex-col`}>
      {/* Ambient Gradient Lights */}
      <div className="ambient-glow-cyan h-96 w-96 -top-20 right-10" />
      <div className="ambient-glow-gold h-96 w-96 top-96 -left-20" />

      <header className={`sticky top-0 z-30 border-b ${isLight ? "border-slate-200 bg-white/95 shadow-xs" : "border-slate-800/80 bg-slate-950/80"} backdrop-blur-xl`}>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 sm:flex sm:flex-wrap sm:justify-between sm:px-6">
          <Link to="/hub" className="flex min-w-0 items-center gap-3 hover:opacity-90 transition-opacity">
            <img src={logoUrl} alt="Hudson Homes" className="h-6 w-auto shrink-0 object-contain sm:h-7" />
            <div className={`min-w-0 leading-tight border-l ${isLight ? "border-slate-200" : "border-slate-800"} pl-3`}>
              <h1 className={`truncate text-xs font-bold tracking-[0.14em] ${isLight ? "text-slate-900" : "text-white"} uppercase sm:text-sm`}>
                QLD &amp; NSW House &amp; Land Database
              </h1>
              <p className={`hidden text-[10px] tracking-wider ${isLight ? "text-cyan-700" : "text-cyan-400"} font-semibold uppercase sm:block`}>
                Live Multi-State Availability &amp; Pricing CRM
              </p>
            </div>
          </Link>
          <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
            {/* 15-second multi-user live sync status badge */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                isSaving || isSyncingLive
                  ? isLight
                    ? "border-amber-300 bg-amber-50 text-amber-800 shadow-xs"
                    : "border-amber-500/30 bg-amber-500/15 text-amber-300 shadow-sm"
                  : isLight
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800 shadow-xs"
                    : "border-emerald-500/30 bg-emerald-500/15 text-emerald-400 shadow-sm"
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isSaving || isSyncingLive ? "bg-amber-400" : "bg-emerald-400"
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isSaving || isSyncingLive ? "bg-amber-500 animate-spin" : "bg-emerald-500"
                  }`}
                />
              </span>
              <span>
                {isSaving
                  ? "Saving to Cloud…"
                  : isSyncingLive
                    ? "Syncing Live…"
                    : "Live Synced (15s)"}
              </span>
              {lastSyncTime && !isSaving && !isSyncingLive && (
                <span className={`hidden sm:inline font-mono text-[10px] ${isLight ? "text-emerald-700/70" : "text-emerald-400/60"}`}>
                  · {lastSyncTime}
                </span>
              )}
              <button
                type="button"
                onClick={() => void load({ force: true })}
                disabled={isSyncingLive}
                className="ml-1 hover:opacity-80 transition-opacity cursor-pointer p-0.5 rounded"
                title="Click to force instant sync across all team members"
              >
                <RefreshCw className={`h-3 w-3 ${isSyncingLive ? "animate-spin" : ""}`} />
              </button>
            </div>
            <ThemeToggle />
            <Link to="/hub">
              <Button variant="ghost" size="sm" className={`text-xs ${isLight ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100" : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"} border border-transparent`}>
                Hub
              </Button>
            </Link>
            <Link to="/flyer">
              <Button variant="outline" size="sm" className={`text-xs ${isLight ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-xs" : "border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white"}`}>
                Flyer builder
              </Button>
            </Link>
            <Link to="/land-scout">
              <Button variant="outline" size="sm" className={`text-xs ${isLight ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 shadow-xs" : "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-white"}`}>
                <Compass className="h-3.5 w-3.5 mr-1" />
                Land Scout
              </Button>
            </Link>
            {/* NHC Active Profile */}
            <StaffHeaderProfile isLight={isLight} />
          </div>
        </div>
      </header>

      <main className="space-y-5 p-4 sm:p-6 relative z-10 flex-1 max-w-[1700px] mx-auto w-full">
        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex rounded-xl border ${isLight ? "border-slate-200 bg-white shadow-xs" : "border-slate-800/90 bg-slate-900/90 shadow-inner"} p-1 backdrop-blur-md`}>
            {(["lots", "packages"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold capitalize transition-all ${
                  tab === t
                    ? t === "lots"
                      ? isLight
                        ? "bg-cyan-100 text-cyan-900 border border-cyan-300 shadow-xs font-bold"
                        : "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                      : isLight
                        ? "bg-amber-100 text-amber-900 border border-amber-300 shadow-xs font-bold"
                        : "bg-gradient-to-r from-amber-500/20 to-brand-gold/20 text-amber-200 border border-brand-gold/40 shadow-sm"
                    : isLight
                      ? "text-slate-600 hover:text-slate-900"
                      : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t === "lots" ? `Land lots (${lots.length})` : `Packages (${packages.length})`}
              </button>
            ))}
          </div>

          {/* State Division Filter Tabs: All | Queensland (QLD) | New South Wales (NSW) */}
          <div className={`flex rounded-xl border ${isLight ? "border-slate-200 bg-white shadow-xs" : "border-slate-800/90 bg-slate-900/90 shadow-inner"} p-1 backdrop-blur-md`}>
            <button
              type="button"
              onClick={() => setStateFilter("ALL")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                stateFilter === "ALL"
                  ? isLight
                    ? "bg-slate-900 text-white shadow-xs font-bold"
                    : "bg-slate-800 text-white border border-slate-700 shadow-sm font-bold"
                  : isLight
                    ? "text-slate-600 hover:text-slate-900"
                    : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All States ({tab === "lots" ? lots.length : packages.length})
            </button>
            <button
              type="button"
              onClick={() => setStateFilter("QLD")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 ${
                stateFilter === "QLD"
                  ? isLight
                    ? "bg-cyan-100 text-cyan-900 border border-cyan-300 shadow-xs font-bold"
                    : "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm font-bold"
                  : isLight
                    ? "text-slate-600 hover:text-slate-900"
                    : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
              QLD ({tab === "lots" ? qldLotsCount : qldPkgsCount})
            </button>
            <button
              type="button"
              onClick={() => setStateFilter("NSW")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 ${
                stateFilter === "NSW"
                  ? isLight
                    ? "bg-amber-100 text-amber-900 border border-amber-300 shadow-xs font-bold"
                    : "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40 shadow-sm font-bold"
                  : isLight
                    ? "text-slate-600 hover:text-slate-900"
                    : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              NSW ({tab === "lots" ? nswLotsCount : nswPkgsCount})
            </button>
          </div>

          <Input
            className={`h-9 w-full rounded-lg text-xs sm:max-w-xs ${
              isLight
                ? "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 shadow-xs"
                : "border-slate-800 bg-slate-900/80 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60"
            }`}
            placeholder={tab === "lots" ? "Search estate, suburb, lot…" : "Search package, design, facade, suburb…"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {tab === "lots" ? (
            <Select value={lotSort} onValueChange={(v) => setLotSort(v as typeof lotSort)}>
              <SelectTrigger className={`h-9 w-[180px] rounded-lg text-xs ${isLight ? "border-slate-200 bg-white text-slate-800 shadow-xs" : "border-slate-800 bg-slate-900/80 text-slate-200"}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={isLight ? "border-slate-200 bg-white text-slate-800 shadow-lg" : "border-slate-800 bg-slate-900 text-slate-200"}>
                <SelectItem value="registration">Sort: Registration</SelectItem>
                <SelectItem value="land_price">Sort: Land price</SelectItem>
                <SelectItem value="land_size">Sort: Land size</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {/* Package Sort Dropdown */}
              <Select value={pkgSort} onValueChange={(v) => setPkgSort(v as typeof pkgSort)}>
                <SelectTrigger className={`h-9 w-[180px] rounded-lg text-xs font-medium ${isLight ? "border-slate-200 bg-white text-slate-800 shadow-xs" : "border-slate-800 bg-slate-900/80 text-slate-200"}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={isLight ? "border-slate-200 bg-white text-slate-800 shadow-lg" : "border-slate-800 bg-slate-900 text-slate-200"}>
                  <SelectItem value="price_asc">Sort: Price (Low → High)</SelectItem>
                  <SelectItem value="price_desc">Sort: Price (High → Low)</SelectItem>
                  <SelectItem value="suburb">Sort: Suburb (A–Z)</SelectItem>
                  <SelectItem value="design">Sort: Design (A–Z)</SelectItem>
                  <SelectItem value="house_price">Sort: House Price</SelectItem>
                  <SelectItem value="land_price">Sort: Land Price</SelectItem>
                </SelectContent>
              </Select>

              {/* Package Status Filter Dropdown */}
              <Select value={pkgStatusFilter} onValueChange={(v) => setPkgStatusFilter(v as typeof pkgStatusFilter)}>
                <SelectTrigger className={`h-9 w-[155px] rounded-lg text-xs font-medium ${isLight ? "border-slate-200 bg-white text-slate-800 shadow-xs" : "border-slate-800 bg-slate-900/80 text-slate-200"}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={isLight ? "border-slate-200 bg-white text-slate-800 shadow-lg" : "border-slate-800 bg-slate-900 text-slate-200"}>
                  <SelectItem value="ALL">All Statuses ({packages.length})</SelectItem>
                  <SelectItem value="live">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.9)]" />
                      Live ({packages.filter((p) => p.status === "live").length})
                    </span>
                  </SelectItem>
                  <SelectItem value="draft">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.9)]" />
                      Draft ({packages.filter((p) => p.status === "draft").length})
                    </span>
                  </SelectItem>
                  <SelectItem value="sold">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.9)]" />
                      Sold ({packages.filter((p) => p.status === "sold").length})
                    </span>
                  </SelectItem>
                  <SelectItem value="nhc_exclusive">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.9)]" />
                      Exclusive ({packages.filter((p) => p.status === "nhc_exclusive").length})
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Package Beds Filter Dropdown */}
              <Select value={pkgBedFilter} onValueChange={(v) => setPkgBedFilter(v as typeof pkgBedFilter)}>
                <SelectTrigger className={`h-9 w-[120px] rounded-lg text-xs font-medium ${isLight ? "border-slate-200 bg-white text-slate-800 shadow-xs" : "border-slate-800 bg-slate-900/80 text-slate-200"}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={isLight ? "border-slate-200 bg-white text-slate-800 shadow-lg" : "border-slate-800 bg-slate-900 text-slate-200"}>
                  <SelectItem value="ALL">All Beds</SelectItem>
                  <SelectItem value="3">3 Bedrooms</SelectItem>
                  <SelectItem value="4">4 Bedrooms</SelectItem>
                  <SelectItem value="5+">5+ Bedrooms</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            <Button
              size="sm"
              variant="outline"
              className={`text-xs gap-1.5 ${isLight ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-xs" : "border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white"}`}
              onClick={() => {
                const url = stateFilter !== "ALL" ? `/browse/land?state=${stateFilter}` : "/browse/land";
                window.open(url, "_blank", "noopener");
              }}
            >
              <FileDown className="h-3.5 w-3.5 text-cyan-400" /> Customer land PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              className={`text-xs gap-1.5 ${isLight ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-xs" : "border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white"}`}
              onClick={() => {
                const url = stateFilter !== "ALL" ? `/browse/packages?view=sheet&state=${stateFilter}` : "/browse/packages?view=sheet";
                window.open(url, "_blank", "noopener");
              }}
            >
              <FileDown className="h-3.5 w-3.5 text-amber-400" /> Customer packages PDF
            </Button>
            {tab === "lots" && (
              <>
                <DevelopersDialog />
                <ImportDialog onSaved={load} existingLots={lots} />
                <LotDialog onSaved={load} />
              </>
            )}
          </div>
        </div>

        {tab === "lots" && selLots.length > 0 && (
          <div className={`flex flex-wrap items-center gap-2 rounded-xl p-3 text-xs shadow-xl transition-all ${
            isLight ? "border border-cyan-200 bg-cyan-50/90 text-slate-800 shadow-xs" : "border border-cyan-500/30 bg-slate-900/95 backdrop-blur-xl"
          }`}>
            <span className="font-bold text-cyan-400 text-xs shrink-0 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              {selLots.length} lot{selLots.length === 1 ? "" : "s"} selected:
            </span>

            {/* Bulk Estate */}
            <div className="flex items-center gap-1">
              <Input
                placeholder="New Estate"
                className={`h-7.5 w-[125px] text-xs ${isLight ? "border-slate-300 bg-white text-slate-900" : "border-slate-800 bg-slate-950/80 text-slate-200"}`}
                value={bulkEstate}
                onChange={(e) => setBulkEstate(e.target.value)}
              />
              <Button
                size="sm"
                variant="outline"
                className="h-7.5 text-xs px-2"
                disabled={bulkBusy || !bulkEstate.trim()}
                onClick={applyBulkEstate}
              >
                Change Estate
              </Button>
            </div>

            {/* Bulk Stage */}
            <div className="flex items-center gap-1">
              <Input
                placeholder="Stage (e.g. 4)"
                className={`h-7.5 w-[110px] text-xs ${isLight ? "border-slate-300 bg-white text-slate-900" : "border-slate-800 bg-slate-950/80 text-slate-200"}`}
                value={bulkStage}
                onChange={(e) => setBulkStage(e.target.value)}
              />
              <Button
                size="sm"
                variant="outline"
                className="h-7.5 text-xs px-2"
                disabled={bulkBusy || !bulkStage.trim()}
                onClick={applyBulkStage}
              >
                Set Stage
              </Button>
            </div>

            {/* Bulk Status */}
            <Select
              onValueChange={(v) => void bulkLots({ status: v as Lot["status"] }, `set to ${v}`)}
            >
              <SelectTrigger className={`h-7.5 w-[130px] text-xs ${isLight ? "border-slate-300 bg-white text-slate-900" : "border-slate-800 bg-slate-950/80 text-slate-200"}`}>
                <SelectValue placeholder="Set status" />
              </SelectTrigger>
              <SelectContent className={isLight ? "border-slate-200 bg-white text-slate-800 shadow-lg" : "border-slate-800 bg-slate-900 text-slate-200"}>
                {LOT_STATUS.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize text-xs">
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          s === "available"
                            ? "bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.9)]"
                            : s === "on_hold"
                              ? "bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.9)]"
                              : s === "nhc_exclusive"
                                ? "bg-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.9)]"
                                : "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.9)]"
                        }`}
                      />
                      {statusLabel(s)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Bulk Expected Registration */}
            <div className="flex items-center gap-1">
              <Input
                type="date"
                className={`h-7.5 w-[145px] text-xs ${isLight ? "border-slate-300 bg-white text-slate-900" : "border-slate-800 bg-slate-950/80 text-slate-200"}`}
                value={bulkRegDate}
                onChange={(e) => setBulkRegDate(e.target.value)}
              />
              <Button
                size="sm"
                variant="outline"
                className="h-7.5 text-xs px-2"
                disabled={bulkBusy || !bulkRegDate}
                onClick={() =>
                  void bulkLots(
                    { registration_date: bulkRegDate, titled: false },
                    "registration updated",
                  )
                }
              >
                Set Reg
              </Button>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="h-7.5 text-xs px-2"
              disabled={bulkBusy}
              onClick={() => void bulkLots({ titled: true, registration_date: null }, "registered")}
            >
              Mark registered
            </Button>

            {/* Price Adjustment */}
            <div className="flex items-center gap-1">
              <Input
                placeholder="±$ or New Price"
                className={`h-7.5 w-[115px] text-xs ${isLight ? "border-slate-300 bg-white text-slate-900" : "border-slate-800 bg-slate-950/80 text-slate-200"}`}
                value={bulkPrice}
                onChange={(e) => setBulkPrice(e.target.value)}
              />
              <Button
                size="sm"
                variant="outline"
                className="h-7.5 text-xs px-2"
                disabled={bulkBusy || !bulkPrice.trim()}
                onClick={applyBulkPrice}
              >
                Adjust Price
              </Button>
            </div>

            <Button size="sm" variant="ghost" className="h-7.5 text-xs text-slate-400 hover:text-slate-200 px-2" onClick={() => setSelLots([])}>
              Clear
            </Button>

            <Button
              size="sm"
              variant="destructive"
              className="h-7.5 text-xs ml-auto font-semibold gap-1 px-2.5"
              disabled={bulkBusy}
              onClick={() => void bulkDeleteLots()}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete Selected ({selLots.length})
            </Button>
          </div>
        )}

        {tab === "packages" && selPkgs.length > 0 && (
          <div className={`flex flex-wrap items-center gap-2.5 rounded-xl p-3 text-sm ${isLight ? "border border-amber-200 bg-amber-50/70 text-slate-800 shadow-xs" : "border border-amber-500/30 bg-slate-900/90 backdrop-blur-xl shadow-xl"}`}>
            <span className="font-semibold text-amber-300">{selPkgs.length} packages selected</span>
            <Select
              onValueChange={(v) => void bulkPkgs({ status: v as Pkg["status"] }, `set to ${v}`)}
            >
              <SelectTrigger className={`h-8 w-[150px] text-xs font-semibold ${isLight ? "border-slate-300 bg-white text-slate-900" : "border-slate-800 bg-slate-950/80 text-slate-200"}`}>
                <SelectValue placeholder="Set status" />
              </SelectTrigger>
              <SelectContent className={isLight ? "border-slate-200 bg-white text-slate-800 shadow-lg" : "border-slate-800 bg-slate-900 text-slate-200"}>
                {PKG_STATUS.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize text-xs">
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          s === "live"
                            ? "bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.9)]"
                            : s === "draft"
                              ? "bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.9)]"
                              : s === "nhc_exclusive"
                                ? "bg-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.9)]"
                                : "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.9)]"
                        }`}
                      />
                      {statusLabel(s)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              className="border-slate-800 bg-slate-950/80 text-xs text-slate-300 hover:text-white"
              disabled={bulkBusy}
              onClick={() => void bulkPkgs({ needs_review: false }, "cleared for review")}
            >
              Clear price review flag
            </Button>
            <Button size="sm" variant="ghost" className="text-xs text-slate-400 hover:text-slate-200" onClick={() => setSelPkgs([])}>
              Clear
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="ml-auto text-xs"
              disabled={bulkBusy}
              onClick={() => void bulkDeletePkgs()}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete selected
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-3 p-16 text-sm text-slate-400 rounded-2xl border border-slate-800/80 bg-slate-900/40">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-400" /> Loading database…
          </div>
        ) : tab === "lots" ? (
          <div className={`overflow-x-auto rounded-2xl border ${isLight ? "border-slate-200 bg-white shadow-xs" : "border-slate-800/80 bg-slate-900/80 backdrop-blur-xl shadow-2xl"}`}>
            <table className="w-full text-sm">
              <thead className={`text-left text-[11px] font-semibold tracking-wider uppercase border-b ${isLight ? "bg-slate-50 text-slate-600 border-slate-200" : "bg-slate-950/80 text-slate-400 border-slate-800/80"}`}>
                <tr>
                  <th className="p-3">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-cyan-400 rounded"
                      checked={filteredLots.length > 0 && selLots.length === filteredLots.length}
                      onChange={(e) =>
                        setSelLots(e.target.checked ? filteredLots.map((l) => l.id) : [])
                      }
                    />
                  </th>
                  <th className="p-3">Estate / Suburb</th>
                  <th className="p-3">Lot</th>
                  <th className="p-3">Size</th>
                  <th className="p-3">Land Price</th>
                  <th className="p-3">Developer</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Expected Registration</th>
                  <th className="p-3">Last Updated</th>
                  <th className="p-3">Packages</th>
                  <th className="p-3" />
                </tr>
              </thead>
              {stateLotGroups.map((stateGroup) => (
                <Fragment key={stateGroup.state}>
                  {/* Division / State Header Banner */}
                  <tbody className="border-t-2 border-slate-700/80">
                    <tr className={isLight 
    ? (stateGroup.state === "QLD" ? "bg-cyan-50/75 border-b border-cyan-100" : "bg-amber-50/75 border-b border-amber-100") 
    : (stateGroup.state === "QLD" ? "bg-gradient-to-r from-cyan-950/60 via-slate-900 to-slate-950" : "bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-950")}>
                      <td colSpan={11} className={`px-4 py-3 border-y ${isLight ? "border-slate-200" : "border-slate-800"}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase font-mono ${
                              stateGroup.state === "QLD"
                                ? isLight ? "bg-cyan-100 text-cyan-800 border border-cyan-300 font-bold" : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                                : isLight ? "bg-amber-100 text-amber-900 border border-amber-300 font-bold" : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            }`}>
                              {stateGroup.state} Division
                            </span>
                            <h2 className={`text-sm font-bold tracking-wide ${isLight ? "text-slate-900" : "text-white"}`}>
                              {stateGroup.title}
                            </h2>
                            <span className={`text-xs ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                              ({stateGroup.suburbsCount} suburbs · {stateGroup.lotsCount} lots)
                            </span>
                          </div>
                          <span className={`text-[11px] ${isLight ? "text-slate-600 font-medium" : "text-slate-400"} hidden sm:inline-block`}>
                            {stateGroup.subtitle}
                          </span>
                        </div>

                      </td>
                    </tr>
                  </tbody>

                  {stateGroup.suburbGroups.map((group) => (
                    <tbody key={group.key} className="divide-y divide-slate-800/50">
                      <tr
                        className={`cursor-pointer transition-colors ${isLight ? "bg-slate-50 hover:bg-slate-100/90 border-b border-slate-200" : "bg-slate-900/90 hover:bg-slate-850"}`}
                        onClick={() =>
                          setOpenSuburbs((prev) => toggle(prev, group.key))
                        }
                      >
                        <td colSpan={11} className="px-3.5 py-3">
                          <div className={`flex items-center gap-2.5 text-sm font-semibold ${isLight ? "text-slate-900" : "text-slate-100"}`}>
                            {isOpen(group.key) ? (
                              <ChevronDown className={`h-4 w-4 shrink-0 ${stateGroup.state === "QLD" ? isLight ? "text-cyan-600" : "text-cyan-400" : isLight ? "text-amber-600" : "text-amber-400"}`} />
                            ) : (
                              <ChevronRight className={`h-4 w-4 shrink-0 ${isLight ? "text-slate-500" : "text-slate-400"}`} />
                            )}
                            <span className="truncate">{titleCase(group.label)}</span>
                            <span className={`text-xs font-normal ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                              {group.estates.length} estate{group.estates.length === 1 ? "" : "s"} ·{" "}
                              {group.count} lot{group.count === 1 ? "" : "s"}
                            </span>
                            <span className={`ml-auto text-xs font-semibold hover:underline ${stateGroup.state === "QLD" ? isLight ? "text-cyan-700" : "text-cyan-400" : isLight ? "text-amber-700" : "text-amber-400"}`}>
                              {isOpen(group.key) ? "Hide" : "View"}
                            </span>
                          </div>

                        </td>
                      </tr>
                      {isOpen(group.key) &&
                        group.estates.map(({ estate, lots: groupLots }) => {
                          const allEstateSelected =
                            groupLots.length > 0 && groupLots.every((l) => selLots.includes(l.id));
                          const someEstateSelected =
                            groupLots.some((l) => selLots.includes(l.id));
                          const toggleEstateSelection = () => {
                            if (allEstateSelected) {
                              const estateIds = new Set(groupLots.map((l) => l.id));
                              setSelLots((prev) => prev.filter((id) => !estateIds.has(id)));
                            } else {
                              const estateIds = groupLots.map((l) => l.id);
                              setSelLots((prev) => Array.from(new Set([...prev, ...estateIds])));
                            }
                          };

                          // Group lots within this estate by Stage
                          const stageMap = new Map<string, Lot[]>();
                          for (const l of groupLots) {
                            const stg = extractLotStage(l) || "All Lots / Unassigned Stage";
                            const arr = stageMap.get(stg) || [];
                            arr.push(l);
                            stageMap.set(stg, arr);
                          }
                          const stageEntries = Array.from(stageMap.entries());

                          return (
                            <Fragment key={estate}>
                              {/* Estate Header Banner with Select Estate Checkbox & Button */}
                              <tr className={isLight ? "bg-slate-100/90 border-b border-slate-200" : "bg-slate-950/80 border-b border-slate-800/80"}>
                                <td
                                  colSpan={11}
                                  className={`px-3.5 py-2 pl-7 text-xs font-semibold ${isLight ? "text-slate-800" : "text-slate-200"}`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <input
                                        type="checkbox"
                                        className="h-3.5 w-3.5 accent-cyan-400 rounded cursor-pointer"
                                        checked={allEstateSelected}
                                        ref={(el) => {
                                          if (el) el.indeterminate = !allEstateSelected && someEstateSelected;
                                        }}
                                        onChange={toggleEstateSelection}
                                        title={`Select all lots in ${titleCase(estate)}`}
                                      />
                                      <span className="font-bold text-xs tracking-wide">
                                        {titleCase(estate)}
                                      </span>
                                      <span className={`ml-1 font-normal ${isLight ? "text-slate-500" : "text-slate-400"} text-[11px] normal-case`}>
                                        ({groupLots.length} lot{groupLots.length === 1 ? "" : "s"} · {stageEntries.length} stage{stageEntries.length === 1 ? "" : "s"})
                                      </span>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={toggleEstateSelection}
                                        className={`h-5.5 text-[10px] px-2 font-medium shadow-xs ${
                                          allEstateSelected
                                            ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-300"
                                            : isLight
                                              ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                                              : "border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800"
                                        }`}
                                      >
                                        {allEstateSelected ? "Deselect Estate" : `Select Estate (${groupLots.length})`}
                                      </Button>
                                    </div>
                                  </div>
                                </td>
                              </tr>

                              {/* Stage Sub-headers & Lots */}
                              {stageEntries.map(([stageName, stageLots]) => {
                                const allStageSelected =
                                  stageLots.length > 0 && stageLots.every((l) => selLots.includes(l.id));
                                const someStageSelected =
                                  stageLots.some((l) => selLots.includes(l.id));
                                const toggleStageSelection = () => {
                                  if (allStageSelected) {
                                    const stageIds = new Set(stageLots.map((l) => l.id));
                                    setSelLots((prev) => prev.filter((id) => !stageIds.has(id)));
                                  } else {
                                    const stageIds = stageLots.map((l) => l.id);
                                    setSelLots((prev) => Array.from(new Set([...prev, ...stageIds])));
                                  }
                                };

                                return (
                                  <Fragment key={stageName}>
                                    {(stageEntries.length > 1 || stageName.toLowerCase().includes("stage")) && (
                                      <tr className={isLight ? "bg-slate-50/90 border-b border-slate-200/80" : "bg-slate-900/50 border-b border-slate-800/60"}>
                                        <td colSpan={11} className="px-3.5 py-1.5 pl-12 text-xs">
                                          <div className="flex items-center gap-2.5">
                                            <input
                                              type="checkbox"
                                              className="h-3 w-3 accent-cyan-400 rounded cursor-pointer"
                                              checked={allStageSelected}
                                              ref={(el) => {
                                                if (el) el.indeterminate = !allStageSelected && someStageSelected;
                                              }}
                                              onChange={toggleStageSelection}
                                              title={`Select all lots in ${stageName}`}
                                            />
                                            <span className={`font-semibold text-[11px] ${isLight ? "text-cyan-800" : "text-cyan-300"}`}>
                                              {stageName}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                              ({stageLots.length} lot{stageLots.length === 1 ? "" : "s"})
                                            </span>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              onClick={toggleStageSelection}
                                              className="h-5 text-[10px] px-1.5 font-medium text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 hover:bg-cyan-500/10"
                                            >
                                              {allStageSelected ? "Deselect Stage" : `Select Stage (${stageLots.length})`}
                                            </Button>
                                          </div>
                                        </td>
                                      </tr>
                                    )}

                                    {stageLots.map((l: Lot) => (

                  <tr key={l.id} className={`align-top transition-colors border-b ${isLight ? "hover:bg-slate-50/80 border-slate-200 bg-white" : "hover:bg-slate-800/40 border-slate-800/50"}`}>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-cyan-400 rounded"
                        checked={selLots.includes(l.id)}
                        onChange={() => setSelLots((prev) => toggle(prev, l.id))}
                      />
                    </td>
                    <td className="p-3">
                      <div className={`font-semibold ${isLight ? "text-slate-900" : "text-slate-100"}`}>{titleCase(l.estate)}</div>
                      <div className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>{titleCase(l.suburb)}</div>
                    </td>
                    <td className="p-3">
                      <div className={`font-medium flex items-center gap-1.5 flex-wrap ${isLight ? "text-slate-900" : "text-slate-100"}`}>
                        <span>{l.lot_number ? `Lot ${l.lot_number}` : "—"}</span>
                        {l.notes?.match(/Stage\s*([A-Za-z0-9\.\-]+)/i) && (
                          <span className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${isLight ? "bg-cyan-50 text-cyan-800 border border-cyan-300" : "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30"}`}>
                            {l.notes.match(/Stage\s*([A-Za-z0-9\.\-]+)/i)![0]}
                          </span>
                        )}
                      </div>
                      <div className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>{titleCase(l.address)}</div>
                    </td>
                    <td className={`p-3 whitespace-nowrap ${isLight ? "text-slate-700 font-medium" : "text-slate-200"}`}>
                      {l.land_size ? `${l.land_size} m²` : "—"}
                      <div className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                        {l.frontage ? `${l.frontage} m frontage` : ""}
                      </div>
                    </td>
                    <td className={`p-3 whitespace-nowrap font-bold ${isLight ? "text-cyan-700 font-semibold" : "text-cyan-300"}`}>{money(l.land_price)}</td>
                    <td className="p-3">
                      <div className={isLight ? "text-slate-800 font-medium" : "text-slate-200"}>{l.developer || "—"}</div>
                      <div className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                        {[l.developer_contact_name, l.developer_contact_phone]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </td>
                    <td className="p-3">
                      <Select
                        value={l.status}
                        onValueChange={(v) => updateLot(l.id, { status: v as Lot["status"] })}
                      >
                        <SelectTrigger
                          className={`h-8 w-[130px] text-xs font-semibold capitalize rounded-full transition-all duration-300 ${statusTone(l.status, isLight)}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className={isLight ? "border-slate-200 bg-white text-slate-800 shadow-lg" : "border-slate-800 bg-slate-900 text-slate-200"}>
                          {LOT_STATUS.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize text-xs">
                              <span className="flex items-center gap-1.5">
                                <span
                                  className={`h-2 w-2 rounded-full ${
                                    s === "available"
                                      ? "bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.9)]"
                                      : s === "on_hold"
                                        ? "bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.9)]"
                                        : s === "nhc_exclusive"
                                          ? "bg-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.9)]"
                                          : "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.9)]"
                                  }`}
                                />
                                {statusLabel(s)}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {l.status === "nhc_exclusive" && (
                        <div className="mt-1 text-[11px] text-blue-400 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_4px_rgba(59,130,246,0.8)]" />
                          <span>
                            {(l.exclusive_consultants ?? [])
                              .map((id) => CONSULTANTS.find((c) => c.id === id)?.name ?? id)
                              .join(", ") || "No consultant assigned"}
                          </span>
                        </div>
                      )}
                    </td>
                      <td className={`p-3 text-xs whitespace-nowrap ${isLight ? "text-slate-700 font-medium" : "text-slate-300"}`}>
                        <div>
                          {l.titled
                            ? "Registered"
                            : l.registration_date
                              ? `Expected ${l.registration_date}`
                              : "Registration TBC"}
                        </div>
                      </td>

                      <td className="p-3 text-xs whitespace-nowrap">
                        <div className={isLight ? "text-slate-700" : "text-slate-300"}>{lastUpdated(l.updated_at).rel}</div>
                        <div className={isLight ? "text-slate-600" : "text-slate-400"}>
                          {lastUpdated(l.updated_at).exact}
                        </div>
                      </td>


                      <td className="p-3">
                        {(packagesByLot.get(l.id)?.length ?? 0) > 0 ? (
                          <Select
                            onValueChange={(id) => {
                              const pkg = packages.find((item) => item.id === id);
                              if (!pkg) return;
                              openPackageInFlyer(pkg, l);
                            }}
                          >
                            <SelectTrigger className={`h-8 w-[170px] text-xs font-medium ${isLight ? "border-slate-200 bg-white text-slate-800 hover:bg-slate-50 shadow-xs" : "border-slate-800 bg-slate-900/80 text-slate-200 hover:border-slate-700"}`}>
                              <SelectValue placeholder={`${packagesByLot.get(l.id)?.length ?? 0} package${packagesByLot.get(l.id)?.length === 1 ? "" : "s"}`} />
                            </SelectTrigger>
                            <SelectContent className={isLight ? "border-slate-200 bg-white text-slate-800 shadow-lg" : "border-slate-800 bg-slate-900 text-slate-200"}>
                              {packagesByLot.get(l.id)?.map((pkg) => (
                                <SelectItem key={pkg.id} value={pkg.id}>
                                  {pkg.name || pkg.design || "Untitled package"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-slate-400">None yet</span>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className={`text-xs gap-1.5 font-medium shadow-xs ${isLight ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900" : "border-slate-800 bg-slate-900/80 text-slate-200 hover:bg-slate-800 hover:text-white shadow-sm"}`}
                            onClick={() => {
                              const canonicalAddress = buildCanonicalAddress({
                                lotNumber: l.lot_number,
                                address: l.address,
                                estate: l.estate,
                                suburb: l.suburb,
                                state: getLotState(l),
                                postcode: l.postcode,
                              });
                              openInFlyer({
                                lotId: l.id,
                                suburb: l.suburb,
                                estate: l.estate,
                                address: canonicalAddress,
                                landSize: l.land_size ? String(l.land_size) : "",
                                landFrontage: l.frontage ? String(l.frontage) : "",
                                landPrice: l.land_price ? formatAud(Number(l.land_price)) : "",
                                state: getLotState(l),
                              });
                            }}
                          >
                            <FileDown className="h-3.5 w-3.5 text-cyan-400" /> Flyer
                          </Button>
                          <LotDialog
                            lot={l}
                            onSaved={load}
                            trigger={
                              <Button size="icon" variant="ghost" className={isLight ? "text-slate-500 hover:text-slate-900 hover:bg-slate-100" : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"} title="Edit lot">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            }
                          />
                          <Button size="icon" variant="ghost" className={isLight ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50" : "text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"} onClick={() => removeLot(l.id)} title="Delete lot">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                      </tr>
                        ))}
                      </Fragment>
                    );
                  })}
                </Fragment>
              );
            })}
                </tbody>
              ))}
            </Fragment>
          ))}

              {!filteredLots.length && (
                <tbody>
                  <tr>
                     <td colSpan={11} className="p-8 text-center text-sm text-muted-foreground">
                      No land lots yet — add the first one or import a developer price list.
                    </td>
                  </tr>
                </tbody>
              )}
            </table>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Packages Overhead Summary Cards / Totals */}
            <div
              className={`grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl border ${
                isLight
                  ? "bg-white/95 border-slate-200 shadow-xs"
                  : "bg-slate-900/80 border-slate-800/80 backdrop-blur-xl shadow-xl"
              }`}
            >
              <div className="flex flex-col">
                <span
                  className={`text-[11px] font-semibold uppercase tracking-wider ${
                    isLight ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  Total Active Packages
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span
                    className={`text-2xl font-bold font-mono ${
                      isLight ? "text-slate-900" : "text-white"
                    }`}
                  >
                    {filteredPackages.length}
                  </span>
                  <span className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                    across {statePackageGroups.reduce((acc, g) => acc + g.suburbsCount, 0)} suburbs
                  </span>
                </div>
              </div>

              <div className="flex flex-col">
                <span
                  className={`text-[11px] font-semibold uppercase tracking-wider ${
                    isLight ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  Availability Status
                </span>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.35)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {filteredPackages.filter((p) => p.status === "live").length} Live
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.35)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    {filteredPackages.filter((p) => p.status === "draft").length} Draft
                  </span>
                  {filteredPackages.some((p) => p.status === "nhc_exclusive") && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/50 shadow-[0_0_8px_rgba(59,130,246,0.35)]">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                      {filteredPackages.filter((p) => p.status === "nhc_exclusive").length} Exclusive
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col">
                <span
                  className={`text-[11px] font-semibold uppercase tracking-wider ${
                    isLight ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  Package Price Range
                </span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span
                    className={`text-base sm:text-lg font-bold font-mono ${
                      isLight ? "text-amber-800" : "text-amber-300"
                    }`}
                  >
                    {filteredPackages.length > 0 &&
                    Math.min(
                      ...filteredPackages.map((p) => p.total_price || 0).filter((x) => x > 0),
                    ) < Infinity
                      ? money(
                          Math.min(
                            ...filteredPackages
                              .map((p) => p.total_price || 0)
                              .filter((x) => x > 0),
                          ),
                        )
                      : "—"}
                  </span>
                  <span className="text-xs text-slate-400">to</span>
                  <span
                    className={`text-base sm:text-lg font-bold font-mono ${
                      isLight ? "text-amber-800" : "text-amber-300"
                    }`}
                  >
                    {filteredPackages.length > 0 &&
                    Math.max(
                      ...filteredPackages.map((p) => p.total_price || 0).filter((x) => x > 0),
                    ) > 0
                      ? money(
                          Math.max(
                            ...filteredPackages
                              .map((p) => p.total_price || 0)
                              .filter((x) => x > 0),
                          ),
                        )
                      : "—"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col">
                <span
                  className={`text-[11px] font-semibold uppercase tracking-wider ${
                    isLight ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  Average Package Price
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span
                    className={`text-2xl font-bold font-mono ${
                      isLight ? "text-cyan-700" : "text-cyan-300"
                    }`}
                  >
                    {filteredPackages.length > 0
                      ? money(
                          Math.round(
                            filteredPackages.reduce((sum, p) => sum + (p.total_price || 0), 0) /
                              (filteredPackages.filter((p) => (p.total_price || 0) > 0).length || 1),
                          ),
                        )
                      : "—"}
                  </span>
                  <span className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                    turnkey avg
                  </span>
                </div>
              </div>
            </div>

            {/* Hierarchical Packages Database Table (State -> Suburb -> Estate) */}
            <div
              className={`overflow-x-auto rounded-2xl border ${
                isLight
                  ? "border-slate-200 bg-white shadow-xs"
                  : "border-slate-800/80 bg-slate-900/80 backdrop-blur-xl shadow-2xl"
              }`}
            >
              <table className="w-full text-sm">
                <thead
                  className={`text-left text-[11px] font-semibold tracking-wider uppercase border-b ${
                    isLight
                      ? "bg-slate-50 text-slate-600 border-slate-200"
                      : "bg-slate-950/80 text-slate-400 border-slate-800/80"
                  }`}
                >
                  <tr>
                    <th className="p-3">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-amber-400 rounded cursor-pointer"
                        checked={
                          filteredPackages.length > 0 && selPkgs.length === filteredPackages.length
                        }
                        onChange={(e) =>
                          setSelPkgs(e.target.checked ? filteredPackages.map((p) => p.id) : [])
                        }
                      />
                    </th>
                    <th className="p-3">Package Design &amp; Facade</th>
                    <th className="p-3">Location &amp; Lot</th>
                    <th className="p-3">Specs</th>
                    <th className="p-3">House Price</th>
                    <th className="p-3">Land Price</th>
                    <th className="p-3">Total Package</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Last Updated</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>

                {statePackageGroups.map((stateGroup) => (
                  <Fragment key={stateGroup.state}>
                    {/* Division / State Header Banner */}
                    <tbody className="border-t-2 border-slate-700/80">
                      <tr
                        className={
                          isLight
                            ? stateGroup.state === "QLD"
                              ? "bg-cyan-50/75 border-b border-cyan-100"
                              : "bg-amber-50/75 border-b border-amber-100"
                            : stateGroup.state === "QLD"
                              ? "bg-gradient-to-r from-cyan-950/60 via-slate-900 to-slate-950"
                              : "bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-950"
                        }
                      >
                        <td
                          colSpan={10}
                          className={`px-4 py-3 border-y ${
                            isLight ? "border-slate-200" : "border-slate-800"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase font-mono ${
                                  stateGroup.state === "QLD"
                                    ? isLight
                                      ? "bg-cyan-100 text-cyan-800 border border-cyan-300 font-bold"
                                      : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                                    : isLight
                                      ? "bg-amber-100 text-amber-900 border border-amber-300 font-bold"
                                      : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                }`}
                              >
                                {stateGroup.state} Division
                              </span>
                              <h2
                                className={`text-sm font-bold tracking-wide ${
                                  isLight ? "text-slate-900" : "text-white"
                                }`}
                              >
                                {stateGroup.title}
                              </h2>
                              <span
                                className={`text-xs ${
                                  isLight ? "text-slate-600" : "text-slate-400"
                                }`}
                              >
                                ({stateGroup.suburbsCount} suburbs · {stateGroup.packagesCount} packages)
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              {stateGroup.minPrice && stateGroup.maxPrice && (
                                <span
                                  className={`text-xs font-semibold ${
                                    isLight
                                      ? "text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200"
                                      : "text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30"
                                  }`}
                                >
                                  {money(stateGroup.minPrice)} – {money(stateGroup.maxPrice)}
                                </span>
                              )}
                              <span
                                className={`text-[11px] ${
                                  isLight ? "text-slate-600 font-medium" : "text-slate-400"
                                } hidden sm:inline-block`}
                              >
                                {stateGroup.subtitle}
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </tbody>

                    {/* Suburb Accordion Blocks */}
                    {stateGroup.suburbGroups.map((group) => (
                      <tbody key={group.key} className="divide-y divide-slate-800/50">
                        <tr
                          className={`cursor-pointer transition-colors ${
                            isLight
                              ? "bg-slate-50 hover:bg-slate-100/90 border-b border-slate-200"
                              : "bg-slate-900/90 hover:bg-slate-850"
                          }`}
                          onClick={() => setOpenPkgSuburbs((prev) => toggle(prev, group.key))}
                        >
                          <td colSpan={10} className="px-3.5 py-3">
                            <div
                              className={`flex items-center gap-2.5 text-sm font-semibold ${
                                isLight ? "text-slate-900" : "text-slate-100"
                              }`}
                            >
                              {isPkgSubOpen(group.key) ? (
                                <ChevronDown
                                  className={`h-4 w-4 shrink-0 ${
                                    stateGroup.state === "QLD"
                                      ? isLight
                                        ? "text-cyan-600"
                                        : "text-cyan-400"
                                      : isLight
                                        ? "text-amber-600"
                                        : "text-amber-400"
                                  }`}
                                />
                              ) : (
                                <ChevronRight
                                  className={`h-4 w-4 shrink-0 ${
                                    isLight ? "text-slate-500" : "text-slate-400"
                                  }`}
                                />
                              )}
                              <span className="truncate">{titleCase(group.label)}</span>
                              <span
                                className={`text-xs font-normal ${
                                  isLight ? "text-slate-600" : "text-slate-400"
                                }`}
                              >
                                {group.estatesCount} estate{group.estatesCount === 1 ? "" : "s"} ·{" "}
                                {group.count} package{group.count === 1 ? "" : "s"}
                              </span>
                              {group.minPrice && group.maxPrice && (
                                <span
                                  className={`text-xs font-semibold ${
                                    isLight ? "text-amber-800" : "text-amber-300"
                                  } ml-2`}
                                >
                                  ({money(group.minPrice)} – {money(group.maxPrice)})
                                </span>
                              )}
                              <span
                                className={`ml-auto text-xs font-semibold hover:underline ${
                                  stateGroup.state === "QLD"
                                    ? isLight
                                      ? "text-cyan-700"
                                      : "text-cyan-400"
                                    : isLight
                                      ? "text-amber-700"
                                      : "text-amber-400"
                                }`}
                              >
                                {isPkgSubOpen(group.key) ? "Hide" : "View"}
                              </span>
                            </div>
                          </td>
                        </tr>

                        {isPkgSubOpen(group.key) &&
                          group.estates.map(({ estate, packages: groupPkgs }) => {
                            const allEstateSelected =
                              groupPkgs.length > 0 &&
                              groupPkgs.every((p) => selPkgs.includes(p.id));
                            const someEstateSelected =
                              groupPkgs.some((p) => selPkgs.includes(p.id));
                            const toggleEstateSelection = () => {
                              if (allEstateSelected) {
                                const pkgIds = new Set(groupPkgs.map((p) => p.id));
                                setSelPkgs((prev) => prev.filter((id) => !pkgIds.has(id)));
                              } else {
                                const pkgIds = groupPkgs.map((p) => p.id);
                                setSelPkgs((prev) => Array.from(new Set([...prev, ...pkgIds])));
                              }
                            };

                            return (
                              <Fragment key={estate}>
                                {/* Estate Header Row */}
                                <tr
                                  className={
                                    isLight
                                      ? "bg-slate-100/90 border-b border-slate-200"
                                      : "bg-slate-950/80 border-b border-slate-800/80"
                                  }
                                >
                                  <td
                                    colSpan={10}
                                    className={`px-3.5 py-2 pl-7 text-xs font-semibold ${
                                      isLight ? "text-slate-800" : "text-slate-200"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <input
                                          type="checkbox"
                                          className="h-3.5 w-3.5 accent-amber-400 rounded cursor-pointer"
                                          checked={allEstateSelected}
                                          ref={(el) => {
                                            if (el)
                                              el.indeterminate =
                                                !allEstateSelected && someEstateSelected;
                                          }}
                                          onChange={toggleEstateSelection}
                                        />
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold tracking-wide text-xs">
                                            {estate || "General Releases"}
                                          </span>
                                          <span
                                            className={`text-[11px] font-normal ${
                                              isLight ? "text-slate-600" : "text-slate-400"
                                            }`}
                                          >
                                            ({groupPkgs.length} package
                                            {groupPkgs.length === 1 ? "" : "s"})
                                          </span>
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={toggleEstateSelection}
                                        className={`text-[11px] font-medium transition-colors hover:underline ${
                                          allEstateSelected
                                            ? isLight
                                              ? "text-rose-600"
                                              : "text-rose-400"
                                            : isLight
                                              ? "text-amber-700"
                                              : "text-amber-400"
                                        }`}
                                      >
                                        {allEstateSelected ? "Deselect Estate" : "Select Estate"}
                                      </button>
                                    </div>
                                  </td>
                                </tr>

                                {/* Individual Package Rows */}
                                {groupPkgs.map((p) => {
                                  const flyerObj = ((p.flyer_data || p.flyer_json) && typeof (p.flyer_data || p.flyer_json) === "object" ? (p.flyer_data || p.flyer_json) : {}) as any;
                                  const lot = (p.lot_id ? lotById.get(p.lot_id) : undefined) ||
                                    (flyerObj.lotId ? lotById.get(flyerObj.lotId) : undefined) ||
                                    (flyerObj.lot_id ? lotById.get(flyerObj.lot_id) : undefined) ||
                                    lots.find((l) => {
                                      const pLotNo = String(flyerObj.lot_number || flyerObj.lotNumber || "").replace(/^lot\s*/i, "").trim().toLowerCase();
                                      const lLotNo = String(l.lot_number || "").replace(/^lot\s*/i, "").trim().toLowerCase();
                                      const pEst = String(l.estate || "").trim().toLowerCase();
                                      const grpEst = String(estate || flyerObj.estate || "").trim().toLowerCase();
                                      return Boolean(pLotNo && lLotNo === pLotNo && (!grpEst || pEst === grpEst));
                                    });
                                  const pkgState = p.state || (lot ? getLotState(lot) : "QLD");
                                  return (
                                    <tr
                                      key={p.id}
                                      className={`align-top transition-colors border-b ${
                                        isLight
                                          ? "hover:bg-slate-50/80 border-slate-200 bg-white"
                                          : "hover:bg-slate-800/40 border-slate-800/50"
                                      }`}
                                    >
                                      <td className="p-3">
                                        <input
                                          type="checkbox"
                                          className="h-3.5 w-3.5 accent-amber-400 rounded cursor-pointer"
                                          checked={selPkgs.includes(p.id)}
                                          onChange={() => setSelPkgs((prev) => toggle(prev, p.id))}
                                        />
                                      </td>
                                      <td className="p-3">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span
                                            className={`rounded px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase ${
                                              pkgState === "QLD"
                                                ? isLight
                                                  ? "bg-cyan-100 text-cyan-800 border border-cyan-300"
                                                  : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                                                : isLight
                                                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                                                  : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                            }`}
                                          >
                                            {pkgState}
                                          </span>
                                          <span
                                            className={`font-semibold ${
                                              isLight ? "text-slate-900" : "text-slate-100"
                                            }`}
                                          >
                                            {titleCase(p.name || p.design) || "Untitled"}
                                          </span>
                                        </div>
                                        <div
                                          className={`text-xs ${
                                            isLight ? "text-slate-500" : "text-slate-400"
                                          }`}
                                        >
                                          {[titleCase(p.facade_name), titleCase(p.range_id)]
                                            .filter(Boolean)
                                            .join(" · ")}
                                          {p.needs_review && (
                                            <span
                                              className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                                isLight
                                                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                                                  : "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                                              }`}
                                            >
                                              Price Review
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td
                                        className={`p-3 text-xs ${
                                          isLight ? "text-slate-700" : "text-slate-300"
                                        }`}
                                      >
                                        {lot ? (
                                          <div>
                                            <span className="font-semibold">
                                              {lot.lot_number
                                                ? `Lot ${lot.lot_number}`
                                                : "Lot —"}
                                            </span>
                                            {lot.address && (
                                              <div className={`text-[11px] truncate max-w-[190px] font-medium ${isLight ? "text-slate-600" : "text-slate-300"}`} title={lot.address}>
                                                {lot.address}
                                              </div>
                                            )}
                                            <div
                                              className={`text-[11px] ${
                                                isLight ? "text-slate-500" : "text-slate-400"
                                              }`}
                                            >
                                              {[
                                                lot.land_size ? `${lot.land_size} m²` : null,
                                                lot.frontage ? `${lot.frontage}m frontage` : null,
                                              ]
                                                .filter(Boolean)
                                                .join(" · ")}
                                            </div>
                                          </div>
                                        ) : (
                                          <div>
                                            <span className="font-semibold">
                                              {flyerObj.lot_number || flyerObj.lotNumber
                                                ? `Lot ${flyerObj.lot_number || flyerObj.lotNumber}`
                                                : "Standalone Package"}
                                            </span>
                                            {flyerObj.address && (
                                              <div className={`text-[11px] truncate max-w-[190px] font-medium ${isLight ? "text-slate-600" : "text-slate-300"}`} title={flyerObj.address}>
                                                {flyerObj.address}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </td>
                                      <td
                                        className={`p-3 text-xs whitespace-nowrap ${
                                          isLight ? "text-slate-700 font-medium" : "text-slate-300"
                                        }`}
                                      >
                                        <div>
                                          {[p.beds, p.baths, p.cars].filter(Boolean).join(" / ") ||
                                            "—"}
                                        </div>
                                        {p.floorplan_size && (
                                          <div
                                            className={`text-[11px] ${
                                              isLight ? "text-slate-500" : "text-slate-400"
                                            }`}
                                          >
                                            {p.floorplan_size}
                                          </div>
                                        )}
                                      </td>
                                      <td
                                        className={`p-3 whitespace-nowrap ${
                                          isLight ? "text-slate-800 font-medium" : "text-slate-200"
                                        }`}
                                      >
                                        {money(p.house_price)}
                                      </td>
                                      <td
                                        className={`p-3 whitespace-nowrap ${
                                          isLight ? "text-slate-800 font-medium" : "text-slate-200"
                                        }`}
                                      >
                                        {money(p.land_price)}
                                      </td>
                                      <td
                                        className={`p-3 font-bold whitespace-nowrap ${
                                          isLight ? "text-amber-700" : "text-amber-300"
                                        }`}
                                      >
                                        {money(p.total_price)}
                                      </td>
                                      <td className="p-3">
                                        <Select
                                          value={p.status}
                                          onValueChange={(v) =>
                                            updatePkg(p.id, { status: v as Pkg["status"] })
                                          }
                                        >
                                          <SelectTrigger
                                            className={`h-8 w-[125px] text-xs font-semibold capitalize rounded-full transition-all duration-300 ${statusTone(
                                              p.status,
                                              isLight,
                                            )}`}
                                          >
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent
                                            className={
                                              isLight
                                                ? "border-slate-200 bg-white text-slate-800 shadow-lg"
                                                : "border-slate-800 bg-slate-900 text-slate-200"
                                            }
                                          >
                                            {PKG_STATUS.map((s) => (
                                              <SelectItem key={s} value={s} className="capitalize text-xs">
                                                <span className="flex items-center gap-1.5">
                                                  <span
                                                    className={`h-2 w-2 rounded-full ${
                                                      s === "live"
                                                        ? "bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.9)]"
                                                        : s === "draft"
                                                          ? "bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.9)]"
                                                          : s === "nhc_exclusive"
                                                            ? "bg-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.9)]"
                                                            : "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.9)]"
                                                    }`}
                                                  />
                                                  {statusLabel(s)}
                                                </span>
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </td>
                                      <td className="p-3 text-xs whitespace-nowrap">
                                        <div className={isLight ? "text-slate-700" : "text-slate-300"}>
                                          {lastUpdated(p.updated_at).rel}
                                        </div>
                                        <div className={isLight ? "text-slate-600" : "text-slate-400"}>
                                          {lastUpdated(p.updated_at).exact}
                                        </div>
                                      </td>
                                      <td className="p-3">
                                        <div className="flex justify-end gap-1">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className={`text-xs gap-1.5 font-medium whitespace-nowrap ${
                                              isLight
                                                ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-xs"
                                                : "border-slate-800 bg-slate-900/70 text-slate-200 hover:bg-slate-800 hover:text-white"
                                            }`}
                                            onClick={() => openPackageInFlyer(p, lot)}
                                            title="Edit flyer in Flyer Studio with full address and specs"
                                          >
                                            <Edit3 className="h-3.5 w-3.5 text-brand-gold" />
                                            <span>Edit Flyer</span>
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={downloadingPkgId === p.id}
                                            className={`text-xs gap-1.5 font-medium whitespace-nowrap ${
                                              isLight
                                                ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-xs"
                                                : "border-slate-800 bg-slate-900/70 text-slate-200 hover:bg-slate-800 hover:text-white"
                                            }`}
                                            onClick={() => void handleDirectPdfDownload(p, lot)}
                                            title="Download A4 Flyer PDF directly as is"
                                          >
                                            {downloadingPkgId === p.id ? (
                                              <>
                                                <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
                                                <span>Downloading...</span>
                                              </>
                                            ) : (
                                              <>
                                                <FileDown className="h-3.5 w-3.5 text-amber-400" />
                                                <span>Download PDF</span>
                                              </>
                                            )}
                                          </Button>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                                            onClick={() => removePkg(p.id)}
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </Fragment>
                            );
                          })}
                      </tbody>
                    ))}
                  </Fragment>
                ))}

                {!filteredPackages.length && (
                  <tbody>
                    <tr>
                      <td colSpan={10} className="p-12 text-center text-sm text-slate-400">
                        No packages found matching your criteria — adjust search or filter options.
                      </td>
                    </tr>
                  </tbody>
                )}
              </table>
            </div>
          </div>
        )}

        {/* Global Live Availability Status Legend with Atmospheric Glows */}
        <div
          className={`mt-4 pt-3 pb-1 flex flex-wrap items-center gap-3 text-xs border-t ${
            isLight ? "border-slate-200 text-slate-600" : "border-slate-800/60 text-slate-400"
          }`}
        >
          <span className={`font-semibold ${isLight ? "text-slate-800" : "text-slate-200"}`}>
            Availability Status Legend:
          </span>
          <StatusPill value="available" isLight={isLight} />
          <span className="text-[11px] mr-2">Available for sale</span>
          <StatusPill value="on_hold" isLight={isLight} />
          <span className="text-[11px] mr-2">Client hold (24h)</span>
          <StatusPill value="sold" isLight={isLight} />
          <span className="text-[11px] mr-2">Unconditionally sold</span>
          <StatusPill value="nhc_exclusive" isLight={isLight} />
          <span className="text-[11px]">NHC exclusive release</span>
        </div>

      {/* Offscreen host for direct A4 PDF download */}
      <div
        ref={printContainerRef}
        style={{
          position: "fixed",
          left: "-99999px",
          top: 0,
          width: "794px",
          minHeight: "1123px",
          pointerEvents: "none",
          zIndex: -9999,
          background: "#ffffff",
        }}
      >
        {activeDownloadData && (
          <div className="flyer-preview-container bg-white">
            {(() => {
              const tpl = (activeDownloadData as any).template;
              if (tpl === "house-only") return <HouseOnlyFlyer d={activeDownloadData} />;
              if (tpl === "house-only-v2") return <HouseOnlyFlyerV2 d={activeDownloadData} />;
              if (tpl === "siting") return (
                <>
                  <ExpressFlyer d={activeDownloadData} />
                  <SitingPlanPage d={activeDownloadData} />
                </>
              );
              if (tpl === "siting-v2") return (
                <>
                  <ExpressFlyerV2 d={activeDownloadData} />
                  <SitingPlanV2 d={activeDownloadData} />
                </>
              );
              if (tpl === "showcase") return (
                <>
                  <ShowcaseCover d={activeDownloadData} />
                  <ShowcaseDetails d={activeDownloadData} />
                </>
              );
              return <ExpressFlyer d={activeDownloadData} />;
            })()}
          </div>
        )}
      </div>

      </main>
    </div>
  );
}
