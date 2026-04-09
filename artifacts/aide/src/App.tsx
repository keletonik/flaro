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
import Operations from "@/pages/operations";
import Suppliers from "@/pages/suppliers";
import { ThemeProvider, useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, MessageCircle, Briefcase, FileText, Wrench,
  CalendarDays, Sun, Moon, CheckSquare, FolderKanban, BarChart3,
  Package, ChevronLeft, ChevronRight
} from "lucide-react";
import { useState } from "react";

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
      { path: "/chat", icon: MessageCircle, label: "Chat" },
      { path: "/operations", icon: BarChart3, label: "Operations" },
    ],
  },
  {
    label: "Manage",
    items: [
      { path: "/jobs", icon: Briefcase, label: "Jobs" },
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
    ],
  },
];

const allNavItems = navGroups.flatMap(g => g.items);

function isActive(location: string, item: { path: string; exact?: boolean }) {
  if (item.exact) return location === item.path;
  return location === item.path || location.startsWith(item.path + "/");
}

function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      data-testid="button-theme-toggle"
      onClick={toggleTheme}
      title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      className={cn(
        "flex items-center gap-2.5 rounded-lg transition-all duration-200",
        collapsed
          ? "w-9 h-9 justify-center text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          : "px-3 py-2 text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent text-xs w-full font-medium"
      )}
    >
      {theme === "light"
        ? <Moon size={14} strokeWidth={1.75} />
        : <Sun size={14} strokeWidth={1.75} />
      }
      {!collapsed && <span className="text-[11px]">{theme === "light" ? "Dark mode" : "Light mode"}</span>}
    </button>
  );
}

function SidebarNav() {
  const [location, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn(
      "hidden md:flex fixed left-0 top-0 bottom-0 flex-col z-50 bg-sidebar transition-all duration-300",
      collapsed ? "w-[60px]" : "w-[210px]"
    )}>
      {/* Logo */}
      <div className={cn("flex items-center pt-5 pb-4", collapsed ? "px-3 justify-center" : "px-4")}>
        <button onClick={() => setLocation("/")} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-[hsl(280,70%,50%)] flex items-center justify-center shadow-md shrink-0">
            <BarChart3 size={15} className="text-white" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sidebar-foreground font-bold text-[13px] tracking-tight leading-none">Service Ops</span>
              <span className="text-sidebar-foreground/30 text-[9px] font-medium tracking-wider uppercase mt-0.5">FlameSafe</span>
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
              <p className="px-2 text-[9px] font-bold uppercase tracking-[0.08em] text-sidebar-foreground/20 mb-1.5">{group.label}</p>
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
        <ThemeToggle collapsed={collapsed} />
        <button
          onClick={() => setCollapsed(v => !v)}
          className={cn(
            "flex items-center rounded-lg transition-all duration-200 text-sidebar-foreground/30 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
            collapsed ? "w-9 h-9 justify-center" : "gap-2.5 px-3 py-2 w-full text-xs"
          )}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /><span className="text-[11px]">Collapse</span></>}
        </button>
      </div>
    </aside>
  );
}

function BottomNav() {
  const [location, setLocation] = useLocation();
  const mobileItems = [
    allNavItems[0], // Dashboard
    allNavItems[2], // Operations
    allNavItems[1], // Chat
    allNavItems[3], // Jobs
    allNavItems[4], // Tasks
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border md:hidden">
      <div className="flex items-center justify-around px-1 py-1.5 safe-area-inset-bottom">
        {mobileItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(location, item);
          return (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 min-w-[44px]",
                active ? "text-primary" : "text-sidebar-foreground/35"
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.25 : 1.5} />
              <span className="text-[9px] font-bold tracking-wider uppercase">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function useIsSidebarCollapsed() {
  // Read from the sidebar width via CSS, default to 210px
  return false;
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />
      <div className="md:ml-[210px] pb-16 md:pb-0 min-h-screen transition-all duration-300">
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
      <Route path="/operations" component={() => <Layout><Operations /></Layout>} />
      <Route path="/schedule" component={() => <Layout><Schedule /></Layout>} />
      <Route path="/jobs" component={() => <Layout><Jobs /></Layout>} />
      <Route path="/jobs/:id" component={() => <Layout><JobDetail /></Layout>} />
      <Route path="/notes" component={() => <Layout><Notes /></Layout>} />
      <Route path="/todos" component={() => <Layout><Todos /></Layout>} />
      <Route path="/projects" component={() => <Layout><Projects /></Layout>} />
      <Route path="/toolbox" component={() => <Layout><Toolbox /></Layout>} />
      <Route path="/suppliers" component={() => <Layout><Suppliers /></Layout>} />
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
