/**
 * Panel reference data - brands and models for dry fire FIPs.
 *
 * Authored original content in tech voice. Specifications and behaviours
 * described at an architectural level only. For exact fault codes, wiring
 * values and commissioning sequences, the manufacturer's current manual
 * is authoritative and must be consulted on any live job. The manualHint
 * field on each model points the tech at the correct document.
 */

export type PanelCategory =
  | "conventional"
  | "addressable"
  | "hybrid"
  | "aspirating"
  | "ewis";

export type LifecycleStatus = "current" | "legacy" | "discontinued";

export type Confidence = "verified" | "general" | "pending";

export interface Brand {
  id: string;
  name: string;
  country: string;
  /** One-liner market context for an AU tech. */
  marketNote: string;
  /** Short list of product family names the tech may see on site. */
  productLines: string[];
  /** What this brand does well, from a tech's perspective. */
  strengths: string[];
  /** Known traps and gotchas across the range. */
  gotchas: string[];
  /** Where the tech goes for manuals, support and spares. */
  supportNote: string;
  /** Official site for reference. No scraped content. */
  officialSite: string;
  /** Confidence level for the content in this brand entry. */
  confidence: Confidence;
}

export interface FaultHint {
  /** Display code or short label as it typically appears on the panel. */
  code: string;
  /** Plain-English meaning. */
  meaning: string;
  /** First thing the tech should check on site. */
  firstCheck: string;
}

export interface PanelModel {
  id: string;
  brandId: string;
  name: string;
  category: PanelCategory;
  status: LifecycleStatus;
  /** Human-readable capacity, e.g. "2 to 8 loops, 250 devices per loop". */
  capacity: string;
  summary: string;
  /** Commissioning notes, original tech voice, architectural level. */
  commissioningNotes: string[];
  /** Wiring quirks and traps. */
  wiringQuirks: string[];
  /** Programming notes - typical tool, common steps. */
  programmingNotes: string[];
  /** Fault hints that tend to crop up on site. */
  commonFaults: FaultHint[];
  /** Pointer to the authoritative manual. Not reproduced. */
  manualHint: string;
  /** Confidence level for content in this model entry. */
  confidence: Confidence;
}

