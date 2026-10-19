import { useState, useMemo, useEffect } from "react";
import { useSearch } from "@tanstack/react-router";
import {
  ShieldCheck,
  Lock,
  Phone,
  Mail,
  Home,
  Search,
  Sparkles,
  ArrowUp,
  User,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";
import { Logo, HudsonMark } from "@/components/flyer/FlyerTemplates";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useTheme } from "@/lib/theme";
import { CONSULTANTS, type Consultant } from "@/components/flyer/consultants";
import {
  verifyCustomerToken,
  resolveCustomerAccess,
  matchConsultant,
  type VerifiedCustomerSession,
  CLIENT_SESSION_STORAGE_KEY,
} from "@/lib/floorplan-library/customerLinkSecurity";
import {
  loadAllFloorplanLibraryItems,
  filterAndSortFloorplans,
  getFilterBounds,
  type FloorplanLibraryItem,
  type FloorplanFiltersState,
  type HouseTypeFilter,
} from "@/lib/floorplan-library/floorplanLibraryEngine";
import type { FloorplanRecord } from "@/components/flyer/floorplans.data";
import { FloorplanFilterBar } from "./FloorplanFilterBar";
import { FloorplanCard } from "./FloorplanCard";
import { FloorplanPresentationModal } from "./FloorplanPresentationModal";
import { CustomerEnquiryModal } from "./CustomerEnquiryModal";

