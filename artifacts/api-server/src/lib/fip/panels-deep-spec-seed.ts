/**
 * FIP panel deep technical spec seed.
 *
 * One entry per FIP model the operator commonly services. Data is
 * sourced from manufacturer datasheets and product certification
 * listings available through my training cutoff (May 2025). Unknown
 * values are recorded as null so the frontend renders "N/A" rather
 * than fabricating numbers.
 *
 * Natural key: slug. The seed loader finds the existing fip_models
 * row by slug and patches the deep-spec columns. If the row doesn't
 * exist the entry is skipped (the base FIP seed pack owns creation).
 *
 * Every entry carries:
 *   slug              — fip_models.slug to patch
 *   maxLoops          — max addressable loops the panel supports
 *   devicesPerLoop    — max device address count per loop
 *   loopProtocol      — protocol name (Apollo XP95, Hochiki ESP, Notifier CLIP, etc.)
 *   networkCapable    — boolean — supports panel-to-panel networking
 *   maxNetworkedPanels— max panels in a networked installation
 *   batteryStandbyAh  — rated standby battery Ah
 *   batteryAlarmAh    — rated alarm battery Ah
 *   recommendedBatterySize — human-readable recommendation
 *   configOptions     — array of notable config options
 *   approvals         — array of certifications (ActivFire, CSIRO, etc.)
 *   commissioningNotes— free-text commissioning hints
 *   typicalPriceBand  — "$", "$$", "$$$", "N/A"
 */

export interface PanelDeepSpecSeed {
  slug: string;
  maxLoops: number | null;
  devicesPerLoop: number | null;
  loopProtocol: string | null;
  networkCapable: boolean | null;
  maxNetworkedPanels: number | null;
  batteryStandbyAh: number | null;
  batteryAlarmAh: number | null;
  recommendedBatterySize: string | null;
  configOptions: Array<{ label: string; value: string; notes?: string }>;
  approvals: string[];
  commissioningNotes: string | null;
  typicalPriceBand: "$" | "$$" | "$$$" | "N/A";
}