export const BRANDS: Brand[] = [
  {
    id: "pertronic",
    name: "Pertronic",
    country: "New Zealand",
    marketNote:
      "Strong presence across AU and NZ commercial and institutional sites. Often the default specification on NZ work and increasingly common on larger AU projects.",
    productLines: ["F1", "F100A", "F16e", "F120A", "F220", "Millennium"],
    strengths: [
      "Clean, technician-friendly programming interface via the on-panel keypad and PFS software.",
      "Strong local support through Pertronic AU and NZ offices.",
      "Loop compatibility across Hochiki ESP and Apollo device families on supported models.",
    ],
    gotchas: [
      "Mixing device protocols on the same loop is not supported on most models - confirm the loop card variant before quoting devices.",
      "Older F1 and F16 units have limited capacity; confirm device count against the panel's type-approved envelope before adding loads.",
      "Network topology on Millennium and F220 is specific to the panel generation; verify compatibility before tying a new panel to an existing network.",
    ],
    supportNote:
      "Refer to Pertronic AU or NZ support for current manuals, firmware and training. Log in to the Pertronic partner portal for latest documentation.",
    officialSite: "https://www.pertronic.com",
    confidence: "general",
  },
  {
    id: "ampac",
    name: "Ampac",
    country: "Australia",
    marketNote:
      "Long-standing Australian manufacturer, widely installed across AU commercial buildings. Now part of Halma / Honeywell group.",
    productLines: [
      "FireFinder series",
      "FireFinder Plus",
      "EV3000",
      "LoopSense",
      "ZoneSense",
    ],
    strengths: [
      "Broad model range covering conventional, addressable and hybrid applications.",
      "Long installed base means spares and second-hand knowledge are usually available.",
      "Strong integration story with Xtralis VESDA on combined systems.",
    ],
    gotchas: [
      "Legacy FireFinder programming tools are not interchangeable with the FireFinder Plus range.",
      "Firmware-specific loop behaviour on addressable models - always confirm the firmware version before troubleshooting a loop fault.",
      "Documentation set has grown across multiple product generations; check the model plate for revision before pulling a manual.",
    ],
    supportNote:
      "Ampac tech support is the authoritative source for current fault codes, wiring diagrams and firmware. Keep the site's commissioning pack and as-built on file.",
    officialSite: "https://www.ampac.net",
    confidence: "general",
  },
  {
    id: "fire-sense",
    name: "Fire Sense",
    country: "Australia",
    marketNote:
      "AU-based supplier with a focus on conventional and small addressable panels. Common on smaller commercial and residential fit-outs.",
    productLines: ["SenseKey conventional range", "SenseKey addressable range"],
    strengths: [
      "Straightforward conventional panels suited to smaller sites.",
      "AU stock availability reduces lead times on common models.",
    ],
    gotchas: [
      "Model lineup has evolved over the last decade; confirm the exact variant on the panel plate before ordering spares.",
      "Device compatibility lists are model-specific - verify detector families against the panel documentation before swapping heads.",
    ],
    supportNote:
      "Obtain current manuals, approval documentation and firmware via Fire Sense direct. Do not assume older manuals apply to current stock.",
    officialSite: "https://www.firesense.com.au",
    confidence: "general",
  },
  {
    id: "incite",
    name: "Incite",
    country: "Australia",
    marketNote:
      "AU panel brand encountered on smaller commercial, industrial and retrofit sites. Lower-profile than Pertronic and Ampac but present in the installed base.",
    productLines: ["Incite conventional panels", "Incite addressable panels"],
    strengths: [
      "Locally supported with AU-based technical help for installed sites.",
    ],
    gotchas: [
      "Public technical information is limited compared to majors - always work from the site-supplied manual, not third-party summaries.",
      "Confirm approval status and current certifying laboratory for the specific model before any type-sensitive work.",
    ],
    supportNote:
      "Contact Incite directly for current manuals, firmware and spares. Treat third-party sources as non-authoritative.",
    officialSite: "",
    confidence: "pending",
  },
  {
    id: "fusion",
    name: "Fusion",
    country: "Australia",
    marketNote:
      "AU panel manufacturer seen on commercial and institutional sites. Product mix includes conventional and addressable hardware.",
    productLines: ["Fusion conventional panels", "Fusion addressable panels"],
    strengths: [
      "AU-based manufacturer with local product support.",
    ],
    gotchas: [
      "Model names and firmware have evolved across generations - always cross-check against the panel plate, not memory.",
      "Specification detail is model-specific; do not assume cross-compatibility across the range without verifying.",
    ],
    supportNote:
      "Source current manuals, wiring diagrams and firmware directly from the manufacturer. Keep the site commissioning pack with the panel.",
    officialSite: "",
    confidence: "pending",
  },
  {
    id: "brooks",
    name: "Brooks",
    country: "Australia",
    marketNote:
      "Best known in AU for smoke alarms and ancillary detection. Encountered on residential and small-commercial fire work; FIP range is narrower than the specialist manufacturers.",
    productLines: ["Brooks detection range", "Brooks alarm panels"],
    strengths: [
      "Wide AU distribution for detection and alarm products.",
      "Strong residential presence gives techs familiarity with the device range.",
    ],
    gotchas: [
      "Do not assume domestic detector wiring conventions apply to commercial FIPs - always read the current installation manual.",
      "Product range has evolved; confirm current supported models before ordering spares or swapping hardware.",
    ],
    supportNote:
      "Brooks Australia technical support is the authoritative source for current product information, manuals and firmware.",
    officialSite: "https://www.brooks.com.au",
    confidence: "pending",
  },
];
export const MODELS: PanelModel[] = [
  // ── Pertronic ───────────────────────────────────────────────────────
  {
    id: "pertronic-f220",
    brandId: "pertronic",
    name: "F220",
    category: "addressable",
    status: "current",
    capacity:
      "Multi-loop addressable panel sized for larger commercial and institutional sites. Confirm exact loop and device counts against the current datasheet.",
    summary:
      "Flagship addressable platform in Pertronic's range. Used on larger sites where multiple loops and network integration are required.",
    commissioningNotes: [
      "Follow the F220 commissioning guide for the panel's firmware revision. Program device addresses, map cause-and-effect, then witness-test each zone with the building operator.",
      "Network setup between multiple panels or to a head-end must be planned before commissioning - topology and addressing are not safe to retrofit on a live system.",
      "Witness-test using the manufacturer's recommended procedure and record results in the commissioning pack. Handover is incomplete without it.",
    ],
    wiringQuirks: [
      "Loop wiring must follow the panel's supported topology (Class A or Class B as designed). Do not mix across a single loop without explicit support in the model manual.",
      "Isolator placement matters - follow AS 1670 and the panel's loop-loading rules, not rules of thumb.",
      "Earthing of shielded loop cable should be at the panel end only unless the manufacturer explicitly calls out otherwise.",
    ],
    programmingNotes: [
      "Use Pertronic's approved programming software for the panel's firmware. Confirm compatibility before connecting.",
      "Back up the site configuration before making any change. Keep a copy on the site record and off-site.",
      "Document every change in the site logbook - C&E modifications are a compliance matter, not a casual tweak.",
    ],
    commonFaults: [
      {
        code: "LOOP FAULT (generic)",
        meaning: "Panel has lost integrity on an addressable loop.",
        firstCheck:
          "Check the event log for the specific poll failure or short indication, then follow the loop fault procedure in the panel manual.",
      },
      {
        code: "EARTH FAULT",
        meaning: "Leakage detected between a field conductor and protective earth.",
        firstCheck:
          "Isolate the loop from the panel and megger each conductor to earth. Fault usually sits in a wet J-box or damaged cable.",
      },
      {
        code: "BATTERY FAULT",
        meaning: "Standby battery has failed a periodic load test or voltage check.",
        firstCheck:
          "Measure battery float voltage, confirm date-code, load-test under simulated alarm. Replace as a matched pair if out of spec.",
      },
    ],
    manualHint:
      "Refer to the F220 installation and programming manual for the panel's firmware revision. Pertronic's partner portal has the current set.",
    confidence: "general",
  },
  {
    id: "pertronic-f120a",
    brandId: "pertronic",
    name: "F120A",
    category: "addressable",
    status: "current",
    capacity:
      "Addressable panel sized for mid-range commercial sites. Loop and device capacity specified in the current datasheet.",
    summary:
      "Mid-range addressable platform. Common on commercial offices and mixed-use buildings where F220 scale is not required.",
    commissioningNotes: [
      "Program device addresses and labels to match the site schedule before energising the loop.",
      "Set cause-and-effect to match the approved fire engineering report; do not assume defaults fit the site.",
      "Complete witness tests zone by zone with the operator and record results.",
    ],
    wiringQuirks: [
      "Follow the panel's supported loop topology. Confirm whether the site is Class A or Class B and wire accordingly.",
      "Respect loop loading limits - detector count plus module count plus cable length sits inside an envelope, not a single limit.",
    ],
    programmingNotes: [
      "Use the approved programming tool for the firmware. Back up before any change.",
      "Maintain a site logbook entry for every configuration change.",
    ],
    commonFaults: [
      {
        code: "EARTH FAULT",
        meaning: "Leakage to protective earth somewhere on the loop.",
        firstCheck: "Megger each loop conductor to earth with the loop disconnected at the panel.",
      },
      {
        code: "DEVICE MISSING",
        meaning: "Panel has stopped receiving polls from a specific address.",
        firstCheck:
          "Check physical connection at the flagged device, confirm address DIP or programmed address matches, check the last isolator upstream.",
      },
    ],
    manualHint:
      "Refer to the F120A installation and programming manual for the installed firmware revision.",
    confidence: "general",
  },
  {
    id: "pertronic-f16e",
    brandId: "pertronic",
    name: "F16e",
    category: "conventional",
    status: "current",
    capacity:
      "Conventional panel suited to small commercial sites. Zone count per current datasheet.",
    summary:
      "Conventional zone panel for small sites. Familiar keypad and indicator layout typical of the Pertronic range.",
    commissioningNotes: [
      "Fit end-of-line resistors per the panel's supported value for each zone - confirm the EOL value in the panel manual.",
      "Test each zone with an alarm device and confirm the correct zone lights on the panel HMI.",
      "Commission brigade outputs and sounder circuits per AS 1670 and the site fire engineering report.",
    ],
    wiringQuirks: [
      "Conventional zones are 2-wire radial runs. Daisy-chain devices rather than star-wiring.",
      "A missing or wrong-value EOL will flag a zone fault - stock common values in the kit.",
    ],
    programmingNotes: [
      "Configuration on a conventional panel is typically limited to zone labels, cause-and-effect and brigade output - consult the manual for the exact sequence.",
    ],
    commonFaults: [
      {
        code: "ZONE FAULT",
        meaning: "Open circuit or EOL issue on a zone.",
        firstCheck:
          "Measure across the zone pair at the panel - expect the EOL value. Infinite resistance is an open; well below EOL value suggests a short or extra load on the line.",
      },
      {
        code: "BATTERY FAULT",
        meaning: "Standby battery failing voltage or load criteria.",
        firstCheck: "Load-test the batteries; replace as a matched pair if out of spec.",
      },
    ],
    manualHint:
      "Refer to the F16e installation manual for the panel's firmware and wiring requirements.",
    confidence: "general",
  },

  // ── Ampac ───────────────────────────────────────────────────────────
  {
    id: "ampac-firefinder-plus",
    brandId: "ampac",
    name: "FireFinder Plus",
    category: "hybrid",
    status: "current",
    capacity:
      "Hybrid panel supporting conventional zones and addressable loops. Capacity per current Ampac datasheet.",
    summary:
      "Modern Ampac panel with support for both conventional zones and addressable loops. Seen on mid-to-large commercial sites.",
    commissioningNotes: [
      "Confirm the firmware revision before commissioning - tools and behaviour differ across versions.",
      "Map addressable devices against the site schedule before energising. Conventional zones need correct EOL values.",
      "Document cause-and-effect against the fire engineering report; witness-test each rule with the operator.",
    ],
    wiringQuirks: [
      "Hybrid panels mix conventional and addressable - keep zone wiring and loop wiring visually separated in the cabinet.",
      "Isolator placement on addressable loops follows the panel's loading rules; do not extrapolate from other brands.",
    ],
    programmingNotes: [
      "Use the Ampac-approved programming tool for the panel firmware. Back up before any change.",
      "Keep the site config file under version control and attach a copy to the site record.",
    ],
    commonFaults: [
      {
        code: "EARTH FAULT",
        meaning: "Leakage between a field conductor and protective earth.",
        firstCheck: "Isolate the loop and megger each conductor to earth.",
      },
      {
        code: "LOOP FAULT",
        meaning: "Polling or integrity failure on an addressable loop.",
        firstCheck:
          "Inspect the event log for the specific fault, then follow the loop fault diagnostic in the FireFinder Plus manual.",
      },
    ],
    manualHint:
      "Refer to the FireFinder Plus installation and programming manual current for the firmware revision on the panel plate.",
    confidence: "general",
  },
  {
    id: "ampac-firefinder-legacy",
    brandId: "ampac",
    name: "FireFinder (legacy)",
    category: "hybrid",
    status: "legacy",
    capacity:
      "Legacy Ampac panel, widely installed across AU commercial sites. Capacity and features depend heavily on the specific revision.",
    summary:
      "Older FireFinder generation still commonly encountered on maintenance jobs. Programming tool and documentation differ from the current FireFinder Plus range.",
    commissioningNotes: [
      "Confirm firmware and hardware revision against the panel plate before commissioning or upgrading.",
      "Legacy panels may not support current device families - verify compatibility from the manual, not memory.",
    ],
    wiringQuirks: [
      "Older loop cards have specific loading limits that differ from current models. Do not assume current rules apply.",
      "Shielding and earthing practices may differ from the newer range; follow the installation manual for the panel revision.",
    ],
    programmingNotes: [
      "Legacy programming tools are version-specific. A tool for the current FireFinder Plus will not necessarily work on the legacy FireFinder.",
      "Back up the configuration before touching anything - restoring a legacy config after loss is often painful.",
    ],
    commonFaults: [
      {
        code: "SYSTEM FAULT",
        meaning: "Generic system-level fault, specific cause indicated in the event log or secondary indicator.",
        firstCheck:
          "Read the event log and the panel's LED indicators together; the specific fault detail is needed before any action.",
      },
    ],
    manualHint:
      "Refer to the original FireFinder installation manual for the panel revision. Ampac tech support holds legacy documentation for older units.",
    confidence: "general",
  },
  {
    id: "ampac-ev3000",
    brandId: "ampac",
    name: "EV3000",
    category: "ewis",
    status: "current",
    capacity:
      "EWIS / occupant warning system platform. Configuration depends on the number of zone amps and WIP handsets fitted.",
    summary:
      "Ampac's EWIS platform for AS 1670.4 warning and intercommunication systems. Typically paired with a FIP rather than used as a detection panel in its own right.",
    commissioningNotes: [
      "Size amps against speaker load per the speaker tap schedule - confirm totals are within the amp's rated output plus headroom.",
      "Test evacuation and alert tones at zone level; confirm SPL at the worst-case location meets AS 1670.4.",
      "Complete STIPA intelligibility tests where required and record results.",
    ],
    wiringQuirks: [
      "100 V line speaker circuits are not 100 V AC mains - but treat the wiring as live for safety purposes.",
      "WIP handset wiring follows the panel's documented topology; do not substitute non-approved handsets.",
    ],
    programmingNotes: [
      "Use the EV3000 programming tool for the firmware revision. Back up before any change.",
      "Integration with a FIP (alarm input, brigade signal) is defined by site drawings - confirm every interface before commissioning.",
    ],
    commonFaults: [
      {
        code: "AMP FAULT",
        meaning: "Zone amp has flagged a fault, often thermal or load-related.",
        firstCheck:
          "Check speaker load total against amp rating, measure circuit impedance, inspect for shorts or failed speaker transformers.",
      },
    ],
    manualHint:
      "Refer to the Ampac EV3000 installation and commissioning manual for the current firmware revision.",
    confidence: "general",
  },

  // ── Fire Sense ──────────────────────────────────────────────────────
  {
    id: "fire-sense-sensekey-conv",
    brandId: "fire-sense",
    name: "SenseKey (conventional)",
    category: "conventional",
    status: "current",
    capacity:
      "Conventional zone panel for small-to-mid commercial sites. Zone count per current datasheet.",
    summary:
      "Fire Sense conventional panel in the SenseKey range. Common on smaller commercial and residential fit-outs.",
    commissioningNotes: [
      "Fit correct EOL values as specified in the panel manual. Do not substitute values from other brands.",
      "Witness-test each zone with the operator. Confirm brigade output and sounder circuits per AS 1670.",
    ],
    wiringQuirks: [
      "Conventional zones are 2-wire radial runs. Do not star-wire.",
      "Verify detector compatibility against the manual before swapping heads - range is model-specific.",
    ],
    programmingNotes: [
      "Consult the installation manual for the zone labelling and cause-and-effect options supported on the installed firmware.",
    ],
    commonFaults: [
      {
        code: "ZONE FAULT",
        meaning: "Open or abnormal resistance on a zone.",
        firstCheck:
          "Measure the zone pair at the panel; expect the documented EOL value. Repair the open or short in the field.",
      },
    ],
    manualHint:
      "Obtain the current SenseKey conventional panel manual direct from Fire Sense for the installed revision.",
    confidence: "pending",
  },
];

export function modelsForBrand(brandId: string): PanelModel[] {
  return MODELS.filter((m) => m.brandId === brandId);
}

export function brandById(id: string): Brand | undefined {
  return BRANDS.find((b) => b.id === id);
}

export function modelById(id: string): PanelModel | undefined {
  return MODELS.find((m) => m.id === id);
}
