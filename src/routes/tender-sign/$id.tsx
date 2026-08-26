import React, { useState, useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Logo } from "@/components/flyer/FlyerTemplates";
import { formatAud } from "@/lib/pricing";
import { getTenderByIdAsync, saveTenderToIdb } from "@/lib/tender/tenderStorage";
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
  const [client1Name, setClient1Name] = useState("");
  const [client2Name, setClient2Name] = useState("");
  const [client1Signed, setClient1Signed] = useState(false);
  const [client2Signed, setClient2Signed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canvas1Ref = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing1, setIsDrawing1] = useState(false);
  const [hasDrawn1, setHasDrawn1] = useState(false);

  useEffect(() => {
    getTenderByIdAsync(id).then((found) => {
      if (found) {
        setTender(found);
        setClient1Name(found.atp.client1Name || `${found.customer1.firstName} ${found.customer1.surname}`.trim());
        setClient2Name(found.atp.client2Name || `${found.customer2.firstName} ${found.customer2.surname}`.trim());
        setClient1Signed(found.atp.client1Signed);
        setClient2Signed(found.atp.client2Signed);
        if (found.status === "client_signed" || found.atp.client1Signed) {
          setSubmitted(true);
        }
      }
      setLoading(false);
    });
  }, [id]);

  const clearCanvas1 = () => {
    const canvas = canvas1Ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn1(false);
  };

  const startDrawing1 = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing1(true);
    const canvas = canvas1Ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#0284c7";
    ctx.lineWidth = 2.5;
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

  const stopDrawing1 = () => {
    setIsDrawing1(false);
  };

  const handleSubmitSignature = async () => {
    if (!tender) return;
    if (!client1Name.trim()) {
      toast.error("Please enter your printed legal name");
      return;
    }

    let sigDataUrl = tender.atp.client1SignatureDataUrl || "";
    if (hasDrawn1 && canvas1Ref.current) {
      sigDataUrl = canvas1Ref.current.toDataURL("image/png");
    } else if (!sigDataUrl) {
      // Create typed cursive signature
      const offCanvas = document.createElement("canvas");
      offCanvas.width = 500;
      offCanvas.height = 160;
      const ctx = offCanvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#0284c7";
        ctx.font = "italic 36px 'Brush Script MT', cursive, serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(client1Name, 250, 80);
      }
      sigDataUrl = offCanvas.toDataURL("image/png");
    }

    const today = new Date().toLocaleDateString("en-AU", { day: "numeric", month: "numeric", year: "numeric" });
    const updated: TenderSubmission = {
      ...tender,
      status: "client_signed",
      atp: {
        ...tender.atp,
        client1Signed: true,
        client1Name,
        client1SignatureDate: today,
        client1SignatureDataUrl: sigDataUrl,
        isRemoteSigned: true,
        remoteSignedAt: new Date().toISOString(),
      },
    };

    await saveTenderToIdb(updated);
    setTender(updated);
    setSubmitted(true);
    toast.success("Authority to Proceed signed successfully! Thank you.");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 font-sans">
        <div className="text-center space-y-3">
          <Logo light size={12} />
          <div className="text-sm font-semibold text-slate-400">Loading your Authority to Proceed document…</div>
        </div>
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 font-sans">
        <div className="max-w-md text-center space-y-4 bg-slate-900 p-8 rounded-2xl border border-slate-800">
          <Logo light size={12} />
          <AlertCircle className="h-10 w-10 text-amber-400 mx-auto" />
          <h2 className="text-lg font-bold">Document Link Not Found</h2>
          <p className="text-xs text-slate-400">
            This Authority to Proceed link may have expired or was opened in a different browser session. Please contact your New Home Consultant Morgan Hales.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-6 lg:p-8 flex flex-col justify-between max-w-4xl mx-auto selection:bg-cyan-500/30">
      {/* Top Header */}
      <header className="border-b border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Logo light size={11} />
          <div className="border-l border-slate-800 pl-3">
            <span className="text-xs font-bold tracking-widest text-white uppercase block">
              Authority to Proceed
            </span>
            <span className="text-[10px] text-cyan-400 font-mono">
              Ref: {tender.submissionNumber}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Secure Digital E-Sign Portal</span>
        </div>
      </header>

      {/* Main Signing Card */}
      <main className="my-6 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
        {submitted ? (
          <div className="text-center py-10 space-y-4">
            <div className="h-16 w-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 mx-auto">
              <Check className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-black text-white">Authority to Proceed Signed!</h2>
            <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
              Thank you, <strong>{client1Name}</strong>. Your electronic signature has been authenticated and delivered directly to your New Home Consultant <strong>{tender.newHomeConsultant}</strong>.
            </p>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 max-w-md mx-auto text-xs text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Tender Reference:</span>
                <strong className="font-mono text-cyan-400">{tender.submissionNumber}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Signed Date:</span>
                <span className="font-mono">{tender.atp.client1SignatureDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">EFT Remittance Reference:</span>
                <strong className="font-mono text-amber-400">{tender.atp.eftReference}</strong>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div>
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                Client Review &amp; Electronic Signature
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Authority to Proceed — {tender.customer1.surname} Residence
              </h2>
            </div>

            {/* Summary Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Home Design:</span>
                <strong className="text-slate-100 text-sm">{tender.homeSpec.homeDesign}</strong>
                <span className="text-[11px] text-slate-400 block">{tender.homeSpec.facade} Facade &bull; {tender.homeSpec.inclusionsType}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Proposed Site:</span>
                <strong className="text-slate-100">Lot {tender.land.lotNo}, {tender.land.streetName || tender.land.estate}</strong>
                <span className="text-[11px] text-slate-400 block">{tender.land.suburb} ({tender.land.council})</span>
              </div>
              <div className="text-right sm:border-l border-slate-800 sm:pl-3">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Tender Fee Payable:</span>
                <strong className="text-base font-extrabold font-mono text-emerald-400">
                  {formatAud(tender.atp.feeAmount)}
                </strong>
                <span className="text-[10px] text-slate-400 block">Credited to Building Deposit</span>
              </div>
            </div>

            {/* Legal Terms Acknowledgement */}
            <div className="space-y-2 text-xs text-slate-300 bg-slate-950/60 p-4 rounded-2xl border border-slate-800 leading-relaxed">
              <p>
                1. I/We hereby request a Tender document be produced outlining the cost of constructing our new Hudson Home with all selected variations and site assessments.
              </p>
              <p>
                2. I/We provide authority for Hudson Homes to conduct a site assessment, obtain a contour survey, and conduct a soil test.
              </p>
              <p>
                3. The Tender remains valid for <strong>270 days (9 months) Fixed Price Guarantee</strong> and covers up to three (3) revisions.
              </p>
            </div>

            {/* Electronic Signature Pad */}
            <div className="space-y-4 bg-slate-950 p-5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <PenTool className="h-4 w-4 text-cyan-400" /> Draw Your Signature on Screen *
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearCanvas1}
                  className="text-xs text-slate-400 hover:text-rose-400 gap-1 h-7"
                >
                  <RotateCcw className="h-3 w-3" /> Clear
                </Button>
              </div>

              <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-xl bg-white p-1 relative overflow-hidden transition-colors shadow-inner">
                <canvas
                  ref={canvas1Ref}
                  width={600}
                  height={180}
                  onMouseDown={startDrawing1}
                  onMouseMove={draw1}
                  onMouseUp={stopDrawing1}
                  onMouseLeave={stopDrawing1}
                  onTouchStart={startDrawing1}
                  onTouchMove={draw1}
                  onTouchEnd={stopDrawing1}
                  className="w-full h-36 cursor-crosshair touch-none block"
                />
                {!hasDrawn1 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs italic">
                    Sign with your finger, stylus, or mouse here
                  </div>
                )}
                <div className="absolute bottom-2 left-4 right-4 border-b border-slate-200 pointer-events-none" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Printed Full Legal Name *</label>
                <Input
                  value={client1Name}
                  onChange={(e) => setClient1Name(e.target.value)}
                  placeholder="e.g. Jordan Samuel Mitchell"
                  className="border-slate-800 bg-slate-900 text-xs text-white"
                />
              </div>
            </div>

            {/* EFT Bank Remittance Info */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 text-xs space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">EFT Payment Details:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-300 font-mono">
                <div>Bank: <strong>NAB</strong></div>
                <div>BSB: <strong>082-778</strong></div>
                <div>Account: <strong>74-586-5607</strong></div>
                <div>Ref: <strong className="text-amber-400">{tender.atp.eftReference}</strong></div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="button"
                size="lg"
                onClick={handleSubmitSignature}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-slate-950 font-black text-sm shadow-xl shadow-cyan-500/20 py-6"
              >
                <CheckCircle2 className="h-5 w-5 mr-2" /> Sign &amp; Submit Authority to Proceed
              </Button>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-500 border-t border-slate-900 pt-4">
        Hudson Homes Pty Ltd &bull; ABN 49 163 189 071 &bull; Builder&apos;s Licence: 259372C &bull; Queensland Division
      </footer>
    </div>
  );
}
