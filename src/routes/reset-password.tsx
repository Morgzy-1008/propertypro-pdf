import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logoUrl from "@/assets/hudson-homes-logo.png";
import { isLegacySharedPassword } from "@/lib/access";


export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    forced: search.forced === "1" ? "1" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Set a new password | Hudson Homes Package Studio" },
      {
        name: "description",
        content: "Choose a new private password for your Hudson Homes Package Studio account.",
      },
      { property: "og:title", content: "Set a new Package Studio password" },
      {
        property: "og:description",
        content: "Hudson Homes staff password reset for the House & Land package studio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});


function ResetPasswordPage() {
  const navigate = useNavigate();
  const { forced } = Route.useSearch();
  const [password, setPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase delivers a recovery session via the URL hash on arrival.
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    void supabase.auth.getSession().then(({ data: s }) => {
      if (s.session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 10) {
      toast.error("Use at least 10 characters.");
      return;
    }
    if (isLegacySharedPassword(password)) {
      toast.error("That's the retired shared password — choose something only you know.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated.");
      navigate({ to: "/database", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-sm rounded-xl border bg-background p-7 shadow-sm">
        <img src={logoUrl} alt="Hudson Homes" className="mx-auto h-12 w-auto object-contain" />
        <h1 className="mt-5 text-center text-lg font-semibold text-brand-navy">
          {forced ? "Choose your own password" : "Set a new password"}
        </h1>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          {forced
            ? "The old shared password is retired. Set a private password now to keep using the studio."
            : ready
              ? "Choose a private password only you know."
              : "Open this page from the reset link in your email."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">New password</Label>
            <Input
              type="password"
              required
              minLength={10}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            disabled={busy || !ready}
            className="w-full bg-brand-navy text-brand-cream hover:bg-brand-navy-deep"
          >
            Update password
          </Button>
        </form>
      </div>
    </main>
  );
}
