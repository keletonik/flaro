/**
 * FipNetworkingGuide — structured technical reference for FIP
 * networking and configuration topics, organised basic → advanced.
 *
 * Static content only. Acts as a quick on-site lookup the operator
 * can bring up when scoping a job, briefing a tech, or designing
 * panel-to-panel comms. Topics are grouped into expandable sections
 * for skim-ability.
 */

import { useState } from "react";
import {
  ChevronDown, ChevronRight, Network, Cpu, Cable, Radio, Server,
  Layers, ShieldCheck, Workflow, Zap, GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Level = "basic" | "intermediate" | "advanced";

interface Topic {
  title: string;
  level: Level;
  body: React.ReactNode;
}

interface Section {
  key: string;
  title: string;
  blurb: string;
  icon: typeof Network;
  topics: Topic[];
}

const LEVEL_PILL: Record<Level, string> = {
  basic: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  intermediate: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  advanced: "bg-red-500/10 text-red-500 border-red-500/30",
};

const SECTIONS: Section[] = [
  {
    key: "loop-fundamentals",
    title: "1. Loop fundamentals",
    blurb: "How a single panel sees its detection devices.",
    icon: Cable,
    topics: [
      {
        title: "Conventional vs addressable",
        level: "basic",
        body: (
          <>
            <p>Two world-views for FIP wiring:</p>
            <ul className="list-disc list-inside space-y-0.5 mt-1">
              <li><b>Conventional</b> — each zone is a pair of wires. The panel only knows "zone 5 is in alarm". Devices are dumb. Common for small Australian sites with NSW Inertia 2400, Ampac FireFinder Plus (conventional cards), older Wormald.</li>
              <li><b>Addressable / analogue-addressable</b> — every device has a unique address on a Signalling Line Circuit (SLC), reports its own status + analogue value. Pertronic F-series, Notifier NFS, Simplex 4010ES/4100ES, Hochiki ESP, Apollo XP95/Discovery, Vigilant MX1.</li>
            </ul>
            <p className="mt-1.5 text-muted-foreground">Hybrid panels accept both — Apollo + Hochiki protocols on the same loop card are common.</p>
          </>
        ),
      },
      {
        title: "Class A vs Class B wiring (AS 1670.1)",
        level: "basic",
        body: (
          <>
            <ul className="list-disc list-inside space-y-0.5">
              <li><b>Class B</b> — single radial run, end-of-line resistor. A single break loses everything past the break. Cheaper, more common.</li>
              <li><b>Class A</b> — loop returns to the panel ("A&B"). A single break is detected and the loop is fed from both ends. Required for survivability on bigger / higher-risk sites.</li>
              <li><b>Class X</b> (some US specs) = Class A with short-circuit isolation between every device. AS uses isolators instead.</li>
            </ul>
            <p className="mt-1.5">AS 1670.1 §3.34 calls for isolators such that a single short cannot disable more than 40 devices or one zone, whichever is less.</p>
          </>
        ),
      },
      {
        title: "Loop budgets & device limits",
        level: "intermediate",
        body: (
          <>
            <p>Three constraints to balance every time you load a loop:</p>
            <ul className="list-disc list-inside space-y-0.5 mt-1">
              <li><b>Address count</b> — Apollo 126, Hochiki 127, Notifier CLIP 99 + 99, Simplex IDNet 250, Pertronic SenseNET 240.</li>
              <li><b>Current</b> — quiescent + alarm load must sit inside the loop card's spec (typically 400–500 mA). Sounders + beacons hit current hard.</li>
              <li><b>Cable run</b> — usually ≤2 km @ 1.5 mm² fire-rated cable. Longer or thinner = volt-drop kills devices furthest from the panel.</li>
            </ul>
          </>
        ),
      },
      {
        title: "Isolator placement strategy",
        level: "intermediate",
        body: (
          <>
            <p>Two patterns:</p>
            <ul className="list-disc list-inside space-y-0.5 mt-1">
              <li><b>Per-zone</b> — isolator at the start of every zone. Easy mental model, easy to commission.</li>
              <li><b>Every-Nth-device</b> — modern guidance. Drop an isolator every ~20 devices and at every floor / fire compartment boundary. Survivability in the AS sense without doubling your hardware.</li>
            </ul>
            <p className="mt-1.5">Built-in isolators (XPander base, Hochiki ALN-EN with isolator) shift the maths — count the isolating bases instead of separate modules.</p>
          </>
        ),
      },
    ],
  },
  {
    key: "panel-config",
    title: "2. Panel configuration basics",
    blurb: "What lives inside the panel programming tool.",
    icon: Cpu,
    topics: [
      {
        title: "Zones, sub-zones, and labels",
        level: "basic",
        body: (
          <>
            <p>Every device belongs to a <b>zone</b>. A zone is what the brigade sees on the printer / MIMIC. AS 1670.1:</p>
            <ul className="list-disc list-inside space-y-0.5 mt-1">
              <li>One zone per fire compartment, or per ~2000 m² open floor.</li>
              <li>Stairs, lift shafts, plant rooms get their own zone.</li>
              <li>MCPs (manual call points) go in their own dedicated zone — distinguishable from automatic detection.</li>
            </ul>
            <p className="mt-1.5">Custom labels are gold. "L3 KITCHEN OVER COOKTOP" beats "Zone 12 D7" every time when a sleepy tech is on a 3 a.m. callout.</p>
          </>
        ),
      },
      {
        title: "Soft addresses vs physical addresses",
        level: "intermediate",
        body: (
          <>
            <p>Addressable devices ship with a default address (often 1 or 254). You set the working address either by:</p>
            <ul className="list-disc list-inside space-y-0.5 mt-1">
              <li>Hardware DIP switches (older Apollo, Notifier B501).</li>
              <li>Programmer / handheld (Apollo XPERT, Hochiki YBO, Pertronic LPS).</li>
              <li>Auto-learn / soft-address from the panel.</li>
            </ul>
            <p className="mt-1.5">Anomaly to flag during commissioning: a device's <i>physical</i> address differs from its <i>configured</i> address in the panel — comes up as a "missing" or "extra" device on Loop X.</p>
          </>
        ),
      },
      {
        title: "Cause and effect (output programming)",
        level: "intermediate",
        body: (
          <>
            <p>The "if X then Y" of a fire system. Every panel tool uses a slightly different syntax:</p>
            <ul className="list-disc list-inside space-y-0.5 mt-1">
              <li><b>Pertronic</b> — Output Logic in Lifecycle Tool, expression-based.</li>
              <li><b>Notifier</b> — VeriFire / CAMWorks list functions, equation lists.</li>
              <li><b>Simplex</b> — SDU "Action Messages" + Custom Control.</li>
              <li><b>Vigilant MX1</b> — programmable logic blocks in MX1 Programmer.</li>
            </ul>
            <p className="mt-1.5">Common Australian rules to expect to see:</p>
            <ul className="list-disc list-inside space-y-0.5 mt-1">
              <li>Any zone in alarm → Brigade signal output (ASE) + Occupant Warning System.</li>
              <li>MCP only → Brigade + OWS + lift recall (no AHU shutdown — it's a confirmed evac).</li>
              <li>Smoke in lift lobby → Lift recall to ground (ground-floor lobby goes to alternate level).</li>
              <li>Mechanical zone (kitchen, plant) → AHU/exhaust shutdown + dampers close.</li>
            </ul>
          </>
        ),
      },
      {
        title: "EOL resistors & line supervision",
        level: "basic",
        body: (
          <>
            <p>End-of-line components (typically 3.3 kΩ or 4.7 kΩ resistors, or active EOL units) close the supervision loop. The panel reads:</p>
            <ul className="list-disc list-inside space-y-0.5 mt-1">
              <li>Open circuit → fault.</li>
              <li>EOL value → normal.</li>
              <li>Short / lower resistance → alarm or fault depending on band.</li>
            </ul>
            <p className="mt-1.5">If a config drops the EOL programming, the line still works but supervision is dead — a subtle but serious commissioning bug.</p>
          </>
        ),
      },
    ],
  },
  {
    key: "panel-to-panel",
    title: "3. Panel-to-panel networking",
    blurb: "How multiple FIPs share alarm + control across a building or campus.",
    icon: Network,
    topics: [
      {
        title: "When you need a network",
        level: "basic",
        body: (
          <>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Site is too big for one panel's loop budget (large hospitals, universities, shopping centres).</li>
              <li>Multiple buildings on a campus need a single brigade interface.</li>
              <li>An MCC / fire control room needs a master panel that mirrors the slaves.</li>
              <li>Redundancy — if one panel dies the rest keep monitoring.</li>
            </ul>
          </>
        ),
      },
      {
        title: "Per-vendor panel-network protocols",
        level: "intermediate",
        body: (
          <>
            <ul className="list-disc list-inside space-y-1">
              <li><b>Pertronic Net2</b> — peer-to-peer over RS-485 fibre, up to 250 nodes, deterministic alarm propagation. Most common Australian native FIP network.</li>
              <li><b>Notifier ONYXWorks / NUI / NWAS</b> — high-speed network over copper or fibre, NCM-W modules. ONYXWorks is the workstation layer.</li>
              <li><b>Simplex 4120 Network / ES-Net</b> — token-based, fibre or twisted pair, supports up to 99/210 nodes depending on generation.</li>
              <li><b>Vigilant MX1 FIP-Link</b> — peer or master/slave, fibre preferred for noise immunity.</li>
              <li><b>Ampac FireFinder Plus / FACP Net</b> — RS-485 and TCP/IP variants.</li>
              <li><b>Bosch FPA-5000 CAN bus + Ethernet</b> — backbone over CAN, optional Ethernet for remote panels.</li>
              <li><b>Honeywell ESSER essernet</b> — proprietary token ring, very common in European-spec sites.</li>
              <li><b>Hochiki Latitude</b> — IP-native multi-panel network.</li>
            </ul>
          </>
        ),
      },
      {
        title: "Topologies — star, ring, bus",
        level: "intermediate",
        body: (
          <>
            <ul className="list-disc list-inside space-y-0.5">
              <li><b>Bus / daisy chain</b> — simplest, single break loses downstream nodes.</li>
              <li><b>Ring (self-healing)</b> — preferred. A single break is detected as a fault but the network keeps running because every node is reachable from at least one direction.</li>
              <li><b>Star with redundant paths</b> — switches with redundant uplinks; needs careful spanning-tree config when riding shared IT infrastructure.</li>
            </ul>
            <p className="mt-1.5 text-muted-foreground">Fibre is the default backbone for anything spanning more than one building — galvanic isolation kills ground-loop noise and lightning surge.</p>
          </>
        ),
      },
      {
        title: "Cabling — fire-rated copper vs fibre",
        level: "advanced",
        body: (
          <>
            <ul className="list-disc list-inside space-y-0.5">
              <li><b>WS52W / FP200 / Pyrocable</b> — Australian fire-rated copper, 30/60/120-min ratings, used for SLCs and short-haul panel-network legs.</li>
              <li><b>Single-mode fibre</b> — long-haul (&gt;500 m), campus links. Needs media converters approved for life-safety use.</li>
              <li><b>Multi-mode fibre</b> — shorter runs inside a building, cheaper transceivers.</li>
              <li>Always run network cable in its own duct or with a 300 mm separation from data / power per AS 3000 + AS 1670.1.</li>
            </ul>
          </>
        ),
      },
    ],
  },
  {
    key: "interfaces",
    title: "4. External interfaces & integrations",
    blurb: "How the panel talks to brigade, BMS, lifts, AV, and tools.",
    icon: GitBranch,
    topics: [
      {
        title: "ASE / brigade signalling",
        level: "basic",
        body: (
          <>
            <p>The Alarm Signalling Equipment is the brigade's onsite agent. In NSW that's the FRNSW-approved ASE (Permaconn, Multinet, Ampac SmartTerminal). Connection is typically:</p>
            <ul className="list-disc list-inside space-y-0.5 mt-1">
              <li>Two relays from the FIP — Alarm and Fault.</li>
              <li>Optional zone breakdown over RS-485 (AS 4428.6 protocol) for "info to brigade" panels.</li>
              <li>The ASE then dual-paths to the monitoring centre (3G/4G + IP).</li>
            </ul>
          </>
        ),
      },
      {
        title: "Occupant Warning System (AS 1670.4)",
        level: "intermediate",
        body: (
          <>
            <p>The OWS is a separate (or integrated) amplifier driving sounders, AV, and recorded EVAC messages.</p>
            <ul className="list-disc list-inside space-y-0.5 mt-1">
              <li>Typically zoned to match fire compartments — alert in adjacent zones, evacuate in alarm zone.</li>
              <li>EWIS (Emergency Warning & Intercommunication System) is OWS + warden phones. Mandatory in AS 1670.4 for higher-occupancy buildings.</li>
              <li>Common Australian brands: Ampac EvacU, Pertronic EVAC, Wormald Multitone, Vigilant T-Gen.</li>
              <li>Interconnect to FIP is usually a contact-closure per zone + a fault back-feed; high-end EWIS uses RS-485 or IP for full status mirror.</li>
            </ul>
          </>
        ),
      },
      {
        title: "BMS integration — BACnet, Modbus, contact closures",
        level: "advanced",
        body: (
          <>
            <p>BMS wants to know fire status without being able to silence it. Three integration tiers:</p>
            <ul className="list-disc list-inside space-y-0.5 mt-1">
              <li><b>Hard contacts</b> — relays per zone or per status. Cheap, dumb, AS 1670.1 compliant. Use this if the BMS only needs alarm/fault/iso bits.</li>
              <li><b>Modbus RTU / TCP</b> — serial register map. Pertronic, Notifier, Bosch all expose read-only Modbus. Read-only is the rule — BMS must not be able to silence/reset.</li>
              <li><b>BACnet IP</b> — preferred for new commercial. Notifier ONYX-BACnet, Simplex BACnet Gateway, Pertronic BMS-IP. Map fire zones → BACnet objects (BI for alarm/fault, AV for analogue value).</li>
            </ul>
            <p className="mt-1.5 text-muted-foreground">Galvanic isolation between FIP and BMS LAN is mandatory. Use a one-way data diode if the FIP is on a regulated life-safety network.</p>
          </>
        ),
      },
      {
        title: "Lift recall & AHU/damper control",
        level: "intermediate",
        body: (
          <>
            <p>Two safety-critical interlocks driven by the FIP cause-and-effect:</p>
            <ul className="list-disc list-inside space-y-0.5 mt-1">
              <li><b>Lift recall</b> (AS 1735.2) — smoke in lift lobby on level X drives a phase-1 recall to ground (or alternate if ground is the alarmed lobby). Wired as relay outputs to lift controller.</li>
              <li><b>HVAC shutdown / smoke-mode</b> — by zone or globally; trips AHU contactors, shuts fire & smoke dampers, starts stair pressurisation fans. AS 1668.1 sets the air-handling rules.</li>
            </ul>
          </>
        ),
      },
      {
        title: "MIMIC / Fire Control Room",
        level: "intermediate",
        body: (
          <>
            <p>The MIMIC is the lit zone-map at the fire panel. AS 1670.1 requires it for buildings beyond a certain class/area. Usually wired:</p>
            <ul className="list-disc list-inside space-y-0.5 mt-1">
              <li>One LED per zone, driven by the FIP zone outputs (open collector / relay).</li>
              <li>Active when zone in alarm; some MIMICs also show isolated zones in amber.</li>
              <li>Larger sites use a graphical PC-based MIMIC (e.g. Pertronic MIMIC Plus, Notifier ONYXWorks Workstation).</li>
            </ul>
          </>
        ),
      },
    ],
  },
  {
    key: "remote-access",
    title: "5. Remote access & IP-based features",
    blurb: "Modern stuff — IP networking, remote diagnostics, cyber.",
    icon: Server,
    topics: [
      {
        title: "Remote diagnostics & event push",
        level: "intermediate",
        body: (
          <>
            <p>Most modern panels can push events to a service portal:</p>
            <ul className="list-disc list-inside space-y-0.5 mt-1">
              <li>Pertronic FireUtils / FireConnect.</li>
              <li>Notifier ONYX FirstVision / NotiFire.</li>
              <li>Simplex 4100ES + TrueSite Workstation.</li>
              <li>Vigilant MX1 Hub.</li>
              <li>Ampac LoopSense Cloud.</li>
            </ul>
            <p className="mt-1.5">Useful for: live fault ticketing, predictive battery testing, AS 1851 logbook automation, remote re-arming after a confirmed false alarm.</p>
          </>
        ),
      },
      {
        title: "Network segregation & cyber hardening",
        level: "advanced",
        body: (
          <>
            <p>Panels on IP networks are real attack surface. Minimum hygiene:</p>
            <ul className="list-disc list-inside space-y-0.5 mt-1">
              <li>Dedicated VLAN, no internet egress except via vendor cloud allow-list.</li>
              <li>Default passwords changed at commissioning. Document the rotation in the AS 1851 logbook.</li>
              <li>Firmware kept current. Subscribe to vendor security bulletins.</li>
              <li>Read-only BMS bridge (data diode for high-security sites).</li>
              <li>Physical security on the panel — locked enclosure, tamper switch wired back to a dedicated zone.</li>
            </ul>
          </>
        ),
      },
      {
        title: "Cellular / mesh ASE alternatives",
        level: "advanced",
        body: (
          <>
            <p>Where copper to the brigade is impractical (heritage sites, remote campuses):</p>
            <ul className="list-disc list-inside space-y-0.5 mt-1">
              <li>Permaconn PM45 / PM54 — dual-SIM 4G with IP failover.</li>
              <li>Multinet — single-path 3G/4G, cheaper, lower-class buildings.</li>
              <li>RFX / FireRF — proprietary mesh radio for hard-to-cable additions (heritage, retrofit).</li>
            </ul>
            <p className="mt-1.5">Each path needs its own FRNSW path-availability test schedule per AS 1670.3.</p>
          </>
        ),
      },
    ],
  },
  {
    key: "advanced-design",
    title: "6. Advanced design topics",
    blurb: "Survivability, redundancy, special hazards.",
    icon: Workflow,
    topics: [
      {
        title: "Survivability — keeping outputs alive after partial failure",
        level: "advanced",
        body: (
          <>
            <p>AS 1670.1 §3.20 + IFC: in escape routes the fire system must keep working long enough to evacuate. Practical measures:</p>
            <ul className="list-disc list-inside space-y-0.5 mt-1">
              <li>Class A wiring on all SLCs in escape routes.</li>
              <li>Survival-rated cable (WS52W 120-min) for OWS and brigade signalling beyond the protected enclosure.</li>
              <li>Redundant sounder circuits — two NACs per zone wired from opposite ends.</li>
              <li>Two-stage power supplies: 24 h standby + 30-min alarm load minimum, longer for hospitals / aged care.</li>
            </ul>
          </>
        ),
      },
      {
        title: "Redundant FIPs & fail-over",
        level: "advanced",
        body: (
          <>
            <p>Hot-standby FIP architectures appear on hospitals, data centres, defence:</p>
            <ul className="list-disc list-inside space-y-0.5 mt-1">
              <li>Two physically separate FIPs share a network ring.</li>
              <li>Loops are dual-fed — each panel can drive every device.</li>
              <li>One panel is "active master" at a time, the other shadows; hardware watchdog flips on failure.</li>
              <li>Pertronic Net2 + dual MCB, Notifier NCM-W mirrored, Simplex 4100ES dual-CPU all support this in different ways.</li>
            </ul>
          </>
        ),
      },
      {
        title: "Aspirating systems (VESDA / FAAST) integration",
        level: "advanced",
        body: (
          <>
            <p>VESDA detectors are often standalone but integrate to the FIP via:</p>
            <ul className="list-disc list-inside space-y-0.5 mt-1">
              <li>Dry contacts per alarm level (Alert, Action, Fire 1, Fire 2).</li>
              <li>Xtralis HLI (High Level Interface) for direct addressable handshake — preserves per-pipe granularity at the FIP.</li>
              <li>Important: VESDA is typically wired to its <b>own zone(s)</b> on the FIP, with custom labels matching the pipe layout.</li>
            </ul>
          </>
        ),
      },
      {
        title: "Suppression interlocks (gas, mist, sprinkler)",
        level: "advanced",
        body: (
          <>
            <p>Where the fire system also fires off a suppression release:</p>
            <ul className="list-disc list-inside space-y-0.5 mt-1">
              <li>Cross-zone (coincidence) detection — two independent detectors must alarm before release.</li>
              <li>Abort + manual release MCPs in the protected room, separately addressed.</li>
              <li>Pre-discharge OWS — different tone + voice from general evac.</li>
              <li>Door / damper interlocks held during release; HVAC isolated for the agent's hold time.</li>
            </ul>
            <p className="mt-1.5 text-muted-foreground">AS 4214 (gaseous), AS 2118 (sprinkler), AS 4587 (water mist) set the integration rules.</p>
          </>
        ),
      },
    ],
  },
];

export function FipNetworkingGuide() {
  // Default: first section open, rest collapsed
  const [open, setOpen] = useState<Record<string, boolean>>({ [SECTIONS[0].key]: true });
  const [filter, setFilter] = useState<"all" | Level>("all");

  function toggle(k: string) {
    setOpen((o) => ({ ...o, [k]: !o[k] }));
  }

  function filterTopic(t: Topic): boolean {
    return filter === "all" || t.level === filter;
  }

  return (
    <div className="max-w-5xl space-y-4">
      <header>
        <h1 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Network className="w-4 h-4 text-primary" />
          FIP Networking & Configuration
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Loop fundamentals to multi-panel networks — Australian context. Filter by depth, expand a section to read.
        </p>
      </header>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Depth</span>
        {(["all", "basic", "intermediate", "advanced"] as const).map((l) => (
          <button
            key={l}
            onClick={() => setFilter(l)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors",
              filter === l
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:text-foreground",
            )}
          >
            {l}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1 mr-2"><span className="w-2 h-2 rounded-full bg-emerald-500" /> basic</span>
          <span className="inline-flex items-center gap-1 mr-2"><span className="w-2 h-2 rounded-full bg-amber-500" /> intermediate</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> advanced</span>
        </span>
      </div>

      <div className="space-y-2">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const visibleTopics = s.topics.filter(filterTopic);
          if (visibleTopics.length === 0) return null;
          const isOpen = !!open[s.key];
          return (
            <section key={s.key} className="bg-card border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => toggle(s.key)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold text-foreground">{s.title}</h2>
                  <p className="text-[11px] text-muted-foreground truncate">{s.blurb}</p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {visibleTopics.length} topic{visibleTopics.length !== 1 ? "s" : ""}
                </span>
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {isOpen && (
                <div className="border-t border-border divide-y divide-border">
                  {visibleTopics.map((t, i) => (
                    <div key={i} className="px-4 py-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="text-xs font-semibold text-foreground">{t.title}</h3>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase border",
                          LEVEL_PILL[t.level],
                        )}>
                          {t.level}
                        </span>
                      </div>
                      <div className="text-[12px] leading-relaxed text-foreground/90 space-y-1 [&_b]:text-foreground [&_b]:font-semibold [&_i]:italic">
                        {t.body}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <footer className="text-[10px] text-muted-foreground border-t border-border pt-3">
        References: AS 1670.1 (system design), AS 1670.3 (path availability), AS 1670.4 (occupant warning), AS 1851 (maintenance), AS 4428 (control & indicating equipment), AS 7240 series (system components), AS 1735.2 (lift fire control), AS 1668.1 (smoke control via air handling), AS 4214 (gaseous suppression).
      </footer>

      {/* Unused icon imports retained for future sub-section icons */}
      <div className="hidden">
        <Radio /> <Layers /> <ShieldCheck /> <Zap />
      </div>
    </div>
  );
}
