import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import html2canvas from "html2canvas-pro";
import {
  MessageSquarePlus,
  Scissors,
  Send,
  X,
  Bug,
  Lightbulb,
  HelpCircle,
  CheckCircle2,
  Trash2,
  Camera,
  Loader2,
  Sparkles,
  Clock,
  MapPin,
  Mic,
  MicOff,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { getActiveStaffUser, onStaffUserChanged, type StaffProfile } from "@/lib/authSession";
import {
  submitSupportTicket,
  getSupportTickets,
  onSupportTicketsChanged,
  resolveReadablePageTitle,
  type SupportTicket,
  type SupportTicketCategory,
} from "@/lib/supportFeedback";

interface HelpSupportWidgetProps {
  isLight?: boolean;
  compact?: boolean;
}

interface SnipBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export function HelpSupportWidget({ isLight = false, compact = false }: HelpSupportWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSnipping, setIsSnipping] = useState(false);
  const [isCapturingSnip, setIsCapturingSnip] = useState(false);
  const [snipDrag, setSnipDrag] = useState<SnipBox | null>(null);
  const [isDraggingSnip, setIsDraggingSnip] = useState(false);

  const [category, setCategory] = useState<SupportTicketCategory>("issue");
  const [message, setMessage] = useState("");
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | undefined>(undefined);
  const [snipRect, setSnipRect] = useState<
    { x: number; y: number; width: number; height: number } | undefined
  >(undefined);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [showMyHistory, setShowMyHistory] = useState(false);

  const [activeUser, setActiveUser] = useState<StaffProfile | null>(() => getActiveStaffUser());
  const [myTickets, setMyTickets] = useState<SupportTicket[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Voice-to-Text Speech Recognition State
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasSpeech = Boolean(
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      );
      setSpeechSupported(hasSpeech);
    }
  }, []);

  const toggleVoiceRecording = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      setInterimTranscript("");
      return;
    }

    const SpeechClass =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechClass) {
      toast.info("Voice recognition works best on Chrome or Microsoft Edge with microphone access.");
      return;
    }

    try {
      const rec = new SpeechClass();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-AU";

      rec.onstart = () => {
        setIsListening(true);
        setInterimTranscript("");
      };

      rec.onresult = (event: any) => {
        let interim = "";
        let finalChunk = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalChunk += transcript;
          } else {
            interim += transcript;
          }
        }
        setInterimTranscript(interim);
        if (finalChunk) {
          setMessage((prev) => {
            const trimmed = prev.trim();
            const chunkTrimmed = finalChunk.trim();
            if (!trimmed) return chunkTrimmed;
            return `${trimmed} ${chunkTrimmed}`;
          });
        }
      };

      rec.onerror = (e: any) => {
        console.warn("[HelpSupportWidget] Speech recognition error:", e?.error);
        if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
          toast.error("Microphone access was denied. Please allow microphone permissions in browser settings.");
        }
        setIsListening(false);
        setInterimTranscript("");
      };

      rec.onend = () => {
        setIsListening(false);
        setInterimTranscript("");
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.warn("Could not start speech recognition:", err);
      setIsListening(false);
      setInterimTranscript("");
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (dropdownRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const refreshMyTickets = useCallback(() => {
    const user = getActiveStaffUser();
    const all = getSupportTickets();
    if (!user) {
      setMyTickets(all.slice(0, 5));
      return;
    }
    const mine = all.filter(
      (t) =>
        t.authorId === user.id ||
        t.authorEmail.toLowerCase() === (user.email || "").toLowerCase()
    );
    setMyTickets(mine.slice(0, 8));
  }, []);

  useEffect(() => {
    refreshMyTickets();
    const unsubUser = onStaffUserChanged((u) => {
      setActiveUser(u);
      refreshMyTickets();
    });
    const unsubTickets = onSupportTicketsChanged(() => refreshMyTickets());
    return () => {
      unsubUser();
      unsubTickets();
    };
  }, [refreshMyTickets]);

  // Close snipping on Escape key
  useEffect(() => {
    if (!isSnipping) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsSnipping(false);
        setSnipDrag(null);
        setIsDraggingSnip(false);
        setIsOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSnipping]);

  const currentPathname =
    typeof window !== "undefined" ? window.location.pathname + window.location.search : "/hub";
  const currentPageTitle = resolveReadablePageTitle(currentPathname);
  const firstName = (activeUser?.name || "There").split(" ")[0];

  const handleStartSnip = () => {
    setIsOpen(false);
    setSnipDrag(null);
    setIsDraggingSnip(false);
    setIsSnipping(true);
  };

  const captureCroppedRegion = async (rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => {
    setIsCapturingSnip(true);
    try {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vw = document.documentElement.clientWidth || window.innerWidth;
      const vh = document.documentElement.clientHeight || window.innerHeight;
      const sx = window.scrollX || window.pageXOffset || 0;
      const sy = window.scrollY || window.pageYOffset || 0;

      // Capture the full viewport at 1:1 viewport alignment so flex/centered containers never shift horizontally,
      // then slice the exact (rect.x, rect.y, rect.width, rect.height) region onto outCanvas.
      const fullCanvas = await html2canvas(document.documentElement, {
        scale: dpr,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: isLight ? "#f8fafc" : "#020617",
        windowWidth: vw,
        windowHeight: vh,
        width: vw,
        height: vh,
        x: sx,
        y: sy,
        scrollX: 0,
        scrollY: 0,
        ignoreElements: (el) =>
          el.hasAttribute("data-snip-ignore") ||
          el.id === "quote-pdf-export-container" ||
          el.classList.contains("ambient-glow-gold") ||
          el.classList.contains("ambient-glow-cyan"),
        onclone: (clonedDoc) => {
          const allEls = clonedDoc.querySelectorAll<HTMLElement>("*");
          for (let i = 0; i < allEls.length; i++) {
            const el = allEls[i];
            const cls = typeof el.className === "string" ? el.className : "";
            // Prevent Tailwind v4 shadow-2xl / backdrop-blur from rendering dark grey bands in html2canvas
            if (cls.includes("shadow-2xl") || cls.includes("shadow-xl")) {
              el.style.boxShadow = isLight
                ? "0 2px 8px rgba(15, 23, 42, 0.06)"
                : "0 6px 16px rgba(0, 0, 0, 0.35)";
            }
            if (cls.includes("backdrop-blur")) {
              el.style.backdropFilter = "none";
              (el.style as any).webkitBackdropFilter = "none";
            }
          }
        },
      });

      const cropX = Math.max(0, Math.round(rect.x * dpr));
      const cropY = Math.max(0, Math.round(rect.y * dpr));
      const cropW = Math.max(
        1,
        Math.min(fullCanvas.width - cropX, Math.round(rect.width * dpr))
      );
      const cropH = Math.max(
        1,
        Math.min(fullCanvas.height - cropY, Math.round(rect.height * dpr))
      );

      // Downscale only if wider than 1400px while strictly preserving the exact cropped aspect ratio
      const maxDim = 1400;
      let targetW = cropW;
      let targetH = cropH;
      if (targetW > maxDim || targetH > maxDim) {
        const ratio = Math.min(maxDim / targetW, maxDim / targetH);
        targetW = Math.max(1, Math.round(targetW * ratio));
        targetH = Math.max(1, Math.round(targetH * ratio));
      }

      const outCanvas = document.createElement("canvas");
      outCanvas.width = targetW;
      outCanvas.height = targetH;
      const ctx = outCanvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = isLight ? "#f8fafc" : "#020617";
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(
          fullCanvas,
          cropX,
          cropY,
          cropW,
          cropH,
          0,
          0,
          targetW,
          targetH
        );
      }

      const dataUrl = outCanvas.toDataURL("image/png");
      setScreenshotDataUrl(dataUrl);
      setSnipRect({
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    } catch {
      // Fallback visual snapshot if DOM contains untainted canvas/WebGL
      const fallbackCanvas = document.createElement("canvas");
      fallbackCanvas.width = Math.max(320, Math.min(800, Math.round(rect.width)));
      fallbackCanvas.height = Math.max(180, Math.min(500, Math.round(rect.height)));
      const ctx = fallbackCanvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, fallbackCanvas.width, fallbackCanvas.height);
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, fallbackCanvas.width - 4, fallbackCanvas.height - 4);
        ctx.fillStyle = "#f8fafc";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText(`Screen Snip: ${currentPageTitle}`, 20, 42);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "13px monospace";
        ctx.fillText(
          `Region: (${Math.round(rect.x)}, ${Math.round(rect.y)}) — ${Math.round(
            rect.width
          )} × ${Math.round(rect.height)} px`,
          20,
          72
        );
      }
      setScreenshotDataUrl(fallbackCanvas.toDataURL("image/png"));
      setSnipRect(rect);
    } finally {
      setIsCapturingSnip(false);
      setIsSnipping(false);
      setSnipDrag(null);
      setIsDraggingSnip(false);
      setIsOpen(true);
    }
  };

  const handleSnipMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isCapturingSnip) return;
    setIsDraggingSnip(true);
    setSnipDrag({
      startX: e.clientX,
      startY: e.clientY,
      endX: e.clientX,
      endY: e.clientY,
    });
  };

  const handleSnipMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingSnip || !snipDrag) return;
    setSnipDrag((prev) =>
      prev
        ? {
            ...prev,
            endX: e.clientX,
            endY: e.clientY,
          }
        : null
    );
  };

  const handleSnipMouseUp = () => {
    if (!isDraggingSnip || !snipDrag) return;
    setIsDraggingSnip(false);

    const x = Math.min(snipDrag.startX, snipDrag.endX);
    const y = Math.min(snipDrag.startY, snipDrag.endY);
    const width = Math.abs(snipDrag.endX - snipDrag.startX);
    const height = Math.abs(snipDrag.endY - snipDrag.startY);

    // If the user just clicked without dragging a meaningful box, capture a centered 600x380 region around the click
    const finalRect =
      width < 24 || height < 24
        ? {
            x: Math.max(0, Math.min(window.innerWidth - 480, snipDrag.startX - 240)),
            y: Math.max(0, Math.min(window.innerHeight - 300, snipDrag.startY - 150)),
            width: Math.min(480, window.innerWidth),
            height: Math.min(300, window.innerHeight),
          }
        : { x, y, width, height };

    void captureCroppedRegion(finalRect);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") {
              setScreenshotDataUrl(reader.result);
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !screenshotDataUrl) return;

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
      setInterimTranscript("");
    }

    submitSupportTicket({
      category,
      message: message.trim() || "(Attached cropped screen snip)",
      screenshotDataUrl,
      snipRect,
      pageUrl: currentPathname,
      pageTitle: currentPageTitle,
    });

    setMessage("");
    setScreenshotDataUrl(undefined);
    setSnipRect(undefined);
    setJustSubmitted(true);
    refreshMyTickets();

    setTimeout(() => {
      setJustSubmitted(false);
    }, 4500);
  };

  const normalizedSnipRect = snipDrag
    ? {
        left: Math.min(snipDrag.startX, snipDrag.endX),
        top: Math.min(snipDrag.startY, snipDrag.endY),
        width: Math.abs(snipDrag.endX - snipDrag.startX),
        height: Math.abs(snipDrag.endY - snipDrag.startY),
      }
    : null;

  return (
    <>
      {/* Top Toolbar Trigger Button */}
      <div className="relative shrink-0" data-snip-ignore="true">
        <button
          ref={triggerRef}
          type="button"
          data-testid="help-support-trigger-btn"
          onClick={() => {
            setIsOpen((prev) => !prev);
            setJustSubmitted(false);
          }}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full border transition-all text-xs font-bold shadow-xs cursor-pointer shrink-0 ${
            isOpen
              ? isLight
                ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                : "bg-emerald-500 border-emerald-400 text-slate-950 shadow-md"
              : isLight
                ? "bg-white/90 border-slate-300 text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-900"
                : "bg-slate-900/90 border-slate-700/80 text-slate-200 hover:bg-slate-800 hover:border-emerald-500/50 hover:text-emerald-300"
          }`}
          title="Help, Support & Feedback — Report an issue or snip the screen"
        >
          <MessageSquarePlus
            className={`h-3.5 w-3.5 shrink-0 ${
              isOpen ? (isLight ? "text-white" : "text-slate-950") : "text-emerald-500"
            }`}
          />
          <span className={compact ? "hidden xl:inline" : "hidden sm:inline"}>Help &amp; Support</span>
        </button>

        {/* Dropdown Chat Box rendered via Portal so it never clips inside overflow-hidden headers */}
        {isOpen &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              ref={dropdownRef}
              data-snip-ignore="true"
              data-testid="help-support-dropdown"
              onClick={(e) => e.stopPropagation()}
              className={`fixed top-14 right-3 sm:right-6 w-[calc(100vw-1.5rem)] max-w-[390px] rounded-2xl border shadow-2xl overflow-hidden z-[9991] animate-in fade-in slide-in-from-top-2 duration-150 ${
                isLight
                  ? "bg-white border-slate-200 text-slate-900 shadow-slate-900/15"
                  : "bg-slate-950/95 border-slate-800 text-slate-100 backdrop-blur-xl shadow-black/60"
              }`}
            >
              {/* Chat Box Header */}
              <div
                className={`px-4 py-3 border-b flex items-center justify-between ${
                  isLight
                    ? "bg-gradient-to-r from-emerald-50/90 via-white to-teal-50/60 border-slate-200"
                    : "bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border-slate-800"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 border ${
                      isLight
                        ? "bg-emerald-100 border-emerald-300 text-emerald-700"
                        : "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                    }`}
                  >
                    <MessageSquarePlus className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3
                        className={`text-xs font-extrabold tracking-wide uppercase ${
                          isLight ? "text-slate-900" : "text-white"
                        }`}
                      >
                        Help &amp; Support Chat
                      </h3>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <p
                      className={`text-[11px] truncate ${
                        isLight ? "text-slate-500" : "text-slate-400"
                      }`}
                    >
                      Direct to Morgan &bull; Bug reports &amp; ideas
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  data-testid="support-close-btn"
                  onClick={() => setIsOpen(false)}
                  className={`h-7 w-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                    isLight
                      ? "hover:bg-slate-200/70 text-slate-500 hover:text-slate-900"
                      : "hover:bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                  aria-label="Close support chat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

                {/* Chat Body */}
                <form onSubmit={handleSubmit} className="p-4 space-y-3.5 max-h-[80vh] overflow-y-auto">
                  {/* Active Page Context Pill */}
                  <div
                    className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl border text-[11px] ${
                      isLight
                        ? "bg-slate-50 border-slate-200 text-slate-600"
                        : "bg-slate-900/70 border-slate-800 text-slate-300"
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate font-medium">
                      <MapPin className="h-3 w-3 text-emerald-500 shrink-0" />
                      <span className="truncate">{currentPageTitle}</span>
                    </span>
                    <span className="text-[10px] font-mono opacity-75 shrink-0">
                      {activeUser?.name || "Staff"}
                    </span>
                  </div>

                  {/* Conversational Greeting Bubble */}
                  <div
                    className={`p-3 rounded-2xl rounded-tl-sm text-xs leading-relaxed border ${
                      isLight
                        ? "bg-emerald-50/70 border-emerald-200/80 text-slate-700"
                        : "bg-emerald-950/25 border-emerald-500/20 text-slate-200"
                    }`}
                  >
                    Hi <strong className="font-bold">{firstName}</strong>! Spot a bug, pricing hiccup, or have feedback to make the website better? Write a quick note below or{" "}
                    <strong className="font-semibold text-emerald-600 dark:text-emerald-400">
                      crop &amp; snip
                    </strong>{" "}
                    part of the page so Morgan can fix it directly.
                  </div>

                  {/* Category Selector Pills */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      data-testid="support-category-issue"
                      onClick={() => setCategory("issue")}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        category === "issue"
                          ? isLight
                            ? "bg-rose-50 border-rose-400 text-rose-800 shadow-2xs"
                            : "bg-rose-500/20 border-rose-500/50 text-rose-300"
                          : isLight
                            ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Bug className="h-3 w-3" />
                      <span>Problem</span>
                    </button>

                    <button
                      type="button"
                      data-testid="support-category-feedback"
                      onClick={() => setCategory("feedback")}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        category === "feedback"
                          ? isLight
                            ? "bg-amber-50 border-amber-400 text-amber-900 shadow-2xs"
                            : "bg-amber-500/20 border-amber-500/50 text-amber-300"
                          : isLight
                            ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Lightbulb className="h-3 w-3" />
                      <span>Feedback</span>
                    </button>

                    <button
                      type="button"
                      data-testid="support-category-question"
                      onClick={() => setCategory("question")}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        category === "question"
                          ? isLight
                            ? "bg-cyan-50 border-cyan-400 text-cyan-900 shadow-2xs"
                            : "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                          : isLight
                            ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <HelpCircle className="h-3 w-3" />
                      <span>Question</span>
                    </button>
                  </div>

                  {/* Voice-to-Text Dictation Button */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      data-testid="support-voice-dictate-btn"
                      onClick={toggleVoiceRecording}
                      className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold border flex items-center justify-between transition-all cursor-pointer shadow-2xs ${
                        isListening
                          ? "bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse"
                          : isLight
                            ? "bg-emerald-50/70 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                            : "bg-emerald-950/25 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/30"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {isListening ? (
                          <>
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                            </span>
                            <Mic className="h-3.5 w-3.5 text-rose-400" />
                            <span>Listening... Click to Finish</span>
                          </>
                        ) : (
                          <>
                            <Mic className="h-3.5 w-3.5 text-emerald-500" />
                            <span>Talk &amp; Explain (Voice to Text)</span>
                          </>
                        )}
                      </span>
                      <span className="text-[10px] opacity-75 font-normal">
                        {isListening ? "Transcribing live" : "Hands-free"}
                      </span>
                    </button>
                  </div>

                  {/* Live Interim Transcript Bubble */}
                  {isListening && interimTranscript && (
                    <div
                      data-testid="support-voice-interim"
                      className="p-2 rounded-xl bg-rose-950/30 border border-rose-500/40 text-[11px] text-rose-200 italic flex items-center gap-1.5"
                    >
                      <Volume2 className="h-3 w-3 text-rose-400 shrink-0 animate-bounce" />
                      <span className="truncate">&ldquo;{interimTranscript}&rdquo;</span>
                    </div>
                  )}

                  {/* Message Input */}
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      data-testid="support-message-input"
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onPaste={handlePaste}
                      placeholder={
                        category === "issue"
                          ? "Describe what happened or click 'Talk & Explain' above to speak..."
                          : category === "feedback"
                            ? "Share your idea or click 'Talk & Explain' above to speak..."
                            : "Ask a question about how to use a feature..."
                      }
                      className={`w-full rounded-xl border p-3 pr-9 text-xs leading-relaxed resize-none focus:outline-none focus:ring-2 transition-all ${
                        isLight
                          ? "bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-emerald-500/30 focus:border-emerald-500"
                          : "bg-slate-900/90 border-slate-800 text-white placeholder:text-slate-500 focus:ring-emerald-500/30 focus:border-emerald-500"
                      }`}
                    />
                    <button
                      type="button"
                      data-testid="support-textarea-mic-btn"
                      onClick={toggleVoiceRecording}
                      className={`absolute right-2.5 bottom-2.5 p-1 rounded-lg transition-all cursor-pointer ${
                        isListening
                          ? "text-rose-400 bg-rose-500/20 animate-pulse"
                          : isLight
                            ? "text-slate-400 hover:text-emerald-600 hover:bg-slate-200/60"
                            : "text-slate-500 hover:text-emerald-400 hover:bg-slate-800"
                      }`}
                      title={isListening ? "Stop listening" : "Click to speak"}
                    >
                      {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  {/* Screen Crop & Snip Attachment Area */}
                  {screenshotDataUrl ? (
                    <div
                      data-testid="support-snip-preview"
                      className={`p-2.5 rounded-xl border space-y-2 ${
                        isLight
                          ? "bg-emerald-50/50 border-emerald-200"
                          : "bg-emerald-950/20 border-emerald-500/30"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <Camera className="h-3.5 w-3.5" />
                          <span>Cropped Screen Snip Attached</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleStartSnip}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer"
                          >
                            Re-Snip
                          </button>
                          <button
                            type="button"
                            data-testid="support-remove-snip-btn"
                            onClick={() => {
                              setScreenshotDataUrl(undefined);
                              setSnipRect(undefined);
                            }}
                            className="text-rose-500 hover:text-rose-400 p-0.5 cursor-pointer"
                            title="Remove attached snip"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div
                        className={`rounded-lg overflow-hidden border p-1.5 flex items-center justify-center ${
                          isLight
                            ? "border-slate-300 bg-slate-100/80"
                            : "border-slate-700 bg-slate-950"
                        }`}
                      >
                        <img
                          src={screenshotDataUrl}
                          alt="Cropped website snip"
                          className="max-h-40 w-auto max-w-full object-contain rounded shadow-xs"
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      data-testid="support-snip-screen-btn"
                      onClick={handleStartSnip}
                      className={`w-full py-2 px-3 rounded-xl border border-dashed text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        isLight
                          ? "border-emerald-400/80 bg-emerald-50/50 text-emerald-800 hover:bg-emerald-100/70"
                          : "border-emerald-500/40 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-950/40 hover:border-emerald-400"
                      }`}
                    >
                      <Scissors className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Crop &amp; Snip a Section of the Page</span>
                    </button>
                  )}

                  {/* Inline Confirmation Message */}
                  {justSubmitted && (
                    <div
                      data-testid="support-submitted-banner"
                      className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
                        isLight
                          ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                          : "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>Logged in Morgan's Support Portal! Thank you.</span>
                    </div>
                  )}

                  {/* Submit Action */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowMyHistory((prev) => !prev)}
                      className={`text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                        isLight
                          ? "text-slate-500 hover:text-slate-800"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      <span>My Sent Notes ({myTickets.length})</span>
                    </button>

                    <button
                      type="submit"
                      data-testid="support-submit-btn"
                      disabled={!message.trim() && !screenshotDataUrl}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Send to Support Log</span>
                    </button>
                  </div>

                  {/* User's Recent Sent Notes */}
                  {showMyHistory && (
                    <div
                      className={`pt-3 mt-2 border-t space-y-2 ${
                        isLight ? "border-slate-200" : "border-slate-800"
                      }`}
                    >
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Your Recent Support &amp; Feedback Notes
                      </div>
                      {myTickets.length === 0 ? (
                        <p className="text-[11px] text-slate-400 py-2 text-center">
                          No notes submitted yet.
                        </p>
                      ) : (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {myTickets.map((t) => (
                            <div
                              key={t.id}
                              className={`p-2 rounded-lg border text-[11px] flex items-start justify-between gap-2 ${
                                isLight
                                  ? "bg-slate-50 border-slate-200"
                                  : "bg-slate-900/60 border-slate-800"
                              }`}
                            >
                              <div className="min-w-0">
                                <p className="font-medium truncate">{t.message}</p>
                                <span className="text-[9.5px] text-slate-400 block">
                                  {t.pageTitle} &bull;{" "}
                                  {new Date(t.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase shrink-0 ${
                                  t.status === "resolved"
                                    ? "bg-emerald-500/20 text-emerald-500"
                                    : "bg-amber-500/20 text-amber-500"
                                }`}
                              >
                                {t.status === "resolved" ? "Resolved" : "Logged"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </form>
            </div>,
            document.body
          )}
      </div>

      {/* Fullscreen Interactive Screen Crop & Snip Overlay */}
      {isSnipping &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            data-snip-ignore="true"
            data-testid="screen-snip-overlay"
            onMouseDown={handleSnipMouseDown}
            onMouseMove={handleSnipMouseMove}
            onMouseUp={handleSnipMouseUp}
            className="fixed inset-0 z-[9999] cursor-crosshair select-none"
            style={{
              backgroundColor: normalizedSnipRect ? "transparent" : "rgba(2, 6, 23, 0.35)",
            }}
          >
            {/* Floating Top Instruction Banner */}
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[10000] pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-full bg-slate-950/95 border border-emerald-500/50 text-white shadow-2xl">
              {isCapturingSnip ? (
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Capturing cropped snip...</span>
                </div>
              ) : (
                <>
                  <Scissors className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold">
                    Click &amp; drag over any section of the page to snip and attach
                  </span>
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsSnipping(false);
                      setSnipDrag(null);
                      setIsDraggingSnip(false);
                      setIsOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold cursor-pointer"
                  >
                    Cancel (Esc)
                  </button>
                </>
              )}
            </div>

            {/* Selection Box with Spotlight Cutout */}
            {normalizedSnipRect && (
              <div
                style={{
                  position: "fixed",
                  left: normalizedSnipRect.left,
                  top: normalizedSnipRect.top,
                  width: Math.max(2, normalizedSnipRect.width),
                  height: Math.max(2, normalizedSnipRect.height),
                  boxShadow: "0 0 0 9999px rgba(2, 6, 23, 0.55)",
                }}
                className="border-2 border-emerald-400 rounded-md pointer-events-none"
              >
                <div className="absolute -bottom-6 right-0 px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-mono text-[10px] font-black shadow">
                  {Math.round(normalizedSnipRect.width)} &times;{" "}
                  {Math.round(normalizedSnipRect.height)} px
                </div>
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
