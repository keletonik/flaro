/**
 * Training content — authored in-field voice for dry-fire technicians.
 *
 * Each module is plain structured data so future edits land in one file,
 * not scattered across JSX. A second commit can migrate this to a DB table
 * if the content grows — for now, static is the simplest thing that works.
 */

export type TrackKey = "fip" | "ows" | "vesda" | "ewis";
export type Level = "beginner" | "intermediate" | "expert";

export interface TrainingTrack {
  key: TrackKey;
  title: string;
  tagline: string;
  /** One-liner for the catalogue card. */
  description: string;
}

export interface TrainingModule {
  id: string;
  track: TrackKey;
  level: Level;
  title: string;
  /** Plain-text summary shown in the catalogue list. */
  summary: string;
  /** Body is a series of blocks. Renderer maps each to JSX. */
  blocks: ContentBlock[];
  /** Minutes to read / work through. Rough but honest. */
  durationMin: number;
  /** Marked true for modules that have real content; false = placeholder. */
  ready: boolean;
}

export type ContentBlock =
  | { kind: "h2"; text: string }
  | { kind: "p"; text: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "numbered"; items: string[] }
  | { kind: "callout"; tone: "info" | "warn" | "tip"; title: string; body: string }
  | { kind: "table"; headers: string[]; rows: string[][] }
  | { kind: "code"; lang?: string; text: string }
  | { kind: "diagram"; diagram: "fip-block" }
  | { kind: "check-yourself"; question: string; answer: string };

// ── Tracks ──────────────────────────────────────────────────────────────

export const TRACKS: TrainingTrack[] = [
  {
    key: "fip",
    title: "Fire Indicator Panels",
    tagline: "Pertronic, Ampac, Fusion — the brains of the system.",
    description:
      "How a FIP works, how to read it, how to program it, how to fault-find it. Covers conventional and addressable loops.",
  },
  {
    key: "vesda",
    title: "VESDA / Aspirating",
    tagline: "Air-sampling smoke detection for high-value spaces.",
    description:
      "Suction principle, pipework design, alarm thresholds, nuisance-alarm debugging, Xtralis-specific traps.",
  },
  {
    key: "ewis",
    title: "EWIS & OWS",
    tagline: "Emergency warning and occupant warning systems.",
    description:
      "AS 1670.4 compliance, WIP handsets, speaker circuits, zone amps, sound pressure and intelligibility testing.",
  },
];

// ── Modules ─────────────────────────────────────────────────────────────

