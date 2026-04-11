import { createContext, useContext, useEffect, useState } from "react";

export type ThemeVariant = "blue-white" | "blue-orange" | "blue-green" | "deep-navy" | "slate-dark" | "graphite-green";
type Mode = "light" | "dark";

const LIGHT_THEMES: ThemeVariant[] = ["blue-white", "blue-orange", "blue-green"];
const DARK_THEMES: ThemeVariant[] = ["deep-navy", "slate-dark", "graphite-green"];

export const THEME_OPTIONS: { key: ThemeVariant; label: string; mode: Mode; accent: string }[] = [
  { key: "blue-white", label: "Enterprise", mode: "light", accent: "#2563EB" },
  { key: "blue-orange", label: "Action", mode: "light", accent: "#F97316" },
  { key: "blue-green", label: "Industrial", mode: "light", accent: "#6B8E23" },
  { key: "deep-navy", label: "Navy", mode: "dark", accent: "#3B82F6" },
  { key: "slate-dark", label: "Slate", mode: "dark", accent: "#38BDF8" },
  { key: "graphite-green", label: "Graphite", mode: "dark", accent: "#22C55E" },
];

interface ThemeContextType {
  theme: ThemeVariant;
  mode: Mode;
  setTheme: (t: ThemeVariant) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "deep-navy",
  mode: "dark",
  setTheme: () => {},
  toggleMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeVariant>(() => {
    const saved = localStorage.getItem("ops-theme-variant");
    if (saved && [...LIGHT_THEMES, ...DARK_THEMES].includes(saved as ThemeVariant)) return saved as ThemeVariant;
    return "deep-navy";
  });

  const mode: Mode = DARK_THEMES.includes(theme) ? "dark" : "light";

  useEffect(() => {
    const root = document.documentElement;
    // Set dark class
    if (mode === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    // Set data-theme attribute for CSS selectors
    root.setAttribute("data-theme", theme);
    localStorage.setItem("ops-theme-variant", theme);
  }, [theme, mode]);

  const setTheme = (t: ThemeVariant) => setThemeState(t);

  const toggleMode = () => {
    if (mode === "light") {
      setThemeState("deep-navy");
    } else {
      setThemeState("blue-white");
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, mode, setTheme, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
