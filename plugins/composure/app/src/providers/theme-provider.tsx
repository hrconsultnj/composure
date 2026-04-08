'use client'

import { createContext, useCallback, useContext, useState } from "react";

interface ThemeContextValue {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("composure-theme");
    if (saved === "light") {
      document.documentElement.classList.remove("dark");
      return false;
    }
    document.documentElement.classList.add("dark");
    return true;
  });

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem("composure-theme", next ? "dark" : "light");
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  }, []);

  return (
    <ThemeContext value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
