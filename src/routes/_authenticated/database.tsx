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
import { parseDeveloperPriceList } from "@/lib/parseLotList";

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


/** Green = available/live, orange = on hold/draft, red = sold. */
function statusTone(value: string) {
  if (value === "available" || value === "live")
    return "bg-emerald-100 text-emerald-800 border-emerald-300";
  if (value === "on_hold" || value === "draft")
    return "bg-orange-100 text-orange-800 border-orange-300";
  if (value === "nhc_exclusive") return "bg-violet-100 text-violet-800 border-violet-300";
  if (value === "sold") return "bg-red-100 text-red-800 border-red-300";
  return "bg-muted text-muted-foreground";
}

function StatusPill({ value }: { value: string }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${statusTone(value)}`}
    >
      {statusLabel(value)}
    </span>
  );
}

const emptyLotForm = {
  estate: "",
  suburb: "",
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
  return {
    estate: lot.estate ?? "",
    suburb: lot.suburb ?? "",
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
    notes: lot.notes ?? "",
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
      setForm((p) => ({
        ...p,
        developer_contact_name: p.developer_contact_name || match.contact_name || "",
        developer_contact_phone: p.developer_contact_phone || match.contact_phone || "",
        developer_contact_email: p.developer_contact_email || match.contact_email || "",
      }));
    });
    return () => {
      cancelled = true;
    };
  }, [open, form.developer]);


  const field = (k: keyof LotForm, label: string, type = "text", disabled = false) => (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type={type}
        disabled={disabled}
        value={form[k]}
        onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))}
      />
    </div>
  );

  const save = async () => {
    if (!form.estate || !form.suburb) {
      toast.error("Estate and suburb are required");
      return;
    }
    setBusy(true);
    const payload = {
      ...form,
      land_size: form.land_size ? Number(form.land_size) : null,
      frontage: form.frontage ? Number(form.frontage) : null,
      land_price: form.land_price ? Number(form.land_price) : null,
      registration_date: registered ? null : form.registration_date || null,
      titled: registered,
      deadline: form.deadline || null,
      exclusive_consultants: exclusive,
    };
    const { error } = lot
      ? await supabase.from("land_lots").update(payload).eq("id", lot.id)
      : await supabase.from("land_lots").insert(payload);
    if (!error && form.developer.trim()) {
      await rememberDeveloper({
        name: form.developer,
        contact_name: form.developer_contact_name,
        contact_phone: form.developer_contact_phone,
        contact_email: form.developer_contact_email,
      });
    }
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(lot ? "Lot updated" : "Lot added");
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="bg-brand-navy text-brand-cream hover:bg-brand-navy-deep">
            <Plus className="h-4 w-4" /> Add land lot
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{lot ? "Edit land lot" : "New land lot"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {field("estate", "Estate")}
          {field("suburb", "Suburb")}
          {field("lot_number", "Lot number")}
          {field("address", "Address")}
          {field("land_size", "Land size m²", "number")}
          {field("frontage", "Frontage m", "number")}
          {field("land_price", "Land price", "number")}
          <div className="space-y-1.5">
            {field("registration_date", "Registration", "date", registered)}
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 accent-[hsl(var(--brand-navy,220_50%_15%))]"
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
        <div className="mt-3 rounded-md border bg-muted/30 p-3">
          <Label className="text-xs text-muted-foreground">
            NHC Exclusive — consultants who can sell this lot
          </Label>
          <div className="mt-2 flex flex-wrap gap-3">
            {CONSULTANTS.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5"
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
          <p className="mt-2 text-[11px] text-muted-foreground">
            Only used when the lot status is set to NHC Exclusive — the lot stays hidden from
            customer listings.
          </p>
        </div>
        <Button onClick={save} disabled={busy} className="mt-2">
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

/** Upload a developer price list (PDF or image) and auto-create every lot in it. */
function ImportDialog({ onSaved, existingLots }: { onSaved: () => void; existingLots: Lot[] }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [estate, setEstate] = useState("");
  const [suburb, setSuburb] = useState("");
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

  const handleFile = async (file: File) => {
    setBusy(true);
    setRows([]);
    try {
      const doc = await pdfDocumentToPagesAndText(file);
      const json = await parseDeveloperPriceList(doc);
      if (json.estate) setEstate(json.estate);
      if (json.suburb) setSuburb(json.suburb);
      if (json.developer) setDeveloper(json.developer);
      const lots = json.lots ?? [];
      setRows(lots);
      setPicked(lots.map(() => true));
      toast.success(`Found ${lots.length} lots — tick the ones to import`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that price list");
    } finally {
      setBusy(false);
    }
  };

  const selected = rows.filter((r, i) => picked[i] && !isDupe(r));
  const dupeCount = rows.filter(isDupe).length;

  const importAll = async () => {
    if (!estate || !suburb) {
      toast.error("Estate and suburb are required");
      return;
    }
    if (!selected.length) {
      toast.error("No lots selected");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("land_lots").insert(
      selected.map((r) => ({
        estate,
        suburb,
        developer,
        developer_contact_name: contactName || null,
        developer_contact_phone: contactPhone || null,
        developer_contact_email: contactEmail || null,
        lot_number: r.lot_number ?? null,
        address: r.address ?? null,
        land_size: r.land_size ?? null,
        frontage: r.frontage ?? null,
        land_price: r.land_price ?? null,
        registration_date: r.titled ? null : (r.registration_date ?? null),
        titled: Boolean(r.titled),
        status: r.status ?? "available",
        notes: r.notes ?? null,
      })),
    );
    if (!error) {
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
    setOpen(false);
    onSaved();
  };

  const allOn = rows.every((r, i) => isDupe(r) || picked[i]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Upload className="h-4 w-4" /> Import price list
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import Developer Price List</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Upload the developer&rsquo;s PDF (or a screenshot) and every lot, size, frontage, price
          and registration date is read automatically.
        </p>
        <Input
          type="file"
          accept="application/pdf,image/*"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        {busy && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Reading the price list…
          </div>
        )}
        {rows.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Estate</Label>
                <Input value={estate} onChange={(e) => setEstate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Suburb</Label>
                <Input value={suburb} onChange={(e) => setSuburb(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Developer</Label>
                <Input value={developer} onChange={(e) => setDeveloper(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Developer contact</Label>
                <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Contact phone</Label>
                <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Contact email</Label>
                <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
              </div>
            </div>
            {dupeCount > 0 && (
              <p className="text-xs text-orange-700">
                {dupeCount} lot{dupeCount === 1 ? " is" : "s are"} already in the database and will
                be skipped.
              </p>
            )}
            <div className="max-h-[40vh] overflow-y-auto rounded border">
              <table className="w-full text-xs">
                <thead className="bg-muted/60 text-left text-muted-foreground">
                  <tr>
                    <th className="p-2">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5"
                        checked={allOn}
                        onChange={(e) => setPicked(rows.map(() => e.target.checked))}
                      />
                    </th>
                    <th className="p-2">Lot</th>
                    <th className="p-2">Size</th>
                    <th className="p-2">Frontage</th>
                    <th className="p-2">Price</th>
                    <th className="p-2">Registration</th>
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
                              setPicked((p) =>
                                p.map((v, idx) => (idx === i ? e.target.checked : v)),
                              )
                            }
                          />
                        </td>
                        <td className="p-2">
                          {r.lot_number || "—"}
                          {dupe && <span className="ml-2 text-[11px]">Already added</span>}
                        </td>
                        <td className="p-2">{r.land_size ? `${r.land_size} m²` : "—"}</td>
                        <td className="p-2">{r.frontage ? `${r.frontage} m` : "—"}</td>
                        <td className="p-2">{money(r.land_price ?? null)}</td>
                        <td className="p-2">
                          {r.titled ? "Registered" : r.registration_date || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Button onClick={importAll} disabled={busy || !selected.length}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Import {selected.length} lot
              {selected.length === 1 ? "" : "s"}
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
    const [lotRes, pkgRes] = await Promise.all([
      supabase.from("land_lots").select("*").order("created_at", { ascending: false }),
      supabase.from("packages").select("*").order("created_at", { ascending: false }),
    ]);
    if (lotRes.error) toast.error(lotRes.error.message);
    if (pkgRes.error) toast.error(pkgRes.error.message);
    setLots((lotRes.data ?? []) as Lot[]);
    setPackages((pkgRes.data ?? []) as Pkg[]);
    setSelLots([]);
    setSelPkgs([]);
    setLoading(false);
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
      [l.estate, l.suburb, l.lot_number, l.address, l.developer]
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
    setLots((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    const { error } = await supabase.from("land_lots").update(patch).eq("id", id);
    if (error) toast.error(error.message);
  };

  const updatePkg = async (id: string, patch: { status: Pkg["status"] }) => {
    setPackages((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    const { error } = await supabase.from("packages").update(patch).eq("id", id);
    if (error) toast.error(error.message);
  };

  const removeLot = async (id: string) => {
    const { error } = await supabase.from("land_lots").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setLots((prev) => prev.filter((l) => l.id !== id));
  };

  const removePkg = async (id: string) => {
    const { error } = await supabase.from("packages").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setPackages((prev) => prev.filter((p) => p.id !== id));
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
    const { error } = await supabase.from("land_lots").update(patch).in("id", selLots);
    setBulkBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${selLots.length} lots ${label}`);
    void load();
  };

  const bulkDeleteLots = async () => {
    if (!selLots.length) return;
    if (!window.confirm(`Delete ${selLots.length} land lots? This cannot be undone.`)) return;
    setBulkBusy(true);
    const { error } = await supabase.from("land_lots").delete().in("id", selLots);
    setBulkBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${selLots.length} lots deleted`);
    void load();
  };

  const bulkPkgs = async (patch: Partial<Pick<Pkg, "status" | "needs_review">>, label: string) => {
    if (!selPkgs.length) return;
    setBulkBusy(true);
    const { error } = await supabase.from("packages").update(patch).in("id", selPkgs);
    setBulkBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${selPkgs.length} packages ${label}`);
    void load();
  };

  const bulkDeletePkgs = async () => {
    if (!selPkgs.length) return;
    if (!window.confirm(`Delete ${selPkgs.length} packages? This cannot be undone.`)) return;
    setBulkBusy(true);
    const { error } = await supabase.from("packages").delete().in("id", selPkgs);
    setBulkBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${selPkgs.length} packages deleted`);
    void load();
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
    <div className="min-h-screen bg-muted/40">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2 sm:flex sm:flex-wrap sm:justify-between sm:px-6 sm:py-2">
          <Link to="/hub" className="flex min-w-0 items-center gap-3 hover:opacity-85 transition-opacity">
            <img src={logoUrl} alt="Hudson Homes" className="h-6 w-auto shrink-0 object-contain sm:h-6" />
            <div className="min-w-0 leading-tight">
              <h1 className="truncate text-xs font-semibold text-brand-navy sm:text-sm">
                QLD House &amp; Land Database
              </h1>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Live availability, pricing and flyer-ready packages
              </p>
            </div>
          </Link>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link to="/hub">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
                Hub
              </Button>
            </Link>
            <Link to="/flyer">
              <Button variant="outline" size="sm">
                Flyer builder
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="space-y-4 p-3 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-md border bg-background p-1">
            {(["lots", "packages"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  tab === t
                    ? "bg-brand-navy text-brand-cream"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "lots" ? `Land lots (${lots.length})` : `Packages (${packages.length})`}
              </button>
            ))}
          </div>
          <Input
            className="h-9 w-full sm:max-w-xs"
            placeholder="Search estate, suburb, design…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {tab === "lots" && (
            <Select value={lotSort} onValueChange={(v) => setLotSort(v as typeof lotSort)}>
              <SelectTrigger className="h-9 w-[190px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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
              onClick={() => window.open("/browse/land", "_blank", "noopener")}
            >
              <FileDown className="h-4 w-4" /> Customer land PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open("/browse/packages", "_blank", "noopener")}
            >
              <FileDown className="h-4 w-4" /> Customer packages PDF
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
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-background p-3 text-sm">
            <span className="font-medium text-brand-navy">{selLots.length} lots selected</span>
            <Select
              onValueChange={(v) => void bulkLots({ status: v as Lot["status"] }, `set to ${v}`)}
            >
              <SelectTrigger className="h-8 w-[150px] text-xs">
                <SelectValue placeholder="Set status" />
              </SelectTrigger>
              <SelectContent>
                {LOT_STATUS.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {statusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              className="h-8 w-[170px] text-xs"
              value={bulkRegDate}
              onChange={(e) => setBulkRegDate(e.target.value)}
            />
            <Button
              size="sm"
              variant="outline"
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
              disabled={bulkBusy}
              onClick={() => void bulkLots({ titled: true, registration_date: null }, "registered")}
            >
              Mark registered
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelLots([])}>
              Clear
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="ml-auto"
              disabled={bulkBusy}
              onClick={() => void bulkDeleteLots()}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete selected
            </Button>
          </div>
        )}

        {tab === "packages" && selPkgs.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-background p-3 text-sm">
            <span className="font-medium text-brand-navy">{selPkgs.length} packages selected</span>
            <Select
              onValueChange={(v) => void bulkPkgs({ status: v as Pkg["status"] }, `set to ${v}`)}
            >
              <SelectTrigger className="h-8 w-[150px] text-xs">
                <SelectValue placeholder="Set status" />
              </SelectTrigger>
              <SelectContent>
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
              disabled={bulkBusy}
              onClick={() => void bulkPkgs({ needs_review: false }, "cleared for review")}
            >
              Clear price review flag
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelPkgs([])}>
              Clear
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="ml-auto"
              disabled={bulkBusy}
              onClick={() => void bulkDeletePkgs()}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete selected
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading database…
          </div>
        ) : tab === "lots" ? (
          <div className="overflow-x-auto rounded-lg border bg-background">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs tracking-wide text-muted-foreground">

                <tr>
                  <th className="p-3">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5"
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
                <tbody key={group.key} className="divide-y">
                  <tr
                    className="cursor-pointer bg-brand-navy/5"
                    onClick={() =>
                      setOpenSuburbs((prev) => toggle(prev, group.key))
                    }
                  >
                    <td colSpan={11} className="px-3 py-2.5">
                      <div className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
                        {isOpen(group.key) ? (
                          <ChevronDown className="h-4 w-4 shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0" />
                        )}
                        <span className="truncate">{titleCase(group.label)}</span>
                        <span className="text-xs font-normal text-muted-foreground">
                          {group.estates.length} estate{group.estates.length === 1 ? "" : "s"} ·{" "}
                          {group.count} lot{group.count === 1 ? "" : "s"}
                        </span>
                        <span className="ml-auto text-xs font-medium text-brand-gold">
                          {isOpen(group.key) ? "Hide" : "View"}
                        </span>
                      </div>
                    </td>
                  </tr>
                  {isOpen(group.key) &&
                    group.estates.map(({ estate, lots: groupLots }) => (
                      <Fragment key={estate}>
                        <tr className="bg-muted/40">
                          <td
                            colSpan={11}
                            className="px-3 py-2 pl-9 text-xs font-semibold text-brand-navy"
                          >
                            {titleCase(estate)}{" "}

                            <span className="ml-1 font-normal text-muted-foreground normal-case">
                              {groupLots.length} lot{groupLots.length === 1 ? "" : "s"}
                            </span>
                          </td>
                        </tr>
                        {groupLots.map((l: Lot) => (

                  <tr key={l.id} className="align-top">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5"
                        checked={selLots.includes(l.id)}
                        onChange={() => setSelLots((prev) => toggle(prev, l.id))}
                      />
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-brand-navy">{titleCase(l.estate)}</div>
                      <div className="text-xs text-muted-foreground">{titleCase(l.suburb)}</div>
                    </td>
                    <td className="p-3">
                      <div>{l.lot_number || "—"}</div>
                      <div className="text-xs text-muted-foreground">{titleCase(l.address)}</div>

                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {l.land_size ? `${l.land_size} m²` : "—"}
                      <div className="text-xs text-muted-foreground">
                        {l.frontage ? `${l.frontage} m frontage` : ""}
                      </div>
                    </td>
                    <td className="p-3 whitespace-nowrap">{money(l.land_price)}</td>
                    <td className="p-3">
                      <div>{l.developer || "—"}</div>
                      <div className="text-xs text-muted-foreground">
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
                          className={`h-8 w-[130px] text-xs font-medium capitalize ${statusTone(l.status)}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LOT_STATUS.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize">
                              {statusLabel(s)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {l.status === "nhc_exclusive" && (
                        <div className="mt-1 text-[11px] text-violet-700">
                          {(l.exclusive_consultants ?? [])
                            .map((id) => CONSULTANTS.find((c) => c.id === id)?.name ?? id)
                            .join(", ") || "No consultant assigned"}
                        </div>
                      )}
                    </td>
                      <td className="p-3 text-xs whitespace-nowrap">
                        <div>
                          {l.titled
                            ? "Registered"
                            : l.registration_date
                              ? `Expected ${l.registration_date}`
                              : "Registration TBC"}
                        </div>
                      </td>

                      <td className="p-3 text-xs whitespace-nowrap">
                        <div>{lastUpdated(l.updated_at).rel}</div>
                        <div className="text-muted-foreground">
                          {lastUpdated(l.updated_at).exact}
                        </div>
                      </td>

                      <td className="p-3">
                        {(packagesByLot.get(l.id)?.length ?? 0) > 0 ? (
                          <Select
                            onValueChange={(id) => {
                              const pkg = packages.find((item) => item.id === id);
                              if (!pkg) return;
                              openInFlyer(
                                pkg.flyer_data && typeof pkg.flyer_data === "object"
                                  ? (pkg.flyer_data as Record<string, unknown>)
                                  : {},
                              );
                            }}
                          >
                            <SelectTrigger className="h-8 w-[170px] text-xs">
                              <SelectValue placeholder={`${packagesByLot.get(l.id)?.length ?? 0} package${packagesByLot.get(l.id)?.length === 1 ? "" : "s"}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {packagesByLot.get(l.id)?.map((pkg) => (
                                <SelectItem key={pkg.id} value={pkg.id}>
                                  {pkg.name || pkg.design || "Untitled package"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-muted-foreground">None yet</span>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
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
                            <FileDown className="h-3.5 w-3.5" /> Flyer
                          </Button>
                          <LotDialog
                            lot={l}
                            onSaved={load}
                            trigger={
                              <Button size="icon" variant="ghost">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            }
                          />
                          <Button size="icon" variant="ghost" onClick={() => removeLot(l.id)}>
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
          <div className="overflow-x-auto rounded-lg border bg-background">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs tracking-wide text-muted-foreground">
                <tr>
                  <th className="p-3">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5"
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
              <tbody className="divide-y">
                {filteredPackages.map((p) => {
                  const lot = p.lot_id ? lotById.get(p.lot_id) : undefined;
                  return (
                    <tr key={p.id} className="align-top">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5"
                          checked={selPkgs.includes(p.id)}
                          onChange={() => setSelPkgs((prev) => toggle(prev, p.id))}
                        />
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-brand-navy">
                          {titleCase(p.name || p.design) || "Untitled"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {[titleCase(p.facade_name), titleCase(p.range_id)]
                            .filter(Boolean)
                            .join(" · ")}
                          {p.needs_review && (
                            <span className="ml-2 text-amber-700">Price Needs Review</span>

                          )}
                        </div>
                      </td>
                      <td className="p-3 text-xs">
                        {lot ? `${titleCase(lot.estate)} · ${titleCase(lot.suburb)}` : "—"}
                      </td>

                      <td className="p-3 text-xs whitespace-nowrap">
                        {[p.beds, p.baths, p.cars].filter(Boolean).join(" / ") || "—"}
                      </td>
                      <td className="p-3 whitespace-nowrap">{money(p.house_price)}</td>
                      <td className="p-3 whitespace-nowrap">{money(p.land_price)}</td>
                      <td className="p-3 font-medium whitespace-nowrap">{money(p.total_price)}</td>
                      <td className="p-3">
                        <Select
                          value={p.status}
                          onValueChange={(v) => updatePkg(p.id, { status: v as Pkg["status"] })}
                        >
                          <SelectTrigger
                            className={`h-8 w-[110px] text-xs font-medium capitalize ${statusTone(p.status)}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PKG_STATUS.map((s) => (
                              <SelectItem key={s} value={s} className="capitalize">
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3 text-xs whitespace-nowrap">
                        <div>{lastUpdated(p.updated_at).rel}</div>
                        <div className="text-muted-foreground">
                          {lastUpdated(p.updated_at).exact}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              openInFlyer({
                                ...(p.flyer_data && typeof p.flyer_data === "object"
                                  ? (p.flyer_data as Record<string, unknown>)
                                  : {}),
                              })
                            }
                          >
                            <FileDown className="h-3.5 w-3.5" /> Flyer
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => removePkg(p.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filteredPackages.length && (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-sm text-muted-foreground">
                      No packages saved yet — build one in the flyer studio and save it here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          <StatusPill value="available" /> lots are sellable today. Everything here is shared — any
          signed-in Hudson user can update it.
        </p>
      </main>
    </div>
  );
}
