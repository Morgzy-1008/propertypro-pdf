import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  KNOWN_STAFF_PROFILES,
  getActiveStaffUser,
  setActiveStaffUser,
  type StaffProfile,
} from "@/lib/authSession";
import { setActiveDivision } from "@/lib/divisionContext";
import { getApprovedStaffEmails } from "@/lib/access";
import {
  Users,
  Search,
  CheckCircle2,
  Building,
  Phone,
  Mail,
  Shield,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  Sparkles,
  MapPin,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

interface ProfileSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitched?: (profile: StaffProfile) => void;
}

export function ProfileSwitcherModal({
  isOpen,
  onClose,
  onSwitched,
}: ProfileSwitcherModalProps) {
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "qld" | "nsw" | "marketing" | "admin">("all");
  const activeUser = getActiveStaffUser();

  // Combine KNOWN_STAFF_PROFILES with any newly approved dynamic staff emails
  const approvedEmails = getApprovedStaffEmails();
  const allProfiles: StaffProfile[] = [...KNOWN_STAFF_PROFILES];

  // Append any approved emails not already present
  approvedEmails.forEach((email) => {
    const clean = email.trim().toLowerCase();
    const alreadyExists = allProfiles.some((p) => p.email.toLowerCase() === clean);
    if (!alreadyExists) {
      const rawName = clean.split("@")[0].replace(/[._-]/g, " ");
      const name = rawName.replace(/\b\w/g, (c) => c.toUpperCase());
      allProfiles.push({
        id: clean.replace(/[^a-zA-Z0-9]/g, "-"),
        name,
        email: clean,
        phone: "0400 000 000",
        title: "New Home Consultant",
        displayCentre: "Hudson Homes",
        division: "QLD",
        state: "QLD",
        role: "nhc",
        avatarInitials: name.slice(0, 2).toUpperCase(),
        accentColor: "from-amber-500 to-amber-700",
      });
    }
  });

  const filtered = allProfiles.filter((p) => {
    // Tab filter
    if (filterTab === "qld" && p.division !== "QLD" && p.state !== "QLD") return false;
    if (filterTab === "nsw" && p.division !== "NSW" && p.state !== "NSW") return false;
    if (filterTab === "marketing" && p.role !== "marketing") return false;
    if (filterTab === "admin" && p.role !== "admin") return false;

    // Search query
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.title.toLowerCase().includes(q) ||
      p.displayCentre.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      (p.division || "").toLowerCase().includes(q) ||
      (p.state || "").toLowerCase().includes(q)
    );
  });

  const handleSwitch = (profile: StaffProfile) => {
    try {
      if (typeof window !== "undefined") {
        // Always store Morgan as the admin impersonator so switching back is always guaranteed
        sessionStorage.setItem("hudson_admin_impersonator", "morgan.hales@hudsonhomes.com.au");
        localStorage.setItem("hudson_admin_impersonator", "morgan.hales@hudsonhomes.com.au");
        try {
          sessionStorage.setItem(
            "hudson_login_toast",
            JSON.stringify({ name: profile.name, type: "switched", title: profile.title })
          );
        } catch {}
      }

      // Persist active staff profile
      setActiveStaffUser(profile, true);

      // Synchronize division context (QLD vs NSW)
      const targetDiv = profile.division || (profile.state === "NSW" ? "NSW" : "QLD");
      setActiveDivision(targetDiv);
      if (typeof window !== "undefined") {
        localStorage.setItem("hudson_active_division", targetDiv);
      }

      toast.success(`Switched login view to ${profile.name}`, {
        description: `Now previewing as ${profile.title} (${profile.displayCentre}).`,
      });

      if (onSwitched) onSwitched(profile);
      onClose();

      const path = typeof window !== "undefined" ? window.location.pathname : "/hub";
      const isRestrictedForMarketing =
        path.includes("quote") ||
        path.includes("crm") ||
        path.includes("tender") ||
        path.includes("site-studio") ||
        path.includes("floorplan-editor");

      let targetPath = path;
      if (path === "/auth" || path === "/" || (profile.role === "marketing" && isRestrictedForMarketing)) {
        targetPath = "/hub";
      }
      const targetUrl = `${targetPath}?switched=${encodeURIComponent(profile.id)}&_t=${Date.now()}`;

      if (typeof window !== "undefined") {
        window.location.href = targetUrl;
      }
    } catch (e) {
      console.error("Profile switch error:", e);
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    }
  };

  const handleReturnToMorgan = () => {
    try {
      const morgan = KNOWN_STAFF_PROFILES.find((p) => p.id === "morgan-hales") || KNOWN_STAFF_PROFILES[0];
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("hudson_admin_impersonator");
        localStorage.removeItem("hudson_admin_impersonator");
        try {
          sessionStorage.setItem(
            "hudson_login_toast",
            JSON.stringify({ name: "Morgan Hales", type: "returned" })
          );
        } catch {}
      }
      setActiveStaffUser(morgan, true);
      setActiveDivision(morgan.division || "QLD");
      if (typeof window !== "undefined") {
        localStorage.setItem("hudson_active_division", morgan.division || "QLD");
      }
      toast.success("Returned to Morgan Hales (Admin)", {
        description: "Full administrative controls restored.",
      });
      onClose();
      if (typeof window !== "undefined") {
        window.location.href = `/hub?returned=admin&_t=${Date.now()}`;
      }
    } catch (e) {
      console.error("Return to admin error:", e);
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-4xl !bg-slate-950 border !border-slate-800 !text-slate-100 p-0 overflow-hidden shadow-2xl rounded-3xl backdrop-blur-2xl">
        <DialogHeader className="p-6 border-b !border-slate-800 !bg-slate-900/95 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold !text-white tracking-tight flex items-center gap-2">
                  <span>Switch Staff Profile &amp; Login Preview</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-semibold uppercase">
                    Admin Preview Engine
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs !text-slate-300 mt-0.5">
                  Select any team member to visually experience the platform exactly as they see it in their login.
                </DialogDescription>
              </div>
            </div>

            {/* Quick Reset to Morgan if currently previewing someone else */}
            {activeUser?.id !== "morgan-hales" && (
              <button
                type="button"
                onClick={handleReturnToMorgan}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md transition-all cursor-pointer active:scale-95"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Return to Morgan (Admin)</span>
              </button>
            )}
          </div>

          {/* Quick Return button on mobile */}
          {activeUser?.id !== "morgan-hales" && (
            <div className="sm:hidden pt-2">
              <button
                type="button"
                onClick={handleReturnToMorgan}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md transition-all cursor-pointer"
              >
                <UserCheck className="h-4 w-4" />
                <span>Return to Morgan Hales (Admin)</span>
              </button>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                type="text"
                placeholder="Search staff by name, display centre, office or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-slate-900/90 border-slate-800 text-slate-100 text-xs h-9 focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 shrink-0">
              <button
                type="button"
                onClick={() => setFilterTab("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterTab === "all"
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                All ({allProfiles.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("qld")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterTab === "qld"
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                QLD Sales
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("nsw")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterTab === "nsw"
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                NSW Sales
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("marketing")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterTab === "marketing"
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                Marketing
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("admin")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterTab === "admin"
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                Admin
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Profiles Grid */}
        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filtered.map((profile) => {
              const isCurrent =
                activeUser?.id === profile.id ||
                activeUser?.email?.toLowerCase() === profile.email.toLowerCase();

              const isQld = profile.division === "QLD" || profile.state === "QLD";
              const isNsw = profile.division === "NSW" || profile.state === "NSW";

              return (
                <div
                  key={profile.id}
                  data-testid={`profile-card-${profile.id}`}
                  onClick={() => handleSwitch(profile)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group flex flex-col justify-between gap-3 ${
                    isCurrent
                      ? "border-amber-500/60 bg-gradient-to-br from-amber-500/15 via-slate-900 to-amber-500/5 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/40"
                      : "border-slate-800/90 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700/80 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    {/* Avatar */}
                    <div
                      className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${
                        profile.accentColor || "from-amber-500 to-orange-600"
                      } flex items-center justify-center text-white text-sm font-black shadow-md shrink-0 group-hover:scale-105 transition-transform`}
                    >
                      {profile.avatarInitials}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-white text-sm truncate group-hover:text-amber-300 transition-colors">
                          {profile.name}
                        </span>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* State Pill */}
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${
                              isQld
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                            }`}
                          >
                            {isQld ? "QLD" : "NSW"}
                          </span>

                          {/* Role Pill */}
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                              profile.role === "admin"
                                ? "bg-amber-400 text-slate-950 font-black"
                                : profile.role === "marketing"
                                ? "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30"
                                : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                            }`}
                          >
                            {profile.role === "admin" ? "Admin" : profile.role === "marketing" ? "Marketing" : "NHC"}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-300 font-medium truncate">
                        {profile.title}
                      </div>

                      <div className="text-[11px] text-amber-400/90 flex items-center gap-1.5 truncate">
                        <Building className="h-3 w-3 shrink-0 text-amber-400" />
                        <span className="truncate">{profile.displayCentre}</span>
                      </div>

                      <div className="flex items-center gap-3 text-[10.5px] text-slate-400 font-mono pt-1">
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3 shrink-0 text-slate-500" />
                          <span className="truncate">{profile.email}</span>
                        </span>
                        <span className="flex items-center gap-1 shrink-0">
                          <Phone className="h-3 w-3 shrink-0 text-slate-500" />
                          <span>{profile.phone}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Permissions & Switch Action Footer */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 mt-1">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                      {profile.role === "admin" ? (
                        <span className="text-amber-400 font-semibold flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" /> Full Administrator &amp; Siting Control
                        </span>
                      ) : profile.role === "marketing" ? (
                        <span className="text-fuchsia-400 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> Package Studio &amp; Marketing Renders
                        </span>
                      ) : (
                        <span className="text-slate-400 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-500" /> Quoting • Database • Concept Editor • Flyers
                        </span>
                      )}
                    </span>

                    {isCurrent ? (
                      <button
                        type="button"
                        data-testid={`profile-switch-btn-${profile.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSwitch(profile);
                        }}
                        className="text-[11px] font-bold text-emerald-400 font-mono flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Active Login (Enter Hub)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        data-testid={`profile-switch-btn-${profile.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSwitch(profile);
                        }}
                        className="text-[11px] font-bold px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all flex items-center gap-1 shadow-sm active:scale-95 group-hover:bg-amber-400 cursor-pointer"
                      >
                        <span>Switch Login</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Users className="h-8 w-8 mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-300">No staff profiles match &quot;{search}&quot;</p>
              <p className="text-xs text-slate-500 mt-1">Try clearing the search input or changing the division filter.</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/40 flex items-center justify-between text-xs text-slate-400">
          <span className="text-[11px] font-mono text-slate-500">
            Total Staff Directory: {allProfiles.length} Profiles • 24h Session Preservation
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
