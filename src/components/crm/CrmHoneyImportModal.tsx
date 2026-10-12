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
  Copy,
  ExternalLink,
  Code,
  Download,
  Bookmark,
  ShieldCheck,
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
import { useTheme } from "@/lib/theme";

interface CrmHoneyImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (allLeads: CrmLead[]) => void;
}

const HONEY_CONSOLE_SNIPPET = `// === HONEY CRM 1-CLICK CONTACT EXTRACTOR ===
(function() {
  const extracted = [];
  // Target tables, cards, and grid rows in Honey CRM
  const rows = document.querySelectorAll('tr, .contact-card, .client-card, .client-row, div[role="row"]');
  rows.forEach((row, i) => {
    const text = row.innerText || '';
    if (!text.trim()) return;
    const lines = text.split(/\\n+/).map(s => s.trim()).filter(Boolean);
    const phoneMatch = text.match(/(04\\d{2}\\s?\\d{3}\\s?\\d{3}|\\+61\\d{9}|04\\d{8})/);
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/);
    let name = lines[0] || '';
    if (name.length > 50 || name.toLowerCase().includes('name') || name.toLowerCase().includes('client')) {
      name = lines[1] || 'Honey Client ' + (i + 1);
    }
    if (name && (phoneMatch || emailMatch || lines.length >= 2)) {
      extracted.push({
        clientName: name,
        mobile: phoneMatch ? phoneMatch[0] : '',
        email: emailMatch ? emailMatch[0] : '',
        notes: 'Exported from Honey CRM table view',
        stage: 'walk_ins',
        targetEstate: 'Queensland / NSW',
      });
    }
  });

  const jsonStr = JSON.stringify(extracted, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'honey_crm_clients.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  if (typeof copy === 'function') copy(jsonStr);
  alert('Successfully extracted ' + extracted.length + ' clients from Honey!\\nDownloaded honey_crm_clients.json and copied to clipboard.');
})();`;

