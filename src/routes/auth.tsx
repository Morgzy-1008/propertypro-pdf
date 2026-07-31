import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logoUrl from "@/assets/hudson-homes-logo.png";
import { ACCESS_REQUEST_EMAIL, isAllowedEmail, isLegacySharedPassword } from "@/lib/access";

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
      navigate({ to: "/database", replace: true });
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
          options: { emailRedirectTo: window.location.origin + "/database" },
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
        navigate({ to: "/database", replace: true });
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
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth",
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    const { data } = await supabase.auth.getUser();
    if (!isAllowedEmail(data.user?.email ?? "")) {
      await supabase.auth.signOut();
      toast.error(`Access not approved — request it from ${ACCESS_REQUEST_EMAIL}.`);
      return;
    }
    navigate({ to: "/database", replace: true });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-sm rounded-xl border bg-background p-7 shadow-sm">
        <img src={logoUrl} alt="Hudson Homes" className="mx-auto h-12 w-auto object-contain" />
        <h1 className="mt-5 text-center text-lg font-semibold text-brand-navy">
          Package Studio sign in
        </h1>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          Hudson Homes staff access to the QLD House &amp; Land database.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Work email</Label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@hudsonhomes.com.au"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Password</Label>
            <Input
              type="password"
              required
              minLength={10}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your own private password"
            />
          </div>

          <Button
            type="submit"
            disabled={busy}
            className="w-full bg-brand-navy text-brand-cream hover:bg-brand-navy-deep"
          >
            {mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <Button variant="outline" className="mt-3 w-full" onClick={google}>
          Continue with Google
        </Button>

        <button
          type="button"
          className="mt-4 w-full text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>

        <button
          type="button"
          className="mt-2 w-full text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
          onClick={forgot}
        >
          Forgot password? Email me a reset link
        </button>


        <div className="mt-5 rounded-md border bg-muted/40 p-3 text-center text-[11px] leading-relaxed text-muted-foreground">
          Approved Hudson staff only.
          <br />
          Not on the list?{" "}
          <a
            className="text-brand-navy underline underline-offset-2"
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
