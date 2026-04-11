import { useState, useEffect } from "react";
import { Settings2, Palette, User, Bell, Database, Layout, Monitor, Moon, Sun, Check } from "lucide-react";
import { useTheme, THEME_OPTIONS, type ThemeVariant } from "@/lib/theme";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const TECHS = ["Darren Brailey", "Gordon Jenkins", "Haider Al-Heyoury", "John Minai", "Nu Unasa"];

const SECTIONS = [
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "profile", label: "Profile", icon: User },
  { id: "dashboard", label: "Dashboard", icon: Layout },
  { id: "data", label: "Data & Import", icon: Database },
  { id: "display", label: "Display", icon: Monitor },
];

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-8 py-4 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className={cn("relative w-9 h-5 rounded-full transition-colors", checked ? "bg-primary" : "bg-muted")}>
      <div className={cn("absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform", checked && "translate-x-4")} />
    </button>
  );
}

export default function SettingsPage() {
  const { theme, setTheme, mode } = useTheme();
  const [activeSection, setActiveSection] = useState("appearance");
  const [revenueTarget, setRevenueTarget] = useState("180000");
  const [compactMode, setCompactMode] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState("60");
  const [defaultOpsTab, setDefaultOpsTab] = useState("wip");
  const [defaultPmView, setDefaultPmView] = useState("table");
  const [dateFormat, setDateFormat] = useState("en-AU");
  const [currencySymbol, setCurrencySymbol] = useState("$");
  const { toast } = useToast();

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("ops-settings");
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (s.revenueTarget) setRevenueTarget(s.revenueTarget);
        if (s.compactMode !== undefined) setCompactMode(s.compactMode);
        if (s.showCompleted !== undefined) setShowCompleted(s.showCompleted);
        if (s.autoRefresh !== undefined) setAutoRefresh(s.autoRefresh);
        if (s.refreshInterval) setRefreshInterval(s.refreshInterval);
        if (s.defaultOpsTab) setDefaultOpsTab(s.defaultOpsTab);
        if (s.defaultPmView) setDefaultPmView(s.defaultPmView);
        if (s.dateFormat) setDateFormat(s.dateFormat);
        if (s.currencySymbol) setCurrencySymbol(s.currencySymbol);
      } catch (e: any) { console.error(e); }
    }
  }, []);

  const saveSettings = () => {
    const settings = { revenueTarget, compactMode, showCompleted, autoRefresh, refreshInterval, defaultOpsTab, defaultPmView, dateFormat, currencySymbol };
    localStorage.setItem("ops-settings", JSON.stringify(settings));
    toast({ title: "Settings saved" });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 glass border-b border-border/50 px-4 sm:px-6 py-3.5">
        <h1 className="text-foreground font-bold text-lg tracking-tight flex items-center gap-2">
          <Settings2 size={18} className="text-primary" /> Settings
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Configure your workspace preferences</p>
      </div>

      <div className="flex max-w-[1000px] mx-auto px-4 sm:px-6 py-6 gap-6">
        {/* Section nav */}
        <div className="w-[180px] shrink-0 hidden sm:block">
          <div className="sticky top-20 space-y-0.5">
            {SECTIONS.map(s => {
              const Icon = s.icon;
              return (
                <button key={s.id} onClick={() => setActiveSection(s.id)}
                  className={cn("w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                    activeSection === s.id ? "bg-primary/8 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}>
                  <Icon size={14} />{s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Settings content */}
        <div className="flex-1 space-y-8">
          {/* Appearance */}
          {(activeSection === "appearance") && (
            <div>
              <h2 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wide">Appearance</h2>
              <div className="bg-card border border-border rounded-xl p-5">
                <SettingRow label="Theme" description="Choose a colour scheme for the interface">
                  <div className="grid grid-cols-3 gap-1.5">
                    {THEME_OPTIONS.map(opt => (
                      <button key={opt.key} onClick={() => setTheme(opt.key)}
                        className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all",
                          theme === opt.key ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                        )}>
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: opt.accent }} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </SettingRow>
                <SettingRow label="Compact mode" description="Reduce spacing and padding for denser layouts">
                  <Toggle checked={compactMode} onChange={v => { setCompactMode(v); saveSettings(); }} />
                </SettingRow>
              </div>
            </div>
          )}

          {/* Profile */}
          {(activeSection === "profile") && (
            <div>
              <h2 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wide">Profile</h2>
              <div className="bg-card border border-border rounded-xl p-5">
                <SettingRow label="Name" description="Your display name across the platform">
                  <input defaultValue="Casper Tavitian" className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground w-48 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </SettingRow>
                <SettingRow label="Role" description="Your position title">
                  <input defaultValue="Service Manager — Dry Fire" className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground w-48 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </SettingRow>
                <SettingRow label="Team members" description="Technicians in your division">
                  <div className="flex flex-wrap gap-1">
                    {TECHS.map(t => (
                      <span key={t} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-muted text-muted-foreground">{t.split(" ")[0]}</span>
                    ))}
                  </div>
                </SettingRow>
              </div>
            </div>
          )}

          {/* Dashboard */}
          {(activeSection === "dashboard") && (
            <div>
              <h2 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wide">Dashboard</h2>
              <div className="bg-card border border-border rounded-xl p-5">
                <SettingRow label="Monthly revenue target" description="Used for target gauge and progress tracking">
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">$</span>
                    <input value={revenueTarget} onChange={e => setRevenueTarget(e.target.value)}
                      className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground w-28 text-right font-mono focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </SettingRow>
                <SettingRow label="Auto-refresh" description="Automatically update dashboard data in real-time">
                  <Toggle checked={autoRefresh} onChange={v => { setAutoRefresh(v); saveSettings(); }} />
                </SettingRow>
                <SettingRow label="Show completed items" description="Display completed tasks and done jobs on dashboard">
                  <Toggle checked={showCompleted} onChange={v => { setShowCompleted(v); saveSettings(); }} />
                </SettingRow>
              </div>
            </div>
          )}

          {/* Data */}
          {(activeSection === "data") && (
            <div>
              <h2 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wide">Data & Import</h2>
              <div className="bg-card border border-border rounded-xl p-5">
                <SettingRow label="Default Operations tab" description="Which tab opens first in Operations">
                  <select value={defaultOpsTab} onChange={e => { setDefaultOpsTab(e.target.value); saveSettings(); }}
                    className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="wip">WIP</option>
                    <option value="quotes">Quotes</option>
                    <option value="defects">Defects</option>
                    <option value="invoices">Invoices</option>
                  </select>
                </SettingRow>
                <SettingRow label="Default PM board view" description="Which view opens when entering a board">
                  <select value={defaultPmView} onChange={e => { setDefaultPmView(e.target.value); saveSettings(); }}
                    className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="table">Table</option>
                    <option value="kanban">Kanban</option>
                    <option value="gantt">Gantt</option>
                  </select>
                </SettingRow>
              </div>
            </div>
          )}

          {/* Display */}
          {(activeSection === "display") && (
            <div>
              <h2 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wide">Display</h2>
              <div className="bg-card border border-border rounded-xl p-5">
                <SettingRow label="Date format" description="How dates are displayed throughout the app">
                  <select value={dateFormat} onChange={e => { setDateFormat(e.target.value); saveSettings(); }}
                    className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="en-AU">DD/MM/YYYY (Australian)</option>
                    <option value="en-US">MM/DD/YYYY (US)</option>
                    <option value="en-GB">DD/MM/YYYY (UK)</option>
                    <option value="iso">YYYY-MM-DD (ISO)</option>
                  </select>
                </SettingRow>
                <SettingRow label="Currency" description="Currency symbol used in financial displays">
                  <select value={currencySymbol} onChange={e => { setCurrencySymbol(e.target.value); saveSettings(); }}
                    className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="$">$ AUD</option>
                    <option value="USD">$ USD</option>
                    <option value="GBP">£ GBP</option>
                    <option value="EUR">€ EUR</option>
                  </select>
                </SettingRow>
              </div>
            </div>
          )}

          <button onClick={saveSettings} className="px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
