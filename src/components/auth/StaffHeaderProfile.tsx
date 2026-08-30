import React, { useState, useEffect } from "react";
import {
  getActiveStaffUser,
  clearActiveStaffUser,
  onStaffUserChanged,
  type StaffProfile,
} from "@/lib/authSession";
import { StaffSignInModal } from "./StaffSignInModal";
import { Button } from "@/components/ui/button";
import {
  User,
  LogOut,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  Building,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface StaffHeaderProfileProps {
  isLight?: boolean;
}

export function StaffHeaderProfile({ isLight = false }: StaffHeaderProfileProps) {
  const [activeUser, setActiveUser] = useState<StaffProfile | null>(() => getActiveStaffUser());
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    setActiveUser(getActiveStaffUser());
    const unsub = onStaffUserChanged((user) => setActiveUser(user));
    return () => unsub();
  }, []);

  const handleSignOut = () => {
    clearActiveStaffUser(true);
    setIsDropdownOpen(false);
    toast.info("Signed out from NHC profile.");
    setIsSignInModalOpen(true);
  };

  const handleSwitchUser = () => {
    setIsDropdownOpen(false);
    setIsSignInModalOpen(true);
  };

  return (
    <div className="relative">
      {activeUser ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-full border transition-all text-xs font-semibold ${
              isLight
                ? "bg-slate-100/90 border-slate-300 text-slate-800 hover:bg-slate-200/80 shadow-xs"
                : "bg-slate-900/90 border-slate-700/80 text-slate-200 hover:bg-slate-800 hover:border-slate-600 shadow-md"
            }`}
          >
            <div
              className={`h-6 w-6 rounded-full bg-gradient-to-br ${activeUser.accentColor || "from-amber-500 to-orange-600"} flex items-center justify-center text-white text-[10px] font-black shadow-xs`}
            >
              {activeUser.avatarInitials || "NHC"}
            </div>
            <div className="text-left hidden sm:block">
              <span className="block leading-tight text-white font-bold">{activeUser.name}</span>
              <span className="block text-[9.5px] text-amber-400 font-medium leading-none truncate max-w-[130px]">
                {activeUser.displayCentre.replace(" Display Home", "")}
              </span>
            </div>
            <ChevronDown className="h-3 w-3 text-slate-400 ml-0.5" />
          </button>

          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-800 bg-slate-950/95 backdrop-blur-xl shadow-2xl p-3 z-50 text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-100">
                <div className="pb-2.5 mb-2 border-b border-slate-800">
                  <span className="font-bold text-white block">{activeUser.name}</span>
                  <span className="text-[11px] text-slate-400 block font-mono truncate">
                    {activeUser.email}
                  </span>
                  <span className="text-[10px] text-amber-400 font-medium mt-1 inline-flex items-center gap-1">
                    <Building className="h-3 w-3" /> {activeUser.displayCentre}
                  </span>
                </div>

                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={handleSwitchUser}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center gap-2 font-medium"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Switch NHC Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-950/40 text-rose-300 flex items-center gap-2 font-medium"
                  >
                    <LogOut className="h-3.5 w-3.5 text-rose-400" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          onClick={() => setIsSignInModalOpen(true)}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-1.5 shadow-md h-8"
        >
          <User className="h-3.5 w-3.5" />
          <span>Sign In (NHC)</span>
        </Button>
      )}

      <StaffSignInModal
        open={isSignInModalOpen}
        onOpenChange={setIsSignInModalOpen}
        canDismiss={activeUser !== null}
        onSignedIn={(user) => {
          setActiveUser(user);
          setIsSignInModalOpen(false);
        }}
      />
    </div>
  );
}
