import React, { useState } from "react";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Home,
  DollarSign,
  Users,
  Building,
  Check,
  Sparkles,
  UserPlus,
  X,
  FileText,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CrmLead,
  CrmStageId,
  CRM_PIPELINE_STAGES,
  HUDSON_CONSULTANTS,
} from "@/lib/crm/crmTypes";
import { saveCrmLead } from "@/lib/crm/crmStorage";
import { toast } from "sonner";

interface CrmNewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultConsultantId?: string;
  onCreated: (lead: CrmLead) => void;
}

export function CrmNewClientModal({
  isOpen,
  onClose,
  defaultConsultantId = "morgan_hales",
  onCreated,
}: CrmNewClientModalProps) {
  // Client 1
  const [client1FirstName, setClient1FirstName] = useState("");
  const [client1LastName, setClient1LastName] = useState("");
  const [client1Phone, setClient1Phone] = useState("");
  const [client1Email, setClient1Email] = useState("");

  // Client 2 (Optional)
  const [hasClient2, setHasClient2] = useState(false);
  const [client2Name, setClient2Name] = useState("");
  const [client2Phone, setClient2Phone] = useState("");
  const [client2Email, setClient2Email] = useState("");

  // Land & Property
  const [targetEstate, setTargetEstate] = useState("");
  const [suburb, setSuburb] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [landStatus, setLandStatus] = useState<CrmLead["landStatus"]>("Looking for Land");
  const [landBudget, setLandBudget] = useState<number>(320000);

  // Build Spec
  const [housingType, setHousingType] = useState<CrmLead["housingType"]>("Single Storey");
  const [preferredDesign, setPreferredDesign] = useState("");
  const [facadeName, setFacadeName] = useState("Classic");
  const [totalEstimatedDealValue, setTotalEstimatedDealValue] = useState<number>(460000);

  // Workflow & Assignment
  const [stage, setStage] = useState<CrmStageId>("new_lead");
  const [assignedConsultantId, setAssignedConsultantId] = useState(defaultConsultantId);
  const [leadSource, setLeadSource] = useState<CrmLead["leadSource"]>("Display Home Kiosk");
  const [notes, setNotes] = useState("");

  const handleReset = () => {
    setClient1FirstName("");
    setClient1LastName("");
    setClient1Phone("");
    setClient1Email("");
    setHasClient2(false);
    setClient2Name("");
    setClient2Phone("");
    setClient2Email("");
    setTargetEstate("");
    setSuburb("");
    setLotNumber("");
    setLandStatus("Looking for Land");
    setLandBudget(320000);
    setHousingType("Single Storey");
    setPreferredDesign("");
    setFacadeName("Classic");
    setTotalEstimatedDealValue(460000);
    setStage("new_lead");
    setAssignedConsultantId(defaultConsultantId);
    setLeadSource("Display Home Kiosk");
    setNotes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fullName = `${client1FirstName} ${client1LastName}`.trim();
    if (!fullName) {
      toast.error("Please enter the client's name.");
      return;
    }

    const consultant = HUDSON_CONSULTANTS.find((c) => c.id === assignedConsultantId) || HUDSON_CONSULTANTS[0];

    const newLead: CrmLead = {
      id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      clientName: fullName,
      email: client1Email.trim(),
      mobile: client1Phone.trim(),
      secondaryCustomerName: hasClient2 && client2Name.trim() ? client2Name.trim() : undefined,
      secondaryCustomerMobile: hasClient2 && client2Phone.trim() ? client2Phone.trim() : undefined,
      secondaryCustomerEmail: hasClient2 && client2Email.trim() ? client2Email.trim() : undefined,
      targetEstate: targetEstate.trim() || "Unspecified Estate",
      suburb: suburb.trim() || "Queensland",
      lotNumber: lotNumber.trim() || "TBA",
      landStatus,
      landBudget: Number(landBudget) || 0,
      preferredDesign: preferredDesign.trim() || "Standard Hudson Design",
      facadeName: facadeName.trim() || "Classic",
      housingType,
      totalEstimatedDealValue: Number(totalEstimatedDealValue) || 450000,
      stage,
      assignedConsultantId,
      leadSource,
      notes: notes.trim() || `New client registered by ${consultant.name}.`,
      isAtpSigned: stage === "tender_accepted" || stage === "contract_signed" || stage === "under_construction",
      atpFeePaid: stage === "tender_accepted" || stage === "contract_signed" || stage === "under_construction",
      isContractSigned: stage === "contract_signed" || stage === "under_construction",
      contractDepositPaid: stage === "contract_signed" || stage === "under_construction",
      clientNotes: [
        {
          id: `note_${Date.now()}`,
          author: consultant.name,
          content: notes.trim() || "Client added to Hudson Horizon CRM.",
          createdAt: new Date().toISOString(),
        },
      ],
      tasks: [
        {
          id: `task_${Date.now()}`,
          title: `Initial consultation & requirement qualification for ${fullName}`,
          dueDate: "Tomorrow",
          completed: false,
          createdAt: new Date().toISOString(),
        },
      ],
      activities: [
        {
          id: `act_${Date.now()}`,
          type: "status_change",
          title: `Client Registered (${CRM_PIPELINE_STAGES.find(s => s.id === stage)?.shortLabel})`,
          description: `New lead added by ${consultant.name}.`,
          timestamp: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastContactedAt: new Date().toISOString(),
    };

    await saveCrmLead(newLead);
    toast.success(`Successfully added ${fullName} to CRM!`);
    onCreated(newLead);
    handleReset();
    onClose();
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
              <UserPlus className="h-5 w-5 text-amber-400" />
              Add New Client &bull; Hudson Horizon CRM
            </DialogTitle>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Register a new client record, assign a sales consultant, and place them into the active 12-stage sales pipeline.
          </p>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* SECTION 1: PRIMARY CLIENT */}
          <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
              <User className="h-4 w-4" />
              Primary Client (Applicant 1)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">First Name *</Label>
                <Input
                  required
                  value={client1FirstName}
                  onChange={(e) => setClient1FirstName(e.target.value)}
                  placeholder="e.g. Jordan"
                  className="h-9 text-xs border-slate-800 bg-slate-950 text-white font-medium"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Last Name *</Label>
                <Input
                  required
                  value={client1LastName}
                  onChange={(e) => setClient1LastName(e.target.value)}
                  placeholder="e.g. Hales"
                  className="h-9 text-xs border-slate-800 bg-slate-950 text-white font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Mobile Phone</Label>
                <Input
                  type="tel"
                  value={client1Phone}
                  onChange={(e) => setClient1Phone(e.target.value)}
                  placeholder="e.g. 0412 888 999"
                  className="h-9 text-xs border-slate-800 bg-slate-950 text-white font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Email Address</Label>
                <Input
                  type="email"
                  value={client1Email}
                  onChange={(e) => setClient1Email(e.target.value)}
                  placeholder="e.g. jordan.hales@gmail.com"
                  className="h-9 text-xs border-slate-800 bg-slate-950 text-white"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: 2ND CLIENT / CO-BUYER (OPTIONAL) */}
          <div className="space-y-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
                <Users className="h-4 w-4" />
                Secondary Client / Partner (Applicant 2)
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setHasClient2(!hasClient2)}
                className="h-7 text-xs border-slate-700 bg-slate-800 text-slate-300 hover:text-white gap-1"
              >
                {hasClient2 ? "Remove 2nd Client" : "+ Add 2nd Client / Partner"}
              </Button>
            </div>

            {hasClient2 && (
              <div className="pt-2 border-t border-slate-800/80 space-y-3 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-300">Full Name (Partner / Co-Buyer)</Label>
                  <Input
                    value={client2Name}
                    onChange={(e) => setClient2Name(e.target.value)}
                    placeholder="e.g. Sarah Mitchell"
                    className="h-9 text-xs border-slate-800 bg-slate-950 text-white"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-300">Mobile Phone</Label>
                    <Input
                      type="tel"
                      value={client2Phone}
                      onChange={(e) => setClient2Phone(e.target.value)}
                      placeholder="e.g. 0417 555 124"
                      className="h-9 text-xs border-slate-800 bg-slate-950 text-white font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-300">Email Address</Label>
                    <Input
                      type="email"
                      value={client2Email}
                      onChange={(e) => setClient2Email(e.target.value)}
                      placeholder="e.g. sarah.mitchell@gmail.com"
                      className="h-9 text-xs border-slate-800 bg-slate-950 text-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: LAND & PROPERTY LOCATION */}
          <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <MapPin className="h-4 w-4" />
              Land &amp; Property Information
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Target Estate</Label>
                <Input
                  value={targetEstate}
                  onChange={(e) => setTargetEstate(e.target.value)}
                  placeholder="e.g. Providence / Flagstone"
                  className="h-9 text-xs border-slate-800 bg-slate-950 text-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Suburb</Label>
                <Input
                  value={suburb}
                  onChange={(e) => setSuburb(e.target.value)}
                  placeholder="e.g. South Ripley"
                  className="h-9 text-xs border-slate-800 bg-slate-950 text-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Lot Number</Label>
                <Input
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                  placeholder="e.g. Lot 719"
                  className="h-9 text-xs border-slate-800 bg-slate-950 text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Land Status</Label>
                <Select value={landStatus} onValueChange={(v: any) => setLandStatus(v)}>
                  <SelectTrigger className="h-9 border-slate-800 bg-slate-950 text-xs text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                    <SelectItem value="Have Land (Registered)">Have Land (Registered)</SelectItem>
                    <SelectItem value="Land Under Contract (Unregistered)">Land Under Contract (Unregistered)</SelectItem>
                    <SelectItem value="Looking for Land">Looking for Land</SelectItem>
                    <SelectItem value="Knockdown Rebuild (KDRB)">Knockdown Rebuild (KDRB)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Land Budget ($)</Label>
                <Input
                  type="number"
                  value={landBudget || ""}
                  onChange={(e) => setLandBudget(Number(e.target.value) || 0)}
                  placeholder="320000"
                  className="h-9 text-xs border-slate-800 bg-slate-950 text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: BUILD SPECIFICATION & DEAL VALUE */}
          <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400">
              <Home className="h-4 w-4" />
              Home Design &amp; Investment Estimate
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Housing Type</Label>
                <Select value={housingType} onValueChange={(v: any) => setHousingType(v)}>
                  <SelectTrigger className="h-9 border-slate-800 bg-slate-950 text-xs text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                    <SelectItem value="Single Storey">Single Storey</SelectItem>
                    <SelectItem value="Double Storey">Double Storey</SelectItem>
                    <SelectItem value="Split Level">Split Level</SelectItem>
                    <SelectItem value="Dual Living">Dual Living / Duplex</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Preferred Design</Label>
                <Input
                  value={preferredDesign}
                  onChange={(e) => setPreferredDesign(e.target.value)}
                  placeholder="e.g. Amber 21 / Jasper 26"
                  className="h-9 text-xs border-slate-800 bg-slate-950 text-white"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Preferred Facade</Label>
                <Input
                  value={facadeName}
                  onChange={(e) => setFacadeName(e.target.value)}
                  placeholder="e.g. Classic / Hamptons"
                  className="h-9 text-xs border-slate-800 bg-slate-950 text-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Estimated Total Deal Value ($)</Label>
              <Input
                type="number"
                value={totalEstimatedDealValue || ""}
                onChange={(e) => setTotalEstimatedDealValue(Number(e.target.value) || 0)}
                placeholder="465000"
                className="h-9 text-xs border-slate-800 bg-slate-950 text-emerald-400 font-bold font-mono"
              />
            </div>
          </div>

          {/* SECTION 5: PIPELINE STAGE & ASSIGNMENT */}
          <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-yellow-400">
              <Building className="h-4 w-4" />
              Sales Assignment &amp; Pipeline Bucket
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Pipeline Stage</Label>
                <Select value={stage} onValueChange={(v: any) => setStage(v)}>
                  <SelectTrigger className="h-9 border-slate-800 bg-slate-950 text-xs text-slate-200 font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-800 bg-slate-900 text-slate-200 max-h-64">
                    {CRM_PIPELINE_STAGES.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Assigned Consultant</Label>
                <Select value={assignedConsultantId} onValueChange={setAssignedConsultantId}>
                  <SelectTrigger className="h-9 border-slate-800 bg-slate-950 text-xs text-slate-200 font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                    {HUDSON_CONSULTANTS.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.name} ({c.displayOffice})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Lead Source</Label>
                <Select value={leadSource} onValueChange={(v: any) => setLeadSource(v)}>
                  <SelectTrigger className="h-9 border-slate-800 bg-slate-950 text-xs text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                    <SelectItem value="Display Home Kiosk">Display Home Kiosk</SelectItem>
                    <SelectItem value="Phone Walk-in">Phone Walk-in</SelectItem>
                    <SelectItem value="Website Inquiry">Website Inquiry</SelectItem>
                    <SelectItem value="Referral">Referral</SelectItem>
                    <SelectItem value="Developer Land Partner">Developer Land Partner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Consultant Notes &amp; Special Requirements</Label>
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Met at Flagstone display home. Client loves Amber 21 layout, looking for 400m2 lot."
                className="text-xs border-slate-800 bg-slate-950 text-slate-100 resize-none"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs gap-1.5 px-6 shadow-lg shadow-amber-500/20"
            >
              <Check className="h-4 w-4" />
              Save &amp; Add Client to CRM
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
