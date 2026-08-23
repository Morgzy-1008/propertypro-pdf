import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Phone, Mail, MessageSquare, UserPlus, Download, Home, ArrowRight, ShieldCheck, MapPin, Building2 } from "lucide-react";
import { CONSULTANTS, findConsultant, consultantVCard } from "@/components/flyer/consultants";
import { Logo } from "@/components/flyer/FlyerTemplates";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/c/$id")({
  loader: ({ params }) => {
    const cleanId = params.id.toLowerCase().replace(/[^a-z0-9-]/g, "");
    let c = findConsultant(cleanId);
    if (!c) {
      // Try matching by first name or part of ID
      c = CONSULTANTS.find(
        (item) =>
          item.id.toLowerCase().includes(cleanId) ||
          cleanId.includes(item.id.toLowerCase()) ||
          item.name.toLowerCase().includes(cleanId)
      );
    }
    if (!c) {
      c = CONSULTANTS[0]; // fallback to Morgan Hales
    }
    return c;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Consultant"} | Hudson Homes Queensland` },
      {
        name: "description",
        content: `Contact ${loaderData?.name ?? "New Home Consultant"} at Hudson Homes. Direct phone: ${loaderData?.phone ?? ""}, display centre: ${loaderData?.displayCentre ?? ""}.`,
      },
      { property: "og:title", content: `${loaderData?.name ?? "Consultant"} | Hudson Homes Queensland` },
      {
        property: "og:description",
        content: "Tap to save contact details or call direct.",
      },
      { property: "og:type", content: "profile" },
    ],
  }),
  component: ConsultantContactPage,
});

function ConsultantContactPage() {
  const c = Route.useLoaderData();
  const [downloaded, setDownloaded] = useState(false);

  const cleanPhone = c.phone.replace(/[^\d+]/g, "");

  const downloadVCard = () => {
    const vcard = consultantVCard({
      name: c.name,
      phone: c.phone,
      email: c.email,
      office: c.displayCentre,
      website: "www.hudsonhomes.com.au",
    });

    const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${c.name.replace(/\s+/g, "_")}.vcf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloaded(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-brand-gold/30">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <Logo light size={10} />
        <span className="text-[11px] font-semibold text-brand-gold uppercase tracking-wider">
          Digital Contact Card
        </span>
      </header>

      {/* Main Card */}
      <main className="flex-1 max-w-md w-full mx-auto p-5 flex flex-col justify-center gap-5">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 backdrop-blur-xl p-6 shadow-2xl space-y-6 text-center">
          {/* Avatar / Initials */}
          <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-2xl font-extrabold text-white shadow-lg shadow-amber-500/20 border-2 border-amber-300/40">
            {c.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>

          {/* Name & Title */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-white tracking-tight">{c.name}</h1>
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">{c.title}</p>
            <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5 pt-1">
              <Building2 className="h-3.5 w-3.5 text-slate-500" />
              <span>{c.displayCentre}</span>
            </p>
          </div>

          {/* Main Action: Add to Phone Contacts */}
          <button
            type="button"
            onClick={downloadVCard}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2.5 transition-all transform active:scale-[0.98]"
          >
            <UserPlus className="h-4 w-4" />
            <span>{downloaded ? "✓ Contact File Saved" : "Save Contact to Phone"}</span>
          </button>

          {/* Quick Action Grid */}
          <div className="grid grid-cols-3 gap-2.5 pt-2">
            <a
              href={`tel:${cleanPhone}`}
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                <Phone className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-semibold text-slate-200">Call</span>
            </a>

            <a
              href={`sms:${cleanPhone}`}
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
                <MessageSquare className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-semibold text-slate-200">Message</span>
            </a>

            <a
              href={`mailto:${c.email}?subject=Hudson%20Homes%20House%20%26%20Land%20Enquiry`}
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center">
                <Mail className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-semibold text-slate-200">Email</span>
            </a>
          </div>

          {/* Details List */}
          <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 divide-y divide-slate-800/60 text-left text-xs">
            <div className="p-3 flex items-center justify-between">
              <span className="text-slate-400">Mobile</span>
              <span className="font-semibold text-slate-100">{c.phone}</span>
            </div>
            <div className="p-3 flex items-center justify-between">
              <span className="text-slate-400">Email</span>
              <span className="font-semibold text-slate-100 truncate max-w-[200px]">{c.email}</span>
            </div>
            <div className="p-3 flex items-center justify-between">
              <span className="text-slate-400">Display Centre</span>
              <span className="font-semibold text-slate-100">{c.displayCentre}</span>
            </div>
          </div>

          {/* Browse Packages Link */}
          <Link
            to="/browse/packages"
            className="w-full py-3 px-4 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition-colors"
          >
            <Home className="h-3.5 w-3.5 text-amber-400" />
            <span>Browse House &amp; Land Packages</span>
            <ArrowRight className="h-3.5 w-3.5 ml-auto text-slate-500" />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[10px] text-slate-400">
        Hudson Homes · Zero Surprises
      </footer>
    </div>
  );
}
