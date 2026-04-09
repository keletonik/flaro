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
import Todos from "@/pages/todos";
import Projects from "@/pages/projects";
import { ThemeProvider, useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, MessageCircle, Briefcase, FileText, Wrench,
  CalendarDays, Sun, Moon, CheckSquare, FolderKanban
} from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30000, retry: 1 },
  },
});

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { path: "/chat", icon: MessageCircle, label: "Chat" },
  { path: "/jobs", icon: Briefcase, label: "Jobs" },
  { path: "/todos", icon: CheckSquare, label: "To-Do" },
  { path: "/projects", icon: FolderKanban, label: "Projects" },
  { path: "/notes", icon: FileText, label: "Notes" },
  { path: "/schedule", icon: CalendarDays, label: "Schedule", sidebarOnly: true },
  { path: "/toolbox", icon: Wrench, label: "Toolbox", sidebarOnly: true },
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
        "flex items-center gap-2.5 rounded-lg transition-all duration-200",
        compact
          ? "w-8 h-8 justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          : "px-3 py-2 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent text-xs w-full font-medium"
      )}
    >
      {theme === "light"
        ? <Moon size={14} strokeWidth={1.75} />
        : <Sun size={14} strokeWidth={1.75} />
      }
      {!compact && <span>{theme === "light" ? "Dark mode" : "Light mode"}</span>}
    </button>
  );
}

function SidebarNav() {
  const [location, setLocation] = useLocation();

  const mainNav = navItems.filter(i => !i.path.match(/schedule|toolbox/));
  const secondaryNav = navItems.filter(i => i.path.match(/schedule|toolbox/));

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-52 flex-col z-50 bg-sidebar border-r border-sidebar-border">
      {/* Logo area */}
      <div className="px-4 pt-5 pb-4">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm flex-shrink-0">
            <span className="text-white font-bold text-sm tracking-tighter">A</span>
          </div>
          <span className="text-sidebar-foreground font-bold text-base tracking-tight">AIDE</span>
        </button>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-sidebar-border mb-3" />

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {mainNav.map((item) => {
          const Icon = item.icon;
          const active = isActive(location, item);
          return (
            <button
              key={item.path}
              data-testid={`sidebar-nav-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              onClick={() => setLocation(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 text-left relative",
                active
                  ? "bg-sidebar-accent text-white"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
              )}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-r-full" />
              )}
              <Icon size={15} strokeWidth={active ? 2.25 : 1.75} className="flex-shrink-0" />
              <span className="flex-1 tracking-wide uppercase text-[10px]">{item.label}</span>
            </button>
          );
        })}

        {/* Secondary nav group */}
        <div className="pt-4 pb-1">
          <p className="px-3 text-[9px] font-bold uppercase tracking-widest text-sidebar-foreground/25 mb-1">Tools</p>
          {secondaryNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(location, item);
            return (
              <button
                key={item.path}
                data-testid={`sidebar-nav-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                onClick={() => setLocation(item.path)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 text-left relative",
                  active
                    ? "bg-sidebar-accent text-white"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
                )}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-r-full" />
                )}
                <Icon size={15} strokeWidth={active ? 2.25 : 1.75} className="flex-shrink-0" />
                <span className="flex-1 tracking-wide uppercase text-[10px]">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-2 pb-4 border-t border-sidebar-border pt-3 space-y-1">
        <ThemeToggle />
        <div className="px-3 pt-1">
          <p className="text-[9px] text-sidebar-foreground/25 font-medium tracking-widest uppercase">Mentaris · AIDE v1.0</p>
        </div>
      </div>
    </aside>
  );
}

function BottomNav() {
  const [location, setLocation] = useLocation();
  const mobileItems = navItems.filter(i => !("sidebarOnly" in i && i.sidebarOnly)).slice(0, 5);

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
                "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 min-w-[44px]",
                active ? "text-primary" : "text-sidebar-foreground/40"
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.25 : 1.5} />
              <span className="text-[9px] font-bold tracking-widest uppercase">{item.label}</span>
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
      <div className="md:ml-52 pb-16 md:pb-0 min-h-screen">
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
      <Route path="/todos" component={() => <Layout><Todos /></Layout>} />
      <Route path="/projects" component={() => <Layout><Projects /></Layout>} />
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
