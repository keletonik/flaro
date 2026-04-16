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
const NotFound = lazy(() => import("@/pages/not-found"));
import {
  LayoutDashboard, MessageCircle, Briefcase, FileText, Wrench,
  CalendarDays, Sun, Moon, CheckSquare, FolderKanban, BarChart3,
  Package, ChevronLeft, ChevronRight, PieChart, MoreHorizontal, Settings2,
  Shield, Mail
} from "lucide-react";
import AidePA from "@/components/AidePA";
import AIDEAssistant from "@/components/AIDEAssistant";
import CommandPalette from "@/components/CommandPalette";
import { KeyboardCheatSheet } from "@/components/KeyboardCheatSheet";
import { AideFavicon, AideWordmark } from "@/components/AideLogo";

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

const navGroups = [
  {
    label: "Command",
    items: [
      { path: "/", icon: LayoutDashboard, label: "Dashboard", exact: true },
      { path: "/pa", icon: MessageCircle, label: "PA" },
      { path: "/operations", icon: BarChart3, label: "Operations" },
      { path: "/analytics", icon: PieChart, label: "Analytics" },
      { path: "/metrics", icon: BarChart3, label: "Metrics" },
    ],
  },
  {
    label: "Manage",
    items: [
      { path: "/jobs", icon: Briefcase, label: "WIPs" },
      { path: "/purchase-orders", icon: Mail, label: "POs" },
      { path: "/todos", icon: CheckSquare, label: "Tasks" },
      { path: "/projects", icon: FolderKanban, label: "Projects" },
      { path: "/suppliers", icon: Package, label: "Suppliers" },
    ],
  },
  {
    label: "Tools",
    items: [
      { path: "/schedule", icon: CalendarDays, label: "Schedule" },
      { path: "/notes", icon: FileText, label: "Notes" },
      { path: "/toolbox", icon: Wrench, label: "Toolbox" },
      { path: "/fip", icon: Shield, label: "FIP Knowledge" },
      { path: "/settings", icon: Settings2, label: "Settings" },
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
  return (
    <div className="relative">
      <button
        data-testid="button-theme-toggle"
        onClick={() => collapsed ? toggleMode() : setShowPicker(v => !v)}
        title="Change theme"
        className={cn(
          "flex items-center gap-2.5 rounded-lg transition-all duration-200",
          collapsed
            ? "w-9 h-9 justify-center text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            : "px-3 py-2 text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent text-xs w-full font-medium"
        )}
      >
        {mode === "light" ? <Sun size={14} strokeWidth={1.75} /> : <Moon size={14} strokeWidth={1.75} />}
        {!collapsed && <span className="text-[11px]">Theme</span>}
      </button>
      {showPicker && !collapsed && (
        <div className="absolute bottom-full left-0 mb-1 w-full bg-sidebar-accent border border-sidebar-border rounded-lg p-1.5 shadow-lg z-50">
          {THEME_OPTIONS.map(opt => (
            <button key={opt.key} onClick={() => { setTheme(opt.key); setShowPicker(false); }}
              className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[10px] font-medium transition-all",
                theme === opt.key ? "text-sidebar-primary-foreground bg-sidebar-primary" : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              )}>
              <div className="w-3 h-3 rounded-full border border-sidebar-border" style={{ backgroundColor: opt.accent }} />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function UserBadge({ collapsed }: { collapsed: boolean }) {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <div className={cn("flex items-center rounded-lg", collapsed ? "justify-center py-1" : "gap-2 px-3 py-1.5")}>
      <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
        {user.displayName.split(" ").map(w => w[0]).join("").slice(0, 2)}
      </div>
      {!collapsed && (
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-sidebar-foreground truncate">{user.displayName}</p>
          <button onClick={logout} className="text-[9px] text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors">Sign out</button>
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
      {/* Logo */}
      <div className={cn("flex items-center pt-5 pb-4", collapsed ? "px-3 justify-center" : "px-4")}>
        <button onClick={() => setLocation("/")} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-xl bg-[#0b1014] border border-[#1e293b] flex items-center justify-center shrink-0">
            <AideFavicon color="#22d3ee" size={22} />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <AideWordmark color="#22d3ee" height={16} />
              <span className="text-sidebar-foreground/30 text-[9px] font-medium tracking-wider uppercase mt-0.5">Service Ops</span>
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
              <p className="px-2 text-[10px] font-bold uppercase tracking-[0.06em] text-sidebar-foreground/30 mb-1.5">{group.label}</p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(location, item);
                return (
                  <button
                    key={item.path}
                    data-testid={`sidebar-nav-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                    onClick={() => setLocation(item.path)}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "w-full flex items-center rounded-lg transition-all duration-150 text-left relative group",
                      collapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-2.5 py-2",
                      active
                        ? "bg-sidebar-accent text-sidebar-foreground"
                        : "text-sidebar-foreground/45 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                    )}
                  >
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-primary rounded-r-full" />
                    )}
                    <Icon size={collapsed ? 17 : 15} strokeWidth={active ? 2.25 : 1.75} className="shrink-0" />
                    {!collapsed && (
                      <span className="text-[11px] font-semibold tracking-wide">{item.label}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className={cn("border-t border-sidebar-border pt-2 pb-3 space-y-1", collapsed ? "px-2" : "px-2")}>
        <UserBadge collapsed={collapsed} />
        <ThemeToggle collapsed={collapsed} />
        <button
          onClick={() => setCollapsed(v => !v)}
          className={cn(
            "flex items-center rounded-lg transition-all duration-200 text-sidebar-foreground/30 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
            collapsed ? "w-9 h-9 justify-center" : "gap-2.5 px-3 py-2 w-full text-xs"
          )}
          title={collapsed ? "Expand (Cmd+\\)" : "Collapse (Cmd+\\)"}
        >
          {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /><span className="text-[11px]">Collapse</span><span className="ml-auto text-[9px] opacity-60 font-mono">⌘\</span></>}
        </button>
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
              {moreItems.map(item => {
                const Icon = item.icon;
                return (
                  <button key={item.path} onClick={() => { setLocation(item.path); setMoreOpen(false); }}
                    className="flex flex-col items-center gap-1 py-2 rounded-xl text-sidebar-foreground/50 hover:text-primary transition-colors">
                    <Icon size={18} strokeWidth={1.5} />
                    <span className="text-[8px] font-bold tracking-wider uppercase">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border md:hidden">
        <div className="flex items-center justify-around px-1 py-1.5 safe-area-inset-bottom">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(location, item);
            return (
              <button key={item.path} onClick={() => setLocation(item.path)}
                className={cn("flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 min-w-[44px]", active ? "text-primary" : "text-sidebar-foreground/35")}>
                <Icon size={20} strokeWidth={active ? 2.25 : 1.5} />
                <span className="text-[9px] font-bold tracking-wider uppercase">{item.label}</span>
              </button>
            );
          })}
          <button onClick={() => setMoreOpen(v => !v)}
            className={cn("flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 min-w-[44px]", moreOpen ? "text-primary" : "text-sidebar-foreground/35")}>
            <MoreHorizontal size={20} strokeWidth={1.5} />
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
          className="hidden md:flex fixed left-[68px] top-4 z-20 items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110 transition-transform"
          title="Expand sidebar (⌘\\)"
        >
          <ChevronRight size={14} />
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
          <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
            <span className="text-destructive text-xl">!</span>
          </div>
          <h2 className="text-foreground font-semibold text-lg mb-2">Something went wrong</h2>
          <p className="text-muted-foreground text-sm mb-4 max-w-md">{this.state.error}</p>
          <button onClick={() => { this.setState({ hasError: false, error: "" }); window.location.reload(); }}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90">
            Reload
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
          <Route path="/operations"><Operations /></Route>
          <Route path="/analytics"><Analytics /></Route>
          <Route path="/metrics"><Metrics /></Route>
          <Route path="/schedule"><Schedule /></Route>
          <Route path="/jobs"><Jobs /></Route>
          <Route path="/jobs/:id"><JobDetail /></Route>
          <Route path="/purchase-orders"><PurchaseOrders /></Route>
          <Route path="/notes"><Notes /></Route>
          <Route path="/todos"><Todos /></Route>
          <Route path="/projects"><PM /></Route>
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
