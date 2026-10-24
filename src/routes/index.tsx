import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/** The QLD package database is the home screen — staff must sign in first. */
export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Hudson Sales Hub | Hudson Homes" },
      {
        name: "description",
        content:
          "Hudson Homes staff portal for the QLD House & Land package database and print-ready flyer studio.",
      },
      { property: "og:title", content: "Hudson Sales Hub | Hudson Homes" },
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
    throw redirect({ to: "/hub", replace: true });
  },
  component: () => null,
});
