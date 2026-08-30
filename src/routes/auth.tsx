import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  isAllowedEmail,
  ACCESS_REQUEST_EMAIL,
} from "@/lib/access";
import {
  KNOWN_STAFF_PROFILES,
  findStaffProfileByEmail,
  setActiveStaffUser,
  isStaffSessionActive,
  getSavedLoginCredentials,
  type StaffProfile,
} from "@/lib/authSession";
import { logAccessRequest } from "@/lib/adminAlerts";
import {
  ShieldCheck,
  Sparkles,
  Lock,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building,
  UserCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import { Logo } from "@/components/flyer/FlyerTemplates";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Staff Authentication | Hudson Homes Enterprise Hub" },
      {
        name: "description",
        content: "Hudson Homes staff daily authentication portal for Quoting, House & Land database, and CRM.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [busy, setBusy] = useState(false);
  const [accessPendingEmail, setAccessPendingEmail] = useState<string | null>(null);

  useEffect(() => {
    // If user already has an active 24-hr session, redirect directly to /hub
    if (isStaffSessionActive()) {
      navigate({ to: "/hub", replace: true });
      return;
    }

    // Pre-fill remembered credentials for daily seamless 1-click sign-in
    const saved = getSavedLoginCredentials();
    if (saved && saved.email) {
      setEmail(saved.email);
      if (saved.password) {
        setPassword(saved.password);
      }
      setRememberMe(true);
    }
  }, [navigate]);

  const selectProfile = (profile: StaffProfile) => {
    setEmail(profile.email);
    setAccessPendingEmail(null);
    const saved = getSavedLoginCredentials();
    if (saved && saved.email.toLowerCase() === profile.email.toLowerCase() && saved.password) {
      setPassword(saved.password);
    } else if (!password) {
      setPassword("Hudson2026!");
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      toast.error("Please enter your Hudson Homes work email.");
      return;
    }

    if (!cleanEmail.endsWith("@hudsonhomes.com.au") && !cleanEmail.endsWith("@hudsonhhomes.com.au")) {
      toast.error("Only @hudsonhomes.com.au email addresses are permitted.");
      return;
    }

    // Check if user is in authorized whitelist
    if (!isAllowedEmail(cleanEmail)) {
      // Log access request for Morgan Hales
      const req = logAccessRequest(cleanEmail);
      setAccessPendingEmail(cleanEmail);
      toast.warning("Access Request Submitted", {
        description: `Your request has been sent to Morgan Hales (System Admin) for approval.`,
        duration: 8000,
      });
      return;
    }

    if (!password || password.length < 4) {
      toast.error("Please enter your account password.");
      return;
    }

    setBusy(true);

    try {
      // Match authorized staff profile
      let profile = findStaffProfileByEmail(cleanEmail);
      if (!profile) {
        profile = {
          id: cleanEmail.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase(),
          name: cleanEmail.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          email: cleanEmail,
          phone: "0400 000 000",
          title: "New Home Consultant",
          displayCentre: "Queensland Division",
          role: "nhc",
          avatarInitials: cleanEmail.slice(0, 2).toUpperCase(),
          accentColor: "from-amber-500 to-orange-600",
        };
      }

      // Establish active 24-hour authenticated session
      setActiveStaffUser(profile, rememberMe, password);

      toast.success(`Welcome back, ${profile.name}!`, {
        description: "Authenticated successfully for the next 24 hours.",
      });

      // Once signed in, send user to /hub
      navigate({ to: "/hub", replace: true });
    } catch (err) {
      toast.error("Sign in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-100 font-sans relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-amber-500/10 blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md rounded-3xl border border-slate-800/90 bg-slate-900/90 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <Logo light size={14} />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-semibold tracking-wide">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
            <span>Daily Staff Authentication (24h Active Session)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Sign In to Hudson Portal
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Authorized staff access to Quoting, House &amp; Land Database, CRM, and Estimating.
          </p>
        </div>

        {/* Quick Profile Select Pill Grid */}
        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Select Your Staff Profile:
          </Label>
          <div className="grid grid-cols-5 gap-1.5">
            {KNOWN_STAFF_PROFILES.map((p) => {
              const isSelected = email.toLowerCase() === p.email.toLowerCase();
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectProfile(p)}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    isSelected
                      ? "border-amber-500 bg-amber-500/20 shadow-md ring-1 ring-amber-500/50"
                      : "border-slate-800 bg-slate-950/60 hover:bg-slate-800/80 hover:border-slate-700"
                  }`}
                  title={`${p.name} (${p.email})`}
                >
                  <div
                    className={`h-7 w-7 rounded-lg bg-gradient-to-br ${p.accentColor} flex items-center justify-center text-white text-[10px] font-black shadow-xs`}
                  >
                    {p.avatarInitials}
                  </div>
                  <span className="text-[9.5px] font-medium text-slate-300 truncate w-full text-center">
                    {p.name.split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pending Access Notice */}
        {accessPendingEmail && (
          <div className="p-3.5 rounded-2xl border border-amber-500/40 bg-amber-950/30 space-y-1.5 text-xs text-amber-200">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <AlertTriangle className="h-4 w-4 text-amber-400 flex-none" />
              <span>Access Request Sent to Admin</span>
            </div>
            <p className="text-[11px] text-amber-300/90 leading-relaxed">
              <strong>{accessPendingEmail}</strong> has been logged in Morgan Hales&apos;s Website Admin approval queue.
              You will be able to sign in as soon as Morgan approves your request.
            </p>
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300 font-medium flex items-center justify-between">
              <span>Hudson Work Email</span>
              <span className="text-[10px] text-slate-500 font-mono">@hudsonhomes.com.au</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setAccessPendingEmail(null);
                }}
                placeholder="firstname.lastname@hudsonhomes.com.au"
                className="pl-9 bg-slate-950/70 border-slate-800 text-slate-100 focus:border-amber-500 focus:ring-amber-500/20 text-xs h-9.5"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300 font-medium flex items-center justify-between">
              <span>Password</span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[10px] text-amber-400 hover:underline flex items-center gap-1"
              >
                {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {showPassword ? "Hide" : "Show"}
              </button>
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="pl-9 bg-slate-950/70 border-slate-800 text-slate-100 focus:border-amber-500 focus:ring-amber-500/20 text-xs h-9.5"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-amber-500 accent-amber-500 cursor-pointer"
              />
              <span className="text-xs text-slate-300">Remember credentials on this device</span>
            </label>
            <span className="text-[10px] text-emerald-400 font-mono">24-hr session</span>
          </div>

          <Button
            type="submit"
            disabled={busy}
            className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-bold hover:from-amber-400 hover:to-amber-300 text-xs h-10 shadow-lg shadow-amber-500/20 transition-all"
          >
            {busy ? "Authenticating…" : "Sign In to Hudson Portal"}
          </Button>
        </form>

        {/* Security Whitelist Notice */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-3.5 text-center text-[11px] leading-relaxed text-slate-400 space-y-1">
          <div className="flex items-center justify-center gap-1 text-slate-300 font-semibold">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Authorized Logins Only</span>
          </div>
          <p className="text-[10.5px]">
            Jesse Jenkins, Adrian Baxter, Morgan Hales, Alyssa Hales &amp; Shelley Lay.
          </p>
          <p className="text-[10px] text-slate-500 pt-0.5">
            Any unlisted login automatically sends an approval alert to <strong>Morgan Hales</strong>.
          </p>
        </div>
      </div>
    </main>
  );
}
