import { useState } from "react";
import {
  X,
  Phone,
  Mail,
  Send,
  CheckCircle2,
  Home,
  BedDouble,
  Bath,
  Car,
  MapPin,
  Sparkles,
  Building2,
  Clock,
} from "lucide-react";
import type { FloorplanRecord } from "@/components/flyer/floorplans.data";
import { CONSULTANTS, type Consultant } from "@/components/flyer/consultants";
import { Logo } from "@/components/flyer/FlyerTemplates";

interface CustomerEnquiryModalProps {
  plan: FloorplanRecord;
  facadeName?: string;
  consultantId?: string;
  division?: "QLD" | "NSW";
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
}

export function CustomerEnquiryModal({
  plan,
  facadeName,
  consultantId,
  division = "QLD",
  isOpen,
  onClose,
  isLight,
}: CustomerEnquiryModalProps) {
  if (!isOpen) return null;

  const consultant = consultantId
    ? CONSULTANTS.find((c) => c.id.toLowerCase() === consultantId.toLowerCase())
    : CONSULTANTS.find((c) => c.division === division) || CONSULTANTS[0];

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [suburb, setSuburb] = useState("");
  const [landStatus, setLandStatus] = useState("Looking for Land");
  const [comments, setComments] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone) return;
    setIsSubmitting(true);

    try {
      // Save enquiry to local storage lead log
      const enquiry = {
        id: `enq_${Date.now()}`,
        date: new Date().toISOString(),
        fullName,
        phone,
        email,
        suburb,
        landStatus,
        comments,
        plan: plan.label,
        facade: facadeName || "Classic",
        consultant: consultant?.name || "General",
        division,
      };

      const existing = JSON.parse(localStorage.getItem("hudson_customer_enquiries") || "[]");
      existing.unshift(enquiry);
      localStorage.setItem("hudson_customer_enquiries", JSON.stringify(existing.slice(0, 100)));
    } catch {
      // Fallback
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
          isLight ? "bg-white border-slate-200 text-slate-900" : "bg-slate-900 border-slate-800 text-white"
        }`}
      >
        {/* Header */}
        <div className="p-5 border-b border-inherit flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Home className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight leading-tight">
                Enquire About {plan.label}
              </h2>
              <p className="text-xs text-slate-400">
                Direct enquiry to Hudson Homes New Home Specialists
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isLight ? "hover:bg-slate-100 text-slate-500" : "hover:bg-slate-800 text-slate-400"
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-5">
          {submitted ? (
            <div className="py-8 text-center flex flex-col items-center justify-center gap-4">
              <div className="h-16 w-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 animate-in zoom-in duration-300">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-emerald-400">Enquiry Received!</h3>
              <p className="text-sm text-slate-400 max-w-sm">
                Thank you, <strong>{fullName}</strong>. Your enquiry for the <strong>{plan.label}</strong>{" "}
                {facadeName ? `(${facadeName})` : ""} has been received. {consultant?.name ? `${consultant.name}` : "Our team"}{" "}
                will reach out to you within 24 hours.
              </p>
              {consultant?.phone && (
                <div className="mt-4 p-4 rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 text-center w-full max-w-sm">
                  <p className="text-xs text-slate-400 mb-1">Need immediate answers?</p>
                  <a
                    href={`tel:${consultant.phone.replace(/\s+/g, "")}`}
                    className="inline-flex items-center gap-2 text-sm font-bold text-amber-400 hover:underline"
                  >
                    <Phone className="h-4 w-4" />
                    Call {consultant.name}: {consultant.phone}
                  </a>
                </div>
              )}
              <button
                type="button"
                onClick={onClose}
                className="mt-2 px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Selected Plan Summary Banner */}
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={plan.url}
                    alt={plan.label}
                    className="w-16 h-12 object-contain bg-white rounded-lg p-0.5 border border-slate-300 shrink-0"
                  />
                  <div>
                    <div className="text-sm font-black">{plan.label}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1">
                        <BedDouble className="h-3 w-3 text-indigo-400" />
                        {plan.beds}
                      </span>
                      <span className="flex items-center gap-1">
                        <Bath className="h-3 w-3 text-cyan-400" />
                        {plan.baths}
                      </span>
                      <span className="flex items-center gap-1">
                        <Car className="h-3 w-3 text-amber-400" />
                        {plan.cars}
                      </span>
                      <span>• {plan.size}m²</span>
                    </div>
                    {facadeName && (
                      <div className="text-[10px] text-amber-400 font-bold flex items-center gap-1 mt-0.5">
                        <Sparkles className="h-2.5 w-2.5" />
                        {facadeName}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Dedicated Consultant Card */}
              {consultant && (
                <div
                  className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                    isLight ? "bg-indigo-50/60 border-indigo-100" : "bg-indigo-950/20 border-indigo-900/40"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
                      {consultant.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold">{consultant.name}</div>
                      <div className="text-[10px] text-slate-400">{consultant.displayCentre}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <a
                      href={`tel:${consultant.phone.replace(/\s+/g, "")}`}
                      className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Call directly"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Call</span>
                    </a>
                    <a
                      href={`mailto:${consultant.email}?subject=Enquiry for ${encodeURIComponent(plan.label)}`}
                      className="p-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Send email"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Email</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sarah Jenkins"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-medium outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all ${
                        isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-950 border-slate-800 text-white"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 0412 345 678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-medium outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all ${
                        isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-950 border-slate-800 text-white"
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. sarah@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-medium outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all ${
                        isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-950 border-slate-800 text-white"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                      Preferred Suburb / Region
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Flagstone, Box Hill"
                      value={suburb}
                      onChange={(e) => setSuburb(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-medium outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all ${
                        isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-950 border-slate-800 text-white"
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Land Status
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      "Looking for Land",
                      "I have Land",
                      "Land Titled",
                    ].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setLandStatus(status)}
                        className={`p-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-center ${
                          landStatus === status
                            ? "bg-indigo-600 border-indigo-500 text-white"
                            : isLight
                            ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                            : "bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Questions or Special Requirements
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Can we customize the alfresco? What are the build times?"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-medium outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all resize-none ${
                      isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-950 border-slate-800 text-white"
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-slate-950 font-black text-xs shadow-lg shadow-indigo-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  <span>{isSubmitting ? "Sending..." : "Submit Enquiry"}</span>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
