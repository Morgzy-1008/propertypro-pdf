import React, { useState, useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Logo } from "@/components/flyer/FlyerTemplates";
import { formatAud } from "@/lib/pricing";
import {
  getTenderByIdAsync,
  saveTenderToIdb,
  decodeTenderFromRemoteLink,
  generateCursiveSignatureDataUrl,
} from "@/lib/tender/tenderStorage";
import { supabase } from "@/integrations/supabase/client";
import type { TenderSubmission } from "@/lib/tender/tenderTypes";
import {
  ShieldCheck,
  CheckCircle2,
  PenTool,
  Check,
  RotateCcw,
  Sparkles,
  Building,
  Home,
  MapPin,
  Calendar,
  AlertCircle,
  FileCheck,
  Type,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/tender-sign/$id")({
  head: () => ({
    meta: [
      { title: "Sign Authority to Proceed | Hudson Homes" },
      {
        name: "description",
        content: "Remote electronic signing portal for Hudson Homes Authority to Proceed and preliminary tender request.",
      },
    ],
  }),
  component: RemoteTenderSignPage,
});

function RemoteTenderSignPage() {
  const { id } = Route.useParams();
  const [tender, setTender] = useState<TenderSubmission | null>(null);
  const [loading, setLoading] = useState(true);

  // Client 1 States
  const [client1Name, setClient1Name] = useState("");
  const [client1Signed, setClient1Signed] = useState(false);
  const [client1Mode, setClient1Mode] = useState<"cursive" | "draw">("cursive");
  const [client1Style, setClient1Style] = useState<1 | 2 | 3 | 4>(1);
  const [client1SigDataUrl, setClient1SigDataUrl] = useState<string>("");
  const canvas1Ref = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing1, setIsDrawing1] = useState(false);
  const [hasDrawn1, setHasDrawn1] = useState(false);

  // Client 2 States
  const [client2Name, setClient2Name] = useState("");
  const [client2Signed, setClient2Signed] = useState(false);
  const [client2Mode, setClient2Mode] = useState<"cursive" | "draw">("cursive");
  const [client2Style, setClient2Style] = useState<1 | 2 | 3 | 4>(1);
  const [client2SigDataUrl, setClient2SigDataUrl] = useState<string>("");
  const canvas2Ref = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing2, setIsDrawing2] = useState(false);
  const [hasDrawn2, setHasDrawn2] = useState(false);

  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function loadData() {
      let found: TenderSubmission | null = null;

      // 1. Check URL query string for compact payload (short URL support ?d=...)
      if (typeof window !== "undefined" && window.location.search) {
        try {
          const searchParams = new URLSearchParams(window.location.search);
          const dParam = searchParams.get("d") || searchParams.get("data");
          if (dParam) {
            const decoded = decodeTenderFromRemoteLink(dParam);
            if (decoded) {
              found = decoded;
              await saveTenderToIdb(decoded).catch(() => {});
              try {
                localStorage.setItem(`hudson_tender_${decoded.id}`, JSON.stringify(decoded));
                localStorage.setItem(`hudson_tender_${decoded.submissionNumber}`, JSON.stringify(decoded));
                localStorage.setItem("hudson_current_tender_draft", JSON.stringify(decoded));
              } catch {}
            }
          }
        } catch (err) {
          console.warn("Could not decode query payload:", err);
        }
      }

      // 2. Check URL hash for embedded payload (#d=... or #data=...)
      if (!found && typeof window !== "undefined" && window.location.hash) {
        try {
          const hash = window.location.hash.replace(/^#/, "");
          const params = new URLSearchParams(hash);
          const dataParam = params.get("d") || params.get("data") || (hash.startsWith("data=") ? hash.replace("data=", "") : "");
          if (dataParam) {
            const decoded = decodeTenderFromRemoteLink(dataParam);
            if (decoded) {
              found = decoded;
              await saveTenderToIdb(decoded).catch(() => {});
              try {
                localStorage.setItem(`hudson_tender_${decoded.id}`, JSON.stringify(decoded));
                localStorage.setItem(`hudson_tender_${decoded.submissionNumber}`, JSON.stringify(decoded));
                localStorage.setItem("hudson_current_tender_draft", JSON.stringify(decoded));
              } catch {}
            }
          }
        } catch (err) {
          console.warn("Could not decode URL fragment payload:", err);
        }
      }

      // 3. Check IndexedDB & Supabase by ID or submissionNumber
      if (!found) {
        found = await getTenderByIdAsync(id);
      }

      // 4. Check LocalStorage by ID
      if (!found) {
        try {
          const direct = localStorage.getItem(`hudson_tender_${id}`);
          if (direct) found = JSON.parse(direct);
        } catch {}
      }

      // 5. Fallback Draft in LocalStorage
      if (!found) {
        try {
          const fallbackDraft = localStorage.getItem("hudson_current_tender_draft");
          if (fallbackDraft) found = JSON.parse(fallbackDraft);
        } catch {}
      }

      if (found) {
        setTender(found);
        const c1N = found.atp.client1Name || `${found.customer1.firstName} ${found.customer1.surname}`.trim();
        const c2N = found.atp.client2Name || `${found.customer2.firstName} ${found.customer2.surname}`.trim();
        setClient1Name(c1N);
        setClient2Name(c2N);
        setClient1Signed(found.atp.client1Signed);
        setClient2Signed(found.atp.client2Signed);
        if (found.atp.client1SignatureDataUrl) setClient1SigDataUrl(found.atp.client1SignatureDataUrl);
        if (found.atp.client2SignatureDataUrl) setClient2SigDataUrl(found.atp.client2SignatureDataUrl);

        if (found.status === "client_signed" || (found.atp.client1Signed && (!found.hasCustomer2 || found.atp.client2Signed))) {
          setSubmitted(true);
        }
      }
      setLoading(false);
    }

    loadData();
  }, [id]);

  // Drawing Canvas 1
  const clearCanvas1 = () => {
    const canvas = canvas1Ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn1(false);
    setClient1SigDataUrl("");
  };

  const startDrawing1 = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing1(true);
    const canvas = canvas1Ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#0284c7";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.beginPath();
    ctx.moveTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
    setHasDrawn1(true);
  };

  const draw1 = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing1) return;
    const canvas = canvas1Ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.lineTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
    ctx.stroke();
  };

  // Drawing Canvas 2
  const clearCanvas2 = () => {
    const canvas = canvas2Ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn2(false);
    setClient2SigDataUrl("");
  };

  const startDrawing2 = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing2(true);
    const canvas = canvas2Ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#0284c7";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.beginPath();
    ctx.moveTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
    setHasDrawn2(true);
  };

  const draw2 = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing2) return;
    const canvas = canvas2Ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.lineTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
    ctx.stroke();
  };

  const handleSignClient1 = () => {
    if (!client1Name.trim()) {
      toast.error("Please enter Client 1 legal printed name");
      return;
    }

    let finalSig = client1SigDataUrl;
    if (client1Mode === "cursive") {
      finalSig = generateCursiveSignatureDataUrl(client1Name, client1Style);
    } else if (client1Mode === "draw" && canvas1Ref.current && hasDrawn1) {
      finalSig = canvas1Ref.current.toDataURL("image/png");
    }

    if (!finalSig) {
      finalSig = generateCursiveSignatureDataUrl(client1Name, client1Style);
    }

    setClient1SigDataUrl(finalSig);
    setClient1Signed(true);
    toast.success(`Primary Purchaser (${client1Name}) signature accepted!`);
  };

  const handleSignClient2 = () => {
    if (!client2Name.trim()) {
      toast.error("Please enter Client 2 legal printed name");
      return;
    }

    let finalSig = client2SigDataUrl;
    if (client2Mode === "cursive") {
      finalSig = generateCursiveSignatureDataUrl(client2Name, client2Style);
    } else if (client2Mode === "draw" && canvas2Ref.current && hasDrawn2) {
      finalSig = canvas2Ref.current.toDataURL("image/png");
    }

    if (!finalSig) {
      finalSig = generateCursiveSignatureDataUrl(client2Name, client2Style);
    }

    setClient2SigDataUrl(finalSig);
    setClient2Signed(true);
    toast.success(`Secondary Purchaser (${client2Name}) signature accepted!`);
  };

  const handleFinalSubmit = async () => {
    if (!tender) return;
    if (!client1Signed) {
      toast.error("Primary Purchaser signature is required before submitting");
      return;
    }
    if (tender.hasCustomer2 && !client2Signed) {
      toast.error("Secondary Purchaser signature is required before submitting");
      return;
    }

    const today = new Date().toLocaleDateString("en-AU", { day: "numeric", month: "numeric", year: "numeric" });
    const finalC1Sig = client1SigDataUrl || generateCursiveSignatureDataUrl(client1Name);
    const finalC2Sig = tender.hasCustomer2 ? client2SigDataUrl || generateCursiveSignatureDataUrl(client2Name) : undefined;

    const updated: TenderSubmission = {
      ...tender,
      status: "client_signed",
      updatedAt: new Date().toISOString(),
      atp: {
        ...tender.atp,
        client1Signed: true,
        client1Name,
        client1SignatureDate: today,
        client1SignatureDataUrl: finalC1Sig,
        client1SignatureStyle: client1Mode,

        client2Signed: tender.hasCustomer2 ? true : tender.atp.client2Signed,
        client2Name: tender.hasCustomer2 ? client2Name : "",
        client2SignatureDate: tender.hasCustomer2 ? today : "",
        client2SignatureDataUrl: finalC2Sig,
        client2SignatureStyle: client2Mode,

        isRemoteSigned: true,
        remoteSignedAt: new Date().toISOString(),
      },
    };

    await saveTenderToIdb(updated);

    try {
      localStorage.setItem(`hudson_tender_${tender.id}`, JSON.stringify(updated));
      localStorage.setItem("hudson_current_tender_draft", JSON.stringify(updated));
      localStorage.setItem(
        "hudson_latest_remote_signature",
        JSON.stringify({
          id: tender.id,
          submissionNumber: tender.submissionNumber,
          atp: updated.atp,
          timestamp: Date.now(),
        })
      );
    } catch {}

    try {
      const bc = new BroadcastChannel("hudson_tender_sync");
      bc.postMessage({ type: "ATP_SIGNED", tender: updated });
      bc.close();
    } catch {}

    // Global cross-device real-time sync via Supabase Realtime Broadcast
    try {
      const liveChannel = supabase.channel(`tender_sync_${tender.submissionNumber}`);
      liveChannel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          liveChannel.send({
            type: "broadcast",
            event: "atp_signed",
            payload: {
              submissionNumber: tender.submissionNumber,
              tenderId: tender.id,
              atp: updated.atp,
              status: "client_signed",
            },
          });
        }
      });
    } catch (e) {
      console.warn("Supabase broadcast error:", e);
    }

    setTender(updated);
    setSubmitted(true);
    toast.success("Authority to Proceed signed successfully! Your consultant's portal is updated live.");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="animate-spin h-8 w-8 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-slate-400">Loading Authority to Proceed document…</p>
        </div>
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
          <AlertCircle className="h-12 w-12 text-amber-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Tender Request Portal</h2>
          <p className="text-xs text-slate-400">
            Please ask your New Home Consultant to click &ldquo;Save Tender to Website&rdquo; to sync the active draft.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Branding */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
              <Logo size={8} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded">
                  Electronic Signing Portal
                </span>
                <span className="text-xs font-mono text-slate-400">Ref: {tender.submissionNumber}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                Authority to Proceed (ATP)
              </h1>
            </div>
          </div>

          <div className="text-left sm:text-right bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80 sm:border-0 sm:bg-transparent">
            <span className="text-[10px] text-slate-400 uppercase block">Preliminary Tender Fee:</span>
            <span className="text-2xl font-black font-mono text-emerald-400">
              {formatAud(tender.atp.feeAmount)}
            </span>
          </div>
        </div>

        {/* Project Summary Card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/60 text-cyan-400 border border-cyan-800">
              <Home className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Selected Design</span>
              <strong className="text-xs text-white">
                {tender.homeSpec.homeDesign || "Home Design"} {tender.homeSpec.facade ? `(${tender.homeSpec.facade} Facade)` : ""}
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-950/60 text-amber-400 border border-amber-800">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Site Location</span>
              <strong className="text-xs text-white truncate block">
                Lot {tender.land.lotNo || "TBA"}, {tender.land.streetName || ""} {tender.land.suburb || ""}
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-800">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">New Home Consultant</span>
              <strong className="text-xs text-white truncate block">
                {tender.newHomeConsultant || "Hudson Homes"} {tender.displayOffice ? `(${tender.displayOffice})` : ""}
              </strong>
            </div>
          </div>
        </div>

        {/* Comprehensive ATP Legal Terms Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <FileCheck className="h-4 w-4 text-cyan-400" /> Terms of Authority &amp; Deposit Crediting Clause
          </h3>

          <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
            <p>
              1. <strong>Site Investigation Authority:</strong> I/We hereby request that a formal Tender document be produced for the construction of my/our new Hudson Home. I/we authorize Hudson Homes to conduct all necessary site inspections, contour surveys, soil test boreholes, and council planning assessments.
            </p>
            <p>
              2. <strong>270-Day Fixed Price Guarantee:</strong> The tender price provided by Hudson Homes will remain fixed for a period of <strong>270 days (9 months)</strong> from the date of tender issuance.
            </p>
            <p>
              3. <strong>Tender Acceptance Fee:</strong> Upon presentation of the completed Tender document, an Acceptance Fee of <strong>$4,400</strong> (or <strong>$6,600</strong> for Knock-Down Rebuild / Dual Occupancy) is payable within 10 days to proceed with architectural working drawings and engineering.
            </p>
            <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200">
              <strong>4. 5% Building Contract Deposit Crediting:</strong> Upon tender acceptance, the formal Master Builders / HIA Building Contract will be prepared. Upon contract signing, the standard <strong>5% contract deposit is required, minus both the Preliminary Fee (Deposit 1) and the Tender Acceptance Fee (Deposit 2) already paid</strong>.
            </div>
          </div>
        </div>

        {/* Client Signatures Section */}
        {submitted ? (
          <div className="bg-emerald-950/40 border border-emerald-500/60 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
            <div className="h-16 w-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-bold text-white">Authority to Proceed Successfully Signed!</h3>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              Thank you for completing your digital signature. Your New Home Consultant has received your signed authorization live and will proceed with ordering your site investigation.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* SIGNATURE BOX 1: PRIMARY PURCHASER */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400 block">
                    1. Primary Purchaser Signature (Client 1)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Legal Name: <strong>{tender.customer1.firstName || ""} {tender.customer1.surname || ""}</strong>
                  </span>
                </div>

                {/* Mode Selector: Cursive Template vs Draw */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setClient1Mode("cursive")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      client1Mode === "cursive"
                        ? "bg-cyan-500 text-slate-950 font-bold shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Type className="h-3 w-3" /> Cursive Font Template
                  </button>
                  <button
                    type="button"
                    onClick={() => setClient1Mode("draw")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      client1Mode === "draw"
                        ? "bg-cyan-500 text-slate-950 font-bold shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <PenTool className="h-3 w-3" /> Draw Signature
                  </button>
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Printed Legal Name *</label>
                <Input
                  value={client1Name}
                  onChange={(e) => setClient1Name(e.target.value)}
                  placeholder="e.g. Jordan Mitchell"
                  className="border-slate-800 bg-slate-950 text-sm font-semibold text-white"
                />
              </div>

              {/* Mode 1: 4 Fancy Cursive Options */}
              {client1Mode === "cursive" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Select your preferred legal cursive signature:</span>
                    <span className="text-[10px] text-cyan-400 font-mono">Style #{client1Style} Selected</span>
                  </div>

                  {(() => {
                    const c1Parts = (client1Name.trim() || "Hudson Client").split(/\s+/);
                    const c1First = c1Parts[0] || "";
                    const c1Last = c1Parts.slice(1).join(" ") || "";
                    const c1Initial = c1Parts.length > 1 ? `${c1First[0]}. ${c1Last}` : c1First;

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Style 1: Full Name - Elegant Script */}
                        <button
                          type="button"
                          onClick={() => setClient1Style(1)}
                          className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between h-28 ${
                            client1Style === 1
                              ? "bg-slate-950 border-cyan-400 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400"
                              : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                              1. Full Name Formal
                            </span>
                            {client1Style === 1 && (
                              <span className="h-4 w-4 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center text-[10px] font-black">
                                ✓
                              </span>
                            )}
                          </div>
                          <div className="text-2xl font-serif italic text-cyan-300 py-1 select-none" style={{ fontFamily: "'Brush Script MT', 'Dancing Script', 'Great Vibes', cursive, serif" }}>
                            {client1Name || "Jordan Mitchell"}
                          </div>
                          <span className="text-[9px] text-slate-500">Classic calligraphy script</span>
                        </button>

                        {/* Style 2: Full Name - Flourish Script */}
                        <button
                          type="button"
                          onClick={() => setClient1Style(2)}
                          className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between h-28 ${
                            client1Style === 2
                              ? "bg-slate-950 border-cyan-400 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400"
                              : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                              2. Full Name Flourish
                            </span>
                            {client1Style === 2 && (
                              <span className="h-4 w-4 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center text-[10px] font-black">
                                ✓
                              </span>
                            )}
                          </div>
                          <div className="text-2xl font-serif italic text-cyan-300 py-1 select-none" style={{ fontFamily: "'Segoe Script', 'Parisienne', 'Alex Brush', cursive, sans-serif" }}>
                            {client1Name || "Jordan Mitchell"}
                          </div>
                          <span className="text-[9px] text-slate-500">Flowing signature flourish</span>
                        </button>

                        {/* Style 3: Initial + Last Name - Executive Script */}
                        <button
                          type="button"
                          onClick={() => setClient1Style(3)}
                          className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between h-28 ${
                            client1Style === 3
                              ? "bg-slate-950 border-amber-400 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400"
                              : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                              3. Initial &amp; Last Name
                            </span>
                            {client1Style === 3 && (
                              <span className="h-4 w-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[10px] font-black">
                                ✓
                              </span>
                            )}
                          </div>
                          <div className="text-2xl font-serif italic text-amber-300 py-1 select-none font-bold" style={{ fontFamily: "'Snell Roundhand', 'Brush Script MT', 'Dancing Script', cursive, serif" }}>
                            {c1Initial || "J. Mitchell"}
                          </div>
                          <span className="text-[9px] text-slate-500">Executive initial calligraphy</span>
                        </button>

                        {/* Style 4: Initial + Last Name - Fluid Pen */}
                        <button
                          type="button"
                          onClick={() => setClient1Style(4)}
                          className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between h-28 ${
                            client1Style === 4
                              ? "bg-slate-950 border-amber-400 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400"
                              : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                              4. Initial &amp; Last Name Fluid
                            </span>
                            {client1Style === 4 && (
                              <span className="h-4 w-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[10px] font-black">
                                ✓
                              </span>
                            )}
                          </div>
                          <div className="text-2xl font-serif italic text-amber-300 py-1 select-none" style={{ fontFamily: "'Lucida Handwriting', 'Segoe Script', 'Great Vibes', cursive, sans-serif" }}>
                            {c1Initial || "J. Mitchell"}
                          </div>
                          <span className="text-[9px] text-slate-500">Modern quick-pen script</span>
                        </button>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* Mode 2: Draw Signature Canvas */
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Draw with your finger or mouse below:</span>
                    <button
                      type="button"
                      onClick={clearCanvas1}
                      className="text-[10.5px] text-slate-400 hover:text-rose-400 flex items-center gap-1"
                    >
                      <RotateCcw className="h-3 w-3" /> Clear Pad
                    </button>
                  </div>

                  <div className="border border-dashed border-slate-700 rounded-2xl bg-slate-950 overflow-hidden touch-none flex items-center justify-center">
                    <canvas
                      ref={canvas1Ref}
                      width={600}
                      height={160}
                      onMouseDown={startDrawing1}
                      onMouseMove={draw1}
                      onMouseUp={() => setIsDrawing1(false)}
                      onTouchStart={startDrawing1}
                      onTouchMove={draw1}
                      onTouchEnd={() => setIsDrawing1(false)}
                      className="w-full h-36 cursor-crosshair block"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  onClick={handleSignClient1}
                  className={`text-xs font-bold gap-1.5 ${
                    client1Signed
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                      : "bg-cyan-500 hover:bg-cyan-400 text-slate-950"
                  }`}
                >
                  <Check className="h-3.5 w-3.5" />
                  {client1Signed ? "Client 1 Signed (Click to Re-sign)" : "Apply Client 1 Signature"}
                </Button>
              </div>
            </div>

            {/* SIGNATURE BOX 2: SECONDARY PURCHASER (IF TWO PURCHASERS) */}
            {tender.hasCustomer2 && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400 block">
                      2. Secondary Purchaser Signature (Client 2)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Legal Name: <strong>{tender.customer2.firstName || ""} {tender.customer2.surname || ""}</strong>
                    </span>
                  </div>

                  {/* Mode Selector: Cursive Template vs Draw */}
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setClient2Mode("cursive")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        client2Mode === "cursive"
                          ? "bg-cyan-500 text-slate-950 font-bold shadow-xs"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Type className="h-3 w-3" /> 4 Fancy Cursive Options
                    </button>
                    <button
                      type="button"
                      onClick={() => setClient2Mode("draw")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        client2Mode === "draw"
                          ? "bg-cyan-500 text-slate-950 font-bold shadow-xs"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <PenTool className="h-3 w-3" /> Draw Signature
                    </button>
                  </div>
                </div>

                {/* Name Input */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Printed Legal Name *</label>
                  <Input
                    value={client2Name}
                    onChange={(e) => setClient2Name(e.target.value)}
                    placeholder="e.g. Sarah Mitchell"
                    className="border-slate-800 bg-slate-950 text-sm font-semibold text-white"
                  />
                </div>

                {/* Mode 1: 4 Fancy Cursive Options */}
                {client2Mode === "cursive" ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Select your preferred legal cursive signature:</span>
                      <span className="text-[10px] text-cyan-400 font-mono">Style #{client2Style} Selected</span>
                    </div>

                    {(() => {
                      const c2Parts = (client2Name.trim() || "Hudson Client").split(/\s+/);
                      const c2First = c2Parts[0] || "";
                      const c2Last = c2Parts.slice(1).join(" ") || "";
                      const c2Initial = c2Parts.length > 1 ? `${c2First[0]}. ${c2Last}` : c2First;

                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Style 1: Full Name - Elegant Script */}
                          <button
                            type="button"
                            onClick={() => setClient2Style(1)}
                            className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between h-28 ${
                              client2Style === 1
                                ? "bg-slate-950 border-cyan-400 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400"
                                : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                1. Full Name Formal
                              </span>
                              {client2Style === 1 && (
                                <span className="h-4 w-4 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center text-[10px] font-black">
                                  ✓
                                </span>
                              )}
                            </div>
                            <div className="text-2xl font-serif italic text-cyan-300 py-1 select-none" style={{ fontFamily: "'Brush Script MT', 'Dancing Script', 'Great Vibes', cursive, serif" }}>
                              {client2Name || "Sarah Mitchell"}
                            </div>
                            <span className="text-[9px] text-slate-500">Classic calligraphy script</span>
                          </button>

                          {/* Style 2: Full Name - Flourish Script */}
                          <button
                            type="button"
                            onClick={() => setClient2Style(2)}
                            className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between h-28 ${
                              client2Style === 2
                                ? "bg-slate-950 border-cyan-400 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400"
                                : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                2. Full Name Flourish
                              </span>
                              {client2Style === 2 && (
                                <span className="h-4 w-4 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center text-[10px] font-black">
                                  ✓
                                </span>
                              )}
                            </div>
                            <div className="text-2xl font-serif italic text-cyan-300 py-1 select-none" style={{ fontFamily: "'Segoe Script', 'Parisienne', 'Alex Brush', cursive, sans-serif" }}>
                              {client2Name || "Sarah Mitchell"}
                            </div>
                            <span className="text-[9px] text-slate-500">Flowing signature flourish</span>
                          </button>

                          {/* Style 3: Initial + Last Name - Executive Script */}
                          <button
                            type="button"
                            onClick={() => setClient2Style(3)}
                            className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between h-28 ${
                              client2Style === 3
                                ? "bg-slate-950 border-amber-400 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400"
                                : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                                3. Initial &amp; Last Name
                              </span>
                              {client2Style === 3 && (
                                <span className="h-4 w-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[10px] font-black">
                                  ✓
                                </span>
                              )}
                            </div>
                            <div className="text-2xl font-serif italic text-amber-300 py-1 select-none font-bold" style={{ fontFamily: "'Snell Roundhand', 'Brush Script MT', 'Dancing Script', cursive, serif" }}>
                              {c2Initial || "S. Mitchell"}
                            </div>
                            <span className="text-[9px] text-slate-500">Executive initial calligraphy</span>
                          </button>

                          {/* Style 4: Initial + Last Name - Fluid Pen */}
                          <button
                            type="button"
                            onClick={() => setClient2Style(4)}
                            className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between h-28 ${
                              client2Style === 4
                                ? "bg-slate-950 border-amber-400 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400"
                                : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                                4. Initial &amp; Last Name Fluid
                              </span>
                              {client2Style === 4 && (
                                <span className="h-4 w-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[10px] font-black">
                                  ✓
                                </span>
                              )}
                            </div>
                            <div className="text-2xl font-serif italic text-amber-300 py-1 select-none" style={{ fontFamily: "'Lucida Handwriting', 'Segoe Script', 'Great Vibes', cursive, sans-serif" }}>
                              {c2Initial || "S. Mitchell"}
                            </div>
                            <span className="text-[9px] text-slate-500">Modern quick-pen script</span>
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  /* Mode 2: Draw Signature Canvas */
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Draw with your finger or mouse below:</span>
                      <button
                        type="button"
                        onClick={clearCanvas2}
                        className="text-[10.5px] text-slate-400 hover:text-rose-400 flex items-center gap-1"
                      >
                        <RotateCcw className="h-3 w-3" /> Clear Pad
                      </button>
                    </div>

                    <div className="border border-dashed border-slate-700 rounded-2xl bg-slate-950 overflow-hidden touch-none flex items-center justify-center">
                      <canvas
                        ref={canvas2Ref}
                        width={600}
                        height={160}
                        onMouseDown={startDrawing2}
                        onMouseMove={draw2}
                        onMouseUp={() => setIsDrawing2(false)}
                        onTouchStart={startDrawing2}
                        onTouchMove={draw2}
                        onTouchEnd={() => setIsDrawing2(false)}
                        className="w-full h-36 cursor-crosshair block"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    onClick={handleSignClient2}
                    className={`text-xs font-bold gap-1.5 ${
                      client2Signed
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                        : "bg-cyan-500 hover:bg-cyan-400 text-slate-950"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                    {client2Signed ? "Client 2 Signed (Click to Re-sign)" : "Apply Client 2 Signature"}
                  </Button>
                </div>
              </div>
            )}

            {/* Final Submission Button */}
            <div className="pt-4">
              <Button
                type="button"
                onClick={handleFinalSubmit}
                className="w-full py-6 text-base font-black uppercase tracking-wider bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-slate-950 rounded-2xl shadow-xl shadow-emerald-500/20"
              >
                <ShieldCheck className="h-5 w-5 mr-2" />
                Authorize &amp; Submit Signed Authority to Proceed
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
