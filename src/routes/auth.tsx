import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACCESS_REQUEST_EMAIL, isAllowedEmail, isLegacySharedPassword } from "@/lib/access";
import { ShieldCheck, Sparkles } from "lucide-react";

import { Logo } from "@/components/flyer/FlyerTemplates";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in | Hudson Homes Package Studio" },
      {
        name: "description",
        content:
          "Hudson Homes staff sign-in for the House & Land package database and flyer studio.",
      },
      { property: "og:title", content: "Hudson Homes Package Studio sign in" },
      {
        property: "og:description",
        content: "Sign in to manage QLD House & Land packages and build print-ready flyers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      if (!isAllowedEmail(data.session.user.email ?? "")) {
        await supabase.auth.signOut();
        toast.error(`Access not approved — request it from ${ACCESS_REQUEST_EMAIL}.`);
        return;
      }
      navigate({ to: "/hub", replace: true });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllowedEmail(email)) {
      toast.error("That email isn't approved yet — request access below.");
      return;
    }
    if (password.length < 10) {
      toast.error("Choose a private password of at least 10 characters.");
      return;
    }
    if (mode === "signup" && isLegacySharedPassword(password)) {
      toast.error("That old shared password can't be used — pick a private one.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/hub" },
        });
        if (error) throw error;
        toast.success("Account created — you can sign in now.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (isLegacySharedPassword(password)) {
          toast.warning("That shared password is retired — set your own private one now.");
          navigate({ to: "/reset-password", search: { forced: "1" }, replace: true });
          return;
        }
        navigate({ to: "/hub", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!isAllowedEmail(email)) {
      toast.error("Enter your Hudson work email first.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    if (error) {
      toast.error("Could not send the reset email.");
      return;
    }
    toast.success("Reset link sent — check your inbox.");
  };

  const google = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/auth",
      },
    });
    if (error) {
      toast.error("Google sign-in failed: " + error.message);
      return;
    }
    const { data } = await supabase.auth.getUser();
    if (data.user && !isAllowedEmail(data.user.email ?? "")) {
      await supabase.auth.signOut();
      toast.error(`Access not approved — request it from ${ACCESS_REQUEST_EMAIL}.`);
      return;
    }
    if (data.user) {
      navigate({ to: "/hub", replace: true });
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 font-sans relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-brand-gold/10 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-900/80 backdrop-blur-xl p-8 sm:p-10 shadow-2xl relative z-10">
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <Logo light size={14} />
          </div>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-[11px] font-medium tracking-wide">
            <Sparkles className="h-3 w-3" /> QLD Package Studio
          </div>
          <h1 className="mt-3 text-2xl font-bold text-white tracking-tight">
            {mode === "signin" ? "Sign in to your account" : "Create staff account"}
          </h1>
          <p className="mt-1.5 text-xs text-slate-400">
            Hudson Homes authorized staff access to Flyer Builder &amp; Database.
          </p>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">Work email</Label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@hudsonhomes.com.au"
              className="bg-slate-950/60 border-slate-800 text-slate-100 focus:border-brand-gold/60 focus:ring-brand-gold/20 placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">Password</Label>
            <Input
              type="password"
              required
              minLength={10}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your own private password"
              className="bg-slate-950/60 border-slate-800 text-slate-100 focus:border-brand-gold/60 focus:ring-brand-gold/20 placeholder:text-slate-500"
            />
          </div>

          <Button
            type="submit"
            disabled={busy}
            className="w-full bg-gradient-to-r from-amber-500 to-brand-gold text-slate-950 font-semibold hover:from-amber-400 hover:to-amber-300 transition-all shadow-md mt-2"
          >
            {mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <Button
          variant="outline"
          className="mt-3 w-full border-slate-800 bg-slate-950/40 text-slate-300 hover:bg-slate-800 hover:text-white"
          onClick={google}
        >
          Continue with Google
        </Button>

        <div className="mt-6 flex flex-col gap-2 text-center text-xs text-slate-400">
          <button
            type="button"
            className="hover:text-amber-300 transition-colors"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>

          <button
            type="button"
            className="hover:text-slate-300 transition-colors"
            onClick={forgot}
          >
            Forgot password? Email me a reset link
          </button>
        </div>

        <div className="mt-6 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 text-center text-[11px] leading-relaxed text-slate-400">
          <div className="flex items-center justify-center gap-1.5 text-slate-300 font-medium mb-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Approved Hudson Staff Only</span>
          </div>
          Not on the access list?{" "}
          <a
            className="text-brand-gold hover:underline font-medium"
            href={`mailto:${ACCESS_REQUEST_EMAIL}?subject=Package%20Studio%20access%20request&body=Hi%20Morgan%2C%20please%20set%20me%20up%20with%20access%20to%20the%20Hudson%20Package%20Studio.`}
          >
            Request access
          </a>{" "}
          from {ACCESS_REQUEST_EMAIL}.
        </div>
      </div>
    </main>
  );
}
