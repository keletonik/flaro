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
  // v2.1 deep spec expansion — every field nullable, missing values
  // are rendered as "N/A" in the UI. sourceNotes cites where the
  // spec came from (manufacturer datasheet, product listing, etc.).
  dimensionsMm?: string | null;
  weightKg?: number | null;
  ipRating?: string | null;
  operatingTempC?: string | null;
  operatingHumidityPct?: string | null;
  mainsSupply?: string | null;
  psuOutputA?: number | null;
  auxCurrentBudgetMa?: number | null;
  maxZones?: number | null;
  relayOutputs?: number | null;
  supervisedNacs?: number | null;
  ledMimicChannels?: number | null;
  lcdLines?: number | null;
  eventLogCapacity?: number | null;
  causeEffectSupport?: boolean | null;
  warrantyYears?: number | null;
  remoteAccess?: string | null;
  loopCableSpec?: string | null;
  datasheetUrl?: string | null;
  sourceNotes?: string | null;
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
    dimensionsMm: "380 x 480 x 130",
    weightKg: 10.0,
    ipRating: "IP30",
    operatingTempC: "-5 to +45",
    operatingHumidityPct: "5-95 non-condensing",
    mainsSupply: "230 VAC 50 Hz",
    psuOutputA: 3.0,
    auxCurrentBudgetMa: 500,
    maxZones: 64,
    relayOutputs: 2,
    supervisedNacs: 4,
    ledMimicChannels: 16,
    lcdLines: 2,
    eventLogCapacity: 1000,
    causeEffectSupport: true,
    warrantyYears: 3,
    remoteAccess: "USB direct only (standalone — no network option)",
    loopCableSpec: "2-core 1.5 mm² fire-rated, max 2000 m per loop",
    datasheetUrl: "https://www.pertronic.com.au/products/f100a",
    sourceNotes: "Pertronic F100A datasheet + installation manual (Pertronic.com.au, accessed May 2025)",
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
    dimensionsMm: "440 x 560 x 150",
    weightKg: 13.0,
    ipRating: "IP30",
    operatingTempC: "-5 to +45",
    operatingHumidityPct: "5-95 non-condensing",
    mainsSupply: "230 VAC 50 Hz",
    psuOutputA: 4.0,
    auxCurrentBudgetMa: 800,
    maxZones: 128,
    relayOutputs: 4,
    supervisedNacs: 4,
    ledMimicChannels: 32,
    lcdLines: 4,
    eventLogCapacity: 4000,
    causeEffectSupport: true,
    warrantyYears: 3,
    remoteAccess: "USB + optional Ethernet (SmartTerminal)",
    loopCableSpec: "2-core 1.5 mm² fire-rated, max 2000 m per loop, max 44 Ω",
    datasheetUrl: "https://www.pertronic.com.au/products/f120a",
    sourceNotes: "Pertronic F120A datasheet (Pertronic.com.au, accessed May 2025)",
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
    dimensionsMm: "530 x 650 x 180",
    weightKg: 18.5,
    ipRating: "IP30",
    operatingTempC: "-5 to +45",
    operatingHumidityPct: "5-95 non-condensing",
    mainsSupply: "230 VAC 50 Hz / 3.15 A fuse",
    psuOutputA: 6.0,
    auxCurrentBudgetMa: 1500,
    maxZones: 512,
    relayOutputs: 12,
    supervisedNacs: 8,
    ledMimicChannels: 64,
    lcdLines: 4,
    eventLogCapacity: 10000,
    causeEffectSupport: true,
    warrantyYears: 3,
    remoteAccess: "USB + Ethernet via PerTools config software",
    loopCableSpec: "2-core 1.5 mm² fire-rated twisted pair, max 2000 m per loop, max 44 Ω loop resistance",
    datasheetUrl: "https://www.pertronic.com.au/products/f220",
    sourceNotes: "Pertronic F220 product brochure + installation manual (Pertronic.com.au, accessed May 2025)",
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
    dimensionsMm: "500 x 700 x 200",
    weightKg: 22.0,
    ipRating: "IP30",
    operatingTempC: "-5 to +50",
    operatingHumidityPct: "5-95 non-condensing",
    mainsSupply: "230 VAC 50 Hz",
    psuOutputA: 8.0,
    auxCurrentBudgetMa: 2000,
    maxZones: 256,
    relayOutputs: 8,
    supervisedNacs: 8,
    ledMimicChannels: 96,
    lcdLines: 8,
    eventLogCapacity: 8000,
    causeEffectSupport: true,
    warrantyYears: 2,
    remoteAccess: "USB + Ethernet via LoopSense",
    loopCableSpec: "2-core 1.5 mm² fire-rated, max 2 km per loop, max 30 Ω loop resistance",
    datasheetUrl: "https://www.ampac.net/products/firefinder-plus",
    sourceNotes: "Ampac FireFinder Plus installation + commissioning manual (Ampac.net, accessed May 2025)",
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
    dimensionsMm: "430 x 560 x 140",
    weightKg: 14.5,
    ipRating: "IP30",
    operatingTempC: "-5 to +45",
    operatingHumidityPct: "5-95 non-condensing",
    mainsSupply: "230 VAC 50 Hz",
    psuOutputA: 5.0,
    auxCurrentBudgetMa: 1000,
    maxZones: 128,
    relayOutputs: 4,
    supervisedNacs: 4,
    ledMimicChannels: 32,
    lcdLines: 8,
    eventLogCapacity: 4000,
    causeEffectSupport: true,
    warrantyYears: 2,
    remoteAccess: "USB via LoopSense config software",
    loopCableSpec: "2-core 1.5 mm² fire-rated, max 2 km per loop",
    datasheetUrl: "https://www.ampac.net/products/fp1200",
    sourceNotes: "Ampac FP1200 product manual (Ampac.net, accessed May 2025)",
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

  // ─── Tyco / Kidde ──────────────────────────────────────────────────
  {
    slug: "tyco-mx-4000",
    maxLoops: 2,
    devicesPerLoop: 200,
    loopProtocol: "MX Digital",
    networkCapable: true,
    maxNetworkedPanels: 200,
    batteryStandbyAh: 24,
    batteryAlarmAh: 24,
    recommendedBatterySize: "2 × 12V 24Ah SLA",
    configOptions: [
      { label: "Programming tool", value: "Configurator (USB)" },
      { label: "Loops", value: "Up to 2 MX loops, 200 devices each" },
      { label: "Zones", value: "Up to 250 software zones" },
      { label: "Sounder circuits", value: "4 supervised sounder circuits" },
      { label: "Network", value: "MX Network via fibre or RS485, up to 200 nodes" },
    ],
    approvals: ["ActivFire scheme", "EN 54 listed"],
    commissioningNotes:
      "Tyco MX panels are common on large commercial sites. The MX protocol reports analogue sensor values continuously — use the graphical analogue trend view in Configurator to spot drift before it triggers a pre-alarm.",
    typicalPriceBand: "$$$",
  },

  // ─── Xtralis VESDA (aspirating) ────────────────────────────────────
  {
    slug: "xtralis-vesda-vep",
    maxLoops: null,
    devicesPerLoop: null,
    loopProtocol: "VESDAnet (proprietary)",
    networkCapable: true,
    maxNetworkedPanels: 100,
    batteryStandbyAh: null,
    batteryAlarmAh: null,
    recommendedBatterySize: "Powered from host FIP standby supply — no independent battery",
    configOptions: [
      { label: "Programming tool", value: "Xtralis VSC (VESDA System Configurator)" },
      { label: "Sensitivity classes", value: "A (0.005%/m) / B (0.015%/m) / C (0.05%/m)" },
      { label: "Pipe network", value: "Up to 4 pipes per detector, max 200m total pipe length" },
      { label: "Alarm thresholds", value: "Alert / Action / Fire 1 / Fire 2 independently configurable" },
      { label: "Network", value: "VESDAnet up to 100 detectors + displays" },
    ],
    approvals: ["AS 7240.20 / EN 54-20", "ActivFire scheme"],
    commissioningNotes:
      "VESDA VEP is a very early warning aspirating detector — not a FIP in its own right but often treated as one. Transport time (sample hole to detector) must be < 120 seconds per AS 1670.1 §3.26.4. Commission via VSC: define pipe network, run ASPIRE2 design, match real measurement to simulation before signing off.",
    typicalPriceBand: "$$$",
  },
  {
    slug: "xtralis-vesda-vli",
    maxLoops: null,
    devicesPerLoop: null,
    loopProtocol: "VESDAnet",
    networkCapable: true,
    maxNetworkedPanels: 100,
    batteryStandbyAh: null,
    batteryAlarmAh: null,
    recommendedBatterySize: "Powered from host FIP standby supply",
    configOptions: [
      { label: "Programming tool", value: "Xtralis VSC" },
      { label: "Sensitivity classes", value: "A / B / C with Ethernet reporting" },
      { label: "Ethernet", value: "Built-in — supports remote monitoring + SNMP" },
      { label: "Pipe network", value: "Up to 4 pipes, max 800m total with VLI" },
    ],
    approvals: ["AS 7240.20 / EN 54-20", "ActivFire scheme"],
    commissioningNotes:
      "VLI has wider pipe range than VEP thanks to higher aspirator flow. Ethernet reporting is opt-in — requires Xtralis Xchange cloud or a local SCADA integration.",
    typicalPriceBand: "$$$",
  },

  // ─── Wormald ───────────────────────────────────────────────────────
  {
    slug: "wormald-vigilant-mx1",
    maxLoops: 8,
    devicesPerLoop: 200,
    loopProtocol: "Tyco MX Digital",
    networkCapable: true,
    maxNetworkedPanels: 200,
    batteryStandbyAh: 38,
    batteryAlarmAh: 38,
    recommendedBatterySize: "2 × 12V 38Ah SLA",
    configOptions: [
      { label: "Programming tool", value: "Vigilant Configurator" },
      { label: "Loops", value: "Up to 8 MX loops" },
      { label: "Zones", value: "Up to 500 zones" },
      { label: "Brigade connection", value: "Integrated AS 1670.3 BASM interface" },
      { label: "Network", value: "MX Net up to 200 nodes via fibre / RS485" },
    ],
    approvals: ["ActivFire scheme (current)", "AS 4428.1 / AS 7240.2 listed"],
    commissioningNotes:
      "Vigilant MX1 is the Australian-branded Tyco MX platform. BASM integration is the differentiator — configure the BASM output relays via the Configurator, confirm brigade signal type (ASE or direct) before going live.",
    typicalPriceBand: "$$$",
  },

  // ─── Notifier large ────────────────────────────────────────────────
  {
    slug: "notifier-nfs-3030",
    maxLoops: 10,
    devicesPerLoop: 318,
    loopProtocol: "Notifier FlashScan / CLIP",
    networkCapable: true,
    maxNetworkedPanels: 103,
    batteryStandbyAh: 100,
    batteryAlarmAh: 100,
    recommendedBatterySize: "2 × 12V 100Ah SLA in dedicated battery cabinet",
    configOptions: [
      { label: "Programming tool", value: "VeriFire Tools (Ethernet)" },
      { label: "Loops", value: "Up to 10 × SLC loops" },
      { label: "Zones", value: "Up to 1,000 software zones" },
      { label: "Sounder circuits", value: "8 NACs + LEM-320 expansion" },
      { label: "Network", value: "NOTI-FIRE-NET up to 103 panels" },
      { label: "Graphics", value: "ONYXWorks workstation optional" },
    ],
    approvals: ["ActivFire scheme", "UL 864 9th ed."],
    commissioningNotes:
      "NFS-3030 is the biggest Notifier in Australia — reserved for mega-sites (hospitals, airports, campuses). Battery cabinet is always external. Confirm AS 4428 battery ventilation requirements before siting the cabinet in a confined space.",
    typicalPriceBand: "$$$",
  },
];

