import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import React, { lazy, Suspense, useState, createContext, useContext, useCallback } from "react";
import { ThemeProvider, useTheme, THEME_OPTIONS } from "@/lib/theme";
import { cn } from "@/lib/utils";

// Lazy-loaded pages for code splitting
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Chat = lazy(() => import("@/pages/chat"));
const PA = lazy(() => import("@/pages/pa"));
const Jobs = lazy(() => import("@/pages/jobs"));
const Notes = lazy(() => import("@/pages/notes"));
const Toolbox = lazy(() => import("@/pages/toolbox"));
const JobDetail = lazy(() => import("@/pages/job-detail"));
const Schedule = lazy(() => import("@/pages/schedule"));
const Todos = lazy(() => import("@/pages/todos"));
const Projects = lazy(() => import("@/pages/projects"));
const Operations = lazy(() => import("@/pages/operations"));
const Suppliers = lazy(() => import("@/pages/suppliers"));
const Analytics = lazy(() => import("@/pages/analytics"));
const Metrics = lazy(() => import("@/pages/metrics"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const PM = lazy(() => import("@/pages/pm"));
const FIP = lazy(() => import("@/pages/fip"));
const PurchaseOrders = lazy(() => import("@/pages/purchase-orders"));
const AidePopout = lazy(() => import("@/pages/aide-popout"));
const NotFound = lazy(() => import("@/pages/not-found"));
// All Lucide nav icons replaced with text-based prefixes
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
    queries: { staleTime: 30000, retry: 1 },
  },
});

