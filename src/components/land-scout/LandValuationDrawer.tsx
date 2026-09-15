import {
  X,
  TrendingUp,
  Award,
  DollarSign,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Scale,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { type LandParcel } from "@/lib/land-scout/landScoutTypes";
import { useTheme } from "@/lib/theme";

interface LandValuationDrawerProps {
  parcel: LandParcel | null;
  onClose: () => void;
  onPackageInFlyer: (parcel: LandParcel) => void;
}

export function LandValuationDrawer({
  parcel,
  onClose,
  onPackageInFlyer,
}: LandValuationDrawerProps) {
  const { mode } = useTheme();
  const isLight = mode === "normal";

  if (!parcel) return null;

  const val = parcel.valuation;
  const isDiscount = val.priceDeltaPercent <= 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs p-0 sm:p-4 transition-all"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`h-full w-full max-w-xl ${isLight ? "bg-white text-slate-900 border-slate-200" : "bg-slate-900 text-slate-100 border-slate-800"} border-l sm:border sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200`}>
        {/* Header */}
        <div className={`p-5 border-b flex items-center justify-between ${isLight ? "bg-slate-50 border-slate-200" : "border-slate-800 bg-slate-950/80"}`}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-brand-gold/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-base font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                  Lot {parcel.lotNumber} · Value &amp; Yield Appraisal
                </h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                    val.dealScoreRating === "strong_buy"
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                      : val.dealScoreRating === "speculative_buy"
                      ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                      : "bg-amber-500/15 border-amber-500/40 text-amber-300"
                  }`}
                >
                  Deal Score: {val.dealScorePoints}/100
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {parcel.estate ? `${parcel.estate}, ` : ""}{parcel.suburb} {parcel.state} ({parcel.landSizeM2}m² · {parcel.frontageM}m Frontage)
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close drawer"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
          {/* Executive Recommendation Banner */}
          <div
            className={`p-4 rounded-xl border ${
              val.acquisitionRecommendation === "Hudson Spec Purchase"
                ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-200"
                : "border-brand-gold/40 bg-amber-950/20 text-amber-200"
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm mb-1">
              {val.acquisitionRecommendation === "Hudson Spec Purchase" ? (
                <Award className="h-4 w-4 text-emerald-400" />
              ) : (
                <ShieldCheck className="h-4 w-4 text-amber-400" />
              )}
              <span>Acquisition Verdict: {val.acquisitionRecommendation}</span>
            </div>
            <p className={`text-xs ${isLight ? "text-slate-700" : "text-slate-300"} leading-relaxed`}>
              {val.dealSummary}
            </p>
          </div>

          {/* 1. Suburb Land Rate Comparison */}
          <div className="space-y-3">
            <h3 className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-slate-600" : "text-slate-400"} flex items-center gap-1.5`}>
              <TrendingUp className="h-3.5 w-3.5 text-brand-gold" />
              1. Suburb Land Value Benchmarks
            </h3>

            <div className="grid grid-cols-3 gap-2.5">
              <div className={`p-3 rounded-xl border text-center ${isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"}`}>
                <span className={`text-[10px] ${isLight ? "text-slate-600" : "text-slate-400"} block mb-0.5`}>Listed Price</span>
                <span className={`text-sm font-bold ${isLight ? "text-slate-900" : "text-white"}`}>${parcel.price.toLocaleString()}</span>
                <span className={`text-[10px] ${isLight ? "text-slate-500" : "text-slate-400"} block font-mono`}>${parcel.pricePerM2}/m²</span>
              </div>

              <div className={`p-3 rounded-xl border text-center ${isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"}`}>
                <span className={`text-[10px] ${isLight ? "text-slate-600" : "text-slate-400"} block mb-0.5`}>Suburb Median</span>
                <span className={`text-sm font-bold ${isLight ? "text-slate-900" : "text-slate-300"}`}>${val.medianSuburbLandPrice.toLocaleString()}</span>
                <span className={`text-[10px] ${isLight ? "text-slate-500" : "text-slate-400"} block font-mono`}>${val.medianSuburbPricePerM2}/m²</span>
              </div>

              <div
                className={`p-3 rounded-xl border text-center ${
                  isDiscount
                    ? isLight ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
                    : isLight ? "bg-rose-50 border-rose-300 text-rose-800" : "bg-rose-950/30 border-rose-500/40 text-rose-300"
                }`}
              >
                <span className={`text-[10px] ${isLight ? "text-slate-600" : "text-slate-400"} block mb-0.5`}>Variance vs Median</span>
                <span className="text-sm font-bold">
                  {val.priceDeltaPercent > 0 ? `+${val.priceDeltaPercent}%` : `${val.priceDeltaPercent}%`}
                </span>
                <span className="text-[10px] block font-semibold">
                  {isDiscount ? "Discounted / Under Market" : "Premium Above Market"}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Commercial Turnkey & Equity Margin Analysis */}
          <div className="space-y-3">
            <h3 className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-slate-600" : "text-slate-400"} flex items-center gap-1.5`}>
              <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
              2. Turnkey Yield &amp; Finished Resale Projection
            </h3>

            <div className={`rounded-xl border p-4 space-y-2.5 text-xs ${isLight ? "bg-slate-50 border-slate-200" : "border-slate-800 bg-slate-950/70"}`}>
              <div className={`flex justify-between items-center ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                <span>Land Acquisition Price:</span>
                <span className={`font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>${parcel.price.toLocaleString()}</span>
              </div>
              <div className={`flex justify-between items-center ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                <span>Estimated Hudson Build (Turnkey 4 Bed Single Storey):</span>
                <span className={`font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>${val.estimatedBuildCost.toLocaleString()}</span>
              </div>
              <div className={`flex justify-between items-center pt-2 border-t ${isLight ? "border-slate-200 text-slate-800" : "border-slate-800 text-slate-200"} font-medium`}>
                <span>Total Turnkey Package Cost:</span>
                <span className={`font-bold ${isLight ? "text-amber-700" : "text-amber-300"}`}>${val.estimatedTurnkeyTotalCost.toLocaleString()}</span>
              </div>

              <div className={`flex justify-between items-center pt-2 border-t ${isLight ? "border-slate-200 text-slate-800" : "border-slate-800/80 text-slate-200"}`}>
                <span>Projected Completed Home Resale Value (GRV):</span>
                <span className={`font-bold ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>${val.estimatedCompletedMarketValue.toLocaleString()}</span>
              </div>

              <div className={`p-2.5 rounded-lg flex justify-between items-center ${isLight ? "bg-emerald-100/70 border border-emerald-300 text-emerald-900" : "bg-emerald-500/10 border border-emerald-500/30"}`}>
                <span className={`font-bold ${isLight ? "text-emerald-900" : "text-emerald-300"}`}>Estimated Gross Equity Buffer:</span>
                <span className={`text-sm font-extrabold ${isLight ? "text-emerald-800" : "text-emerald-400"}`}>
                  +${val.projectedGrossEquityMargin.toLocaleString()} ({val.projectedEquityMarginPercent}%)
                </span>
              </div>
              <p className={`text-[10px] ${isLight ? "text-slate-500" : "text-slate-400"} pt-1`}>
                *Based on recent median 4-bed 2-bath 2-car new builds in {parcel.suburb}. Provides healthy equity buffer for client bank valuation and builder speculative stock.
              </p>
            </div>
          </div>

          {/* 3. Recent Comparable Vacant Land Sales in Area */}
          <div className="space-y-3">
            <h3 className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-slate-600" : "text-slate-400"} flex items-center gap-1.5`}>
              <Building2 className="h-3.5 w-3.5 text-cyan-500" />
              3. Recent Comparable Land Sales in {parcel.suburb}
            </h3>

            {val.comparableSales && val.comparableSales.length > 0 ? (
              <div className="space-y-2">
                {val.comparableSales.map((comp) => (
                  <div
                    key={comp.id}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                      isLight
                        ? "bg-slate-50 border-slate-200 hover:border-slate-300"
                        : "border-slate-800/80 bg-slate-950/50 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <span className={`font-semibold ${isLight ? "text-slate-900" : "text-slate-200"} block`}>{comp.address}</span>
                      <span className={`text-[10px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                        {comp.landSizeM2}m² · {comp.frontageM}m Frontage · Sold {comp.saleDate}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`font-bold ${isLight ? "text-slate-900" : "text-white"} block`}>
                        ${comp.salePrice.toLocaleString()}
                      </span>
                      <span className={`text-[10px] font-mono ${isLight ? "text-amber-700" : "text-amber-400"}`}>
                        ${comp.pricePerM2}/m²
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`p-4 rounded-xl border text-center text-xs ${isLight ? "bg-slate-50 border-slate-200 text-slate-500" : "border-slate-800 bg-slate-950/40 text-slate-500"}`}>
                No recent vacant land settlements recorded in this immediate pocket within the last 90 days.
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className={`p-4 border-t flex items-center justify-between gap-3 ${isLight ? "border-slate-200 bg-white" : "border-slate-800 bg-slate-950/90"}`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
              isLight
                ? "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
                : "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onPackageInFlyer(parcel);
            }}
            className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-brand-gold text-slate-950 text-xs font-bold hover:from-amber-400 hover:to-amber-300 shadow-md shadow-brand-gold/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <span>Package This Lot in Flyer Builder</span>
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
