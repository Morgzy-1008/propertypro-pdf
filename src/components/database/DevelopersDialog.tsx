import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Contact, Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { listDevelopers, type DeveloperContact } from "@/lib/developers";

/** Address book of developer contacts, reused whenever lots are added or imported. */
export function DevelopersDialog({ onSaved }: { onSaved?: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<DeveloperContact[]>([]);

  useEffect(() => {
    if (!open) return;
    setBusy(true);
    void listDevelopers().then((d) => {
      setRows(d);
      setBusy(false);
    });
  }, [open]);

  const patch = (id: string, key: keyof DeveloperContact, value: string) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)));

  const saveAll = async () => {
    setBusy(true);
    for (const r of rows) {
      const { error } = await supabase
        .from("developers")
        .update({
          name: r.name.trim(),
          contact_name: r.contact_name || null,
          contact_phone: r.contact_phone || null,
          contact_email: r.contact_email || null,
        })
        .eq("id", r.id);
      if (error) {
        setBusy(false);
        toast.error(error.message);
        return;
      }
    }
    setBusy(false);
    toast.success("Developer contacts saved");
    setOpen(false);
    onSaved?.();
  };

  const addBlank = async () => {
    const { data, error } = await supabase
      .from("developers")
      .insert({ name: "New Developer" })
      .select("*")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((p) => [...p, data as DeveloperContact]);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("developers").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((p) => p.filter((r) => r.id !== id));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white text-xs gap-1.5">
          <Contact className="h-3.5 w-3.5 text-cyan-400" /> Developer contacts
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl border-slate-800 bg-slate-950/95 text-slate-100 backdrop-blur-2xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-white font-bold tracking-wide">Developer Contacts</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-slate-400">
          Saved automatically whenever you add or import lots. Edit here and every future import
          for that developer picks up these details.
        </p>
        {busy && !rows.length && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin text-cyan-400" /> Loading…
          </div>
        )}
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="grid grid-cols-1 gap-2.5 rounded-xl border border-slate-800 bg-slate-900/80 p-3 sm:grid-cols-9 shadow-inner">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[11px] text-slate-400 font-medium">Developer</Label>
                <Input
                  value={r.name}
                  onChange={(e) => patch(r.id, "name", e.target.value)}
                  className="h-8 rounded-lg border-slate-800 bg-slate-950/70 text-xs text-slate-100 focus:border-cyan-500/60"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[11px] text-slate-400 font-medium">Contact</Label>
                <Input
                  value={r.contact_name ?? ""}
                  onChange={(e) => patch(r.id, "contact_name", e.target.value)}
                  className="h-8 rounded-lg border-slate-800 bg-slate-950/70 text-xs text-slate-100 focus:border-cyan-500/60"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[11px] text-slate-400 font-medium">Phone</Label>
                <Input
                  value={r.contact_phone ?? ""}
                  onChange={(e) => patch(r.id, "contact_phone", e.target.value)}
                  className="h-8 rounded-lg border-slate-800 bg-slate-950/70 text-xs text-slate-100 focus:border-cyan-500/60"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[11px] text-slate-400 font-medium">Email</Label>
                <Input
                  value={r.contact_email ?? ""}
                  onChange={(e) => patch(r.id, "contact_email", e.target.value)}
                  className="h-8 rounded-lg border-slate-800 bg-slate-950/70 text-xs text-slate-100 focus:border-cyan-500/60"
                />
              </div>
              <div className="flex items-end">
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10" onClick={() => void remove(r.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {!rows.length && !busy && (
            <p className="text-sm text-slate-400">No developers saved yet.</p>
          )}
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white text-xs gap-1.5" onClick={() => void addBlank()}>
            <Plus className="h-3.5 w-3.5" /> Add developer
          </Button>
          <Button onClick={() => void saveAll()} disabled={busy} className="bg-gradient-to-r from-amber-500 to-brand-gold text-slate-950 font-semibold hover:from-amber-400 text-xs">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
