import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  KNOWN_STAFF_PROFILES,
  type StaffProfile,
  setActiveStaffUser,
} from "@/lib/authSession";
import {
  User,
  ShieldCheck,
  Building,
  CheckCircle2,
  Lock,
  Sparkles,
  MapPin,
  Phone,
  Mail,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/flyer/FlyerTemplates";

interface StaffSignInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignedIn?: (user: StaffProfile) => void;
  canDismiss?: boolean;
}

export function StaffSignInModal({
  open,
  onOpenChange,
  onSignedIn,
  canDismiss = true,
}: StaffSignInModalProps) {
  const [selectedProfileId, setSelectedProfileId] = useState<string>("jesse-jenkins");
  const [rememberMe, setRememberMe] = useState(true);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customEmail, setCustomEmail] = useState("");
  const [customPhone, setCustomPhone] = useState("");
  const [customOffice, setCustomOffice] = useState("Queensland Division");

  const handleSelectAndSignIn = (profile: StaffProfile) => {
    setActiveStaffUser(profile, rememberMe);
    toast.success(`✨ Welcome, ${profile.name}!`, {
      description: `Website tailored to ${profile.displayCentre} and your active estimates.`,
    });
    if (onSignedIn) onSignedIn(profile);
    onOpenChange(false);
  };

  const handleCustomSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = customEmail.trim().toLowerCase();
    if (!cleanEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    const name = customName.trim() || cleanEmail.split("@")[0];
    const newProfile: StaffProfile = {
      id: cleanEmail.replace(/[^a-zA-Z0-9]/g, "-"),
      name,
      email: cleanEmail,
      phone: customPhone.trim() || "0400 000 000",
      title: "New Home Consultant",
      displayCentre: customOffice.trim() || "Queensland Division",
      role: "nhc",
      avatarInitials: name.slice(0, 2).toUpperCase(),
      accentColor: "from-blue-500 to-indigo-600",
    };

    setActiveStaffUser(newProfile, rememberMe);
    toast.success(`✨ Welcome, ${name}!`);
    if (onSignedIn) onSignedIn(newProfile);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (canDismiss || !v) {
          onOpenChange(v);
        }
      }}
    >
      <DialogContent
        className="w-full max-w-2xl bg-slate-950 border border-slate-800 text-slate-100 p-0 overflow-hidden shadow-2xl rounded-3xl"
        onPointerDownOutside={(e) => {
          if (!canDismiss) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (!canDismiss) e.preventDefault();
        }}
      >
        {/* Ambient Top Glow */}
        <div className="relative p-6 sm:p-8 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border-b border-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Logo light size={11} />
              <div className="border-l border-slate-800 pl-3">
                <span className="text-xs font-black tracking-widest text-white uppercase block">
                  Staff &amp; NHC Portal
                </span>
                <span className="text-[10px] tracking-widest text-amber-400 font-bold uppercase block">
                  Hudson Homes Queensland
                </span>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Zero Surprises OS</span>
            </div>
          </div>

          <div className="mt-5 space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Sign In to Your Workspace
            </h2>
            <p className="text-xs text-slate-400">
              Select your profile to automatically load your saved estimates, contact details on quotes, and tender submissions:
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {!isCustomMode ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {KNOWN_STAFF_PROFILES.map((p) => {
                  const isSelected = selectedProfileId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectAndSignIn(p)}
                      className={`relative p-4 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between hover:scale-[1.02] ${
                        isSelected
                          ? "bg-slate-900 border-amber-500/60 shadow-lg shadow-amber-500/10"
                          : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`h-11 w-11 rounded-xl bg-gradient-to-br ${p.accentColor} flex items-center justify-center text-white font-black text-sm flex-none shadow-md`}
                        >
                          {p.avatarInitials}
                        </div>
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                              {p.name}
                            </h3>
                            <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-amber-400 transition-transform group-hover:translate-x-1" />
                          </div>
                          <span className="text-[11px] text-amber-400/90 font-medium block truncate">
                            {p.displayCentre}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate font-mono">
                            {p.email}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10.5px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-slate-500" />
                          {p.phone}
                        </span>
                        <span className="text-cyan-400 font-semibold group-hover:underline">
                          Sign In &rarr;
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Custom NHC Login Option */}
              <div className="pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCustomMode(true)}
                  className="w-full text-xs text-slate-400 hover:text-white border border-dashed border-slate-800 hover:border-slate-700 h-9"
                >
                  <User className="h-3.5 w-3.5 mr-1.5 text-cyan-400" />
                  Sign in with another @hudsonhomes.com.au email
                </Button>
              </div>
            </div>
          ) : (
            /* Custom Email / Name Form */
            <form onSubmit={handleCustomSignIn} className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300 font-bold">Your Full Name:</Label>
                  <Input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Sarah Connor"
                    required
                    className="border-slate-800 bg-slate-900 text-xs text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300 font-bold">Hudson Email Address:</Label>
                  <Input
                    type="email"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="name@hudsonhomes.com.au"
                    required
                    className="border-slate-800 bg-slate-900 text-xs text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300 font-bold">Mobile Phone:</Label>
                  <Input
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                    placeholder="0400 000 000"
                    className="border-slate-800 bg-slate-900 text-xs text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300 font-bold">Display Centre / Office:</Label>
                  <Input
                    value={customOffice}
                    onChange={(e) => setCustomOffice(e.target.value)}
                    placeholder="e.g. Coomera Display Home"
                    className="border-slate-800 bg-slate-900 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCustomMode(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  &larr; Back to NHC List
                </Button>
                <Button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-1.5 shadow-md"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Sign In &amp; Tailor Workspace
                </Button>
              </div>
            </form>
          )}

          {/* Remember Me Checkbox & Notice */}
          <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500/40"
              />
              <span className="text-slate-300 font-medium">
                Remember my details on this device for future visits
              </span>
            </label>

            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Lock className="h-3 w-3" /> Secure local profile storage
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