export function CrmHoneyImportModal({
  isOpen,
  onClose,
  onImportComplete,
}: CrmHoneyImportModalProps) {
  const { mode } = useTheme();
  const isLight = mode === "normal";

  const [activeTab, setActiveTab] = useState<"extractor" | "paste" | "upload">("extractor");
  const [rawText, setRawText] = useState("");
  const [selectedConsultantId, setSelectedConsultantId] = useState("morgan_hales");
  const [parsedContacts, setParsedContacts] = useState<Partial<CrmLead>[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const parseCsvOrJson = (text: string) => {
    if (!text || text.trim() === "") {
      setParsedContacts([]);
      return;
    }

    // Try parsing as JSON first
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        setParsedContacts(parsed);
        return;
      }
    } catch {
      // not JSON, fallback to CSV/TSV
    }

    const lines = text.trim().split(/\r?\n/);
    if (lines.length === 0) return;

    const firstLine = lines[0];
    const isTab = firstLine.includes("\t");
    const delimiter = isTab ? "\t" : ",";

    const headers = lines[0]
      .split(delimiter)
      .map((h) => h.trim().replace(/^["']|["']$/g, "").toLowerCase());

    const records: Partial<CrmLead>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

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
        }
      });

      if (!name && (firstName || lastName)) {
        name = `${firstName} ${lastName}`.trim();
      }

      if (!name && cols[0]) {
        name = cols[0];
      }

      if (name) {
        records.push({
          clientName: name,
          mobile,
          email,
          targetEstate: estate || "Unspecified Estate",
          suburb: suburb || "Queensland",
          lotNumber: lotNumber || "TBA",
          landStatus,
          preferredDesign: design || "Standard Hudson Design",
          totalEstimatedDealValue: budget,
          notes: notes || "Imported from Honey CRM CSV",
          stage,
        });
      }
    }

    setParsedContacts(records);
  };

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(HONEY_CONSOLE_SNIPPET);
    toast.success("Honey Extractor script copied! Paste in Honey browser console (F12).");
  };

  const handleLoadSampleHoneyData = () => {
    const sample: Partial<CrmLead>[] = [
      {
        clientName: "David & Sarah Henderson",
        mobile: "0418 552 110",
        email: "d.henderson@auspost.com.au",
        targetEstate: "Flagstone Rise",
        suburb: "Flagstone",
        lotNumber: "512",
        preferredDesign: "Ashton 23",
        totalEstimatedDealValue: 478000,
        notes: "Imported from Honey CRM - visited Flagstone display Saturday",
        stage: "walk_ins",
      },
      {
        clientName: "Michael & Karen O'Connor",
        mobile: "0429 883 911",
        email: "m.oconnor@brisbanelaw.com.au",
        targetEstate: "Bahrs Scrub Vista",
        suburb: "Bahrs Scrub",
        lotNumber: "84",
        preferredDesign: "Allure 32",
        totalEstimatedDealValue: 695000,
        notes: "Imported from Honey CRM - interested in double storey Hampton",
        stage: "concept_plan",
      },
      {
        clientName: "Anthony Russo",
        mobile: "0401 773 228",
        email: "anthony.russo@sydneycorp.com",
        targetEstate: "Box Hill",
        suburb: "Box Hill",
        lotNumber: "29",
        preferredDesign: "Cambridge 28",
        totalEstimatedDealValue: 590000,
        notes: "Imported from Honey CRM - comparing builder quotes",
        stage: "estimate_presented",
      },
    ];

    setParsedContacts(sample);
    setRawText(JSON.stringify(sample, null, 2));
    setActiveTab("paste");
    toast.success("Loaded 3 sample Honey CRM contacts!");
  };

  const handleExecuteImport = async () => {
    if (parsedContacts.length === 0) {
      toast.error("No valid contacts found to import.");
      return;
    }

    setIsProcessing(true);
    try {
      const { addedCount, allLeads } = await importHoneyContacts(
        parsedContacts,
        selectedConsultantId
      );

      toast.success(`Successfully imported ${addedCount} contacts from Honey CRM! ✓`);
      onImportComplete(allLeads);
      onClose();
    } catch (err: any) {
      toast.error(`Error importing contacts: ${err?.message || "Unknown error"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-3xl p-0 overflow-hidden ${
        isLight ? "bg-white text-slate-900 border-slate-200" : "bg-slate-950 text-white border-slate-800"
      }`}>
        <DialogHeader className={`p-4 border-b ${
          isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900 border-slate-800"
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-black tracking-tight">
                Import Contacts from Honey CRM
              </DialogTitle>
              <p className={`text-xs ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                Can&apos;t export natively from Honey? Use our 1-click browser extractor, bookmarklet, or drop CSV/JSON files.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Switcher */}
        <div className={`flex border-b px-4 gap-2 pt-2 ${
          isLight ? "border-slate-200 bg-slate-50" : "border-slate-800 bg-slate-950"
        }`}>
          <button
            type="button"
            onClick={() => setActiveTab("extractor")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all ${
              activeTab === "extractor"
                ? "border-amber-500 text-amber-500"
                : isLight
                ? "border-transparent text-slate-600 hover:text-slate-900"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            ⚡ 1-Click Honey Browser Extractor
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("paste")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all ${
              activeTab === "paste"
                ? "border-amber-500 text-amber-500"
                : isLight
                ? "border-transparent text-slate-600 hover:text-slate-900"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Code className="h-3.5 w-3.5" />
            Paste JSON / CSV
          </button>
        </div>

        {/* Tab 1: 1-Click Browser Extractor */}
        {activeTab === "extractor" && (
          <div className="p-4 sm:p-5 space-y-4 text-xs">
            <div className={`p-4 rounded-xl border space-y-2.5 ${
              isLight ? "bg-amber-50 border-amber-200 text-amber-950" : "bg-amber-950/20 border-amber-800/50 text-amber-200"
            }`}>
              <span className="font-bold flex items-center gap-1.5 text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                <Sparkles className="h-4 w-4" /> How to Extract from Honey with 1 Click:
              </span>
              <ol className="list-decimal list-inside space-y-1.5 leading-relaxed text-[11px] opacity-90">
                <li>Log in to your <strong>Honey CRM</strong> in Google Chrome where your client list is open.</li>
                <li>Press <kbd className="px-1.5 py-0.5 rounded bg-black/20 font-mono font-bold">F12</kbd> (or right click anywhere &rarr; <em>Inspect</em> &rarr; click <strong>Console</strong>).</li>
                <li>Click the <strong>Copy 1-Click Script</strong> button below, paste into the console, and press <kbd className="px-1.5 py-0.5 rounded bg-black/20 font-mono font-bold">Enter</kbd>.</li>
                <li>The script automatically reads the visible clients and downloads <code>honey_crm_clients.json</code> while copying to your clipboard!</li>
                <li>Switch back here, click <strong>Paste JSON</strong>, and your whole client list is in Hudson CRM!</li>
              </ol>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={handleCopySnippet}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-1.5 shadow-md"
              >
                <Copy className="h-3.5 w-3.5" /> Copy 1-Click Honey Extractor Script
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleLoadSampleHoneyData}
                className="text-xs border-slate-700 text-slate-300 hover:text-white"
              >
                Load Sample Honey Export (3 Clients)
              </Button>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-1 font-semibold">
                Or drag this bookmarklet to your Chrome bookmarks bar:
              </span>
              <a
                href={`javascript:${encodeURIComponent(HONEY_CONSOLE_SNIPPET)}`}
                onClick={(e) => {
                  e.preventDefault();
                  toast.info("Drag this button to your Bookmarks bar in Chrome to use as a 1-click extractor in Honey CRM!");
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-amber-500/40 text-amber-400 font-bold text-xs hover:bg-slate-800 cursor-grab"
              >
                <Bookmark className="h-3.5 w-3.5 text-amber-500" />
                📦 Drag to Bookmarks: &quot;Export Honey CRM&quot;
              </a>
            </div>
          </div>
        )}

        {/* Tab 2: Paste JSON / CSV */}
        {activeTab === "paste" && (
          <div className="p-4 sm:p-5 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <Label className="text-slate-400">Paste Honey Export (JSON or CSV)</Label>
              {parsedContacts.length > 0 && (
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  {parsedContacts.length} Contacts Ready to Import
                </span>
              )}
            </div>

            <Textarea
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                parseCsvOrJson(e.target.value);
              }}
              rows={8}
              placeholder="Paste your copied honey_crm_clients.json or CSV contents here..."
              className={`text-xs font-mono ${
                isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-emerald-300"
              }`}
            />

            {/* Preview of Parsed Contacts */}
            {parsedContacts.length > 0 && (
              <div className="max-h-36 overflow-y-auto space-y-1 p-2 rounded-lg border border-slate-800 bg-slate-900/40">
                {parsedContacts.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] text-slate-300 py-0.5 border-b border-slate-800/40 last:border-0">
                    <span className="font-bold">{c.clientName}</span>
                    <span>{c.mobile || "No Mobile"}</span>
                    <span>{c.preferredDesign || "Hudson Home"}</span>
                    <span className="text-amber-400 font-mono">${((c.totalEstimatedDealValue || 450000) / 1000).toFixed(0)}k</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className={`p-4 border-t flex items-center justify-between ${
          isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900 border-slate-800"
        }`}>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Assign leads to:</span>
            <select
              value={selectedConsultantId}
              onChange={(e) => setSelectedConsultantId(e.target.value)}
              className={`h-8 rounded-lg border px-2 text-xs ${
                isLight ? "bg-white border-slate-300" : "bg-slate-950 border-slate-700 text-white"
              }`}
            >
              {HUDSON_CONSULTANTS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.displayOffice})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteImport}
              disabled={parsedContacts.length === 0 || isProcessing}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-1.5 shadow-md"
            >
              <Upload className="h-3.5 w-3.5" />
              {isProcessing ? "Importing..." : `Import ${parsedContacts.length} Contacts`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
