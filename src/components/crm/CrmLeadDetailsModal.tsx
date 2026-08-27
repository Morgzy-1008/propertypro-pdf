import React, { useState } from "react";
import {
  CrmLead,
  CRM_PIPELINE_STAGES,
  CrmStageId,
  HUDSON_CONSULTANTS,
} from "@/lib/crm/crmTypes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Phone,
  Mail,
  MapPin,
  Home,
  Layers,
  Send,
  Sliders,
  DollarSign,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { calculateDealCommission } from "@/lib/commission/commissionCalculator";
import { useNavigate } from "@tanstack/react-router";

interface CrmLeadDetailsModalProps {
  lead: CrmLead | null;
  open: boolean;
  onClose: () => void;
  onSaveLead: (updated: CrmLead) => void;
}

export function CrmLeadDetailsModal({
  lead,
  open,
  onClose,
  onSaveLead,
}: CrmLeadDetailsModalProps) {
  const navigate = useNavigate();
  if (!lead) return null;

  const [formData, setFormData] = useState<CrmLead>({ ...lead });
  const comms = calculateDealCommission(formData);

  const formatAud = (val: number) =>
    new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(val);

  const handleSave = () => {
    onSaveLead(formData);
    toast.success(`Client ${formData.clientName} updated successfully.`);
    onClose();
  };

  const handleLaunchQuote = () => {
    navigate({ to: "/quote-builder" });
  };

  const handleLaunchTender = () => {
    navigate({ to: "/tender-request" });
  };

  const handleLaunchFloorplan = () => {
    navigate({ to: "/floorplan-editor" });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="border-slate-800 bg-slate-950 text-slate-100 sm:max-w-3xl max-h-[90vh] overflow-y-auto font-sans p-6">
        <DialogHeader className="border-b border-slate-800 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl font-black text-white">
                  {formData.clientName}
                </DialogTitle>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-800/60">
                  {formData.leadSource}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                360° Client Profile &bull; Stage: {CRM_PIPELINE_STAGES.find((s) => s.id === formData.stage)?.label}
              </p>
            </div>

            {/* Quick Stage Selector */}
            <div className="min-w-[200px]">
              <Select
                value={formData.stage}
                onValueChange={(val: CrmStageId) => setFormData({ ...formData, stage: val })}
              >
                <SelectTrigger className="border-slate-800 bg-slate-900 text-xs font-bold text-cyan-400">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-800 bg-slate-950 text-slate-100">
                  {CRM_PIPELINE_STAGES.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogHeader>

        {/* Portal Quick Action Launch Bar */}
        <div className="flex flex-wrap items-center gap-2 py-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLaunchQuote}
            className="border-emerald-500/40 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/50 text-xs font-bold gap-1.5"
          >
            <Layers className="h-3.5 w-3.5 text-emerald-400" />
            Open Quoting Tool
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleLaunchTender}
            className="border-amber-500/40 bg-amber-950/30 text-amber-300 hover:bg-amber-900/50 text-xs font-bold gap-1.5"
          >
            <Send className="h-3.5 w-3.5 text-amber-400" />
            Open Tender Portal
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleLaunchFloorplan}
            className="border-cyan-500/40 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/50 text-xs font-bold gap-1.5"
          >
            <Sliders className="h-3.5 w-3.5 text-cyan-400" />
            Foresight Concept Editor
          </Button>
        </div>

        {/* Commission & Deal Value Highlight Card */}
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 shadow-lg grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Total Contract Deal Value</span>
            <span className="text-xl font-black text-white font-mono mt-0.5 block">
              {formatAud(formData.totalEstimatedDealValue)}
            </span>
          </div>

          <div>
            <span className="text-amber-400 font-bold block text-[11px]">Consultant Commission (2.25%)</span>
            <span className="text-xl font-black text-amber-300 font-mono mt-0.5 block">
              {formatAud(comms.grossCommission)}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">50/50 Payout Status</span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${comms.tranche1Eligible ? "bg-emerald-950 text-emerald-300 border border-emerald-800" : "bg-slate-900 text-slate-400 border border-slate-800"}`}>
                T1: {comms.tranche1Eligible ? "Paid ($" + formatAud(comms.tranche1Amount) + ")" : "Pending"}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${comms.tranche2Eligible ? "bg-emerald-950 text-emerald-300 border border-emerald-800" : "bg-slate-900 text-slate-400 border border-slate-800"}`}>
                T2: {comms.tranche2Eligible ? "Paid ($" + formatAud(comms.tranche2Amount) + ")" : "Pending"}
              </span>
            </div>
          </div>
        </div>

        {/* Client & Land Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Contact Details */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block border-b border-slate-800 pb-1">
              Purchaser Details
            </span>
            <div>
              <Label className="text-[11px] text-slate-400">Full Name</Label>
              <Input
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                className="border-slate-800 bg-slate-950 text-xs mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] text-slate-400">Mobile</Label>
                <Input
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="border-slate-800 bg-slate-950 text-xs mt-1 font-mono"
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-400">Email</Label>
                <Input
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="border-slate-800 bg-slate-950 text-xs mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-[11px] text-slate-400">Assigned Consultant</Label>
              <Select
                value={formData.assignedConsultantId}
                onValueChange={(val) => setFormData({ ...formData, assignedConsultantId: val })}
              >
                <SelectTrigger className="border-slate-800 bg-slate-950 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-800 bg-slate-950 text-slate-100">
                  {HUDSON_CONSULTANTS.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Land & Home Spec */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 block border-b border-slate-800 pb-1">
              Land &amp; Design Spec
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] text-slate-400">Target Estate</Label>
                <Input
                  value={formData.targetEstate}
                  onChange={(e) => setFormData({ ...formData, targetEstate: e.target.value })}
                  className="border-slate-800 bg-slate-950 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-400">Lot Number</Label>
                <Input
                  value={formData.lotNumber}
                  onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })}
                  className="border-slate-800 bg-slate-950 text-xs mt-1 font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] text-slate-400">Preferred Design</Label>
                <Input
                  value={formData.preferredDesign}
                  onChange={(e) => setFormData({ ...formData, preferredDesign: e.target.value })}
                  className="border-slate-800 bg-slate-950 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-400">Facade</Label>
                <Input
                  value={formData.facadeName}
                  onChange={(e) => setFormData({ ...formData, facadeName: e.target.value })}
                  className="border-slate-800 bg-slate-950 text-xs mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-[11px] text-slate-400">Estimated Deal Value ($)</Label>
              <Input
                type="number"
                value={formData.totalEstimatedDealValue}
                onChange={(e) =>
                  setFormData({ ...formData, totalEstimatedDealValue: parseFloat(e.target.value) || 0 })
                }
                className="border-slate-800 bg-slate-950 text-xs mt-1 font-mono font-bold text-emerald-400"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <Label className="text-[11px] text-slate-300">Consultant Notes &amp; History</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="border-slate-800 bg-slate-900 text-xs mt-1"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs text-slate-400">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-1.5 shadow-md shadow-amber-500/20"
          >
            <CheckCircle2 className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
