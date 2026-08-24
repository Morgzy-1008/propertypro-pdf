import { createFileRoute } from "@tanstack/react-router";
import { EftPaymentPortal, type EftPaymentDetails } from "@/components/quoting/EftPaymentPortal";
import { getQuoteById } from "@/lib/quoting/quoteStorage";

interface PaySearchParams {
  bsb?: string;
  acc?: string;
  name?: string;
  ref?: string;
  amt?: number;
  bank?: string;
  quoteId?: string;
}

export const Route = createFileRoute("/pay")({
  validateSearch: (search: Record<string, unknown>): PaySearchParams => {
    return {
      bsb: typeof search.bsb === "string" ? search.bsb : undefined,
      acc: typeof search.acc === "string" ? search.acc : undefined,
      name: typeof search.name === "string" ? search.name : undefined,
      ref: typeof search.ref === "string" ? search.ref : undefined,
      amt:
        typeof search.amt === "number"
          ? search.amt
          : typeof search.amt === "string"
            ? Number(search.amt) || undefined
            : undefined,
      bank: typeof search.bank === "string" ? search.bank : undefined,
      quoteId: typeof search.quoteId === "string" ? search.quoteId : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "EFT Bank Transfer Payment Details | Hudson Homes" },
      {
        name: "description",
        content: "Copy verified bank transfer details for Hudson Homes Queensland initial tender deposit.",
      },
    ],
  }),
  component: PayRoutePage,
});

function PayRoutePage() {
  const search = Route.useSearch();
  let quoteDetails: Partial<EftPaymentDetails> = {};

  if (search.quoteId) {
    const q = getQuoteById(search.quoteId);
    if (q) {
      const lastName = q.client.clientName.trim().split(/\s+/).pop() || "Client";
      const quoteNum = q.client.estimateNumber || q.quoteNumber || "Quote";
      quoteDetails = {
        amount: q.client.depositAmount || 1650,
        reference: `${lastName}-${quoteNum}`,
        clientName: q.client.clientName,
      };
    }
  }

  const details: EftPaymentDetails = {
    accountName: search.name || quoteDetails.accountName || "Hudson Homes (QLD) Pty Ltd",
    bsb: search.bsb || quoteDetails.bsb || "082 778",
    accountNumber: search.acc || quoteDetails.accountNumber || "74-586-5607",
    reference: search.ref || quoteDetails.reference || "Deposit-Quote",
    amount: search.amt || quoteDetails.amount || 1650,
    bankName: search.bank || quoteDetails.bankName || "National Australia Bank (NAB)",
  };

  return <EftPaymentPortal details={details} />;
}
