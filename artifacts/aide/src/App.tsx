import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import React, { lazy, Suspense, useState, createContext, useContext, useCallback } from "react";
import { ThemeProvider, useTheme, THEME_OPTIONS } from "@/lib/theme";
import { cn } from "@/lib/utils";

// Pivot (2026-04-22): app is now focused purely on Dry Fire technical
// assistance. Only FIP + Settings are exposed in the nav. Every other
// page file remains on disk so this is reversible; they're simply not
// routed or linked from anywhere. Anyone who hits /jobs, /analytics,
// etc. gets redirected to /fip.
const DashboardHub = lazy(() => import("@/pages/dashboard-hub"));
const FIP = lazy(() => import("@/pages/fip"));
const FaultFinding = lazy(() => import("@/pages/fault-finding"));
const Training = lazy(() => import("@/pages/training"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const Chat = lazy(() => import("@/pages/chat"));
const AidePopout = lazy(() => import("@/pages/aide-popout"));
const NotFound = lazy(() => import("@/pages/not-found"));

import { Home, Flame, Settings as SettingsIcon, type LucideIcon } from "lucide-react";
import AIDEAssistant from "@/components/AIDEAssistant";
import CommandPalette from "@/components/CommandPalette";
import { KeyboardCheatSheet } from "@/components/KeyboardCheatSheet";
import { FileIntakeDialog } from "@/components/FileIntakeDialog";

const SidebarContext = createContext<{ collapsed: boolean; setCollapsed: React.Dispatch<React.SetStateAction<boolean>> }>({ collapsed: false, setCollapsed: () => {} });
export function useSidebar() { return useContext(SidebarContext); }

// AIDE panel state — shared between AIDEAssistant and Layout so the
// content area adjusts its margins when the panel opens/docks.
interface AIDEState { open: boolean; dock: "right" | "left" | "bottom"; width: number; height: number; }
const AIDEContext = createContext<{ aideState: AIDEState; setAideState: (s: AIDEState) => void }>({
  aideState: { open: false, dock: "right", width: 0, height: 0 },
  setAideState: () => {},
});
export function useAIDE() { return useContext(AIDEContext); }

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Live data: refetch every 20s in the background, refetch on tab focus,
      // and treat data as stale immediately on focus changes. Keeps the
      // dashboard, todos, jobs, and analytics within ~20s of Airtable truth
      // (Airtable poll itself is 30s).
      staleTime: 10000,
      refetchInterval: 20000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

// Nav is the manager's hot loop: see jobs, dispatch, quote, invoice, reference.
// App is now a Dry Fire technical-assistance tool. Nav surfaces FIP
// (the knowledge base) and Settings. Everything else has been removed
// from the nav; old page files stay on disk for reversibility but aren't
// routed — see the router below.
interface NavItem {
  path: string;
  /** ASCII glyph shown only when theme=terminal. */
  prefix: string;
  /** Lucide icon shown in every non-terminal theme. */
  icon: LucideIcon;
  label: string;
  exact?: boolean;
}

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "toolkit",
    items: [
      { path: "/",    prefix: "~",  icon: Home,  label: "Dashboard", exact: true },
      { path: "/fip", prefix: "{}", icon: Flame, label: "FIP" },
    ],
  },
  {
    label: "sys",
    items: [
      { path: "/settings", prefix: "./", icon: SettingsIcon, label: "Settings" },
    ],
  },
];

const allNavItems = navGroups.flatMap(g => g.items);

function isActive(location: string, item: { path: string; exact?: boolean }) {
  if (item.exact) return location === item.path;
  return location === item.path || location.startsWith(item.path + "/");
}

