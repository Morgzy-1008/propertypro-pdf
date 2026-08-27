import React, { useState } from "react";
import {
  Sparkles,
  Send,
  Home,
  CheckCircle2,
  Phone,
  Mail,
  User,
  MapPin,
  DollarSign,
  Heart,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { saveCrmLead } from "@/lib/crm/crmStorage";
import { CrmLead } from "@/lib/crm/crmTypes";
import { Logo } from "@/components/flyer/FlyerTemplates";

export function CrmDisplayKiosk() {
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [storeys, setStoreys] = useState<"Single Storey" | "Double Storey" | "Dual Living">("Single Storey");
  const [landStatus, setLandStatus] = useState<any>("Looking for Land");
  const [targetSuburb, setTargetSuburb] = useState("South Ripley / Ipswich");
  const [budgetRange, setBudgetRange] = useState("450000");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !mobile) {
      toast.error("Please enter your name and mobile number.");
      return;
    }

    setIsSubmitting(true);
    try {
      const newLead: CrmLead = {
        id: `kiosk_lead_${Date.now()}`,
        clientName: `${firstName} ${surname}`.trim(),
        email: email || `${firstName.toLowerCase()}@guest.hudsonhomes.com.au`,
        mobile: mobile,
        targetEstate: targetSuburb,
        suburb: targetSuburb.split("/")[0]?.trim() || "South Ripley",
        lotNumber: "TBA",
        landStatus: landStatus,
        landBudget: 300000,
        preferredDesign: storeys === "Single Storey" ? "Amber 21" : "Jasper 26",
        facadeName: "Hampton Executive",
        housingType: storeys,
        totalEstimatedDealValue: parseFloat(budgetRange) || 475000,
        stage: "display_walkin",
        assignedConsultantId: "morgan_hales",
        leadSource: "Display Home Kiosk",
        notes: `Registered at Springfield Central Display Village iPad Kiosk. Looking for ${storeys} in ${targetSuburb}.`,
        isAtpSigned: false,
        atpFeePaid: false,
        isContractSigned: false,
        contractDepositPaid: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastContactedAt: new Date().toISOString(),
      };

      await saveCrmLead(newLead);
      setSubmitted(true);
      toast.success("Thank you! Your dream home brochure pack has been queued.");
    } catch {
      toast.error("Failed to register. Please speak to our consultant.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFirstName("");
    setSurname("");
    setMobile("");
    setEmail("");
    setSubmitted(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-amber-500/30 p-4 sm:p-8 relative overflow-hidden">
      {/* Background Glow Lights */}
      <div className="ambient-glow-gold h-96 w-96 -top-20 -right-20 pointer-events-none" />
      <div className="ambient-glow-cyan h-96 w-96 -bottom-20 -left-20 pointer-events-none" />

      {/* Top Header */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Logo light size={12} />
          <div className="border-l border-slate-800 pl-3">
            <span className="text-xs font-bold tracking-widest text-white uppercase block">
              Springfield Central Display Village
            </span>
            <span className="text-[10px] tracking-widest text-amber-400 font-bold uppercase">
              Dream Home Touch Kiosk
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Consultant on Duty: Morgan Hales</span>
        </div>
      </header>

      {/* Main Kiosk Card */}
      <main className="max-w-2xl mx-auto w-full my-auto py-8">
        {submitted ? (
          <div className="p-8 rounded-3xl border border-emerald-500/40 bg-slate-900/90 backdrop-blur-2xl text-center space-y-5 shadow-2xl animate-fade-in">
            <div className="h-16 w-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-black text-white">
              Welcome to the Hudson Family, {firstName}!
            </h2>
            <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              We've created your personal home package file. Your digital inclusions brochure and price list are being prepared.
            </p>
            <div className="pt-4 border-t border-slate-800 flex justify-center">
              <Button
                size="lg"
                onClick={handleReset}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm px-8"
              >
                Register Another Visitor
              </Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="p-8 rounded-3xl border border-slate-800 bg-slate-900/90 backdrop-blur-2xl shadow-2xl space-y-6"
          >
            <div className="text-center space-y-1">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Discover Your Dream Home
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Register below to receive instant pricing, floorplans, and inclusion brochures directly to your phone.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-slate-300">First Name *</Label>
                  <Input
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Jordan"
                    className="border-slate-800 bg-slate-950 text-sm h-11 mt-1 font-semibold text-white"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-300">Last Name *</Label>
                  <Input
                    required
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    placeholder="e.g. Hales"
                    className="border-slate-800 bg-slate-950 text-sm h-11 mt-1 font-semibold text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-slate-300">Mobile Phone *</Label>
                  <Input
                    required
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="e.g. 0412 888 999"
                    className="border-slate-800 bg-slate-950 text-sm h-11 mt-1 font-mono text-cyan-300 font-bold"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-300">Email Address</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. jordan.hales@gmail.com"
                    className="border-slate-800 bg-slate-950 text-sm h-11 mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <Label className="text-xs text-slate-300">Storeys</Label>
                  <Select value={storeys} onValueChange={(v: any) => setStoreys(v)}>
                    <SelectTrigger className="border-slate-800 bg-slate-950 text-xs h-10 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-slate-800 bg-slate-950 text-slate-100">
                      <SelectItem value="Single Storey">Single Storey</SelectItem>
                      <SelectItem value="Double Storey">Double Storey</SelectItem>
                      <SelectItem value="Dual Living">Dual Living / Duplex</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-slate-300">Land Status</Label>
                  <Select value={landStatus} onValueChange={(v: any) => setLandStatus(v)}>
                    <SelectTrigger className="border-slate-800 bg-slate-950 text-xs h-10 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-slate-800 bg-slate-950 text-slate-100">
                      <SelectItem value="Have Land (Registered)">Have Land (Registered)</SelectItem>
                      <SelectItem value="Land Under Contract (Unregistered)">Land Under Contract</SelectItem>
                      <SelectItem value="Looking for Land">Looking for Land</SelectItem>
                      <SelectItem value="Knockdown Rebuild (KDRB)">Knockdown Rebuild</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-slate-300">Target Location</Label>
                  <Input
                    value={targetSuburb}
                    onChange={(e) => setTargetSuburb(e.target.value)}
                    className="border-slate-800 bg-slate-950 text-xs h-10 mt-1"
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-sm h-12 shadow-xl shadow-amber-500/20 gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {isSubmitting ? "Registering…" : "Get Instant Floorplans & Price List"}
            </Button>
          </form>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto w-full text-center text-[11px] text-slate-500 border-t border-slate-900 pt-3">
        Hudson Homes Queensland &bull; Zero Surprises &bull; Hudson Horizon Integrated System
      </footer>
    </div>
  );
}
