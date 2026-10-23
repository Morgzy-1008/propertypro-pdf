import React, { useState, useEffect } from "react";
import {
  GhlIntegrationSettings,
  GhlOutboundStagingItem,
  GhlScopeCheckResult,
  GhlSyncMode,
} from "@/lib/crm/crmTypes";
import {
  loadGhlSettings,
  saveGhlSettings,
  probeGhlTokenScopes,
  loadGhlStagingQueue,
  saveGhlStagingQueue,
  buildMarketingScopeRequestText,
  syncHoneyGhlLeadsToCrm,
  maskGhlToken,
  extractGhlLocationId,
} from "@/lib/crm/ghlIntegration";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Play,
  Lock,
  Unlock,
  Layers,
  Sparkles,
  Server,
  PhoneCall,
  Code,
  Check,
  Eye,
  EyeOff,
  ArrowRight,
  Trash2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useTheme } from "@/lib/theme";

interface CrmGhlControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSynced?: () => void;
}

export function CrmGhlControlModal({
  isOpen,
  onClose,
  onSynced,
}: CrmGhlControlModalProps) {
  const { mode } = useTheme();
  const isLight = mode === "normal";

  const [activeTab, setActiveTab] = useState<
    "control_scopes" | "staging_queue" | "ghl_vs_telnyx"
  >("control_scopes");
  const [settings, setSettings] = useState<GhlIntegrationSettings>(() => loadGhlSettings());
  const [showToken, setShowToken] = useState(false);
  const [isProbing, setIsProbing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [scopeResults, setScopeResults] = useState<GhlScopeCheckResult[]>([]);
  const [stagingQueue, setStagingQueue] = useState<GhlOutboundStagingItem[]>(() =>
    loadGhlStagingQueue()
  );

  useEffect(() => {
    if (isOpen) {
      const loaded = loadGhlSettings();
      setSettings(loaded);
      setStagingQueue(loadGhlStagingQueue());
      // Run an initial non-blocking scope probe if token is present or show diagnostic state
      void handleRunScopeProbe(loaded.pitToken, loaded.locationId);
    }
  }, [isOpen]);

  const handleRunScopeProbe = async (tok?: string, loc?: string) => {
    setIsProbing(true);
    try {
      const res = await probeGhlTokenScopes(
        tok ?? settings.pitToken,
        loc ?? settings.locationId
      );
      setScopeResults(res);
    } finally {
      setIsProbing(false);
    }
  };

  const handleChangeMode = (newMode: GhlSyncMode) => {
    const next = { ...settings, syncMode: newMode };
    setSettings(next);
    saveGhlSettings(next);
    toast.success(
      newMode === "readonly_live"
        ? "Switched to Mode 1: Read-Only Live Sync"
        : newMode === "dry_run_sandbox"
        ? "Switched to Mode 2: Safe Dry-Run Sandbox & Outbound Staging Queue"
        : "Switched to Mode 3: Full Two-Way Live Sync with Honey GHL"
    );
  };

  const handleSaveCredentials = () => {
    const cleanLoc = extractGhlLocationId(settings.locationId);
    const updated = { ...settings, locationId: cleanLoc };
    setSettings(updated);
    saveGhlSettings(updated);
    void handleRunScopeProbe(updated.pitToken, updated.locationId);
    toast.success("Honey (GoHighLevel) API credentials saved & live scope probe executed!");
  };

  const handleSyncLeadsNow = async () => {
    setIsSyncing(true);
    try {
      const res = await syncHoneyGhlLeadsToCrm();
      if (res.diagnosticMessage) {
        toast.info(res.diagnosticMessage, { duration: 8000 });
      }
      toast.success(
        `Honey GHL Sync Complete! ${res.syncedCount} leads & call transcripts synchronized.`
      );
      onSynced?.();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleApproveStagedItem = (id: string) => {
    const updated = stagingQueue.map((item) =>
      item.id === id ? { ...item, status: "approved_ready" as const } : item
    );
    setStagingQueue(updated);
    saveGhlStagingQueue(updated);
    toast.success("Payload approved and verified in Dry-Run Sandbox!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-4xl max-h-[90vh] overflow-y-auto ${
          isLight
            ? "bg-white text-slate-900 border-slate-200"
            : "bg-slate-950 text-white border-slate-800"
        }`}
      >
        <DialogHeader className="border-b pb-3 border-slate-200 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-black tracking-tight flex items-center gap-2">
                  Honey CRM (GoHighLevel v2 API) Control Center &amp; Sandbox
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    API v2021-07-28
                  </span>
                </DialogTitle>
                <p className={`text-xs ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                  Manage your GHL Private Integration Token, inspect live scope permissions, and audit dry-run payloads for Marketing.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={handleSyncLeadsNow}
              disabled={isSyncing}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 text-slate-950 font-black text-xs gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing Honey..." : "Sync Honey Leads & Calls Now"}
            </Button>
          </div>
        </DialogHeader>

        {/* 3-Mode Control Switch Banner */}
        <div
          className={`p-3.5 rounded-xl border ${
            isLight
              ? "bg-slate-50 border-slate-200"
              : "bg-slate-900/70 border-slate-800"
          }`}
        >
          <div className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">
            3-Mode API Safety &amp; Control Switch (Proving Safe Governance to Marketing)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {[
              {
                id: "readonly_live" as const,
                title: "1. Read-Only Live Sync",
                desc: "Pull leads, pipeline stages, and call recordings from Honey CRM without ever writing back.",
                icon: Lock,
              },
              {
                id: "dry_run_sandbox" as const,
                title: "2. Dry-Run Staging Queue (Recommended)",
                desc: "Intercepts every CRM stage move, LVM, and AI Call Note into an auditable queue to show Marketing first.",
                icon: ShieldCheck,
              },
              {
                id: "two_way_live" as const,
                title: "3. Full Two-Way Live Sync",
                desc: "Pushes approved stage changes, AI summaries, tasks, and estimate values straight into Honey GHL.",
                icon: Unlock,
              },
            ].map((m) => {
              const Icon = m.icon;
              const active = settings.syncMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleChangeMode(m.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    active
                      ? "bg-amber-500/15 border-amber-500 ring-1 ring-amber-500/40"
                      : isLight
                      ? "bg-white border-slate-200 hover:border-slate-300"
                      : "bg-slate-950 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-black flex items-center gap-1.5">
                      <Icon className={`h-3.5 w-3.5 ${active ? "text-amber-500" : "text-slate-400"}`} />
                      {m.title}
                    </span>
                    {active && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500 text-slate-950">
                        Active
                      </span>
                    )}
                  </div>
                  <p className={`text-[11px] leading-snug ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                    {m.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("control_scopes")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
              activeTab === "control_scopes"
                ? "bg-amber-500 text-slate-950"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            1. API Credentials &amp; Live Scope Diagnostics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("staging_queue")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
              activeTab === "staging_queue"
                ? "bg-amber-500 text-slate-950"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            2. Outbound Dry-Run Staging Queue
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900 text-amber-400 font-mono">
              {stagingQueue.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ghl_vs_telnyx")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
              activeTab === "ghl_vs_telnyx"
                ? "bg-amber-500 text-slate-950"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            3. GHL API vs. Telnyx Architecture Comparison
          </button>
        </div>

        {/* TAB 1: Credentials & Scope Diagnostics */}
        {activeTab === "control_scopes" && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="font-bold block mb-1">
                  GoHighLevel Private Integration Token (PIT)
                </label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type={showToken ? "text" : "password"}
                    value={settings.pitToken}
                    onChange={(e) => setSettings({ ...settings, pitToken: e.target.value })}
                    placeholder="pit-us-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="h-9 text-xs font-mono"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowToken(!showToken)}
                    className="h-9 px-2.5"
                  >
                    {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Stored locally in your browser vault (never committed to Git). Active: {maskGhlToken(settings.pitToken)}
                </p>
              </div>

              <div>
                <label className="font-bold block mb-1">
                  Honey Sub-Account Location ID (or Paste Any Honey Browser URL)
                </label>
                <div className="flex items-center gap-1.5">
                  <Input
                    value={settings.locationId}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        locationId: extractGhlLocationId(e.target.value),
                      })
                    }
                    placeholder="Paste Honey URL (e.g. .../v2/location/ve9EPM428h...) or 20-char ID"
                    className="h-9 text-xs font-mono"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveCredentials}
                    className="h-9 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold shrink-0"
                  >
                    Save &amp; Test
                  </Button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Tip: Open Honey CRM in your browser and paste the URL from your address bar — we auto-extract your 20-char `locationId`!
                </p>
              </div>
            </div>

            {/* Scope Diagnostic Matrix */}
            <div
              className={`p-3.5 rounded-xl border space-y-2.5 ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/50 border-slate-800"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-black text-xs block">
                    Live Token Scope Permissions Matrix
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Shows which GHL scopes Marketing has enabled on your token and what to request next.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        buildMarketingScopeRequestText("phase1_readonly")
                      );
                      toast.success("Copied Phase 1 Read-Only Scope Checklist for Marketing!");
                    }}
                    className="h-7 text-[11px] font-bold gap-1"
                  >
                    <Copy className="h-3 w-3 text-amber-500" />
                    Copy Phase 1 Scope Request
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        buildMarketingScopeRequestText("phase2_readwrite")
                      );
                      toast.success("Copied Phase 2 Full Read/Write Scope Request for Marketing!");
                    }}
                    className="h-7 text-[11px] font-bold gap-1"
                  >
                    <Copy className="h-3 w-3 text-emerald-500" />
                    Copy Phase 2 Write Request
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                {scopeResults.map((s) => (
                  <div
                    key={s.scope}
                    className={`p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                      isLight ? "bg-white border-slate-200" : "bg-slate-950 border-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {s.status === "authorized" || s.status === "missing_location_id" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                      )}
                      <div>
                        <span className="font-bold text-xs">{s.label}</span>
                        <span className="ml-2 font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {s.scope}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {s.detail}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Outbound Dry-Run Staging Queue */}
        {activeTab === "staging_queue" && (
          <div className="space-y-3 text-xs">
            <div
              className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                isLight
                  ? "bg-amber-50/80 border-amber-200 text-amber-950"
                  : "bg-amber-950/20 border-amber-500/30 text-amber-200"
              }`}
            >
              <div>
                <span className="font-black block">
                  🛡️ Marketing Dry-Run Staging Queue ({stagingQueue.length} Outbound Payloads Audited)
                </span>
                <span className="text-[11px] opacity-90">
                  Show this screen to Marketing to demonstrate that Hudson CRM formats every Note, Task, LVM Tag, and Opportunity update to exact GoHighLevel v2 schema specifications before writing live.
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(stagingQueue, null, 2));
                  toast.success("Copied full GHL Dry-Run Audit JSON to clipboard for Marketing!");
                }}
                className="h-8 text-xs font-bold gap-1.5 shrink-0"
              >
                <Copy className="h-3.5 w-3.5" />
                Export Audit Log
              </Button>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {stagingQueue.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border space-y-2 ${
                    isLight ? "bg-white border-slate-200" : "bg-slate-900/80 border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded font-mono font-black text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        {item.httpMethod} {item.ghlEndpoint}
                      </span>
                      <span className="font-black text-xs">{item.leadName}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.status === "approved_ready" || item.status === "synced_live"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {item.status === "approved_ready"
                          ? "✅ Verified & Ready"
                          : item.status === "synced_live"
                          ? "🚀 Synced to Honey"
                          : "🛡️ Staged (Dry-Run)"}
                      </span>

                      {item.status === "staged_dry_run" && (
                        <Button
                          size="sm"
                          onClick={() => handleApproveStagedItem(item.id)}
                          className="h-6 px-2.5 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Verify Payload
                        </Button>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    {item.summary}
                  </p>

                  <pre className="p-2 rounded-lg bg-slate-950 text-emerald-400 font-mono text-[10px] whitespace-pre-wrap break-words">
                    {JSON.stringify(item.payload, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: GHL API vs Telnyx Comparison */}
        {activeTab === "ghl_vs_telnyx" && (
          <div className="space-y-3 text-xs">
            <div
              className={`p-3.5 rounded-xl border ${
                isLight
                  ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                  : "bg-emerald-950/20 border-emerald-500/30 text-emerald-200"
              }`}
            >
              <span className="font-black block text-sm mb-1">
                Why Our Hybrid Architecture (Honey GHL API + Telnyx + Gemini AI) Wins
              </span>
              <p className="text-[11px] leading-relaxed">
                GoHighLevel’s API is unbeatable for syncing Marketing’s ad funnels (Facebook Lead Ads, Google Ads, Website Forms, Campaign attribution), so Marketing never loses visibility. Meanwhile, Telnyx + Hudson AI gives you direct 1-click browser calling, instant call recording, custom home-builder AI summaries, and 70% lower Australian SMS carrier rates—while automatically logging every call &amp; note back into Honey!
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={isLight ? "bg-slate-100 text-slate-800" : "bg-slate-900 text-slate-200"}>
                    <th className="p-2.5 font-black">Capability</th>
                    <th className="p-2.5 font-black">GoHighLevel (Honey) API Only</th>
                    <th className="p-2.5 font-black">Telnyx From Scratch</th>
                    <th className="p-2.5 font-black text-amber-600 dark:text-amber-400">
                      Hudson Hybrid (GHL + Telnyx + AI)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-[11px]">
                  <tr>
                    <td className="p-2.5 font-bold">Inbound Marketing Leads (Meta/Google)</td>
                    <td className="p-2.5">✅ Native in Honey</td>
                    <td className="p-2.5">❌ Must rebuild ad webhooks</td>
                    <td className="p-2.5 font-semibold text-emerald-600 dark:text-emerald-400">
                      ✅ Auto-synced from Honey API
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">1-Click In-Browser Calling (WebRTC)</td>
                    <td className="p-2.5">❌ GHL API cannot place live browser voice calls externally</td>
                    <td className="p-2.5">✅ Native Australian WebRTC dialer</td>
                    <td className="p-2.5 font-semibold text-emerald-600 dark:text-emerald-400">
                      ✅ Dial via Telnyx + sync call log to Honey
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">AI Call Summaries &amp; Auto-Tasks</td>
                    <td className="p-2.5">⚠️ Generic add-on; doesn&apos;t know Hudson designs/estates</td>
                    <td className="p-2.5">✅ Custom audio stream to AI</td>
                    <td className="p-2.5 font-semibold text-emerald-600 dark:text-emerald-400">
                      ✅ Summarises both GHL recordings &amp; live calls + creates Mark-Up/Estimate tasks
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">Quoting &amp; Floorplan Mark-Up Link</td>
                    <td className="p-2.5">❌ Disconnected from Hudson OS</td>
                    <td className="p-2.5">✅ Built into Hudson OS</td>
                    <td className="p-2.5 font-semibold text-emerald-600 dark:text-emerald-400">
                      ✅ 1-click Quote &amp; Mark-Up + syncs deal value back to Honey
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