function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { theme, mode, setTheme, toggleMode } = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  // Primary click: flip light/dark. Secondary button: open palette picker.
  // Split into two buttons so the one-click mode flip always works, without
  // hiding behind a panel that needs dismissing.
  const lightThemes = THEME_OPTIONS.filter(o => o.mode === "light");
  const darkThemes = THEME_OPTIONS.filter(o => o.mode === "dark");

  return (
    <div className="relative flex items-center gap-0.5">
      <button
        data-testid="button-theme-toggle"
        onClick={() => toggleMode()}
        title={mode === "light" ? "Switch to dark" : "Switch to light"}
        className={cn(
          "flex items-center gap-2 rounded-md transition-all duration-200",
          collapsed
            ? "w-9 h-9 justify-center text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            : "px-2 py-1.5 text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent text-xs font-medium flex-1",
        )}
      >
        <span className="font-mono text-[11px] w-5 text-center shrink-0">{mode === "light" ? "☀" : "◑"}</span>
        {!collapsed && <span className="text-[11px] capitalize">{mode}</span>}
      </button>
      {!collapsed && (
        <button
          data-testid="button-palette-picker"
          onClick={() => setShowPicker(v => !v)}
          title="Palette picker"
          className="px-1.5 py-1.5 rounded-md text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent text-[11px]"
        >
          <span className="font-mono" style={{ color: THEME_OPTIONS.find(o => o.key === theme)?.accent }}>◉</span>
        </button>
      )}
      {showPicker && !collapsed && (
        <div className="absolute bottom-full right-0 mb-1 w-48 bg-sidebar-accent border border-sidebar-border rounded-md p-1.5 shadow-lg z-50 space-y-2">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-sidebar-foreground/40 px-2 mb-1">light</p>
            {lightThemes.map(opt => (
              <button key={opt.key} onClick={() => { setTheme(opt.key); setShowPicker(false); }}
                className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[10px] font-medium transition-all",
                  theme === opt.key ? "text-sidebar-primary-foreground bg-sidebar-primary" : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                )}>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: opt.accent }} />
                {opt.label}
              </button>
            ))}
          </div>
          <div className="h-px bg-sidebar-border/60" />
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-sidebar-foreground/40 px-2 mb-1">dark</p>
            {darkThemes.map(opt => (
              <button key={opt.key} onClick={() => { setTheme(opt.key); setShowPicker(false); }}
                className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[10px] font-medium transition-all",
                  theme === opt.key ? "text-sidebar-primary-foreground bg-sidebar-primary" : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                )}>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: opt.accent }} />
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UserBadge({ collapsed }: { collapsed: boolean }) {
  const { user, logout } = useAuth();
  if (!user) return null;
  const initials = user.displayName.split(" ").map(w => w[0]).join("").slice(0, 2);
  return (
    <div className={cn("flex items-center rounded-md", collapsed ? "justify-center py-1" : "gap-2 px-2 py-1.5")}>
      <span className="font-mono text-[11px] font-bold text-primary w-5 text-center shrink-0">{initials}</span>
      {!collapsed && (
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-sidebar-foreground truncate">{user.displayName}</p>
          <button onClick={logout} className="font-mono text-[9px] text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors">sign out</button>
        </div>
      )}
    </div>
  );
}

