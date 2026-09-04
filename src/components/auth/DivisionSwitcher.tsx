import React, { useState, useEffect } from "react";
import { getActiveDivision, setActiveDivision, onDivisionChanged, type Division } from "@/lib/divisionContext";
import { MapPin } from "lucide-react";
import { toast } from "sonner";

interface DivisionSwitcherProps {
  isLight?: boolean;
  className?: string;
  size?: "sm" | "md";
}

export function DivisionSwitcher({ isLight = false, className = "", size = "sm" }: DivisionSwitcherProps) {
  const [division, setDivision] = useState<Division>(() => getActiveDivision());

  useEffect(() => {
    setDivision(getActiveDivision());
    const unsub = onDivisionChanged((newDiv) => setDivision(newDiv));
    return () => unsub();
  }, []);

  const handleToggle = (target: Division) => {
    if (target === division) return;
    setActiveDivision(target);
    toast.success(`Active division switched to ${target === "NSW" ? "New South Wales (NSW)" : "Queensland (QLD)"}`, {
      description: `Flyer builder and quoting system are now loaded with ${target} pricing.`,
    });
  };

  return (
    <div
      className={`inline-flex items-center rounded-full p-0.5 border transition-all shadow-xs ${
        isLight
          ? "bg-slate-100 border-slate-300"
          : "bg-slate-900/90 border-slate-700/80"
      } ${className}`}
      title="Switch active division between Queensland and New South Wales"
    >
      <button
        type="button"
        onClick={() => handleToggle("QLD")}
        className={`flex items-center gap-1 rounded-full font-bold transition-all ${
          size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3.5 py-1.5 text-xs"
        } ${
          division === "QLD"
            ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm font-black"
            : isLight
            ? "text-slate-600 hover:text-slate-900"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <MapPin className="h-3 w-3" />
        <span>QLD</span>
      </button>

      <button
        type="button"
        onClick={() => handleToggle("NSW")}
        className={`flex items-center gap-1 rounded-full font-bold transition-all ${
          size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3.5 py-1.5 text-xs"
        } ${
          division === "NSW"
            ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm font-black"
            : isLight
            ? "text-slate-600 hover:text-slate-900"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <MapPin className="h-3 w-3" />
        <span>NSW</span>
      </button>
    </div>
  );
}
