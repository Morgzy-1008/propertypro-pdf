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
        <Button size="sm" variant="outline">
          <Contact className="h-4 w-4" /> Developer contacts
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Developer Contacts</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Saved automatically whenever you add or import lots. Edit here and every future import
          for that developer picks up these details.
        </p>
        {busy && !rows.length && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="grid grid-cols-1 gap-2 rounded border p-3 sm:grid-cols-9">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[11px] text-muted-foreground">Developer</Label>
                <Input value={r.name} onChange={(e) => patch(r.id, "name", e.target.value)} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[11px] text-muted-foreground">Contact</Label>
                <Input
                  value={r.contact_name ?? ""}
                  onChange={(e) => patch(r.id, "contact_name", e.target.value)}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[11px] text-muted-foreground">Phone</Label>
                <Input
                  value={r.contact_phone ?? ""}
                  onChange={(e) => patch(r.id, "contact_phone", e.target.value)}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[11px] text-muted-foreground">Email</Label>
                <Input
                  value={r.contact_email ?? ""}
                  onChange={(e) => patch(r.id, "contact_email", e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button variant="ghost" size="icon" onClick={() => void remove(r.id)}>
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </div>
          ))}
          {!rows.length && !busy && (
            <p className="text-sm text-muted-foreground">No developers saved yet.</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void addBlank()}>
            <Plus className="h-4 w-4" /> Add developer
          </Button>
          <Button onClick={() => void saveAll()} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
