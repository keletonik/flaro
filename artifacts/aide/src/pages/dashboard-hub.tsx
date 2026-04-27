/**
 * Dashboard hub — landing page for the pivoted AIDE.
 *
 * Renders a grid of Fire Safety tools. FIP Knowledge Base is the only
 * one live today; future tools are placeholders so the shape of the
 * hub is visible without shipping half-finished features.
 *
 * Click a live tile → navigate to the tool. Click a placeholder →
 * nothing (pointer disabled).
 */

import { useLocation } from "wouter";
import {
  Flame, Calculator, BookOpen, ClipboardCheck, Gauge, Wrench,
  Zap, Wifi, Siren, Waves, CircuitBoard, FileText, GraduationCap,
  Cpu, type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { InstallBanner } from "@/components/InstallBanner";
import { cn } from "@/lib/utils";

interface Tool {
  /** Stable key for React + analytics. */
  key: string;
  icon: LucideIcon;
  title: string;
  description: string;
  /** Absolute path the tile links to. null = placeholder. */
  href: string | null;
  /** Label that appears over placeholders. */
  comingSoon?: boolean;
}

const TOOLS: Tool[] = [
  {
    key: "fip",
    icon: Flame,
    title: "FIP Knowledge Base",
    description: "Manufacturers, panel models, standards, fault codes, datasheets.",
    href: "/fip",
  },
  {
    key: "fault-finding",
    icon: Wrench,
    title: "Fault Finding",
    description: "Realistic field troubleshooting for shorts, opens, comms, alarms.",
    href: "/fault-finding",
  },
  {
    key: "training",
    icon: GraduationCap,
    title: "Training",
    description: "Field-voice learning tracks for FIP, VESDA and EWIS.",
    href: "/training",
  },
  {
    key: "panels",
    icon: Cpu,
    title: "Panels",
    description: "Brand and model reference for Pertronic, Ampac, Fire Sense and more.",
    href: "/panels",
  },
  {
    key: "standards",
    icon: BookOpen,
    title: "AS Standards",
    description: "Quick reference for AS 1670, 1851, 2118 and compliance triggers.",
    href: null,
    comingSoon: true,
  },
  {
    key: "testing",
    icon: ClipboardCheck,
    title: "Testing Schedules",
    description: "Building-class-aware test intervals with reminders and defect flow.",
    href: null,
    comingSoon: true,
  },
  {
    key: "hydraulic",
    icon: Gauge,
    title: "Hydrant & Sprinkler",
    description: "Pressure, flow, pipe sizing calculators for dry fire systems.",
    href: null,
    comingSoon: true,
  },
  {
    key: "detectors",
    icon: Siren,
    title: "Detector Lookup",
    description: "Cross-reference detector types, codes, sensitivities per AS.",
    href: null,
    comingSoon: true,
  },
  {
    key: "wiring",
    icon: CircuitBoard,
    title: "Panel Wiring",
    description: "Loop calculators, cable specs, terminator diagrams.",
    href: null,
    comingSoon: true,
  },
  {
    key: "networking",
    icon: Wifi,
    title: "Networking",
    description: "Pertronic/Ampac network topology, addressing, peer-to-peer.",
    href: null,
    comingSoon: true,
  },
  {
    key: "power",
    icon: Zap,
    title: "Battery & PSU",
    description: "Battery-backup calculations and PSU load sizing.",
    href: null,
    comingSoon: true,
  },
  {
    key: "calculator",
    icon: Calculator,
    title: "Unit Converter",
    description: "Pressure, flow, length units used across AS and ISO spec sheets.",
    href: null,
    comingSoon: true,
  },
  {
    key: "hydrostatic",
    icon: Waves,
    title: "Hydrostatic Tests",
    description: "Pipework pressure test sheets and pass/fail thresholds.",
    href: null,
    comingSoon: true,
  },
  {
    key: "maintenance",
    icon: Wrench,
    title: "Maintenance Logs",
    description: "Templates for service reports, defect remediation tracking.",
    href: null,
    comingSoon: true,
  },
  {
    key: "docs",
    icon: FileText,
    title: "Manuals Library",
    description: "Cross-manufacturer search across installation & programming manuals.",
    href: null,
    comingSoon: true,
  },
];

function ToolTile({ tool, onClick }: { tool: Tool; onClick: () => void }) {
  const Icon = tool.icon;
  const disabled = !tool.href;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative text-left rounded-xl border p-4 transition-all duration-200",
        disabled
          ? "border-border/50 bg-card/40 cursor-default"
          : "border-border bg-card hover:border-primary/50 hover:bg-muted/30 hover:shadow-[0_8px_24px_-12px_hsl(var(--primary)/0.35)] hover:-translate-y-0.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200",
            disabled
              ? "bg-muted/40 text-muted-foreground/40"
              : "bg-primary/10 text-primary group-hover:bg-primary/20 group-hover:scale-105",
          )}
        >
          <Icon size={18} />
        </div>
        {tool.comingSoon && (
          <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground/70 px-1.5 py-0.5 rounded border border-border/60">
            soon
          </span>
        )}
      </div>
      <h3
        className={cn(
          "text-[14px] font-bold tracking-tight mb-1",
          disabled ? "text-foreground/60" : "text-foreground",
        )}
      >
        {tool.title}
      </h3>
      <p
        className={cn(
          "text-[12px] leading-relaxed",
          disabled ? "text-muted-foreground/60" : "text-muted-foreground",
        )}
      >
        {tool.description}
      </p>
    </button>
  );
}

export default function DashboardHub() {
  const [, setLocation] = useLocation();
  const activeCount = TOOLS.filter((t) => !!t.href).length;

  return (
    <div className="flex-1 min-w-0 min-h-screen bg-background">
      <PageHeader
        prefix="~"
        title="Fire Safety Toolkit"
        subtitle={`Dry Fire technical assistance · ${activeCount} of ${TOOLS.length} tools live`}
      />

      <div className="px-4 sm:px-6 py-5 max-w-[1280px]">
        <InstallBanner className="mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {TOOLS.map((tool) => (
            <ToolTile
              key={tool.key}
              tool={tool}
              onClick={() => tool.href && setLocation(tool.href)}
            />
          ))}
        </div>

        <p className="mt-6 font-mono text-[10px] text-muted-foreground/70 tracking-wide">
          Tools marked <span className="text-foreground/80">soon</span> are on
          the roadmap. Open the AIDE tray (⌘+.) to ask technical questions
          about any of them in the meantime.
        </p>
      </div>
    </div>
  );
}
