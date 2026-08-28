import React, { useState } from "react";
import {
  Upload,
  FileSpreadsheet,
  Check,
  Sparkles,
  AlertCircle,
  Users,
  CheckCircle2,
  FileText,
  UserCheck,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CrmLead, HUDSON_CONSULTANTS } from "@/lib/crm/crmTypes";
import { importHoneyContacts } from "@/lib/crm/crmStorage";
import { toast } from "sonner";

interface CrmHoneyImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (allLeads: CrmLead[]) => void;
}

export function CrmHoneyImportModal({
  isOpen,
  onClose,
  onImportComplete,
}: CrmHoneyImportModalProps) {
  const [rawText, setRawText] = useState("");
  const [selectedConsultantId, setSelectedConsultantId] = useState("morgan_hales");
  const [parsedContacts, setParsedContacts] = useState<Partial<CrmLead>[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const parseCsvOrTsv = (text: string) => {
    if (!text || text.trim() === "") {
      setParsedContacts([]);
      return;
    }

    const lines = text.trim().split(/\r?\n/);
    if (lines.length === 0) return;

    // Detect delimiter (comma or tab)
    const firstLine = lines[0];
    const isTab = firstLine.includes("\t");
    const delimiter = isTab ? "\t" : ",";

    // Header row mapping
    const headers = lines[0]
      .split(delimiter)
      .map((h) => h.trim().replace(/^["']|["']$/g, "").toLowerCase());

    const records: Partial<CrmLead>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle simple CSV splitting or tab splitting
      const cols = line.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ""));
      if (cols.length === 0 || cols.every((c) => !c)) continue;

      let name = "";
      let firstName = "";
      let lastName = "";
      let mobile = "";
      let email = "";
      let estate = "";
      let suburb = "";
      let lotNumber = "";
      let landStatus: CrmLead["landStatus"] = "Looking for Land";
      let design = "";
      let budget = 450000;
      let notes = "";
      let stage: any = "new_lead";

      headers.forEach((h, colIdx) => {
        const val = cols[colIdx] || "";
        if (!val) return;

        if (h.includes("first") && (h.includes("name") || h.includes("client"))) {
          firstName = val;
        } else if (h.includes("last") && (h.includes("name") || h.includes("client"))) {
          lastName = val;
        } else if (h.includes("name") || h.includes("client") || h.includes("contact") || h.includes("lead")) {
          if (!name) name = val;
        } else if (h.includes("phone") || h.includes("mobile") || h.includes("cell")) {
          mobile = val;
        } else if (h.includes("email") || h.includes("mail")) {
          email = val;
        } else if (h.includes("estate") || h.includes("development") || h.includes("project")) {
          estate = val;
        } else if (h.includes("suburb") || h.includes("city") || h.includes("town")) {
          suburb = val;
        } else if (h.includes("lot") || h.includes("unit")) {
          lotNumber = val;
        } else if (h.includes("design") || h.includes("plan") || h.includes("house")) {
          design = val;
        } else if (h.includes("budget") || h.includes("value") || h.includes("price")) {
          const num = parseFloat(val.replace(/[^0-9.]/g, ""));
          if (!isNaN(num) && num > 0) budget = num;
        } else if (h.includes("note") || h.includes("comment") || h.includes("detail")) {
          notes = val;
        } else if (h.includes("stage") || h.includes("status") || h.includes("phase")) {
          const lower = val.toLowerCase();
          if (lower.includes("walk")) stage = "walk_ins";
          else if (lower.includes("concept") || lower.includes("plan")) stage = "concept_plan";
          else if (lower.includes("estimate") || lower.includes("quote")) stage = "estimate_presented";
          else if (lower.includes("tender req")) stage = "tender_requested";
          else if (lower.includes("tender rec")) stage = "tender_received";
          else if (lower.includes("tender acc") || lower.includes("atp")) stage = "tender_accepted";
          else if (lower.includes("contract") || lower.includes("signed")) stage = "contract_signed";
          else if (lower.includes("construct") || lower.includes("site") || lower.includes("build")) stage = "under_construction";
          else if (lower.includes("long") || lower.includes("future")) stage = "long_term";
          else if (lower.includes("no contact") || lower.includes("unresponsive")) stage = "no_contact";
          else if (lower.includes("lost") || lower.includes("cancel") || lower.includes("not proceed")) stage = "sale_not_proceeding";
        }
      });

      const finalName = name || `${firstName} ${lastName}`.trim();
      if (!finalName && !mobile && !email) continue;

      records.push({
        clientName: finalName || "Unnamed Contact",
        mobile: mobile || "N/A",
        email: email || "",
        targetEstate: estate || "Estate TBA",
        suburb: suburb || "Queensland",
        lotNumber: lotNumber || "TBA",
        landStatus,
        preferredDesign: design || "Standard Hudson Design",
        facadeName: "Classic",
        housingType: "Single Storey",
        totalEstimatedDealValue: budget,
        stage,
        assignedConsultantId: selectedConsultantId,
        leadSource: "Website Inquiry",
        notes: notes ? `[Honey CRM]: ${notes}` : "Imported from Honey CRM records.",
      });
    }

    setParsedContacts(records);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawText(text);
      parseCsvOrTsv(text);
    };
    reader.readAsText(file);
  };

  const handleTextChange = (val: string) => {
    setRawText(val);
    parseCsvOrTsv(val);
  };

  const handleConfirmImport = async () => {
    if (parsedContacts.length === 0) {
      toast.error("No valid contacts found to import. Please check your CSV format.");
      return;
    }

    setIsProcessing(true);
    try {
      const { addedCount, allLeads } = await importHoneyContacts(
        parsedContacts,
        selectedConsultantId
      );

      toast.success(`🎉 Successfully imported ${addedCount} contacts from Honey into CRM!`);
      onImportComplete(allLeads);
      onClose();
    } catch (err) {
      console.error("Honey import error:", err);
      toast.error("An error occurred during import. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        className="w-[95vw] max-w-3xl max-h-[92vh] p-0 flex flex-col bg-slate-950 text-slate-100 border border-slate-800 shadow-2xl overflow-hidden rounded-2xl"
      >
        {/* Header */}
        <DialogHeader className="p-5 border-b border-slate-800 bg-slate-900/80 flex-none">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-amber-400" />
              Import Contacts from Honey CRM
            </DialogTitle>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Bulk-import hundreds of saved contacts, phone numbers, and pipeline stages from your Honey export CSV into Hudson Horizon CRM.
          </p>
        </DialogHeader>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Consultant Assignment Selection */}
          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <Label className="text-xs font-bold text-slate-200 block">
                Assign Imported Leads To Consultant:
              </Label>
              <p className="text-[11px] text-slate-400 mt-0.5">
                All imported records will be assigned to this consultant account.
              </p>
            </div>
            <div className="min-w-[220px]">
              <Select value={selectedConsultantId} onValueChange={setSelectedConsultantId}>
                <SelectTrigger className="h-9 border-slate-800 bg-slate-950 text-xs font-bold text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-800 bg-slate-950 text-slate-100">
                  {HUDSON_CONSULTANTS.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name} ({c.displayOffice})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Upload Box & Raw Paste Area */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <label className="flex-1 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-slate-800 hover:border-amber-500/50 bg-slate-900/40 text-xs text-slate-300 font-semibold cursor-pointer transition-all">
                <input
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="h-4 w-4 text-amber-400" />
                <span>{fileName ? `Selected: ${fileName}` : "Upload Honey CSV / TSV File"}</span>
              </label>

              <span className="text-xs text-slate-500 font-bold uppercase">or</span>

              <span className="text-xs text-slate-400">
                Paste copied spreadsheet rows below
              </span>
            </div>

            <Textarea
              rows={4}
              value={rawText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Paste Honey export CSV rows here (Name, Phone, Email, Estate, Stage, Notes)..."
              className="text-xs font-mono border-slate-800 bg-slate-950 text-slate-200 resize-none"
            />
          </div>

          {/* Parsed Preview Table */}
          {parsedContacts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  {parsedContacts.length} Contacts Detected &amp; Ready to Import
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Showing first 10 of {parsedContacts.length}
                </span>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 bg-slate-900/90 text-[10px] uppercase font-bold text-slate-400 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Client Name</th>
                      <th className="py-2 px-3">Mobile Phone</th>
                      <th className="py-2 px-3">Email</th>
                      <th className="py-2 px-3">Estate / Suburb</th>
                      <th className="py-2 px-3">Target Stage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {parsedContacts.slice(0, 10).map((c, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40">
                        <td className="py-2 px-3 font-bold text-white font-sans">
                          {c.clientName}
                        </td>
                        <td className="py-2 px-3 text-slate-300">
                          {c.mobile}
                        </td>
                        <td className="py-2 px-3 text-slate-400">
                          {c.email || "—"}
                        </td>
                        <td className="py-2 px-3 text-slate-400 font-sans">
                          {c.targetEstate} ({c.suburb})
                        </td>
                        <td className="py-2 px-3">
                          <span className="bg-amber-950/60 text-amber-300 border border-amber-800/60 px-1.5 py-0.5 rounded text-[10px] uppercase">
                            {c.stage}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between flex-none">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white"
          >
            Cancel
          </Button>

          <Button
            disabled={parsedContacts.length === 0 || isProcessing}
            onClick={handleConfirmImport}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs gap-1.5 px-6 shadow-lg shadow-amber-500/20"
          >
            <Sparkles className="h-4 w-4" />
            {isProcessing
              ? "Importing Contacts..."
              : `Import All ${parsedContacts.length} Contacts into CRM`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
