import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/** The QLD package database is the home screen — staff must sign in first. */
export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Hudson Homes | QLD House & Land Package Database" },
      {
        name: "description",
        content:
          "Hudson Homes staff portal for the QLD House & Land package database and print-ready flyer studio.",
      },
      { property: "og:title", content: "Hudson Homes | QLD House & Land Package Database" },
      {
        property: "og:description",
        content:
          "Sign in to manage QLD land lots, packages and build print-ready House & Land flyers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async () => {
    let user = null;
    try {
      const { data } = await supabase.auth.getUser();
      user = data?.user ?? null;
    } catch {
      /* continue */
    }
    throw redirect({ to: user ? "/database" : "/flyer", replace: true });
  },
  component: () => null,
});