// Nav is the manager's hot loop: see jobs, dispatch, quote, invoice, reference.
// Metrics folded into Analytics. PA moved to the bottom tray — no separate page.
// Boards placeholder removed. Toolbox merges into Notes (same concept, one surface).
// All removed pages keep their routes for deep links; only the nav shortcut is gone.
const navGroups = [
  {
    label: "cmd",
    items: [
      { path: "/", prefix: "~", label: "Dashboard", exact: true },
      { path: "/operations", prefix: "::", label: "Operations" },
      { path: "/analytics", prefix: ">>", label: "Analytics" },
    ],
  },
  {
    label: "ops",
    items: [
      { path: "/jobs", prefix: "--", label: "Jobs" },
      { path: "/schedule", prefix: "..", label: "Schedule" },
      { path: "/todos", prefix: "++", label: "Tasks" },
      { path: "/purchase-orders", prefix: "[]", label: "POs" },
      { path: "/suppliers", prefix: "<>", label: "Suppliers" },
      { path: "/projects", prefix: "//", label: "Projects" },
    ],
  },
  {
    label: "sys",
    items: [
      { path: "/notes", prefix: "**", label: "Notebook" },
      { path: "/fip", prefix: "{}", label: "FIP" },
      { path: "/settings", prefix: "./", label: "Settings" },
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

  return (
    <aside className={cn(
      "hidden md:flex fixed left-0 top-0 bottom-0 flex-col z-50 bg-sidebar sidebar-shadow transition-all duration-300",
      collapsed ? "w-[60px]" : "w-[210px]"
    )}>
      {/* Logo — typographic wordmark */}
      <div className={cn("flex items-center pt-5 pb-4", collapsed ? "px-3 justify-center" : "px-4")}>
        <button onClick={() => setLocation("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="font-mono text-[15px] font-bold tracking-tighter text-primary shrink-0">A</span>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-mono text-[13px] font-bold tracking-tight text-sidebar-foreground">AIDE</span>
              <span className="font-mono text-[9px] text-sidebar-foreground/30 tracking-widest uppercase">service ops</span>
            </div>
          )}
        </button>
      </div>

      {/* Divider */}
      <div className={cn("h-px bg-sidebar-border mb-2", collapsed ? "mx-2" : "mx-3")} />

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-5 scrollbar-hide">
        {navGroups.map(group => (
          <div key={group.label}>
            {!collapsed && (
              <div className="flex items-center gap-2 px-2 mb-1.5">
                <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-sidebar-foreground/25">{group.label}</span>
                <div className="h-px flex-1 bg-sidebar-border/50" />
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(location, item);
                return (
                  <button
                    key={item.path}
                    data-testid={`sidebar-nav-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                    onClick={() => setLocation(item.path)}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "w-full flex items-center rounded-md transition-all duration-100 text-left relative group",
                      collapsed ? "justify-center px-0 py-2" : "gap-2 px-2 py-1.5",
                      active
                        ? "bg-sidebar-accent text-sidebar-foreground"
                        : "text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                    )}
                  >
                    <span className={cn(
                      "w-5 shrink-0 text-center font-mono text-[11px] leading-none transition-colors duration-100",
                      active ? "text-primary" : "text-sidebar-foreground/25 group-hover:text-sidebar-foreground/50"
                    )}>
                      {item.prefix}
                    </span>
                    {!collapsed && (
                      <span className={cn(
                        "text-[11px] tracking-wide truncate",
                        active ? "font-semibold" : "font-medium"
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
  const [moreOpen, setMoreOpen] = useState(false);
  const PRIMARY_PATHS = ["/", "/pa", "/operations", "/analytics"];
  const primaryItems = allNavItems.filter(i => PRIMARY_PATHS.includes(i.path));
  const moreItems = allNavItems.filter(i => !PRIMARY_PATHS.includes(i.path));

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute bottom-16 left-0 right-0 bg-sidebar border-t border-sidebar-border rounded-t-2xl p-3 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="grid grid-cols-4 gap-2">
              {moreItems.map(item => (
                <button key={item.path} onClick={() => { setLocation(item.path); setMoreOpen(false); }}
                  className="flex flex-col items-center gap-1 py-2 rounded-xl text-sidebar-foreground/50 hover:text-primary transition-colors">
                  <span className="font-mono text-[13px] leading-none text-sidebar-foreground/30">{item.prefix}</span>
                  <span className="text-[8px] font-bold tracking-wider uppercase">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border md:hidden">
        <div className="flex items-center justify-around px-1 py-1.5 safe-area-inset-bottom">
          {primaryItems.map((item) => {
            const active = isActive(location, item);
            return (
              <button key={item.path} onClick={() => setLocation(item.path)}
                className={cn("flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 min-w-[44px]", active ? "text-primary" : "text-sidebar-foreground/35")}>
                <span className={cn("font-mono text-[14px] leading-none", active ? "text-primary font-bold" : "opacity-60")}>{item.prefix}</span>
                <span className="text-[9px] font-bold tracking-wider uppercase">{item.label}</span>
              </button>
            );
          })}
          <button onClick={() => setMoreOpen(v => !v)}
            className={cn("flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 min-w-[44px]", moreOpen ? "text-primary" : "text-sidebar-foreground/35")}>
            <span className="font-mono text-[14px] leading-none">···</span>
            <span className="text-[9px] font-bold tracking-wider uppercase">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const { collapsed, setCollapsed } = useSidebar();
  const { aideState } = useAIDE();
  const [location] = useLocation();

  // Compute content margins based on sidebar + AIDE panel state
  const sidebarW = collapsed ? 60 : 210;
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

function Router() {
  return (
    <Layout>
      <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/"><Dashboard /></Route>
          <Route path="/pa"><PA /></Route>
          {/* /chat is kept as the legacy read-only viewer for the
              historical anthropic_conversations rows. The new PA
              surface lives at /pa. */}
          <Route path="/chat"><Chat /></Route>
          <Route path="/aide-popout"><AidePopout /></Route>
          <Route path="/operations"><Operations /></Route>
          <Route path="/analytics"><Analytics /></Route>
          <Route path="/metrics"><Metrics /></Route>
          <Route path="/schedule"><Schedule /></Route>
          <Route path="/jobs"><Jobs /></Route>
          <Route path="/jobs/:id"><JobDetail /></Route>
          <Route path="/purchase-orders"><PurchaseOrders /></Route>
          <Route path="/notes"><Notes /></Route>
          <Route path="/todos"><Todos /></Route>
          <Route path="/projects"><Projects /></Route>
          <Route path="/boards"><PM /></Route>
          <Route path="/boards/:id"><PM /></Route>
          <Route path="/toolbox"><Toolbox /></Route>
          <Route path="/suppliers"><Suppliers /></Route>
          <Route path="/fip"><FIP /></Route>
          <Route path="/settings"><SettingsPage /></Route>
          <Route><NotFound /></Route>
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
