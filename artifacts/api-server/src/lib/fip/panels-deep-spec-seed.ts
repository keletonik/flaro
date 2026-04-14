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
];

