import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { mode, toggleTheme } = useTheme();
  const isNight = mode === "night";

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      title={isNight ? "Switch to Normal Mode (Light)" : "Switch to Night Mode (Dark)"}
      className={`flex items-center gap-1.5 text-xs font-medium rounded-lg px-2.5 py-1.5 transition-all ${
        isNight
          ? "bg-slate-900/90 text-amber-300 hover:text-amber-200 border border-slate-800/80 hover:bg-slate-800"
          : "bg-amber-50 text-amber-900 hover:text-amber-950 border border-amber-200/80 hover:bg-amber-100 shadow-xs"
      } ${className}`}
    >
      {isNight ? (
        <>
          <Moon className="h-3.5 w-3.5 text-amber-400" />
          <span className="hidden sm:inline">Night Mode</span>
        </>
      ) : (
        <>
          <Sun className="h-3.5 w-3.5 text-amber-600" />
          <span className="hidden sm:inline">Normal Mode</span>
        </>
      )}
    </Button>
  );
}
