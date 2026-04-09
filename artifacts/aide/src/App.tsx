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
import { cn } from "@/lib/utils";
import { Home, MessageCircle, Briefcase, FileText, Wrench } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
    },
  },
});

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/chat", icon: MessageCircle, label: "AIDE" },
  { path: "/jobs", icon: Briefcase, label: "Jobs" },
  { path: "/notes", icon: FileText, label: "Notes" },
  { path: "/toolbox", icon: Wrench, label: "Toolbox" },
];

function BottomNav() {
  const [location, setLocation] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#1A1A24] border-t border-[#2E2E45] md:hidden">
      <div className="flex items-center justify-around px-2 py-2 safe-area-inset-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
          return (
            <button
              key={item.path}
              data-testid={`nav-${item.label.toLowerCase()}`}
              onClick={() => setLocation(item.path)}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-all duration-200",
                isActive ? "text-[#A855F7]" : "text-[#475569]"
              )}
            >
              <div className={cn(
                "relative",
                isActive && "drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]"
              )}>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
              </div>
              <span className="text-[10px] font-medium tracking-wider uppercase">{item.label}</span>
              {isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#7C3AED] rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function SidebarNav() {
  const [location, setLocation] = useLocation();

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-60 bg-[#1A1A24] border-r border-[#2E2E45] flex-col z-50">
      <div className="p-6 border-b border-[#2E2E45]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#A855F7] flex items-center justify-center shadow-lg shadow-[rgba(124,58,237,0.3)]">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-lg tracking-tight">AIDE</h1>
            <p className="text-[#475569] text-xs">Operations Assistant</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
          return (
            <button
              key={item.path}
              data-testid={`sidebar-nav-${item.label.toLowerCase()}`}
              onClick={() => setLocation(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-left",
                isActive
                  ? "bg-[rgba(124,58,237,0.15)] text-[#A855F7] border border-[#7C3AED]"
                  : "text-[#94A3B8] hover:text-white hover:bg-[#242433]"
              )}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 1.5} />
              {item.label}
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#7C3AED]" />
              )}
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-[#2E2E45]">
        <div className="px-4 py-2">
          <p className="text-[#475569] text-xs">Mentaris · AIDE v1.0</p>
        </div>
      </div>
    </aside>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0F0F13]">
      <SidebarNav />
      <div className="md:ml-60 pb-20 md:pb-0 min-h-screen">
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
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
