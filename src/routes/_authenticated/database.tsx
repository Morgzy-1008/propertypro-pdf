import { CONSULTANTS } from "@/components/flyer/consultants";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
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
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
  upsertLocalPackage,
  deleteLocalPackage,
} from "@/lib/databaseStorage";

export const Route = createFileRoute("/_authenticated/database")({
  head: () => ({
    meta: [
      { title: "QLD House & Land Database | Hudson Homes" },
      {
        name: "description",
        content:
          "Live database of Hudson Homes QLD land lots and House & Land packages — availability, pricing and one-click flyer export.",
      },
      { property: "og:title", content: "Hudson Homes QLD House & Land Database" },
      {
        property: "og:description",
        content: "Every available QLD land lot and package, ready to print as a flyer.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DatabasePage,
});

interface Lot {
  id: string;
  estate: string;
  suburb: string;
  developer: string | null;
  developer_contact_name: string | null;
  developer_contact_phone: string | null;
  developer_contact_email: string | null;
  lot_number: string | null;
  address: string | null;
  land_size: number | null;
  frontage: number | null;
  land_price: number | null;
  titled: boolean | null;
  registration_date: string | null;
  status: "available" | "on_hold" | "sold" | "nhc_exclusive";
  exclusive_consultants: string[] | null;
  deadline: string | null;
  notes: string | null;
  updated_at: string | null;
}


interface Pkg {
  id: string;
  lot_id: string | null;
  name: string | null;
  housing_type: string;
  design: string;
  range_id: string;
  facade_name: string | null;
  house_price: number | null;
  land_price: number | null;
  total_price: number | null;
  beds: string | null;
  baths: string | null;
  cars: string | null;
  status: "draft" | "live" | "sold";
  needs_review: boolean;
  notes: string | null;
  flyer_data: unknown;
  updated_at: string | null;
}

const LOT_STATUS = ["available", "on_hold", "sold", "nhc_exclusive"] as const;
const PKG_STATUS = ["draft", "live", "sold"] as const;

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


/** Luxury Dark Tone Badges */
function statusTone(value: string) {
  if (value === "available" || value === "live")
    return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-sm";
  if (value === "on_hold" || value === "draft")
    return "bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-sm";
  if (value === "nhc_exclusive") return "bg-purple-500/15 text-purple-300 border-purple-500/30 shadow-sm";
  if (value === "sold") return "bg-slate-800 text-slate-400 border-slate-700";
  return "bg-slate-800/60 text-slate-400 border-slate-800";
}

function StatusPill({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize transition-colors ${statusTone(value)}`}
    >
      {statusLabel(value)}
    </span>
  );
}

const emptyLotForm = {
  estate: "",
  suburb: "",
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
      <Label className="text-xs text-slate-400 font-medium">{label}</Label>
      <Input
        type={type}
        disabled={disabled}
        value={form[key]}
        onChange={(e) => update(key, e.target.value)}
        className="h-8.5 rounded-lg border-slate-800 bg-slate-900/80 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60"
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

    const lotId = lot?.id || `lot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const fullLot: Lot = {
      ...payload,
      id: lotId,
      status: lot?.status || "available",
      updated_at: new Date().toISOString(),
    };
    upsertLocalLot(fullLot);

    try {
      const { error } = lot
        ? await supabase.from("land_lots").update(payload).eq("id", lot.id)
        : await supabase.from("land_lots").insert({ ...payload, id: lotId });
      if (error) {
        console.warn("[database] Supabase sync lot error:", error);
      }
    } catch (err) {
      console.warn("[database] Supabase sync exception:", err);
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
          <Button size="sm" className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 text-xs font-semibold gap-1.5 shadow-sm">
            <Plus className="h-3.5 w-3.5" /> Add land lot
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl border-slate-800 bg-slate-950/95 text-slate-100 backdrop-blur-2xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-white font-bold tracking-wide">{lot ? "Edit land lot" : "New land lot"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
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
        <div className="mt-3 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3.5 text-slate-300">
          <Label className="text-xs text-slate-400 font-medium">
            NHC Exclusive — consultants who can sell this lot
          </Label>
          <div className="mt-2 flex flex-wrap gap-3">
            {CONSULTANTS.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-xs text-slate-300">
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
          <p className="mt-2 text-[11px] text-slate-400">
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

interface ParsedLot {
  lot_number?: string | null;
  address?: string | null;
  land_size?: number | null;
  frontage?: number | null;
  land_price?: number | null;
  registration_date?: string | null;
  titled?: boolean | null;
  status?: Lot["status"] | null;
  notes?: string | null;
}

/** Same lot number in the same estate + suburb = already in the database. */
const dupeKey = (estate: string, suburb: string, lotNumber: string | null | undefined) =>
  `${estate.trim().toLowerCase()}|${suburb.trim().toLowerCase()}|${(lotNumber ?? "").trim().toLowerCase()}`;

/** Upload a developer price list (PDF, image, CSV, TXT) or paste raw text and auto-create every lot. */
function ImportDialog({ onSaved, existingLots }: { onSaved: () => void; existingLots: Lot[] }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"file" | "paste">("file");
  const [pastedText, setPastedText] = useState("");
  const [estate, setEstate] = useState("");
  const [suburb, setSuburb] = useState("");
  const [stage, setStage] = useState("");
  const [developer, setDeveloper] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [rows, setRows] = useState<ParsedLot[]>([]);
  const [picked, setPicked] = useState<boolean[]>([]);

  const existingKeys = useMemo(
    () => new Set(existingLots.map((l) => dupeKey(l.estate, l.suburb, l.lot_number))),
    [existingLots],
  );

  const isDupe = (r: ParsedLot) =>
    Boolean(r.lot_number) && existingKeys.has(dupeKey(estate, suburb, r.lot_number));

  // Pull saved contacts whenever the developer name changes.
  useEffect(() => {
    const name = developer.trim();
    if (!name) return;
    let cancelled = false;
    void listDevelopers().then((devs) => {
      if (cancelled) return;
      const match = devs.find((d) => devKey(d.name) === devKey(name));
      if (!match) return;
      setContactName((v) => v || match.contact_name || "");
      setContactPhone((v) => v || match.contact_phone || "");
      setContactEmail((v) => v || match.contact_email || "");
    });
    return () => {
      cancelled = true;
    };
  }, [developer]);

  const applyParsedResult = (json: { estate?: string; suburb?: string; stage?: string; developer?: string; lots: ParsedLot[] }) => {
    if (json.estate && !estate) setEstate(json.estate);
    if (json.suburb && !suburb) setSuburb(json.suburb);
    if (json.stage && !stage) setStage(json.stage);
    if (json.developer && !developer) setDeveloper(json.developer);
    const lots = json.lots ?? [];
    if (lots.length > 0) {
      setRows(lots);
      setPicked(lots.map(() => true));
      toast.success(`Found ${lots.length} lots — tick the ones to import`);
    } else {
      setRows([
        {
          lot_number: "",
          stage: json.stage || stage || "",
          land_size: null,
          frontage: null,
          land_price: null,
          titled: false,
          registration_date: "",
          status: "available",
        },
      ]);
      setPicked([true]);
      toast.info("Document loaded — enter lot details below or paste price list text");
    }
  };

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const isTextFile = /\.csv$/i.test(file.name) || /\.txt$/i.test(file.name) || /\.tsv$/i.test(file.name);
      if (isTextFile) {
        const text = await file.text();
        const json = extractLotsFromText(text, file.name);
        applyParsedResult(json);
      } else {
        const doc = await pdfDocumentToPagesAndText(file);
        const json = await parseDeveloperPriceList(doc);
        applyParsedResult(json);
      }
    } catch (err) {
      console.warn("[ImportDialog] File parsing error:", err);
      // Fallback: extract from filename so user is never blocked
      const meta = extractLotsFromText("", file.name);
      applyParsedResult(meta);
    } finally {
      setBusy(false);
    }
  };

  const handleParseText = () => {
    if (!pastedText.trim()) {
      toast.error("Please paste price list text or table rows first");
      return;
    }
    const json = extractLotsFromText(pastedText, "");
    applyParsedResult(json);
  };

  const addEmptyRow = () => {
    setRows((prev) => [
      ...prev,
      {
        lot_number: "",
        stage: stage || "",
        land_size: null,
        frontage: null,
        land_price: null,
        titled: false,
        registration_date: "",
        status: "available",
      },
    ]);
    setPicked((prev) => [...prev, true]);
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
    setPicked((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, patch: Partial<ParsedLot>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const selected = rows.filter((r, i) => picked[i] && !isDupe(r) && (r.lot_number || r.land_price));
  const dupeCount = rows.filter(isDupe).length;

  const importAll = async () => {
    if (!estate.trim() || !suburb.trim()) {
      toast.error("Estate and suburb are required");
      return;
    }
    if (!selected.length) {
      toast.error("No valid lots selected (enter at least lot number or price)");
      return;
    }
    setBusy(true);
    const newLotPayloads = selected.map((r, idx) => {
      const rowStage = (r.stage || stage || "").trim();
      const stagePrefix = rowStage ? (rowStage.toLowerCase().startsWith("stage") ? rowStage : `Stage ${rowStage}`) : null;
      const combinedNotes = [stagePrefix, r.notes].filter(Boolean).join(" · ") || null;

      return {
        id: `lot-imp-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        estate: estate.trim(),
        suburb: suburb.trim(),
        developer: developer.trim(),
        developer_contact_name: contactName || null,
        developer_contact_phone: contactPhone || null,
        developer_contact_email: contactEmail || null,
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

    // Save all to localStorage immediately
    const existing = getLocalLots();
    saveLocalLots([...newLotPayloads, ...existing]);

    try {
      await supabase.from("land_lots").insert(newLotPayloads);
    } catch (err) {
      console.warn("[database] Supabase sync import error:", err);
    }

    if (developer.trim()) {
      await rememberDeveloper({
        name: developer,
        contact_name: contactName,
        contact_phone: contactPhone,
        contact_email: contactEmail,
      });
    }
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      `${selected.length} lots imported${dupeCount ? ` · ${dupeCount} duplicate${dupeCount === 1 ? "" : "s"} skipped` : ""}`,
    );
    setRows([]);
    setPicked([]);
    setPastedText("");
    setOpen(false);
    onSaved();
  };

  const allOn = rows.length > 0 && rows.every((r, i) => isDupe(r) || picked[i]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white text-xs gap-1.5">
          <Upload className="h-3.5 w-3.5 text-amber-400" /> Import price list
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl border-slate-800 bg-slate-950/95 text-slate-100 backdrop-blur-2xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-white font-bold tracking-wide">Import Developer Price List</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-slate-400">
          Upload a developer&rsquo;s PDF, CSV, spreadsheet, or screenshot &mdash; or paste table text directly. Every lot, stage, size, and price is extracted automatically.
        </p>

        <div className="flex gap-2 border-b border-slate-800 pb-2 text-xs">
          <Button
            size="sm"
            variant={mode === "file" ? "default" : "outline"}
            onClick={() => setMode("file")}
            className={`h-7 text-xs ${mode === "file" ? "bg-gradient-to-r from-amber-500/20 to-brand-gold/15 text-amber-200 border border-brand-gold/40" : "border-slate-800 bg-slate-900/60 text-slate-400"}`}
          >
            Upload Document (PDF / CSV / Image)
          </Button>
          <Button
            size="sm"
            variant={mode === "paste" ? "default" : "outline"}
            onClick={() => setMode("paste")}
            className={`h-7 text-xs ${mode === "paste" ? "bg-gradient-to-r from-amber-500/20 to-brand-gold/15 text-amber-200 border border-brand-gold/40" : "border-slate-800 bg-slate-900/60 text-slate-400"}`}
          >
            Paste Text / Table
          </Button>
        </div>

        {mode === "file" ? (
          <Input
            type="file"
            accept="application/pdf,image/*,.csv,.txt,.tsv"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
        ) : (
          <div className="space-y-2">
            <textarea
              className="w-full min-h-[90px] rounded-md border p-2 text-xs font-mono"
              placeholder="Paste table lines, tab-delimited text, or developer price list text here (e.g. Stage 4  Lot 101  450m2  14m  $385,000  Available  Nov 2026)"
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
            />
            <Button size="sm" onClick={handleParseText} disabled={busy || !pastedText.trim()}>
              Parse Pasted Text
            </Button>
          </div>
        )}

        {busy && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Reading price list…
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Estate *</Label>
            <Input placeholder="e.g. Aurora" value={estate} onChange={(e) => setEstate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Suburb *</Label>
            <Input placeholder="e.g. Flagstone" value={suburb} onChange={(e) => setSuburb(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Stage / Release</Label>
            <Input placeholder="e.g. Stage 4" value={stage} onChange={(e) => setStage(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Developer</Label>
            <Input placeholder="e.g. Peet" value={developer} onChange={(e) => setDeveloper(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Developer contact</Label>
            <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Contact phone</Label>
            <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Contact email</Label>
            <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </div>
        </div>

        {rows.length > 0 && (
          <>
            {dupeCount > 0 && (
              <p className="text-xs text-orange-700">
                {dupeCount} lot{dupeCount === 1 ? " is" : "s are"} already in the database and will be skipped.
              </p>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-semibold text-muted-foreground">
                Lots to Import ({rows.length} {rows.length === 1 ? "lot" : "lots"})
              </span>
              <Button size="sm" variant="outline" onClick={addEmptyRow} className="h-6 text-xs gap-1">
                <Plus className="h-3 w-3" /> Add Lot
              </Button>
            </div>

            <div className="max-h-[38vh] overflow-y-auto rounded border">
              <table className="w-full text-xs">
                <thead className="bg-muted/60 text-left text-muted-foreground">
                  <tr>
                    <th className="p-2 w-8">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5"
                        checked={allOn}
                        onChange={(e) => setPicked(rows.map(() => e.target.checked))}
                      />
                    </th>
                    <th className="p-2 w-20">Lot #</th>
                    <th className="p-2 w-20">Stage</th>
                    <th className="p-2 w-20">Size (m²)</th>
                    <th className="p-2 w-20">Frontage</th>
                    <th className="p-2 w-28">Price ($)</th>
                    <th className="p-2 w-28">Registration</th>
                    <th className="p-2 w-24">Status</th>
                    <th className="p-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((r, i) => {
                    const dupe = isDupe(r);
                    return (
                      <tr key={i} className={dupe ? "bg-muted/40 text-muted-foreground" : ""}>
                        <td className="p-2">
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5"
                            disabled={dupe}
                            checked={!dupe && Boolean(picked[i])}
                            onChange={(e) =>
                              setPicked((p) => p.map((v, idx) => (idx === i ? e.target.checked : v)))
                            }
                          />
                        </td>
                        <td className="p-1">
                          <input
                            className="w-full rounded border px-1.5 py-0.5 text-xs font-medium"
                            placeholder="101"
                            value={r.lot_number || ""}
                            onChange={(e) => updateRow(i, { lot_number: e.target.value })}
                          />
                        </td>
                        <td className="p-1">
                          <input
                            className="w-full rounded border px-1.5 py-0.5 text-xs"
                            placeholder={stage || "4"}
                            value={r.stage || ""}
                            onChange={(e) => updateRow(i, { stage: e.target.value })}
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            className="w-full rounded border px-1.5 py-0.5 text-xs"
                            placeholder="450"
                            value={r.land_size ?? ""}
                            onChange={(e) => updateRow(i, { land_size: e.target.value ? parseFloat(e.target.value) : null })}
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            step="0.1"
                            className="w-full rounded border px-1.5 py-0.5 text-xs"
                            placeholder="14.0"
                            value={r.frontage ?? ""}
                            onChange={(e) => updateRow(i, { frontage: e.target.value ? parseFloat(e.target.value) : null })}
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            className="w-full rounded border px-1.5 py-0.5 text-xs"
                            placeholder="385000"
                            value={r.land_price ?? ""}
                            onChange={(e) => updateRow(i, { land_price: e.target.value ? parseInt(e.target.value, 10) : null })}
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
                              updateRow(i, { titled: isReg, registration_date: isReg ? null : v });
                            }}
                          />
                        </td>
                        <td className="p-1">
                          <select
                            className="w-full rounded border px-1 py-0.5 text-xs bg-background"
                            value={r.status || "available"}
                            onChange={(e) => updateRow(i, { status: e.target.value as any })}
                          >
                            <option value="available">Available</option>
                            <option value="on_hold">On Hold</option>
                            <option value="sold">Sold</option>
                          </select>
                        </td>
                        <td className="p-1 text-center">
                          <button
                            type="button"
                            onClick={() => removeRow(i)}
                            className="text-muted-foreground hover:text-destructive"
                            title="Remove row"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Button onClick={importAll} disabled={busy || !selected.length}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Import {selected.length} lot
              {selected.length === 1 ? "" : "s"} to Database
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}


function DatabasePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"lots" | "packages">("lots");
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

  const load = useCallback(async () => {
    setLoading(true);
    // Instant load from localStorage cache (auto-seeded if empty)
    const localL = getLocalLots();
    const localP = getLocalPackages();
    setLots(localL);
    setPackages(localP);

    try {
      const [lotRes, pkgRes] = await Promise.all([
        supabase.from("land_lots").select("*").order("created_at", { ascending: false }),
        supabase.from("packages").select("*").order("created_at", { ascending: false }),
      ]);
      
      if (lotRes.data && lotRes.data.length > 0) {
        setLots(lotRes.data as Lot[]);
        saveLocalLots(lotRes.data as Lot[]);
      }
      if (pkgRes.data && pkgRes.data.length > 0) {
        setPackages(pkgRes.data as Pkg[]);
        saveLocalPackages(pkgRes.data as Pkg[]);
      }
      setSelLots([]);
      setSelPkgs([]);
    } catch (e) {
      console.warn("[database] Supabase sync notice (using local storage fallback):", e);
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    void load();
  }, [load]);

  const lotById = useMemo(() => new Map(lots.map((l) => [l.id, l])), [lots]);
  const packagesByLot = useMemo(() => {
    const grouped = new Map<string, Pkg[]>();
    for (const pkg of packages) {
      if (!pkg.lot_id) continue;
      const existing = grouped.get(pkg.lot_id);
      if (existing) existing.push(pkg);
      else grouped.set(pkg.lot_id, [pkg]);
    }
    return grouped;
  }, [packages]);

  const filteredLots = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return lots;
    return lots.filter((l) =>
      [l.estate, l.suburb, l.lot_number, l.address, l.developer, l.notes]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [lots, query]);

  /** Lots grouped by suburb, then by estate inside each suburb. */
  const lotGroups = useMemo(() => {
    const cmp = (a: Lot, b: Lot) => {
      if (lotSort === "land_price") return (a.land_price ?? 0) - (b.land_price ?? 0);
      if (lotSort === "land_size") return (a.land_size ?? 0) - (b.land_size ?? 0);
      // registration: registered lots first, then soonest date, undated last
      const av = a.titled ? "0000-00-00" : (a.registration_date ?? "9999-12-31");
      const bv = b.titled ? "0000-00-00" : (b.registration_date ?? "9999-12-31");
      return av.localeCompare(bv);
    };

    // Lots that mention the same suburb word sit under one heading.
    const suburbKey = (l: Lot) => (l.suburb || "Unassigned suburb").trim().toLowerCase();

    const suburbs = new Map<string, { label: string; lots: Lot[] }>();
    for (const l of filteredLots) {
      const key = suburbKey(l);
      const entry = suburbs.get(key);
      if (entry) entry.lots.push(l);
      else suburbs.set(key, { label: l.suburb?.trim() || "Unassigned suburb", lots: [l] });
    }

    return [...suburbs.entries()]
      .sort((a, b) => a[1].label.localeCompare(b[1].label))
      .map(([key, { label, lots: items }]) => {
        const estates = new Map<string, Lot[]>();
        for (const l of items) {
          const e = l.estate || "Unassigned estate";
          const arr = estates.get(e);
          if (arr) arr.push(l);
          else estates.set(e, [l]);
        }
        return {
          key,
          label,
          count: items.length,
          estates: [...estates.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([estate, group]) => ({ estate, lots: [...group].sort(cmp) })),
        };
      });
  }, [filteredLots, lotSort]);

  const [openSuburbs, setOpenSuburbs] = useState<string[]>([]);
  const searching = query.trim().length > 0;
  // Suburbs always stay collapsed until they are clicked open.
  const isOpen = (key: string) => openSuburbs.includes(key);


  const filteredPackages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return packages;
    return packages.filter((p) => {
      const lot = p.lot_id ? lotById.get(p.lot_id) : undefined;
      return [p.name, p.design, p.facade_name, lot?.estate, lot?.suburb]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [packages, query, lotById]);

  const updateLot = async (id: string, patch: { status: Lot["status"] }) => {
    setLots((prev) => {
      const next = prev.map((l) => (l.id === id ? { ...l, ...patch } : l));
      saveLocalLots(next);
      return next;
    });
    try {
      await supabase.from("land_lots").update(patch).eq("id", id);
    } catch (e) {
      console.warn("[database] Supabase update lot warning:", e);
    }
  };

  const updatePkg = async (id: string, patch: { status: Pkg["status"] }) => {
    setPackages((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...patch } : p));
      saveLocalPackages(next);
      return next;
    });
    try {
      await supabase.from("packages").update(patch).eq("id", id);
    } catch (e) {
      console.warn("[database] Supabase update pkg warning:", e);
    }
  };

  const removeLot = async (id: string) => {
    deleteLocalLot(id);
    setLots((prev) => prev.filter((l) => l.id !== id));
    try {
      await supabase.from("land_lots").delete().eq("id", id);
    } catch (e) {
      console.warn("[database] Supabase delete lot warning:", e);
    }
    toast.success("Lot removed");
  };

  const removePkg = async (id: string) => {
    deleteLocalPackage(id);
    setPackages((prev) => prev.filter((p) => p.id !== id));
    try {
      await supabase.from("packages").delete().eq("id", id);
    } catch (e) {
      console.warn("[database] Supabase delete pkg warning:", e);
    }
    toast.success("Package removed");
  };

  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  /** Apply one change to every selected land lot. */
  const bulkLots = async (
    patch: { status?: Lot["status"]; registration_date?: string | null; titled?: boolean; deadline?: string | null },
    label: string,
  ) => {
    if (!selLots.length) return;
    setBulkBusy(true);
    setLots((prev) => {
      const next = prev.map((l) => (selLots.includes(l.id) ? { ...l, ...patch } : l));
      saveLocalLots(next);
      return next;
    });
    try {
      await supabase.from("land_lots").update(patch).in("id", selLots);
    } catch (e) {
      console.warn("[database] Bulk lot update warning:", e);
    }
    setBulkBusy(false);
    toast.success(`${selLots.length} lots ${label}`);
  };

  const bulkDeleteLots = async () => {
    if (!selLots.length) return;
    if (!window.confirm(`Delete ${selLots.length} land lots? This cannot be undone.`)) return;
    setBulkBusy(true);
    setLots((prev) => {
      const next = prev.filter((l) => !selLots.includes(l.id));
      saveLocalLots(next);
      return next;
    });
    try {
      await supabase.from("land_lots").delete().in("id", selLots);
    } catch (e) {
      console.warn("[database] Bulk delete lots warning:", e);
    }
    setBulkBusy(false);
    toast.success(`${selLots.length} lots deleted`);
  };

  const bulkPkgs = async (patch: Partial<Pick<Pkg, "status" | "needs_review">>, label: string) => {
    if (!selPkgs.length) return;
    setBulkBusy(true);
    setPackages((prev) => {
      const next = prev.map((p) => (selPkgs.includes(p.id) ? { ...p, ...patch } : p));
      saveLocalPackages(next);
      return next;
    });
    try {
      await supabase.from("packages").update(patch).in("id", selPkgs);
    } catch (e) {
      console.warn("[database] Bulk packages warning:", e);
    }
    setBulkBusy(false);
    toast.success(`${selPkgs.length} packages ${label}`);
  };

  const bulkDeletePkgs = async () => {
    if (!selPkgs.length) return;
    if (!window.confirm(`Delete ${selPkgs.length} packages? This cannot be undone.`)) return;
    setBulkBusy(true);
    setPackages((prev) => {
      const next = prev.filter((p) => !selPkgs.includes(p.id));
      saveLocalPackages(next);
      return next;
    });
    try {
      await supabase.from("packages").delete().in("id", selPkgs);
    } catch (e) {
      console.warn("[database] Bulk delete pkgs warning:", e);
    }
    setBulkBusy(false);
    toast.success(`${selPkgs.length} packages deleted`);
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

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden font-sans selection:bg-brand-gold/30 flex flex-col">
      {/* Ambient Gradient Lights */}
      <div className="ambient-glow-cyan h-96 w-96 -top-20 right-10" />
      <div className="ambient-glow-gold h-96 w-96 top-96 -left-20" />

      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 sm:flex sm:flex-wrap sm:justify-between sm:px-6">
          <Link to="/hub" className="flex min-w-0 items-center gap-3 hover:opacity-90 transition-opacity">
            <img src={logoUrl} alt="Hudson Homes" className="h-6 w-auto shrink-0 object-contain sm:h-7" />
            <div className="min-w-0 leading-tight border-l border-slate-800 pl-3">
              <h1 className="truncate text-xs font-bold tracking-[0.14em] text-white uppercase sm:text-sm">
                QLD House &amp; Land Database
              </h1>
              <p className="hidden text-[10px] tracking-wider text-cyan-400 font-medium uppercase sm:block">
                Live Availability &amp; Pricing CRM
              </p>
            </div>
          </Link>
          <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
            <Link to="/hub">
              <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-transparent hover:border-slate-800">
                Hub
              </Button>
            </Link>
            <Link to="/flyer">
              <Button variant="outline" size="sm" className="border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white text-xs">
                Flyer builder
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => void load()} className="text-slate-400 hover:text-slate-100 hover:bg-slate-900" title="Refresh database">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-slate-400 hover:text-rose-300 hover:bg-rose-500/10" title="Sign out">
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="space-y-5 p-4 sm:p-6 relative z-10 flex-1 max-w-[1700px] mx-auto w-full">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl border border-slate-800/90 bg-slate-900/90 p-1 backdrop-blur-md shadow-inner">
            {(["lots", "packages"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold capitalize transition-all ${
                  tab === t
                    ? t === "lots"
                      ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                      : "bg-gradient-to-r from-amber-500/20 to-brand-gold/20 text-amber-200 border border-brand-gold/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t === "lots" ? `Land lots (${lots.length})` : `Packages (${packages.length})`}
              </button>
            ))}
          </div>
          <Input
            className="h-9 w-full rounded-lg border-slate-800 bg-slate-900/80 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 sm:max-w-xs"
            placeholder="Search estate, suburb, design…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {tab === "lots" && (
            <Select value={lotSort} onValueChange={(v) => setLotSort(v as typeof lotSort)}>
              <SelectTrigger className="h-9 w-[190px] rounded-lg border-slate-800 bg-slate-900/80 text-xs text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                <SelectItem value="registration">Sort: Registration</SelectItem>
                <SelectItem value="land_price">Sort: Land price</SelectItem>
                <SelectItem value="land_size">Sort: Land size</SelectItem>
              </SelectContent>
            </Select>
          )}
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            <Button
              size="sm"
              variant="outline"
              className="border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white text-xs gap-1.5"
              onClick={() => window.open("/browse/land", "_blank", "noopener")}
            >
              <FileDown className="h-3.5 w-3.5 text-cyan-400" /> Customer land PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white text-xs gap-1.5"
              onClick={() => window.open("/browse/packages", "_blank", "noopener")}
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
          <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-cyan-500/30 bg-slate-900/90 backdrop-blur-xl p-3 text-sm shadow-xl">
            <span className="font-semibold text-cyan-300">{selLots.length} lots selected</span>
            <Select
              onValueChange={(v) => void bulkLots({ status: v as Lot["status"] }, `set to ${v}`)}
            >
              <SelectTrigger className="h-8 w-[150px] border-slate-800 bg-slate-950/80 text-xs text-slate-200">
                <SelectValue placeholder="Set status" />
              </SelectTrigger>
              <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                {LOT_STATUS.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {statusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              className="h-8 w-[170px] border-slate-800 bg-slate-950/80 text-xs text-slate-200"
              value={bulkRegDate}
              onChange={(e) => setBulkRegDate(e.target.value)}
            />
            <Button
              size="sm"
              variant="outline"
              className="border-slate-800 bg-slate-950/80 text-xs text-slate-300 hover:text-white"
              disabled={bulkBusy || !bulkRegDate}
              onClick={() =>
                void bulkLots(
                  { registration_date: bulkRegDate, titled: false },
                  "registration updated",
                )
              }
            >
              Set expected registration
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-slate-800 bg-slate-950/80 text-xs text-slate-300 hover:text-white"
              disabled={bulkBusy}
              onClick={() => void bulkLots({ titled: true, registration_date: null }, "registered")}
            >
              Mark registered
            </Button>
            <Button size="sm" variant="ghost" className="text-xs text-slate-400 hover:text-slate-200" onClick={() => setSelLots([])}>
              Clear
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="ml-auto text-xs"
              disabled={bulkBusy}
              onClick={() => void bulkDeleteLots()}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete selected
            </Button>
          </div>
        )}

        {tab === "packages" && selPkgs.length > 0 && (
          <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-amber-500/30 bg-slate-900/90 backdrop-blur-xl p-3 text-sm shadow-xl">
            <span className="font-semibold text-amber-300">{selPkgs.length} packages selected</span>
            <Select
              onValueChange={(v) => void bulkPkgs({ status: v as Pkg["status"] }, `set to ${v}`)}
            >
              <SelectTrigger className="h-8 w-[150px] border-slate-800 bg-slate-950/80 text-xs text-slate-200">
                <SelectValue placeholder="Set status" />
              </SelectTrigger>
              <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                {PKG_STATUS.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
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
            <Loader2 className="h-5 w-5 animate-spin text-cyan-400" /> Loading QLD database…
          </div>
        ) : tab === "lots" ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-900/80 backdrop-blur-xl shadow-2xl">
            <table className="w-full text-sm">
              <thead className="bg-slate-950/80 text-left text-[11px] font-semibold tracking-wider text-slate-400 uppercase border-b border-slate-800/80">
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
              {lotGroups.map((group) => (
                <tbody key={group.key} className="divide-y divide-slate-800/50">
                  <tr
                    className="cursor-pointer bg-slate-900/90 hover:bg-slate-850 transition-colors"
                    onClick={() =>
                      setOpenSuburbs((prev) => toggle(prev, group.key))
                    }
                  >
                    <td colSpan={11} className="px-3.5 py-3">
                      <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-100">
                        {isOpen(group.key) ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-cyan-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                        )}
                        <span className="truncate">{titleCase(group.label)}</span>
                        <span className="text-xs font-normal text-slate-400">
                          {group.estates.length} estate{group.estates.length === 1 ? "" : "s"} ·{" "}
                          {group.count} lot{group.count === 1 ? "" : "s"}
                        </span>
                        <span className="ml-auto text-xs font-medium text-cyan-400 hover:underline">
                          {isOpen(group.key) ? "Hide" : "View"}
                        </span>
                      </div>
                    </td>
                  </tr>
                  {isOpen(group.key) &&
                    group.estates.map(({ estate, lots: groupLots }) => (
                      <Fragment key={estate}>
                        <tr className="bg-slate-950/60 border-b border-slate-800/60">
                          <td
                            colSpan={11}
                            className="px-3.5 py-2 pl-9 text-xs font-semibold text-slate-300"
                          >
                            {titleCase(estate)}{" "}
                            <span className="ml-1 font-normal text-slate-500 normal-case">
                              {groupLots.length} lot{groupLots.length === 1 ? "" : "s"}
                            </span>
                          </td>
                        </tr>
                        {groupLots.map((l: Lot) => (

                  <tr key={l.id} className="align-top hover:bg-slate-800/40 transition-colors">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-cyan-400 rounded"
                        checked={selLots.includes(l.id)}
                        onChange={() => setSelLots((prev) => toggle(prev, l.id))}
                      />
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-100">{titleCase(l.estate)}</div>
                      <div className="text-xs text-slate-400">{titleCase(l.suburb)}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-slate-100 flex items-center gap-1.5 flex-wrap">
                        <span>{l.lot_number ? `Lot ${l.lot_number}` : "—"}</span>
                        {l.notes?.match(/Stage\s*([A-Za-z0-9\.\-]+)/i) && (
                          <span className="inline-block rounded-md bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300 border border-cyan-500/30">
                            {l.notes.match(/Stage\s*([A-Za-z0-9\.\-]+)/i)![0]}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">{titleCase(l.address)}</div>
                    </td>
                    <td className="p-3 whitespace-nowrap text-slate-200">
                      {l.land_size ? `${l.land_size} m²` : "—"}
                      <div className="text-xs text-slate-400">
                        {l.frontage ? `${l.frontage} m frontage` : ""}
                      </div>
                    </td>
                    <td className="p-3 whitespace-nowrap font-semibold text-cyan-300">{money(l.land_price)}</td>
                    <td className="p-3">
                      <div className="text-slate-200">{l.developer || "—"}</div>
                      <div className="text-xs text-slate-400">
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
                          className={`h-8 w-[130px] text-xs font-medium capitalize rounded-full ${statusTone(l.status)}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                          {LOT_STATUS.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize">
                              {statusLabel(s)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {l.status === "nhc_exclusive" && (
                        <div className="mt-1 text-[11px] text-purple-300">
                          {(l.exclusive_consultants ?? [])
                            .map((id) => CONSULTANTS.find((c) => c.id === id)?.name ?? id)
                            .join(", ") || "No consultant assigned"}
                        </div>
                      )}
                    </td>
                      <td className="p-3 text-xs whitespace-nowrap text-slate-300">
                        <div>
                          {l.titled
                            ? "Registered"
                            : l.registration_date
                              ? `Expected ${l.registration_date}`
                              : "Registration TBC"}
                        </div>
                      </td>

                      <td className="p-3 text-xs whitespace-nowrap">
                        <div className="text-slate-300">{lastUpdated(l.updated_at).rel}</div>
                        <div className="text-slate-500">
                          {lastUpdated(l.updated_at).exact}
                        </div>
                      </td>

                      <td className="p-3">
                        {(packagesByLot.get(l.id)?.length ?? 0) > 0 ? (
                          <Select
                            onValueChange={(id) => {
                              const pkg = packages.find((item) => item.id === id);
                              if (!pkg) return;
                              openInFlyer({
                                ...(pkg.flyer_data && typeof pkg.flyer_data === "object"
                                  ? (pkg.flyer_data as Record<string, unknown>)
                                  : {}),
                                packageId: pkg.id,
                                id: pkg.id,
                              });
                            }}
                          >
                            <SelectTrigger className="h-8 w-[170px] border-slate-800 bg-slate-900/80 text-xs text-slate-200 hover:border-slate-700">
                              <SelectValue placeholder={`${packagesByLot.get(l.id)?.length ?? 0} package${packagesByLot.get(l.id)?.length === 1 ? "" : "s"}`} />
                            </SelectTrigger>
                            <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
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
                            className="border-slate-800 bg-slate-900/80 text-slate-200 hover:bg-slate-800 hover:text-white text-xs gap-1.5 font-medium shadow-sm"
                            onClick={() =>
                              openInFlyer({
                                lotId: l.id,
                                suburb: l.suburb,
                                estate: l.estate,
                                address: [l.lot_number, l.address].filter(Boolean).join(", "),
                                landSize: l.land_size ? String(l.land_size) : "",
                                landFrontage: l.frontage ? String(l.frontage) : "",
                                landPrice: l.land_price ? formatAud(Number(l.land_price)) : "",
                              })
                            }
                          >
                            <FileDown className="h-3.5 w-3.5 text-cyan-400" /> Flyer
                          </Button>
                          <LotDialog
                            lot={l}
                            onSaved={load}
                            trigger={
                              <Button size="icon" variant="ghost" className="text-slate-400 hover:text-slate-100 hover:bg-slate-800/60" title="Edit lot">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            }
                          />
                          <Button size="icon" variant="ghost" className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10" onClick={() => removeLot(l.id)} title="Delete lot">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                     </tr>
                        ))}
                      </Fragment>
                    ))}
                </tbody>
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
          <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-900/80 backdrop-blur-xl shadow-2xl">
            <table className="w-full text-sm">
              <thead className="bg-slate-950/80 text-left text-[11px] font-semibold tracking-wider text-slate-400 uppercase border-b border-slate-800/80">
                <tr>
                  <th className="p-3">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-amber-400 rounded"
                      checked={
                        filteredPackages.length > 0 && selPkgs.length === filteredPackages.length
                      }
                      onChange={(e) =>
                        setSelPkgs(e.target.checked ? filteredPackages.map((p) => p.id) : [])
                      }
                    />
                  </th>
                  <th className="p-3">Package</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Specs</th>
                  <th className="p-3">House</th>
                  <th className="p-3">Land</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Last Updated</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredPackages.map((p) => {
                  const lot = p.lot_id ? lotById.get(p.lot_id) : undefined;
                  return (
                    <tr key={p.id} className="align-top hover:bg-slate-800/40 transition-colors">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 accent-amber-400 rounded"
                          checked={selPkgs.includes(p.id)}
                          onChange={() => setSelPkgs((prev) => toggle(prev, p.id))}
                        />
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-100">
                          {titleCase(p.name || p.design) || "Untitled"}
                        </div>
                        <div className="text-xs text-slate-400">
                          {[titleCase(p.facade_name), titleCase(p.range_id)]
                            .filter(Boolean)
                            .join(" · ")}
                          {p.needs_review && (
                            <span className="ml-2 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/30">Price Review</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-xs text-slate-300">
                        {lot ? `${titleCase(lot.estate)} · ${titleCase(lot.suburb)}` : "—"}
                      </td>

                      <td className="p-3 text-xs whitespace-nowrap text-slate-300">
                        {[p.beds, p.baths, p.cars].filter(Boolean).join(" / ") || "—"}
                      </td>
                      <td className="p-3 whitespace-nowrap text-slate-200">{money(p.house_price)}</td>
                      <td className="p-3 whitespace-nowrap text-slate-200">{money(p.land_price)}</td>
                      <td className="p-3 font-bold whitespace-nowrap text-amber-300">{money(p.total_price)}</td>
                      <td className="p-3">
                        <Select
                          value={p.status}
                          onValueChange={(v) => updatePkg(p.id, { status: v as Pkg["status"] })}
                        >
                          <SelectTrigger
                            className={`h-8 w-[110px] text-xs font-medium capitalize rounded-full ${statusTone(p.status)}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                            {PKG_STATUS.map((s) => (
                              <SelectItem key={s} value={s} className="capitalize">
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3 text-xs whitespace-nowrap">
                        <div className="text-slate-300">{lastUpdated(p.updated_at).rel}</div>
                        <div className="text-slate-500">
                          {lastUpdated(p.updated_at).exact}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white text-xs gap-1.5"
                            onClick={() =>
                              openInFlyer({
                                ...(p.flyer_data && typeof p.flyer_data === "object"
                                  ? (p.flyer_data as Record<string, unknown>)
                                  : {}),
                                packageId: p.id,
                                id: p.id,
                              })
                            }
                          >
                            <FileDown className="h-3.5 w-3.5 text-amber-400" /> Flyer
                          </Button>
                          <Button size="icon" variant="ghost" className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10" onClick={() => removePkg(p.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filteredPackages.length && (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-sm text-slate-400">
                      No packages saved yet — build one in the flyer studio and save it here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-slate-400 pt-2 flex items-center gap-2">
          <StatusPill value="available" /> <span>lots are sellable today. Everything here is shared across the QLD team.</span>
        </p>
      </main>
    </div>
  );
}
