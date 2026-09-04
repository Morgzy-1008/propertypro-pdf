/**
 * Hudson Homes Multi-State Division Management (QLD & NSW)
 * Provides centralized division state, automatic consultant division matching,
 * and reactive notifications when the user toggles divisions.
 */

export type Division = "QLD" | "NSW";

const DIVISION_STORAGE_KEY = "hudson_active_division";
const listeners = new Set<(division: Division) => void>();

export function getActiveDivision(): Division {
  if (typeof window === "undefined") return "QLD";
  try {
    const saved = localStorage.getItem(DIVISION_STORAGE_KEY);
    if (saved === "NSW" || saved === "QLD") {
      return saved;
    }
    // Check active staff user's division
    const authUser = localStorage.getItem("hudson_hub_auth_user") || localStorage.getItem("hudson_auth_user");
    if (authUser) {
      const parsed = JSON.parse(authUser);
      if (parsed?.division === "NSW" || parsed?.state === "NSW") {
        return "NSW";
      }
    }
    return "QLD";
  } catch {
    return "QLD";
  }
}

export function setActiveDivision(division: Division): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DIVISION_STORAGE_KEY, division);
    listeners.forEach((fn) => {
      try {
        fn(division);
      } catch (e) {
        console.error("Division listener error:", e);
      }
    });
  } catch (err) {
    console.error("Failed to save active division:", err);
  }
}

export function onDivisionChanged(listener: (division: Division) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