export function ClientFloorplanLibraryView() {
  const { mode } = useTheme();
  const isLight = mode === "normal";

  // Parse search params with instant window.location fallback
  const searchParams = useSearch({ strict: false }) as Record<string, string | undefined>;
  const windowParams = useMemo(() => {
    if (typeof window === "undefined") return {};
    const sp = new URLSearchParams(window.location.search);
    const result: Record<string, string> = {};
    sp.forEach((v, k) => {
      result[k] = v;
    });
    return result;
  }, []);

  const tokenParam = searchParams?.token || windowParams.token || null;
  const designParam = searchParams?.design || windowParams.design || searchParams?.q || windowParams.q || "";
  const stateParam = searchParams?.state || windowParams.state || searchParams?.division || windowParams.division || null;
  const consultantParam = searchParams?.c || windowParams.c || searchParams?.consultant || windowParams.consultant || null;
  const nopriceParam = searchParams?.noprice || windowParams.noprice || searchParams?.pricing || windowParams.pricing || null;

  // 1. Verify access security: Supports clean short links, signed tokens, or active sessions
  const verifiedSession: VerifiedCustomerSession = useMemo(() => {
    return resolveCustomerAccess({
      token: tokenParam,
      c: consultantParam,
      consultant: consultantParam,
      state: stateParam,
      division: stateParam,
      design: designParam,
      q: designParam,
      noprice: nopriceParam,
      pricing: nopriceParam,
    });
  }, [tokenParam, stateParam, consultantParam, designParam, nopriceParam]);

  // Assigned consultant info
  const consultant: Consultant | undefined = useMemo(() => {
    const id = verifiedSession.consultantId || consultantParam;
    if (id) {
      return matchConsultant(id);
    }
    return CONSULTANTS.find((c) => c.division === verifiedSession.division) || CONSULTANTS[0];
  }, [consultantParam, verifiedSession]);

  // Division (QLD / NSW)
  const [division, setDivision] = useState<"QLD" | "NSW">(verifiedSession.division || "QLD");

  useEffect(() => {
    if (verifiedSession.division && verifiedSession.division !== division) {
      setDivision(verifiedSession.division);
    }
  }, [verifiedSession.division]);

  // Load plans
  const allFloorplans = useMemo(() => loadAllFloorplanLibraryItems(division), [division]);
  const bounds = useMemo(() => getFilterBounds(allFloorplans), [allFloorplans]);

  // Filters state
  const [filters, setFilters] = useState<FloorplanFiltersState>(() => ({
    searchQuery: designParam || verifiedSession.preselectedDesign || "",
    houseType: "All",
    inclusionsTier: "H2",
    division,
    btbOnly: false,
    bedrooms: null,
    bathrooms: null,
    cars: null,
    minWidth: bounds.minWidth,
    maxWidth: bounds.maxWidth,
    lotWidthPreset: "all",
    sizePreset: "all",
    minLength: bounds.minLength,
    maxLength: bounds.maxLength,
    minSize: bounds.minSize,
    maxSize: bounds.maxSize,
    minPrice: bounds.minPrice,
    maxPrice: bounds.maxPrice,
    pricePreset: "all",
    exactMaxWidth: "",
    exactMaxLength: "",
    sortBy: "size-desc",
  }));

  // Sync division change
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      division,
      minWidth: Math.min(prev.minWidth, bounds.minWidth),
      maxWidth: Math.max(prev.maxWidth, bounds.maxWidth),
      minPrice: Math.min(prev.minPrice, bounds.minPrice),
      maxPrice: Math.max(prev.maxPrice, bounds.maxPrice),
    }));
  }, [bounds, division]);

  const handleFilterChange = <K extends keyof FloorplanFiltersState>(
    key: K,
    value: FloorplanFiltersState[K]
  ) => {
    if (key === "division") {
      setDivision(value as "QLD" | "NSW");
    }
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      searchQuery: "",
      houseType: "All",
      inclusionsTier: "H2",
      division,
      btbOnly: false,
      bedrooms: null,
      bathrooms: null,
      cars: null,
      minWidth: bounds.minWidth,
      maxWidth: bounds.maxWidth,
      lotWidthPreset: "all",
      sizePreset: "all",
      minLength: bounds.minLength,
      maxLength: bounds.maxLength,
      minSize: bounds.minSize,
      maxSize: bounds.maxSize,
      minPrice: bounds.minPrice,
      maxPrice: bounds.maxPrice,
      pricePreset: "all",
      exactMaxWidth: "",
      exactMaxLength: "",
      sortBy: "size-desc",
    });
  };

  // Presentation Modal
  const [selectedZoomItem, setSelectedZoomItem] = useState<FloorplanLibraryItem | null>(null);

  // Enquiry Modal
  const [enquiryPlan, setEnquiryPlan] = useState<FloorplanRecord | null>(null);
  const [enquiryFacade, setEnquiryFacade] = useState<string | undefined>(undefined);

  const handleOpenEnquiry = (plan: FloorplanRecord, facadeName?: string) => {
    setEnquiryPlan(plan);
    setEnquiryFacade(facadeName);
  };

  // Filtered items
  const filteredPlans = useMemo(
    () => filterAndSortFloorplans(allFloorplans, filters),
    [allFloorplans, filters]
  );

  // House type counts
  const typeCounts = useMemo(() => {
    const counts: Record<HouseTypeFilter, number> = {
      All: allFloorplans.length,
      "Single Storey": 0,
      "Double Storey": 0,
      "Dual Living": 0,
      "Split Level": 0,
      "Granny Flat": 0,
    };
    for (const plan of allFloorplans) {
      if (counts[plan.housingType] !== undefined) {
        counts[plan.housingType]++;
      }
    }
    return counts;
  }, [allFloorplans]);

  // Scroll to top
  const [showScrollTop, setShowScrollTop] = useState(false);
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // -------------------------------------------------------------
  // SECURITY BARRIER: If token is invalid or missing
  // -------------------------------------------------------------
  if (!verifiedSession.valid) {
    return (
      <div
        className={`min-h-screen ${
          isLight ? "bg-slate-100 text-slate-900" : "bg-slate-950 text-slate-100"
        } flex flex-col items-center justify-center p-4 relative font-sans`}
      >
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 backdrop-blur-xl p-8 text-center shadow-2xl flex flex-col items-center gap-5">
          <div className="mb-2">
            <Logo light={false} size={14} />
          </div>
          <div className="h-16 w-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Lock className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white mb-2">Private Client Gallery</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              This interactive floorplan collection is private and secure. To access, please click the verified link provided by your Hudson Homes New Home Sales Consultant.
            </p>
          </div>
          <div className="w-full pt-4 border-t border-slate-800 flex flex-col gap-2">
            <a
              href="https://www.hudsonhomes.com.au"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer transition-colors"
            >
              Visit hudsonhomes.com.au
            </a>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // SECURE CLIENT GALLERY VIEW
  // -------------------------------------------------------------
  return (
    <div
      className={`min-h-screen ${
        isLight ? "bg-slate-100 text-slate-900" : "bg-slate-950 text-slate-100"
      } flex flex-col font-sans selection:bg-brand-gold/30 relative overflow-x-hidden`}
    >
      {/* Subtle Background */}
      <div
        className={`fixed inset-0 pointer-events-none ${
          isLight
            ? "bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:32px_32px] opacity-25"
            : "bg-[radial-gradient(#334155_1.2px,transparent_1.2px)] [background-size:32px_32px] opacity-20"
        }`}
      />

      {/* Top Header: Clean, Client-Safe with No Staff Linkage */}
      <header
        className={`border-b ${
          isLight ? "border-slate-200/90 bg-white/90 shadow-xs" : "border-slate-800/80 bg-slate-950/80"
        } backdrop-blur-xl sticky top-0 z-40 transition-colors`}
      >
        <div className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
        <div className="w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 h-16 flex items-center justify-between gap-4">
          {/* Left: Branding & Client Badge (No link to /hub or /) */}
          <div className="flex items-center gap-3">
            <div className="flex items-center select-none">
              <HudsonMark size={9} className="sm:hidden" />
              <div className="hidden sm:block">
                <Logo light={!isLight} size={11} />
              </div>
            </div>

            <div className={`border-l ${isLight ? "border-slate-300" : "border-slate-700/80"} pl-3 flex items-center gap-2`}>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold font-mono flex items-center gap-1.5 shadow-xs">
                <ShieldCheck className="h-3 w-3" />
                <span>Client Presentation</span>
              </span>
            </div>
          </div>

          {/* Right: Consultant Contact & Theme Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            {consultant && (
              <div
                data-testid="client-consultant-card"
                className={`hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-2xl border text-xs ${
                  isLight ? "bg-slate-100 border-slate-300 text-slate-800" : "bg-slate-900 border-slate-800 text-slate-200"
                }`}
              >
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold text-[10px] shrink-0">
                  {consultant.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <span data-testid="client-consultant-name" className="font-bold block leading-tight">{consultant.name}</span>
                  <a
                    href={`tel:${consultant.phone.replace(/\s+/g, "")}`}
                    className="text-[10px] text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-1"
                  >
                    <Phone className="h-2.5 w-2.5" />
                    <span>{consultant.phone}</span>
                  </a>
                </div>
              </div>
            )}

            {consultant?.phone && (
              <a
                data-testid="client-consultant-mobile-call"
                href={`tel:${consultant.phone.replace(/\s+/g, "")}`}
                className="md:hidden p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center cursor-pointer"
                title={`Call ${consultant.name}`}
              >
                <Phone className="h-4 w-4" />
              </a>
            )}

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-5 relative z-10 flex flex-col gap-4">
        {/* Banner / Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1
              className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight ${
                isLight ? "text-slate-900" : "text-white"
              }`}
            >
              Explore Home{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-400 to-cyan-400">
                Designs
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Browse floorplans, view interactive dimensions, explore facades, and flip layouts.
            </p>
          </div>

          {/* Telemetry pill */}
          <div
            className={`p-2.5 px-3.5 rounded-2xl border flex items-center gap-3 shrink-0 shadow-sm ${
              isLight ? "bg-white border-slate-200" : "bg-slate-900/80 border-slate-800"
            }`}
          >
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-mono font-black text-xs">
              {filteredPlans.length}
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider leading-none mb-0.5">
                Available Designs
              </span>
              <span className="text-xs font-extrabold leading-none">
                {division === "QLD" ? "Queensland Catalogue" : "NSW Catalogue"}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <FloorplanFilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          totalCount={allFloorplans.length}
          filteredCount={filteredPlans.length}
          typeCounts={typeCounts}
          isLight={isLight}
        />

        {/* Floorplans Grid */}
        {filteredPlans.length === 0 ? (
          <div
            className={`rounded-3xl border p-12 text-center flex flex-col items-center justify-center gap-4 my-8 ${
              isLight ? "bg-white border-slate-200 text-slate-800" : "bg-slate-900/60 border-slate-800 text-slate-200"
            }`}
          >
            <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Search className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold">No designs match your selected filters</h3>
            <p className="text-sm text-slate-400 max-w-md">
              Try adjusting your bedroom, bathroom, or width filters to explore more designs.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md cursor-pointer transition-all active:scale-95"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
            {filteredPlans.map((item) => (
              <FloorplanCard
                key={item.id}
                item={item}
                activeTier={filters.inclusionsTier}
                division={division}
                onOpenZoom={setSelectedZoomItem}
                isLight={isLight}
                isClientMode={true}
                hidePricing={!verifiedSession.showPricing}
                consultantId={consultant?.id}
                onEnquire={handleOpenEnquiry}
              />
            ))}
          </div>
        )}
      </main>

      {/* Floating Scroll to Top */}
      {showScrollTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-40 p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl transition-all cursor-pointer flex items-center justify-center active:scale-90"
          title="Scroll to top"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}

      {/* Presentation Modal (Interactive Large View & Facades) */}
      {selectedZoomItem && (
        <FloorplanPresentationModal
          item={selectedZoomItem}
          onClose={() => setSelectedZoomItem(null)}
          isLight={isLight}
          isClientMode={true}
          division={division}
          hidePricing={!verifiedSession.showPricing}
          onEnquire={(variant, facade) => {
            setSelectedZoomItem(null);
            handleOpenEnquiry(variant, facade);
          }}
        />
      )}

      {/* Customer Enquiry Modal */}
      {enquiryPlan && (
        <CustomerEnquiryModal
          plan={enquiryPlan}
          facadeName={enquiryFacade}
          consultantId={consultant?.id}
          division={division}
          isOpen={!!enquiryPlan}
          onClose={() => setEnquiryPlan(null)}
          isLight={isLight}
        />
      )}
    </div>
  );
}
