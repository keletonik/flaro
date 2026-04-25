import { createContext, useContext, useEffect, useState } from "react";

export type ThemeVariant =
  | "salmon" | "salmon-dark"
  | "blue-white" | "blue-orange" | "blue-green"
  | "deep-navy" | "slate-dark" | "graphite-green"
  | "operator" | "fieldkit" | "atelier" | "circuit" | "terminal";
type Mode = "light" | "dark";

const LIGHT_THEMES: ThemeVariant[] = ["salmon", "blue-white", "blue-orange", "blue-green"];
const DARK_THEMES: ThemeVariant[] = ["salmon-dark", "deep-navy", "slate-dark", "graphite-green", "operator", "fieldkit", "atelier", "circuit", "terminal"];

export const THEME_OPTIONS: { key: ThemeVariant; label: string; mode: Mode; accent: string }[] = [
  { key: "salmon", label: "Salmon", mode: "light", accent: "#E58A6E" },
  { key: "salmon-dark", label: "Salmon Dark", mode: "dark", accent: "#F4A082" },
  { key: "blue-white", label: "Enterprise", mode: "light", accent: "#2563EB" },
  { key: "blue-orange", label: "Action", mode: "light", accent: "#F97316" },
  { key: "blue-green", label: "Industrial", mode: "light", accent: "#6B8E23" },
  { key: "deep-navy", label: "Navy", mode: "dark", accent: "#3B82F6" },
  { key: "slate-dark", label: "Slate", mode: "dark", accent: "#38BDF8" },
  { key: "graphite-green", label: "Graphite", mode: "dark", accent: "#22C55E" },
  { key: "operator", label: "Operator", mode: "dark", accent: "#00B4E6" },
  { key: "fieldkit", label: "Fieldkit", mode: "dark", accent: "#FF9500" },
  { key: "atelier", label: "Atelier", mode: "dark", accent: "#B87333" },
  { key: "circuit", label: "Circuit", mode: "dark", accent: "#00FF88" },
  { key: "terminal", label: "Terminal", mode: "dark", accent: "#00FF66" },
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
    return "salmon";
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
      setThemeState("salmon-dark");
    } else {
      setThemeState("salmon");
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
