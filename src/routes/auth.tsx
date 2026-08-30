import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  findStaffProfileByEmail,
  setActiveStaffUser,
  isStaffSessionActive,
  type StaffProfile,
} from "@/lib/authSession";
import {
  isAuthorizedStaffMember,
  normalizeStaffEmail,
  hasUserConfiguredPassword,
  setUserPassword,
  verifyUserPassword,
} from "@/lib/userCredentials";
import { logAccessRequest } from "@/lib/adminAlerts";
import {
  ShieldCheck,
  Lock,
  Mail,
  AlertTriangle,
  KeyRound,
  Eye,
  EyeOff,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  Phone,
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

type AuthMode = "signin" | "create_password" | "reset_password";

function AuthPage() {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState<AuthMode>("signin");

  // Form states (ALWAYS Blank on load - No prefilled profiles or passwords)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verifyPhone, setVerifyPhone] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);

  useEffect(() => {
    // If user already has an active 24-hr session, redirect directly to /hub
    if (isStaffSessionActive()) {
      navigate({ to: "/hub", replace: true });
    }
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccessDeniedMessage(null);

    const cleanEmail = normalizeStaffEmail(email);

    if (!cleanEmail) {
      toast.error("Please enter your Hudson Homes work email.");
      return;
    }

    // 1. Strict Whitelist Check: Only Morgan, Jesse, Adrian, Alyssa, Shelley
    if (!isAuthorizedStaffMember(cleanEmail)) {
      if (cleanEmail.endsWith("@hudsonhomes.com.au")) {
        logAccessRequest(cleanEmail);
      }
      setAccessDeniedMessage(
        "Access Denied: This email address is not authorized for Hudson Homes portal access. Access is strictly limited to authorized personnel (Morgan, Jesse, Adrian, Alyssa, Shelley)."
      );
      toast.error("Unauthorized email address.");
      return;
    }

    // 2. Check if user needs to create their initial unique password
    if (!hasUserConfiguredPassword(cleanEmail)) {
      const profile = findStaffProfileByEmail(cleanEmail);
      toast.info(`Welcome ${profile?.name || "Staff Member"}! Please set up your unique personal password.`);
      setAuthMode("create_password");
      return;
    }

    if (!password) {
      toast.error("Please enter your unique account password.");
      return;
    }

    setBusy(true);

    try {
      // 3. Verify user's unique password hash
      const isValid = await verifyUserPassword(cleanEmail, password);
      if (!isValid) {
        toast.error("Incorrect password for this account.", {
          description: "Please check your password or click 'Reset Password'.",
        });
        setBusy(false);
        return;
      }

      // 4. Authenticate & start 24-hr session
      const profile = findStaffProfileByEmail(cleanEmail);
      if (profile) {
        setActiveStaffUser(profile, false);
        toast.success(`Welcome back, ${profile.name}!`, {
          description: "Authenticated successfully for the next 24 hours.",
        });
        navigate({ to: "/hub", replace: true });
      }
    } catch {
      toast.error("Authentication failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleCreatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = normalizeStaffEmail(email);

    if (!isAuthorizedStaffMember(cleanEmail)) {
      toast.error("Only authorized staff members may create an account.");
      return;
    }

    if (!newPassword || newPassword.length < 5) {
      toast.error("Password must be at least 5 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match. Please check and try again.");
      return;
    }

    setBusy(true);

    try {
      await setUserPassword(cleanEmail, newPassword);
      const profile = findStaffProfileByEmail(cleanEmail);

      if (profile) {
        setActiveStaffUser(profile, false);
        toast.success(`Password created successfully! Welcome, ${profile.name}.`, {
          description: "Your unique password is saved and your 24-hr session is active.",
        });
        navigate({ to: "/hub", replace: true });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to set password.");
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = normalizeStaffEmail(email);

    if (!isAuthorizedStaffMember(cleanEmail)) {
      toast.error("Only authorized staff members may reset their password.");
      return;
    }

    const profile = findStaffProfileByEmail(cleanEmail);
    const cleanPhoneInput = verifyPhone.replace(/\D/g, "");
    const expectedPhone = (profile?.phone || "").replace(/\D/g, "");

    // Verify phone digits match
    if (!expectedPhone || !cleanPhoneInput || !expectedPhone.endsWith(cleanPhoneInput.slice(-8))) {
      toast.error("Phone number does not match registered profile records.");
      return;
    }

    if (!newPassword || newPassword.length < 5) {
      toast.error("New password must be at least 5 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setBusy(true);

    try {
      await setUserPassword(cleanEmail, newPassword);
      if (profile) {
        setActiveStaffUser(profile, false);
        toast.success("Password reset successfully! Session active for 24h.");
        navigate({ to: "/hub", replace: true });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password.");
    } finally {
      setBusy(false);
    }
  };

  const currentProfile = email ? findStaffProfileByEmail(normalizeStaffEmail(email)) : undefined;

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-100 font-sans relative overflow-hidden">
      {/* Background Ambience */}
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
            {authMode === "signin" && "Sign In to Hudson Portal"}
            {authMode === "create_password" && "Create Your Password"}
            {authMode === "reset_password" && "Reset Your Password"}
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {authMode === "signin" && "Enter your work email and unique password to access Quoting, CRM & Database."}
            {authMode === "create_password" && `Welcome ${currentProfile?.name || ""}! Choose a unique password to secure your account.`}
            {authMode === "reset_password" && "Verify your registered mobile number to set a new password."}
          </p>
        </div>

        {/* Access Denied Warning */}
        {accessDeniedMessage && (
          <div className="p-3.5 rounded-2xl border border-rose-500/40 bg-rose-950/30 space-y-1.5 text-xs text-rose-200">
            <div className="flex items-center gap-1.5 font-bold text-rose-400">
              <AlertTriangle className="h-4 w-4 text-rose-400 flex-none" />
              <span>Restricted Access</span>
            </div>
            <p className="text-[11px] text-rose-300/90 leading-relaxed">
              {accessDeniedMessage}
            </p>
          </div>
        )}

        {/* 1. SIGN IN FORM */}
        {authMode === "signin" && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-medium">Hudson Work Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setAccessDeniedMessage(null);
                  }}
                  placeholder="firstname.lastname@hudsonhomes.com.au"
                  className="pl-9 bg-slate-950/70 border-slate-800 text-slate-100 focus:border-amber-500 focus:ring-amber-500/20 text-xs h-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-slate-300 font-medium">Unique Password</Label>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("reset_password");
                    setAccessDeniedMessage(null);
                  }}
                  className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline font-medium"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your personal password"
                  className="pl-9 pr-10 bg-slate-950/70 border-slate-800 text-slate-100 focus:border-amber-500 focus:ring-amber-500/20 text-xs h-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={busy}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs h-10 rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {busy ? (
                <span>Verifying Credentials...</span>
              ) : (
                <>
                  <KeyRound className="h-4 w-4 text-slate-950" />
                  <span>Sign In (24-Hour Session)</span>
                </>
              )}
            </Button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("create_password");
                  setAccessDeniedMessage(null);
                }}
                className="text-xs text-slate-400 hover:text-amber-400 transition-colors"
              >
                First time logging in? <span className="text-amber-400 font-semibold underline">Set up password</span>
              </button>
            </div>
          </form>
        )}

        {/* 2. CREATE PASSWORD FORM */}
        {authMode === "create_password" && (
          <form onSubmit={handleCreatePassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-medium">Your Work Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setAccessDeniedMessage(null);
                  }}
                  placeholder="firstname.lastname@hudsonhomes.com.au"
                  className="pl-9 bg-slate-950/70 border-slate-800 text-slate-100 text-xs h-10"
                />
              </div>
              {currentProfile && (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold pt-0.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Verified Profile: {currentProfile.name} ({currentProfile.displayCentre})</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-medium">Create New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  type={showNewPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 5 characters"
                  className="pl-9 pr-10 bg-slate-950/70 border-slate-800 text-slate-100 text-xs h-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-medium">Confirm New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  type={showNewPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="pl-9 bg-slate-950/70 border-slate-800 text-slate-100 text-xs h-10"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={busy}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs h-10 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <CheckCircle2 className="h-4 w-4 text-slate-950" />
              <span>Save Password &amp; Sign In</span>
            </Button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signin");
                  setAccessDeniedMessage(null);
                }}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Already have a password? <span className="text-amber-400 font-semibold underline">Back to Sign In</span>
              </button>
            </div>
          </form>
        )}

        {/* 3. RESET PASSWORD FORM */}
        {authMode === "reset_password" && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-medium">Hudson Work Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="firstname.lastname@hudsonhomes.com.au"
                  className="pl-9 bg-slate-950/70 border-slate-800 text-slate-100 text-xs h-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-medium">Verify Registered Mobile Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  type="tel"
                  required
                  value={verifyPhone}
                  onChange={(e) => setVerifyPhone(e.target.value)}
                  placeholder="e.g. 0417 571 864"
                  className="pl-9 bg-slate-950/70 border-slate-800 text-slate-100 text-xs h-10"
                />
              </div>
              <span className="text-[10px] text-slate-500">
                Enter your mobile number associated with your Hudson Homes staff profile.
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-medium">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  type={showNewPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 5 characters"
                  className="pl-9 pr-10 bg-slate-950/70 border-slate-800 text-slate-100 text-xs h-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-medium">Confirm New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  type={showNewPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="pl-9 bg-slate-950/70 border-slate-800 text-slate-100 text-xs h-10"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={busy}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs h-10 rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <KeyRound className="h-4 w-4 text-slate-950" />
              <span>Verify &amp; Set New Password</span>
            </Button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signin");
                  setAccessDeniedMessage(null);
                }}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Back to <span className="text-amber-400 font-semibold underline">Sign In</span>
              </button>
            </div>
          </form>
        )}

        {/* Security Footer Note */}
        <div className="pt-4 border-t border-slate-800/70 text-center">
          <p className="text-[11px] text-slate-500">
            Protected by Hudson Homes Enterprise Authentication Gate • 24h Session Expiry
          </p>
        </div>
      </div>
    </main>
  );
}
