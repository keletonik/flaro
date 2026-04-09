import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Chat from "@/pages/chat";
import Jobs from "@/pages/jobs";
import Notes from "@/pages/notes";
import Toolbox from "@/pages/toolbox";
import JobDetail from "@/pages/job-detail";
import Schedule from "@/pages/schedule";
import { ThemeProvider, useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import {
  Home, MessageCircle, Briefcase, FileText, Wrench,
  CalendarDays, Sun, Moon, ChevronRight
} from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30000, retry: 1 },
  },
});

const navItems = [
  { path: "/", icon: Home, label: "Home", exact: true },
  { path: "/chat", icon: MessageCircle, label: "Chat" },
  { path: "/schedule", icon: CalendarDays, label: "Schedule" },
  { path: "/jobs", icon: Briefcase, label: "Jobs" },
  { path: "/notes", icon: FileText, label: "Notes" },
  { path: "/toolbox", icon: Wrench, label: "Toolbox" },
];

function isActive(location: string, item: { path: string; exact?: boolean }) {
  if (item.exact) return location === item.path;
  return location === item.path || location.startsWith(item.path + "/");
}

function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      data-testid="button-theme-toggle"
      onClick={toggleTheme}
      title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      className={cn(
        "flex items-center gap-2 rounded-lg transition-all duration-200",
        compact
          ? "w-8 h-8 justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
          : "px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted text-sm w-full"
      )}
    >
      {theme === "light"
        ? <Moon size={16} strokeWidth={1.5} />
        : <Sun size={16} strokeWidth={1.5} />
      }
      {!compact && <span className="font-medium">{theme === "light" ? "Dark mode" : "Light mode"}</span>}
    </button>
  );
}

function SidebarNav() {
  const [location, setLocation] = useLocation();
  const { theme } = useTheme();

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-56 flex-col z-50 bg-sidebar border-r border-sidebar-border">
      <div className="px-4 py-4 border-b border-sidebar-border">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
        >
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-xs tracking-tight">A</span>
          </div>
          <div className="text-left">
            <p className="text-sidebar-foreground font-bold text-sm tracking-tight">AIDE</p>
            <p className="text-muted-foreground text-[10px]">Operations Assistant</p>
          </div>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(location, item);
          return (
            <button
              key={item.path}
              data-testid={`sidebar-nav-${item.label.toLowerCase()}`}
              onClick={() => setLocation(item.path)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 text-left group",
                active
                  ? "bg-accent text-primary"
                  : "text-muted-foreground hover:text-sidebar-foreground hover:bg-muted"
              )}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 1.75} className="flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {active && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
            </button>
          );
        })}
      </nav>

      <div className="px-2 py-3 border-t border-sidebar-border space-y-0.5">
        <ThemeToggle />
        <div className="px-3 py-2">
          <p className="text-[10px] text-muted-foreground">Mentaris · AIDE v1.0</p>
        </div>
      </div>
    </aside>
  );
}

function BottomNav() {
  const [location, setLocation] = useLocation();
  const mobileItems = navItems.slice(0, 5);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border md:hidden">
      <div className="flex items-center justify-around px-1 py-1.5">
        {mobileItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(location, item);
          return (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[52px]",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              <span className="text-[9px] font-semibold tracking-wide uppercase">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />
      <div className="md:ml-56 pb-16 md:pb-0 min-h-screen">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Layout><Dashboard /></Layout>} />
      <Route path="/chat" component={() => <Layout><Chat /></Layout>} />
      <Route path="/schedule" component={() => <Layout><Schedule /></Layout>} />
      <Route path="/jobs" component={() => <Layout><Jobs /></Layout>} />
      <Route path="/jobs/:id" component={() => <Layout><JobDetail /></Layout>} />
      <Route path="/notes" component={() => <Layout><Notes /></Layout>} />
      <Route path="/toolbox" component={() => <Layout><Toolbox /></Layout>} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