export const MODULES: TrainingModule[] = [
  // ─── FIP · Beginner · fully authored ──────────────────────────────────
  {
    id: "fip-101",
    track: "fip",
    level: "beginner",
    title: "FIP 101 — What the panel actually does",
    summary:
      "The panel is a monitor, annunciator and relay controller. It doesn't fight the fire — it tells the right people the right thing.",
    durationMin: 18,
    ready: true,
    blocks: [
      { kind: "h2", text: "The one-sentence definition" },
      {
        kind: "p",
        text:
          "A Fire Indicator Panel (FIP) is a continuously-monitored controller that watches every field device on its circuits, interprets their state (normal / alarm / fault / isolate) and triggers outputs to occupant warning, brigade signalling, door controls and suppression systems.",
      },
      {
        kind: "callout",
        tone: "info",
        title: "AS 7240.2 in plain English",
        body:
          "The standard says the FIP must be able to differentiate between a genuine alarm, a fault on the wiring, and a device that's been isolated for service. If it can't tell those three apart, it fails type approval — that's why wiring supervision is not optional.",
      },
      { kind: "h2", text: "The block diagram" },
      { kind: "diagram", diagram: "fip-block" },
      {
        kind: "p",
        text:
          "Every FIP — regardless of brand — has the same six blocks: power supply, CPU / logic board, detection loops (conventional zones or addressable loops), output circuits (OWS, brigade, aux relays), HMI (indicators, keypad, printer), and monitoring circuits (EOLs, battery, earth fault).",
      },
      { kind: "h2", text: "Conventional vs addressable" },
      {
        kind: "table",
        headers: ["Aspect", "Conventional", "Addressable"],
        rows: [
          ["Device ID", "None — zone only", "Unique address per device"],
          ["Wiring", "2-wire radial per zone", "2-wire loop (in & out), Class A or B"],
          ["Supervision", "EOL resistor at far end", "Poll-based; panel queries every device every few seconds"],
          ["Fault isolation", "Zone level only", "Device level; isolator modules segment the loop"],
          ["Typical capacity", "8–16 zones", "99–250 devices per loop, 2–8 loops per panel"],
          ["When to use", "Small single-storey sites, legacy retrofits", "Multi-storey, high device count, anything with comms needs"],
        ],
      },
      {
        kind: "callout",
        tone: "tip",
        title: "Field tip — telling them apart at a glance",
        body:
          "If the panel has a zone indicator LED strip with numbers (1–16 etc), it's almost certainly conventional. If it has an LCD screen that scrolls device names, it's addressable. If it has both, it's a hybrid (common on Pertronic F200 / Ampac FireFinder).",
      },
      { kind: "h2", text: "What a detector actually sends" },
      {
        kind: "p",
        text:
          "A conventional detector is a current sink. Quiescent current is a few mA. When it alarms, it shorts the loop through a known resistance, raising the loop current to the panel's alarm threshold. That's literally it — no intelligence, no handshake.",
      },
      {
        kind: "p",
        text:
          "An addressable detector is a slave on a digital bus. The panel polls each address in turn (typical cycle: 2–5s for the whole loop). The detector responds with its state + analogue value (for smoke: 0–100, with alarm usually triggered at 50–70). The panel decides what counts as an alarm, not the detector.",
      },
      {
        kind: "callout",
        tone: "warn",
        title: "Why this matters on site",
        body:
          "On an addressable loop, isolating ONE detector doesn't always take it off the bus — it just stops the panel processing its alarm. The device is still there electrically. If it's got an internal fault pulling the line, isolation won't clear it. You still need to physically remove or disconnect.",
      },
      { kind: "h2", text: "Supervision — what the panel is watching" },
      {
        kind: "bullets",
        items: [
          "Loop integrity — end-of-line resistor present (conventional) or poll responses received (addressable). Broken wire or missing EOL → fault.",
          "Earth fault — leakage between the loop and protective earth. Caused by moisture, insulation damage, or poor terminations. Usually appears on the 'earth fault' LED without a specific location.",
          "Power supply — mains present, battery charging, battery voltage under load. Panel will fault if battery can't support rated standby + alarm current.",
          "CPU watchdog — internal; if the main board hangs, the watchdog trips and the panel drops all outputs to the failsafe state.",
          "Sounder circuits — monitored independently. Shorted speaker wires = sounder fault; open wires = sounder fault (both will still set the alarm outputs, they just flag the impairment).",
        ],
      },
      { kind: "h2", text: "The HMI — what the screen is telling you" },
      {
        kind: "p",
        text:
          "First thing on arrival: read the indicator LEDs, NOT the screen. The LEDs are hard-wired to the state outputs and cannot lie. The LCD can freeze, scroll past important info, or show stale events if the operator hasn't acknowledged. The LEDs tell you: alarm? fault? isolate? supply OK?",
      },
      {
        kind: "bullets",
        items: [
          "Alarm LED on + buzzer: you have a fire signal somewhere. Don't silence until you've identified the zone/device.",
          "Fault LED on: something's broken. Earth fault, open loop, low battery, missing EOL — check the event log.",
          "Isolate LED on: someone's taken a zone or device offline. Find what and why — this is a compliance issue if not logged.",
          "Power LED off: you have a mains and battery fail — the panel is running on residual capacitance. You have minutes.",
        ],
      },
      {
        kind: "check-yourself",
        question:
          "You arrive at a site, the panel shows a steady amber Fault LED and the LCD is blank. What do you do first?",
        answer:
          "Check the mains + battery indicators. A blank LCD with a fault light is classic low-battery / no-mains: the panel has cut backlight to conserve battery, but the fault signalling stays active. Open the panel, confirm mains at the fuse, confirm battery voltage > 24V and that the charger is delivering. If mains is out, find out why (tripped breaker? building shutdown?) before touching anything else.",
      },
      { kind: "h2", text: "Summary" },
      {
        kind: "bullets",
        items: [
          "FIP = monitor, annunciator, relay controller. Not a suppression system.",
          "Six blocks: PSU, CPU, detection loops, outputs, HMI, supervision.",
          "Conventional uses EOL resistors; addressable uses polling + unique IDs.",
          "Read LEDs before LCD — LEDs cannot lie.",
          "Supervision is what makes the standard happy. Break it and you have an unapproved panel.",
        ],
      },
    ],
  },

  // ─── FIP · Intermediate · placeholder ─────────────────────────────────
  {
    id: "fip-201",
    track: "fip",
    level: "intermediate",
    title: "Addressable loop design — isolators, capacitance, length",
    summary:
      "Class A vs B, loop length limits per manufacturer, where to put isolators, when capacitance bites you.",
    durationMin: 25,
    ready: false,
    blocks: [],
  },
  {
    id: "fip-301",
    track: "fip",
    level: "expert",
    title: "Programming Pertronic F120 / F220 from cold",
    summary:
      "Commissioning a panel from an empty config: zones, devices, cause-and-effect, testing before handover.",
    durationMin: 60,
    ready: false,
    blocks: [],
  },

  // ─── VESDA · placeholders ─────────────────────────────────────────────
  {
    id: "vesda-101",
    track: "vesda",
    level: "beginner",
    title: "VESDA 101 — How air-sampling detection works",
    summary: "Suction principle, cyclone separation, laser chamber, why VESDA sees smoke minutes before spot detectors.",
    durationMin: 20,
    ready: false,
    blocks: [],
  },
  {
    id: "vesda-201",
    track: "vesda",
    level: "intermediate",
    title: "Pipework design — balance, transport time, hole drilling",
    summary: "PipeIQ, balancing multi-pipe systems, transport-time compliance (AS 1670.1 < 120s), common design errors.",
    durationMin: 35,
    ready: false,
    blocks: [],
  },
  {
    id: "vesda-301",
    track: "vesda",
    level: "expert",
    title: "Nuisance alarms — diagnosing false trips on live sites",
    summary: "HVAC interference, dust loading, stratification, alarm level tuning without breaking compliance.",
    durationMin: 45,
    ready: false,
    blocks: [],
  },

  // ─── EWIS · placeholders ──────────────────────────────────────────────
  {
    id: "ewis-101",
    track: "ewis",
    level: "beginner",
    title: "EWIS 101 — What is an Emergency Warning system",
    summary: "AS 1670.4, zone design, WIP vs speaker, evacuation tones vs alert tones, brigade interaction.",
    durationMin: 22,
    ready: false,
    blocks: [],
  },
  {
    id: "ewis-201",
    track: "ewis",
    level: "intermediate",
    title: "Speaker circuits — impedance, taps, 100V line design",
    summary: "100V line basics, tap ratings, zone amp sizing, how to avoid the 'two volts at the end of the corridor' trap.",
    durationMin: 30,
    ready: false,
    blocks: [],
  },
  {
    id: "ewis-301",
    track: "ewis",
    level: "expert",
    title: "Intelligibility testing and STIPA — passing every time",
    summary: "STIPA methodology, reverberation traps, speaker angle, when to add fill speakers, documenting the pass.",
    durationMin: 40,
    ready: false,
    blocks: [],
  },

  // ─── OWS placeholders — included under ewis track keys for simplicity ─
];

export function modulesForTrack(track: TrackKey): TrainingModule[] {
  const order: Level[] = ["beginner", "intermediate", "expert"];
  return MODULES
    .filter(m => m.track === track)
    .sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level));
}

export function moduleById(id: string): TrainingModule | undefined {
  return MODULES.find(m => m.id === id);
}
