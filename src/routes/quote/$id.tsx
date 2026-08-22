import { createFileRoute, notFound } from "@tanstack/react-router";
import { ClientQuoteReview } from "@/components/quoting/ClientQuoteReview";
import { createNewBlankQuote, getQuoteById } from "@/lib/quoting/quoteStorage";
import type { FullQuote } from "@/lib/quoting/quoteTypes";

export const Route = createFileRoute("/quote/$id")({
  loader: ({ params }) => {
    const quote = getQuoteById(params.id);
    if (quote) return { quote };
    // If not found in storage (e.g. fresh browser / demo link), create an interactive sample quote
    const sample = createNewBlankQuote();
    sample.id = params.id;
    sample.client.clientName = "Sample Client";
    sample.client.siteAddress = "Lot 204 Ironbark Drive";
    sample.client.estate = "Flagstone Valley";
    sample.client.suburb = "Flagstone";
    return { quote: sample };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: `Building Tender Quote #${loaderData?.quote?.quoteNumber || ""} | Hudson Homes`,
      },
      {
        name: "description",
        content: "Review and customise your fixed-price building tender quotation from Hudson Homes Queensland.",
      },
    ],
  }),
  component: ClientQuoteRoutePage,
});

function ClientQuoteRoutePage() {
  const { quote } = Route.useLoaderData();
  return <ClientQuoteReview initialQuote={quote} />;
}
