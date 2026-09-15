import { useState } from "react";
import { PlusCircle, Building, DollarSign, X, CheckCircle2 } from "lucide-react";
import { convertLotToParcel } from "@/lib/land-scout/landScoutWebSearch";
import { saveLandParcel } from "@/lib/land-scout/landScoutStorage";
import { type LandParcel } from "@/lib/land-scout/landScoutTypes";
import { type Lot } from "@/lib/databaseStorage";
import { toast } from "sonner";

interface AddCustomLotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLotAdded: (parcel: LandParcel) => void;
}

export function AddCustomLotModal({ isOpen, onClose, onLotAdded }: AddCustomLotModalProps) {
  const [lotNumber, setLotNumber] = useState("");
  const [estate, setEstate] = useState("");
  const [suburb, setSuburb] = useState("");
  const [state, setState] = useState<"QLD" | "NSW">("QLD");
  const [sizeM2, setSizeM2] = useState("450");
  const [frontageM, setFrontageM] = useState("15.0");
  const [price, setPrice] = useState("350000");
  const [isRegistered, setIsRegistered] = useState(true);
  const [agentName, setAgentName] = useState("");
  const [agentAgency, setAgentAgency] = useState("");
  const [agentPhone, setAgentPhone] = useState("");
  const [agentEmail, setAgentEmail] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suburb.trim()) {
      toast.error("Please enter a suburb.");
      return;
    }

    const size = Number(sizeM2) || 450;
    const frontage = Number(frontageM) || 14;
    const priceNum = Number(price) || 350000;

    const lot: Lot = {
      id: `custom-${Date.now()}`,
      estate: estate.trim() || suburb.trim(),
      suburb: suburb.trim(),
      state,
      developer: agentAgency.trim() || "Private / Independent",
      developer_contact_name: agentName.trim() || "Sales Representative",
      developer_contact_phone: agentPhone.trim() || "1300 246 700",
      developer_contact_email: agentEmail.trim() || "sales@hudsonhomes.com.au",
      lot_number: lotNumber.trim() || "1",
      address: `Lot ${lotNumber.trim() || "1"} ${estate.trim() || suburb.trim()}, ${suburb.trim()} ${state}`,
      land_size: size,
      frontage,
      land_price: priceNum,
      titled: isRegistered,
      registration_date: isRegistered ? null : "2026-10-31",
      status: "available",
      exclusive_consultants: null,
      deadline: null,
      notes: "Direct manual entry into Hudson Land Scout.",
      updated_at: new Date().toISOString(),
    };

    const parcel = convertLotToParcel(lot);
    saveLandParcel(parcel);
    toast.success(`Lot ${parcel.lotNumber} in ${parcel.suburb} added!`, {
      description: `Matched design: ${parcel.suggestedDesign} · Deal score: ${parcel.valuation.dealScorePoints}/100`,
    });
    onLotAdded(parcel);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl p-6 space-y-5 text-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-brand-gold">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Add Custom Vacant Block</h2>
              <p className="text-xs text-slate-400">Add an off-market or direct developer block</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">State</label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value as "QLD" | "NSW")}
                className="w-full h-9 px-3 rounded-xl border border-slate-700 bg-slate-950 text-xs text-white focus:outline-hidden focus:border-brand-gold"
              >
                <option value="QLD">Queensland (QLD)</option>
                <option value="NSW">New South Wales (NSW)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Suburb *</label>
              <input
                type="text"
                required
                value={suburb}
                onChange={(e) => setSuburb(e.target.value)}
                placeholder="e.g. Flagstone, Box Hill"
                className="w-full h-9 px-3 rounded-xl border border-slate-700 bg-slate-950 text-xs text-white focus:outline-hidden focus:border-brand-gold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Estate Name</label>
              <input
                type="text"
                value={estate}
                onChange={(e) => setEstate(e.target.value)}
                placeholder="e.g. Flagstone Central"
                className="w-full h-9 px-3 rounded-xl border border-slate-700 bg-slate-950 text-xs text-white focus:outline-hidden focus:border-brand-gold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Lot Number</label>
              <input
                type="text"
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                placeholder="e.g. 104"
                className="w-full h-9 px-3 rounded-xl border border-slate-700 bg-slate-950 text-xs text-white focus:outline-hidden focus:border-brand-gold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Land Size (m²)</label>
              <input
                type="number"
                value={sizeM2}
                onChange={(e) => setSizeM2(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-slate-700 bg-slate-950 text-xs text-white focus:outline-hidden focus:border-brand-gold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Frontage (m)</label>
              <input
                type="number"
                step="0.1"
                value={frontageM}
                onChange={(e) => setFrontageM(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-slate-700 bg-slate-950 text-xs text-white focus:outline-hidden focus:border-brand-gold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Price ($)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-slate-700 bg-slate-950 text-xs text-white focus:outline-hidden focus:border-brand-gold"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRegistered}
                onChange={(e) => setIsRegistered(e.target.checked)}
                className="rounded-sm border-slate-700 bg-slate-950 text-brand-gold focus:ring-brand-gold"
              />
              <span className="text-xs text-slate-300 font-medium">
                Titled / Registered (Immediate Settlement)
              </span>
            </label>
          </div>

          <div className="border-t border-slate-800 pt-3 space-y-3">
            <span className="text-[11px] font-semibold text-slate-400 block">
              Contact / Agent Details (Optional)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="Agent Name"
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-700 bg-slate-950 text-xs text-white placeholder:text-slate-600 focus:outline-hidden"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={agentAgency}
                  onChange={(e) => setAgentAgency(e.target.value)}
                  placeholder="Agency / Developer"
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-700 bg-slate-950 text-xs text-white placeholder:text-slate-600 focus:outline-hidden"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={agentPhone}
                  onChange={(e) => setAgentPhone(e.target.value)}
                  placeholder="Phone"
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-700 bg-slate-950 text-xs text-white placeholder:text-slate-600 focus:outline-hidden"
                />
              </div>
              <div>
                <input
                  type="email"
                  value={agentEmail}
                  onChange={(e) => setAgentEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-700 bg-slate-950 text-xs text-white placeholder:text-slate-600 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-brand-gold text-slate-950 text-xs font-bold hover:bg-amber-400 transition-colors flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              Save Block
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