function SidebarNav() {
  const [location, setLocation] = useLocation();
  const { collapsed, setCollapsed } = useSidebar();
  const { theme } = useTheme();
  const isTerminal = theme === "terminal";

  return (
    <aside className={cn(
      "hidden md:flex fixed left-0 top-0 bottom-0 flex-col z-50 bg-sidebar sidebar-shadow transition-all duration-300",
      collapsed ? "w-[60px]" : "w-[224px]"
    )}>
      {/* Logo — chevron monogram across every theme, signal-green cursor
          block reserved for the terminal register. Gives the app a
          consistent brand mark regardless of which palette is active. */}
      <div className={cn("flex items-center pt-5 pb-4", collapsed ? "px-3 justify-center" : "px-4")}>
        <button onClick={() => setLocation("/")} className="flex items-center gap-2.5 hover:opacity-85 transition-opacity group">
          <svg viewBox="0 0 100 100" width={collapsed ? 22 : 20} height={collapsed ? 22 : 20} className="shrink-0">
            <path
              d="M 28 22 L 60 50 L 28 78"
              fill="none"
              stroke="currentColor"
              strokeWidth="14"
              strokeLinecap="square"
              strokeLinejoin="miter"
              className={cn(
                "transition-colors",
                isTerminal ? "text-sidebar-foreground" : "text-primary",
              )}
            />
            {isTerminal && <rect x="68" y="42" width="14" height="16" fill="currentColor" className="text-primary" />}
          </svg>
          {!collapsed && (
            <div className="flex items-center gap-1.5 leading-none">
              <span className={cn(
                "font-mono font-bold tracking-tight text-sidebar-foreground",
                isTerminal ? "text-[15px] lowercase" : "text-[14px]",
              )}>
                {isTerminal ? "aide" : "AIDE"}
              </span>
              {isTerminal ? (
                <span
                  className="inline-block w-[7px] h-[13px] bg-primary"
                  style={{ animation: "terminal-block-blink 1.1s steps(2) infinite" }}
                />
              ) : (
                <span className="font-mono text-[9px] text-sidebar-foreground/55 tracking-widest uppercase ml-0.5">
                  service ops
                </span>
              )}
            </div>
          )}
        </button>
      </div>

      {/* Divider */}
      <div className={cn("h-px bg-sidebar-border mb-2", collapsed ? "mx-2" : "mx-3")} />

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-4 scrollbar-hide">
        {navGroups.map(group => (
          <div key={group.label}>
            {!collapsed && (
              <div className="flex items-center gap-2 px-2 mb-1">
                <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-sidebar-foreground/40">{group.label}</span>
                <div className="h-px flex-1 bg-sidebar-border/50" />
              </div>
            )}
            <div className="space-y-[2px]">
              {group.items.map((item) => {
                const active = isActive(location, item);
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    data-testid={`sidebar-nav-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                    onClick={() => setLocation(item.path)}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "w-full flex items-center rounded-md transition-all duration-150 text-left relative group",
                      collapsed ? "justify-center px-0 py-2" : "gap-2.5 px-2.5 py-2",
                      // Active: stronger background tint + accent-foreground + left
                      // primary stripe. Reads as "you are here" at a glance.
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:rounded-r-sm before:bg-primary before:content-['']"
                        : "text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
                    )}
                  >
                    {/* Both slots rendered; CSS swaps which one is visible.
                        Terminal theme shows ASCII via [data-theme=terminal];
                        every other theme shows the lucide icon. */}
                    <span
                      data-nav-ascii=""
                      className={cn(
                        "w-5 shrink-0 text-center font-mono text-[11px] leading-none transition-colors",
                        active ? "text-primary" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70",
                      )}
                    >
                      {item.prefix}
                    </span>
                    <span
                      data-nav-icon=""
                      className={cn(
                        "w-5 h-5 shrink-0 inline-flex items-center justify-center transition-colors",
                        active ? "text-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground",
                      )}
                    >
                      <Icon size={14} strokeWidth={active ? 2.25 : 1.75} />
                    </span>
                    {!collapsed && (
                      <span className={cn(
                        "text-[11px] tracking-wide truncate",
                        active ? "font-semibold" : "font-medium",
                      )}>{item.label}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* AIDE AI Button — minimal text link */}
      <div className={cn("px-2 mb-1")}>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("aide-toggle"))}
          title={collapsed ? "Open AIDE" : "Open AIDE intelligence"}
          className={cn(
            "w-full flex items-center rounded-md transition-colors text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
            collapsed ? "justify-center w-9 h-9" : "gap-2 px-2 py-1.5"
          )}
        >
          <span className="font-mono text-[11px] text-primary shrink-0 w-4 text-center">⚡</span>
          {!collapsed && (
            <span className="font-mono text-[11px] font-medium tracking-wide">AIDE</span>
          )}
        </button>
      </div>

      {/* Footer — compact single block */}
      <div className={cn("border-t border-sidebar-border pt-1.5 pb-2 space-y-0.5", collapsed ? "px-2" : "px-2")}>
        <UserBadge collapsed={collapsed} />
        <div className={cn("flex items-center", collapsed ? "flex-col gap-0.5" : "gap-0.5")}>
          <ThemeToggle collapsed={collapsed} />
          <button
            onClick={() => setCollapsed(v => !v)}
            className={cn(
              "flex items-center rounded-md transition-all duration-200 text-sidebar-foreground/30 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
              collapsed ? "w-9 h-9 justify-center" : "gap-1.5 px-2 py-1 flex-1 text-xs"
            )}
            title={collapsed ? "Expand (Cmd+\\)" : "Collapse (Cmd+\\)"}
          >
            {collapsed
              ? <span className="font-mono text-[11px]">&raquo;</span>
              : <>
                  <span className="font-mono text-[10px]">&laquo;</span>
                  <span className="text-[10px] font-medium">Collapse</span>
                  <span className="ml-auto font-mono text-[9px] opacity-50">⌘\</span>
                </>
            }
          </button>
        </div>
      </div>
    </aside>
  );
}

function BottomNav() {
  const [location, setLocation] = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border md:hidden">
      <div className="flex items-center justify-around px-1 py-1.5 safe-area-inset-bottom">
        {allNavItems.map((item) => {
          const active = isActive(location, item);
          return (
            <button key={item.path} onClick={() => setLocation(item.path)}
              className={cn("flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all duration-200", active ? "text-primary" : "text-sidebar-foreground/60")}>
              <span className={cn("font-mono text-[14px] leading-none", active ? "text-primary font-bold" : "opacity-80")}>{item.prefix}</span>
              <span className="text-[9px] font-bold tracking-wider uppercase">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const { collapsed, setCollapsed } = useSidebar();
  const { aideState } = useAIDE();
  const [location] = useLocation();

  // Compute content margins based on sidebar + AIDE panel state
  const sidebarW = collapsed ? 60 : 224;
  const mlTotal = sidebarW + (aideState.open && aideState.dock === "left" ? aideState.width : 0);
  const mrTotal = aideState.open && aideState.dock === "right" ? aideState.width : 0;
  const pbTotal = 16 + (aideState.open && aideState.dock === "bottom" ? aideState.height : 0); // 16 = mobile bottom nav

  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />
      {collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="hidden md:flex fixed left-[68px] top-4 z-20 items-center justify-center w-6 h-6 rounded-md bg-sidebar-accent border border-sidebar-border text-sidebar-foreground/50 hover:text-sidebar-foreground shadow-sm hover:shadow transition-all"
          title="Expand sidebar (⌘\\)"
        >
          <span className="font-mono text-[10px]">&raquo;</span>
        </button>
      )}
      {/* On mobile (<md) sidebar is hidden, so no ml. On desktop, add
          sidebar width + optional AIDE left-dock width. AIDE right/bottom
          margins apply on all breakpoints since the panel is always visible. */}
      <div
        className="min-h-screen transition-all duration-300 max-md:!ml-0"
        style={{
          marginLeft: `${mlTotal}px`,
          marginRight: `${mrTotal}px`,
          paddingBottom: `${pbTotal}px`,
        }}
      >
        {children}
      </div>
      <BottomNav />
      {location !== "/chat" && location !== "/pa" && <AIDEAssistant />}
      <CommandPalette />
      <KeyboardCheatSheet />
      <FileIntakeDialog />
    </div>
  );
}

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: string }> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: "" }; }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error: error.message }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] px-8 text-center">
          <span className="font-mono text-2xl text-destructive mb-4">!!</span>
          <h2 className="text-foreground font-medium text-sm tracking-tight mb-2">Something went wrong</h2>
          <p className="font-mono text-muted-foreground text-xs mb-4 max-w-md">{this.state.error}</p>
          <button onClick={() => { this.setState({ hasError: false, error: "" }); window.location.reload(); }}
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 font-mono">
            reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Redirect component for routes that no longer have their own page. Fires
 * a one-shot setLocation on mount. Used for `/` and for any unknown path
 * so the app always lands on the FIP knowledge base.
 */
function HomeRedirect() {
  const [, setLocation] = useLocation();
  React.useEffect(() => { setLocation("/"); }, [setLocation]);
  return null;
}

function Router() {
  return (
    <Layout>
      <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Switch>
          {/* Root is the Fire Safety toolkit hub — grid of tools, FIP
              live, rest marked 'soon'. */}
          <Route path="/"><DashboardHub /></Route>
          <Route path="/fip"><FIP /></Route>
          <Route path="/fault-finding"><FaultFinding /></Route>
          <Route path="/training"><Training /></Route>
          <Route path="/settings"><SettingsPage /></Route>
          {/* Chat + popout kept because the AIDE PA tray can open a
              full-page or pop-out conversation for technical support. */}
          <Route path="/chat"><Chat /></Route>
          <Route path="/aide-popout"><AidePopout /></Route>
          {/* Any other path (old bookmarks to /jobs, /analytics, …)
              falls through to the hub, no 404s. */}
          <Route><HomeRedirect /></Route>
        </Switch>
      </Suspense>
      </ErrorBoundary>
    </Layout>
  );
}

const SIDEBAR_COLLAPSED_KEY = "aide-sidebar-collapsed";

function SidebarProvider({ children }: { children: React.ReactNode }) {
  // Persist collapsed state across refreshes (localStorage). Default to
  // false on first load, but if the operator collapsed the sidebar last
  // session we restore that state so their preference sticks.
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      if (typeof window === "undefined") return false;
      return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  // Mirror state to localStorage whenever it changes.
  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
      }
    } catch { /* ignore quota / disabled storage */ }
  }, [collapsed]);

  // Global keyboard shortcut: Cmd/Ctrl + \ toggles the sidebar.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        setCollapsed((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return <SidebarContext.Provider value={{ collapsed, setCollapsed }}>{children}</SidebarContext.Provider>;
}

function AIDEProvider({ children }: { children: React.ReactNode }) {
  const [aideState, setAideState] = useState<AIDEState>({ open: false, dock: "right", width: 0, height: 0 });
  const stableSet = useCallback((s: AIDEState) => setAideState(s), []);
  return <AIDEContext.Provider value={{ aideState, setAideState: stableSet }}>{children}</AIDEContext.Provider>;
}

// Auth context
interface AuthUser { id: string; username: string; displayName: string; role: string; }
const AuthContext = createContext<{ user: AuthUser | null; token: string | null; logout: () => void }>({ user: null, token: null, logout: () => {} });
export function useAuth() { return useContext(AuthContext); }

function App() {
  const defaultUser: AuthUser = { id: "default", username: "casper", displayName: "Casper Tavitian", role: "admin" };

  const handleLogout = () => {};

  return (
    <ThemeProvider>
      <AuthContext.Provider value={{ user: defaultUser, token: null, logout: handleLogout }}>
      <SidebarProvider>
      <AIDEProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
      </AIDEProvider>
      </SidebarProvider>
      </AuthContext.Provider>
    </ThemeProvider>
  );
}

export default App;