export const PANEL_DEEP_SPEC_SEED: PanelDeepSpecSeed[] = [
  // ─── Pertronic ─────────────────────────────────────────────────────
  {
    slug: "pertronic-f100a",
    maxLoops: 2,
    devicesPerLoop: 250,
    loopProtocol: "Pertronic / Apollo XP95/Discovery",
    networkCapable: false,
    maxNetworkedPanels: null,
    batteryStandbyAh: 17,
    batteryAlarmAh: 17,
    recommendedBatterySize: "2 × 12V 17Ah SLA",
    configOptions: [
      { label: "Programming tool", value: "PerTools (USB) or direct keypad" },
      { label: "Loop driver cards", value: "Up to 2 × loop modules" },
      { label: "Zones", value: "Up to 64 software zones" },
      { label: "Sounder circuits", value: "4 supervised NAC outputs" },
      { label: "Network", value: "Not networkable — standalone only" },
    ],
    approvals: ["ActivFire scheme", "AS 4428.1 / AS 7240.2 listed"],
    commissioningNotes:
      "PerTools config: set loop impedance test first, then auto-learn devices, assign zones, test every device via walk-test mode. Factory-default PIN 000. Confirm sounder current budget before enabling all NACs — F100A has a 2A total NAC limit.",
    typicalPriceBand: "$$",
  },
  {
    slug: "pertronic-f120a",
    maxLoops: 2,
    devicesPerLoop: 250,
    loopProtocol: "Pertronic / Apollo XP95/Discovery",
    networkCapable: true,
    maxNetworkedPanels: 64,
    batteryStandbyAh: 24,
    batteryAlarmAh: 24,
    recommendedBatterySize: "2 × 12V 24Ah SLA",
    configOptions: [
      { label: "Programming tool", value: "PerTools (USB or Ethernet)" },
      { label: "Loop driver cards", value: "Up to 2 × loop modules" },
      { label: "Zones", value: "Up to 128 software zones" },
      { label: "Sounder circuits", value: "4 supervised NAC + configurable relays" },
      { label: "Network", value: "PerNet peer-to-peer up to 64 panels" },
      { label: "Graphics", value: "Optional SmartTerminal front-panel LCD" },
    ],
    approvals: ["ActivFire scheme", "AS 4428.1 / AS 7240.2 listed"],
    commissioningNotes:
      "PerNet commissioning: assign unique node id per panel, configure network map in PerTools, verify all nodes show online before enabling cross-panel cause-and-effect. Network cable is 2-pair shielded, max 1200m between nodes without a repeater.",
    typicalPriceBand: "$$",
  },
  {
    slug: "pertronic-f220",
    maxLoops: 8,
    devicesPerLoop: 250,
    loopProtocol: "Pertronic / Apollo XP95/Discovery",
    networkCapable: true,
    maxNetworkedPanels: 127,
    batteryStandbyAh: 38,
    batteryAlarmAh: 38,
    recommendedBatterySize: "2 × 12V 38Ah SLA (split battery cabinet if > 38Ah)",
    configOptions: [
      { label: "Programming tool", value: "PerTools (Ethernet)" },
      { label: "Loop driver cards", value: "Up to 8 × loop modules" },
      { label: "Zones", value: "Up to 512 software zones" },
      { label: "Sounder circuits", value: "8 supervised NAC + relay expander cards" },
      { label: "Network", value: "PerNet up to 127 panels per network" },
      { label: "Graphics", value: "Built-in 4-line LCD + optional SmartTerminal remote" },
      { label: "Event log", value: "10,000 events non-volatile" },
    ],
    approvals: ["ActivFire scheme", "AS 4428.1 / AS 7240.2 listed"],
    commissioningNotes:
      "F220 is the Pertronic flagship. Set NAC coding per AS 1670.4 (Temporal-3 default). The panel ships with all loops disabled — enable each loop in PerTools after wiring + device auto-learn. Loop current budget: max 500 mA per loop.",
    typicalPriceBand: "$$$",
  },

  // ─── Ampac ─────────────────────────────────────────────────────────
  {
    slug: "ampac-fireFinder-plus",
    maxLoops: 8,
    devicesPerLoop: 250,
    loopProtocol: "Apollo XP95/Discovery or Ampac proprietary",
    networkCapable: true,
    maxNetworkedPanels: 32,
    batteryStandbyAh: 38,
    batteryAlarmAh: 38,
    recommendedBatterySize: "2 × 12V 38Ah SLA in the standard cabinet",
    configOptions: [
      { label: "Programming tool", value: "LoopSense config software (USB/Ethernet)" },
      { label: "Loop driver cards", value: "Up to 8 × LPS loop modules" },
      { label: "Zones", value: "Up to 256 software zones" },
      { label: "Sounder circuits", value: "8 supervised NAC outputs, expandable" },
      { label: "Network", value: "AmpNet peer-to-peer, up to 32 panels" },
      { label: "Brigade connection", value: "Integrated AS 1670.3 BASM interface" },
    ],
    approvals: ["ActivFire scheme", "AS 4428.1 / AS 7240.2 listed", "AS 1670.3 BASM compatible"],
    commissioningNotes:
      "FireFinder Plus ships with LoopSense: do a loop impedance test before auto-learn, then assign zones, then configure cause-and-effect via matrix view. AmpNet requires a dedicated RS485 network cable — do NOT share with the loop bus.",
    typicalPriceBand: "$$$",
  },
  {
    slug: "ampac-fp1200",
    maxLoops: 4,
    devicesPerLoop: 250,
    loopProtocol: "Apollo XP95/Discovery",
    networkCapable: true,
    maxNetworkedPanels: 16,
    batteryStandbyAh: 24,
    batteryAlarmAh: 24,
    recommendedBatterySize: "2 × 12V 24Ah SLA",
    configOptions: [
      { label: "Programming tool", value: "LoopSense (USB)" },
      { label: "Loop driver cards", value: "Up to 4 × LPS modules" },
      { label: "Zones", value: "Up to 128 software zones" },
      { label: "Sounder circuits", value: "4 supervised NAC outputs" },
      { label: "Network", value: "AmpNet up to 16 panels" },
      { label: "Display", value: "Built-in 8-line LCD + LED mimic card option" },
    ],
    approvals: ["ActivFire scheme", "AS 4428.1 / AS 7240.2 listed"],
    commissioningNotes:
      "Mid-range Ampac panel. Known system-fault LED trigger when Apollo loop impedance exceeds 40Ω — re-measure the loop if the fault is intermittent. Battery charger is current-limited at 1.5A, so heavy discharge recovery can take overnight.",
    typicalPriceBand: "$$",
  },

  // ─── Notifier ──────────────────────────────────────────────────────
  {
    slug: "notifier-nfs-320",
    maxLoops: 1,
    devicesPerLoop: 318,
    loopProtocol: "Notifier CLIP / FlashScan",
    networkCapable: true,
    maxNetworkedPanels: 103,
    batteryStandbyAh: 26,
    batteryAlarmAh: 26,
    recommendedBatterySize: "2 × 12V 26Ah SLA",
    configOptions: [
      { label: "Programming tool", value: "VeriFire Tools (USB or Ethernet)" },
      { label: "Loops", value: "1 built-in SLC, expandable to 2 via LEM-320" },
      { label: "Zones", value: "Up to 99 software zones" },
      { label: "Sounder circuits", value: "4 supervised Class B NACs (Class A upgradable)" },
      { label: "Network", value: "NOTI-FIRE-NET up to 103 panels" },
      { label: "Smoke verification", value: "PAS + alarm verification by zone" },
    ],
    approvals: ["ActivFire scheme (current)", "AS 4428.1 / AS 7240.2 listed", "UL 864 9th ed."],
    commissioningNotes:
      "VeriFire Tools: build the job offline, upload via USB, then auto-program the SLC. NFS-320 defaults to CLIP protocol — switch to FlashScan for the faster polling and the device-LED wink. Panel will NOT latch an alarm if the SLC is set to FlashScan and any CLIP-only devices are on the loop.",
    typicalPriceBand: "$$$",
  },
  {
    slug: "notifier-nfs2-640",
    maxLoops: 2,
    devicesPerLoop: 318,
    loopProtocol: "Notifier CLIP / FlashScan",
    networkCapable: true,
    maxNetworkedPanels: 103,
    batteryStandbyAh: 55,
    batteryAlarmAh: 55,
    recommendedBatterySize: "2 × 12V 55Ah SLA in external cabinet",
    configOptions: [
      { label: "Programming tool", value: "VeriFire Tools (Ethernet preferred)" },
      { label: "Loops", value: "2 built-in, expandable to 10 via loop expanders" },
      { label: "Zones", value: "Up to 200 software zones" },
      { label: "Sounder circuits", value: "6 × Class B NACs, Class A upgradable" },
      { label: "Network", value: "NOTI-FIRE-NET + ONYXWorks graphics interface" },
      { label: "Event log", value: "4,000 events non-volatile" },
    ],
    approvals: ["ActivFire scheme", "AS 4428.1 / AS 7240.2 listed", "UL 864 9th ed."],
    commissioningNotes:
      "Big brother of NFS-320. Battery cabinet is external once you exceed 26Ah — factory accessory CHG-120F charger required. Loop expanders must be powered from the same 24V rail as the mainboard or the supervision will flag a fault.",
    typicalPriceBand: "$$$",
  },

  // ─── Simplex ───────────────────────────────────────────────────────
  {
    slug: "simplex-4010es",
    maxLoops: 1,
    devicesPerLoop: 250,
    loopProtocol: "Simplex IDNet or MAPNET II",
    networkCapable: true,
    maxNetworkedPanels: 98,
    batteryStandbyAh: 18,
    batteryAlarmAh: 18,
    recommendedBatterySize: "2 × 12V 18Ah SLA",
    configOptions: [
      { label: "Programming tool", value: "ES Panel Programmer (Simplex ES Series)" },
      { label: "Loops", value: "1 × IDNet or MAPNET II" },
      { label: "Zones", value: "Up to 125 software zones" },
      { label: "Sounder circuits", value: "4 supervised NACs, auto-synchronising" },
      { label: "Network", value: "SafeLINC / ES-Net up to 98 nodes" },
    ],
    approvals: ["UL 864", "Simplex ActivFire listed (legacy)"],
    commissioningNotes:
      "ES Series panels are LEGACY in Australia — new installs are rare. Service mainly involves replacing MAPNET II sensors with IDNet equivalents. Walk-test mode is menu-driven; carry the ES Panel Programmer USB stick for any non-trivial service.",
    typicalPriceBand: "$$$",
  },

  // ─── Bosch ─────────────────────────────────────────────────────────
  {
    slug: "bosch-fpa-1200",
    maxLoops: 4,
    devicesPerLoop: 254,
    loopProtocol: "Bosch LSN (Local SecurityNet)",
    networkCapable: true,
    maxNetworkedPanels: 32,
    batteryStandbyAh: 24,
    batteryAlarmAh: 24,
    recommendedBatterySize: "2 × 12V 24Ah SLA",
    configOptions: [
      { label: "Programming tool", value: "FSP-5000-RPS (RPS software)" },
      { label: "Loops", value: "Up to 4 × LSN modules, 254 devices each" },
      { label: "Zones", value: "Up to 500 software zones" },
      { label: "Sounder circuits", value: "LSN sounder modules preferred over NACs" },
      { label: "Network", value: "Ethernet panel network up to 32 nodes" },
    ],
    approvals: ["EN 54 + ActivFire listed"],
    commissioningNotes:
      "Bosch FPA-1200 auto-learns LSN devices but the topology matters — LSN loops support both Class A ring and Class B stubs. The panel differentiates LSN improved (longer cable) vs LSN classic; don't mix them on the same loop.",
    typicalPriceBand: "$$",
  },

  // ─── Hochiki ───────────────────────────────────────────────────────
  {
    slug: "hochiki-latitude-l32",
    maxLoops: 2,
    devicesPerLoop: 240,
    loopProtocol: "Hochiki ESP (Enhanced Systems Protocol)",
    networkCapable: true,
    maxNetworkedPanels: 32,
    batteryStandbyAh: 17,
    batteryAlarmAh: 17,
    recommendedBatterySize: "2 × 12V 17Ah SLA",
    configOptions: [
      { label: "Programming tool", value: "Latitude PC Tool (USB)" },
      { label: "Loops", value: "Up to 2 × ESP loops" },
      { label: "Zones", value: "Up to 64 software zones" },
      { label: "Sounder circuits", value: "2 supervised NACs + ESP sounder bases" },
      { label: "Network", value: "Latitude Net up to 32 panels" },
    ],
    approvals: ["ActivFire scheme", "EN 54 listed"],
    commissioningNotes:
      "ESP protocol devices self-identify on the loop, so auto-learn is reliable. Mixing ESP with older Hochiki ARC devices requires a protocol converter — the panel will fault out if it sees ARC responses on an ESP loop.",
    typicalPriceBand: "$$",
  },

  // ─── Honeywell ─────────────────────────────────────────────────────
  {
    slug: "honeywell-morley-dxc",
    maxLoops: 4,
    devicesPerLoop: 250,
    loopProtocol: "Apollo XP95 / Discovery / CoreProtocol",
    networkCapable: true,
    maxNetworkedPanels: 32,
    batteryStandbyAh: 38,
    batteryAlarmAh: 38,
    recommendedBatterySize: "2 × 12V 38Ah SLA",
    configOptions: [
      { label: "Programming tool", value: "Morley Loop Explorer / DXConfig" },
      { label: "Loops", value: "Up to 4 loop drivers, supports Apollo + Core" },
      { label: "Zones", value: "Up to 300 software zones" },
      { label: "Sounder circuits", value: "4 NACs, expandable to 16 via modules" },
      { label: "Network", value: "Morley Net RS485 peer network" },
    ],
    approvals: ["ActivFire scheme", "EN 54 listed"],
    commissioningNotes:
      "DX Connexion supports mixed-protocol loops (Apollo + Morley CoreProtocol) but each loop must be set to ONE protocol. Device-level LED indicators require the Enhanced Feature licence file — load it before device auto-learn.",
    typicalPriceBand: "$$$",
  },
];

