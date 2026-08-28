import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ThemeMode = "night" | "normal"; // "night" = dark mode, "normal" = light mode

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY_PREFIX = "hudson_theme_mode_";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string>("default");
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "night";
    const saved = localStorage.getItem(`${THEME_STORAGE_KEY_PREFIX}default`);
    return saved === "normal" ? "normal" : "night";
  });

  // Track logged-in user to uniquely customize and persist their theme choice
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const userKey = data.user?.id || data.user?.email || "default";
      setUserId(userKey);
      const userPref = localStorage.getItem(`${THEME_STORAGE_KEY_PREFIX}${userKey}`);
      if (userPref === "normal" || userPref === "night") {
        setModeState(userPref);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const userKey = session?.user?.id || session?.user?.email || "default";
      setUserId(userKey);
      const userPref = localStorage.getItem(`${THEME_STORAGE_KEY_PREFIX}${userKey}`);
      if (userPref === "normal" || userPref === "night") {
        setModeState(userPref);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Synchronize DOM classes and localStorage whenever mode or user changes
  useEffect(() => {
    const root = document.documentElement;
    if (mode === "normal") {
      root.classList.remove("dark", "night-mode");
      root.classList.add("light", "normal-mode");
      root.setAttribute("data-theme", "normal");
      root.style.colorScheme = "light";
    } else {
      root.classList.remove("light", "normal-mode");
      root.classList.add("dark", "night-mode");
      root.setAttribute("data-theme", "night");
      root.style.colorScheme = "dark";
    }

    try {
      localStorage.setItem(`${THEME_STORAGE_KEY_PREFIX}${userId}`, mode);
      localStorage.setItem(`${THEME_STORAGE_KEY_PREFIX}default`, mode);
    } catch {
      /* ignore */
    }
  }, [mode, userId]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
  };

  const toggleTheme = () => {
    setModeState((prev) => (prev === "night" ? "normal" : "night"));
  };

  return (
    <ThemeContext.Provider value={{ mode, setMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
