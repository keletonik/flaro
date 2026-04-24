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
    name: "FireSense",
    country: "Australia",
    marketNote:
      "AU-based supplier with a focus on conventional fire panels, EWIS, gas control and a full range of detectors and field devices. Common on smaller commercial and industrial fit-outs.",
    productLines: [
      "1600 Series conventional panel",
      "Addressable panel range",
      "EWIS / OWS systems",
      "Gas control panels",
      "VESDA accessories",
    ],
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
    name: "Incite Fire",
    country: "Australia",
    marketNote:
      "AU distributor and system integrator based in Sydney with offices in Melbourne, Brisbane and Perth. Incite is not a panel manufacturer - on an Incite-supplied site the tech typically finds Kentec panels running the Hochiki ESP protocol, Hochiki detection, Securiton aspirating, and QE90 EWIS.",
    productLines: [
      "Kentec Syncro AS (addressable)",
      "Kentec Taktis (addressable)",
      "Conventional panels (rebranded / customised)",
      "Hochiki detection range",
      "Securiton aspirating",
      "QE90 EWIS",
    ],
    strengths: [
      "National footprint with a Sydney assembly facility and AU-based technical support for the distributed brands.",
      "Hochiki ESP is a well-supported protocol with a broad device ecosystem.",
    ],
    gotchas: [
      "Always identify the underlying panel brand on the plate before ordering spares - Incite is the supplier, not the manufacturer.",
      "Kentec firmware and programming tools differ between Syncro AS and Taktis - do not assume parts or procedures interchange.",
      "Confirm protocol on the loop before fitting detectors - Kentec panels support multiple protocols and the loop card is protocol-specific.",
    ],
    supportNote:
      "Route technical questions through Incite for AU-distributed Kentec and Hochiki products. For Kentec-specific programming, the Kentec manual for the installed revision is authoritative.",
    officialSite: "https://www.incitefire.com.au",
    confidence: "general",
  },
  {
    id: "fusion",
    name: "Fusion Fire Systems",
    country: "Australia",
    marketNote:
      "AU panel manufacturer formed in 2012 with UK-based Advanced as a major shareholder. Product mix centres on the AXIS AU 5000 analogue addressable range.",
    productLines: [
      "AXIS AU 5000 (1-4 loop analogue addressable)",
      "AU 5000M-EX (Advanced protocol, auto-learn addressing)",
      "Conventional panel range",
      "Gas detection panels",
    ],
    strengths: [
      "AXIS AU 5000 complies with EN 54-13, AS 1670.1:2018 and NZS 4512:2010.",
      "Auto-learn addressing reduces commissioning time on the AU 5000M-EX.",
      "Rack-mount cabinet options to suit a range of site footprints.",
    ],
    gotchas: [
      "Confirm the protocol running on the loop card before swapping devices - the AU 5000 range has supported more than one protocol across revisions.",
      "Firmware across AXIS AU 5000 generations is not interchangeable; check the version on the panel plate before pulling a manual.",
    ],
    supportNote:
      "Fusion Fire Systems AU directly, or through authorised distributors. Keep the site commissioning pack with the panel for tool and protocol identification.",
    officialSite: "https://fusionfire.com.au",
    confidence: "general",
  },
  {
    id: "brooks",
    name: "Brooks Australia",
    country: "Australia",
    marketNote:
      "Long-standing AU supplier best known for residential and small-commercial smoke alarms and Residential Fire Panels. Present on NSW apartment buildings and boarding houses where AS 3786 residential detection is the specification.",
    productLines: [
      "RFP V2 Series Residential Fire Panel",
      "RFP12 / RFP18 Residential Fire Panel (legacy)",
      "RFP6 Residential Fire Panel (legacy)",
      "230 V photoelectric smoke alarms (interconnected)",
      "RadioLINK wireless smoke alarm modules",
    ],
    strengths: [
      "Full residential-class product set, commonly specified on Class 2 and Class 3 buildings under NCC.",
      "AS 3786:2014 compliant smoke alarm range.",
      "Wide AU distribution through electrical wholesalers.",
    ],
    gotchas: [
      "RFP panels are residential-class fire indicator panels; do not specify or wire them as AS 7240 commercial FIPs.",
      "Legacy RFP6 and RFP12/18 have documentation and spares distinct from the current RFP V2 - confirm the exact model on the panel plate.",
      "Interconnected smoke alarms still need a plan for power-fail behaviour; confirm base type and battery backup arrangement.",
    ],
    supportNote:
      "Brooks Australia technical support is the authoritative source for RFP manuals, current product spec and firmware.",
    officialSite: "https://www.brooks.com.au",
    confidence: "general",
  },
  {
    id: "vigilant",
    name: "Vigilant (Johnson Controls)",
    country: "Australia / Global",
    marketNote:
      "Very common across NSW commercial, government and institutional sites. Distributed in AU by FlameStop and through Wormald service. The MX1 is the workhorse analogue-addressable panel on a huge proportion of mid-to-large NSW buildings.",
    productLines: [
      "MX1 Fire Indicator Panel (analogue addressable)",
      "T-Gen tone generator (EWIS)",
      "FP0927 / FP0948 cabinet variants",
      "Vigilant advanced distributed-computer FIP platforms",
    ],
    strengths: [
      "MX1 is AS 4428.3 and AS 7240.4 compliant and widely specified in NSW tender documents.",
      "Networkable via I-Hub RS485 / fibre or PIB IP communications module.",
      "Up to 40 Ah of backup battery supported in the standard cabinet.",
    ],
    gotchas: [
      "Confirm the exact MX1 firmware revision before commissioning or config changes - tools and behaviour differ across revisions.",
      "The MX protocol loop is specific to the MX device family - do not mix non-MX devices without an approved interface module.",
      "Networking topology and addressing must be designed up-front; do not retrofit networking onto a live MX1 without proper planning.",
    ],
    supportNote:
      "Johnson Controls ANZ Tyco Safety Products for current MX1 documentation and firmware. FlameStop is the principal AU distributor. Wormald carries service history on a large slice of the installed base.",
    officialSite: "https://www.johnsoncontrols.com.au",
    confidence: "general",
  },
  {
    id: "simplex",
    name: "Simplex (Johnson Controls)",
    country: "USA / Global",
    marketNote:
      "Encountered on larger NSW commercial and institutional sites, particularly where voice-evacuation is specified. AU-programming-guide exists for the 4100ES and 4010ES complying with AS 4428.1.",
    productLines: [
      "4010ES Addressable Fire Alarm Control Unit",
      "4100ES Fire Alarm Control Unit",
      "TrueAlarm addressable sensors",
      "TrueAlert ES notification appliances",
    ],
    strengths: [
      "4100ES supports networked voice evacuation at scale across multi-building campuses.",
      "4010ES is a strong fit for mid-size buildings up to around 1000 points.",
      "Programming guides are published with AU-specific compliance notes.",
    ],
    gotchas: [
      "Simplex programming tools are licensed per-technician and version-matched to the panel firmware - plan tool access before site attendance.",
      "Device compatibility is tightly scoped to the TrueAlarm and TrueAlert ES families - substituting non-approved devices invalidates type approval.",
      "AU-specific programming differs from the US defaults; always use the AU programming guide for NSW sites.",
    ],
    supportNote:
      "Johnson Controls Simplex division for current documentation, firmware and training. AU programming guides and approvals are available through JCI ANZ.",
    officialSite: "https://www.simplexfire.com",
    confidence: "general",
  },
  {
    id: "notifier",
    name: "Notifier (Honeywell)",
    country: "USA / Global",
    marketNote:
      "Global Honeywell brand present on NSW commercial and institutional work. ONYX Series panels are the most-seen deployments in AU.",
    productLines: [
      "NFS2-640 (ONYX, mid-size)",
      "NFS2-3030 (ONYX, large)",
      "NOTI-FIRE-NET networking",
      "ONYX Intelligent Sensing detector range",
    ],
    strengths: [
      "NFS2-3030 scales up to 3180 addressable devices across 10 SLCs on a single panel.",
      "NOTI-FIRE-NET supports campus-scale networked installations.",
      "ONYX Intelligent Sensing reduces nuisance alarms via advanced drift compensation.",
    ],
    gotchas: [
      "Not every Notifier accessory is AU-approved; confirm ActivFire listing before specifying devices on a new NSW project.",
      "Firmware updates on ONYX Series panels must be performed with the correct license and programming tool - not a field task without authorisation.",
    ],
    supportNote:
      "Honeywell Building Solutions AU for current Notifier product information, firmware and training. Route technical escalations through Honeywell's AU distribution network.",
    officialSite: "https://buildings.honeywell.com/us/en/brands/our-brands/notifier",
    confidence: "general",
  },
  {
    id: "morley-ias",
    name: "Morley-IAS (Honeywell)",
    country: "UK / Global",
    marketNote:
      "Honeywell's UK-origin addressable range. Seen on smaller NSW commercial sites where a cost-effective Honeywell platform is specified over Notifier.",
    productLines: [
      "DXc / DXc2 (small-to-medium addressable)",
      "ZXSe (scalable addressable)",
      "DXc Network card (peer-to-peer networking)",
    ],
    strengths: [
      "AUTOLEARN feature auto-discovers loop devices and speeds commissioning.",
      "DXc peer-to-peer networking supports shared zone and keyboard operation across panels.",
      "Modular, scalable hardware with a small footprint for tenant-fit-out work.",
    ],
    gotchas: [
      "Public AU-specific documentation is thinner than for Notifier; confirm ActivFire approvals for the specific model revision.",
      "Protocol compatibility with third-party devices is limited - use the Morley-IAS detection family unless the manual lists an approved alternative.",
    ],
    supportNote:
      "Honeywell Building Solutions AU and the UK Morley-IAS documentation set. Cross-check any AU-approval claim against the current ActivFire register.",
    officialSite: "https://www.morley-ias.co.uk",
    confidence: "general",
  },
  {
    id: "flamestop",
    name: "FlameStop Australia",
    country: "Australia",
    marketNote:
      "Largest independent AU fire-equipment manufacturer and wholesaler. Carries own-brand conventional and addressable panels (PFS200, FlameStop conventional series) and distributes EST3X addressable and Vigilant MX1.",
    productLines: [
      "FlameStop PFS200 addressable panel range",
      "FlameStop conventional fire alarm panel series",
      "EST3X addressable systems (distributed)",
      "Vigilant MX1 (distributed)",
    ],
    strengths: [
      "National distribution network with a Sydney head office; strong NSW coverage.",
      "Own-brand conventional panels compliant with AS 1670.1 (2004 and 2015 editions).",
      "Multiple brands under one roof means one supplier call often resolves cross-brand compatibility questions.",
    ],
    gotchas: [
      "Identify which underlying brand a FlameStop-supplied panel belongs to before ordering spares - FlameStop is both a manufacturer and a distributor.",
      "FlameStop-branded and third-party-branded panels use different documentation - do not cross-apply manuals.",
    ],
    supportNote:
      "FlameStop AU technical support for own-brand (PFS200, FlameStop conventional). For distributed brands (EST3X, Vigilant), escalate to the manufacturer's AU support.",
    officialSite: "https://www.flamestop.com.au",
    confidence: "general",
  },
  {
    id: "kentec-hochiki",
    name: "Kentec / Hochiki",
    country: "UK (Kentec) / Japan (Hochiki)",
    marketNote:
      "Kentec panels running the Hochiki ESP protocol, with Hochiki detection, are distributed nationally in AU by Incite Fire. Encountered on NSW small-to-medium commercial and institutional sites where cost-effective addressable detection is specified.",
    productLines: [
      "Kentec Syncro AS (1 or 2 loop analogue addressable)",
      "Kentec Taktis (multi-loop addressable)",
      "Hochiki ESP analogue sensors",
      "Hochiki addressable field modules",
    ],
    strengths: [
      "Multi-protocol Kentec panels support Apollo, Argus Vega and Hochiki detection.",
      "Hochiki ESP is a mature protocol with a broad AU-approved device ecosystem.",
      "Compact single-loop Syncro AS suits small sites; Taktis scales up without a protocol change.",
    ],
    gotchas: [
      "Protocol must match the loop card - the same Kentec chassis supports multiple protocols but not simultaneously on one loop.",
      "Syncro AS and Taktis use different programming software and firmware families - do not assume tool interchange.",
      "Hochiki Australia's own AS-approved detectors are the safer choice for compatibility - verify against the approvals register.",
    ],
    supportNote:
      "Incite Fire for AU distribution and technical support. Kentec UK and Hochiki Australia for manufacturer-level documentation.",
    officialSite: "https://www.kentec.co.uk",
    confidence: "general",
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
        code: "LOOP SHORT",
        meaning: "Short across the loop conductors, typically between two isolator segments.",
        firstCheck:
          "Read the event log for the reporting isolator; bisect the loop at that isolator to localise the short.",
      },
      {
        code: "LOOP OPEN",
        meaning: "Loop integrity broken - polling stops beyond the break point.",
        firstCheck:
          "Check the first address reported missing; the break sits upstream of that device.",
      },
      {
        code: "EARTH FAULT",
        meaning: "Leakage detected between a field conductor and protective earth.",
        firstCheck:
          "Isolate the loop from the panel and megger each conductor to earth. Fault usually sits in a wet J-box or damaged cable.",
      },
      {
        code: "DEVICE MISSING",
        meaning: "Panel stopped receiving responses from a specific address.",
        firstCheck:
          "Confirm the address matches the programmed schedule, check the physical device, then check the last isolator upstream.",
      },
      {
        code: "ANALOGUE HIGH",
        meaning: "Detector reporting analogue value above healthy range - approaching alarm threshold.",
        firstCheck:
          "Inspect the detector for dust or contamination; clean or replace. Verify no actual fire condition first.",
      },
      {
        code: "BATTERY FAULT",
        meaning: "Standby battery has failed a periodic load test or voltage check.",
        firstCheck:
          "Measure battery float voltage, confirm date-code, load-test under simulated alarm. Replace as a matched pair if out of spec.",
      },
      {
        code: "CHARGER FAULT",
        meaning: "Panel PSU charger output outside expected range.",
        firstCheck:
          "Measure charger output across the battery terminals; compare against the panel's documented float voltage.",
      },
      {
        code: "SOUNDER CIRCUIT FAULT",
        meaning: "Open or short on a monitored sounder output.",
        firstCheck:
          "Disconnect at the panel and measure; expect the circuit's EOL value. Investigate accordingly.",
      },
      {
        code: "BRIGADE COMMS FAULT",
        meaning: "Signalling path to the monitoring station has failed polling.",
        firstCheck:
          "Check the signalling unit status, confirm line or IP path, then check with the monitoring station for last successful poll.",
      },
      {
        code: "NETWORK FAULT",
        meaning: "Connection between networked panels or to a head-end has failed.",
        firstCheck:
          "Verify network cabling at both ends; confirm addressing and topology match the site design.",
      },
      {
        code: "ZONE ISOLATED",
        meaning: "A zone or device has been manually isolated - compliance flag.",
        firstCheck:
          "Identify who isolated it, why, and whether it should be returned to service. Document in the logbook.",
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
    status: "discontinued",
    capacity:
      "Addressable panel sized for mid-range commercial sites. Discontinued in 2021 and superseded by the F220; still present across the installed base.",
    summary:
      "Legacy mid-range addressable panel now found on maintenance sites. New projects specify the F220 in its place.",
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
        code: "LOOP FAULT",
        meaning: "Generic loop integrity flag - specific cause in the event log.",
        firstCheck: "Read the event log for the reporting address or isolator before walking the loop.",
      },
      {
        code: "DEVICE MISSING",
        meaning: "Panel has stopped receiving polls from a specific address.",
        firstCheck:
          "Check physical connection at the flagged device, confirm address DIP or programmed address matches, check the last isolator upstream.",
      },
      {
        code: "BATTERY FAULT",
        meaning: "Standby battery failed voltage or load criteria.",
        firstCheck: "Load-test the batteries; replace as a matched pair if out of spec.",
      },
      {
        code: "CHARGER FAULT",
        meaning: "Mains or charger output outside expected range.",
        firstCheck: "Confirm mains at the panel input; measure charger output at the battery terminals.",
      },
      {
        code: "SOUNDER CIRCUIT FAULT",
        meaning: "Open or short on a monitored sounder output.",
        firstCheck: "Disconnect at the panel, measure across the circuit, compare to the documented EOL value.",
      },
      {
        code: "ZONE ISOLATED",
        meaning: "A zone or device has been manually isolated - compliance flag.",
        firstCheck: "Identify the isolation, confirm it should still be in place, document in the logbook.",
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
        code: "ZONE OPEN",
        meaning: "Open circuit on a conventional zone - EOL not seen.",
        firstCheck:
          "Measure across the zone pair at the panel, expect the documented EOL value. Infinite resistance points to a break in the field wiring or a missing EOL.",
      },
      {
        code: "ZONE SHORT",
        meaning: "Resistance across the zone is well below the EOL value.",
        firstCheck:
          "Disconnect the zone, walk the run, inspect for pinched cable, wet J-boxes, and stuck-alarm devices.",
      },
      {
        code: "ZONE IN TEST",
        meaning: "A zone has been placed in engineer test mode.",
        firstCheck:
          "Confirm test mode is intentional and scheduled. If work has finished, return the zone to normal and log it.",
      },
      {
        code: "BATTERY FAULT",
        meaning: "Standby battery failing voltage or load criteria.",
        firstCheck: "Load-test the batteries; replace as a matched pair if out of spec.",
      },
      {
        code: "MAINS FAULT",
        meaning: "Panel has lost mains supply and is running on battery.",
        firstCheck:
          "Check the supplying breaker and panel fuse; confirm whether the site-wide mains is live.",
      },
      {
        code: "SOUNDER FAULT",
        meaning: "Monitored sounder output open or short.",
        firstCheck:
          "Disconnect at the panel and measure across the circuit. Expect the documented EOL value.",
      },
    ],
    manualHint:
      "Refer to the F16e installation manual for the panel's firmware and wiring requirements.",
    confidence: "general",
  },

  {
    id: "pertronic-f100a",
    brandId: "pertronic",
    name: "F100A",
    category: "addressable",
    status: "current",
    capacity:
      "Compact addressable panel suited to smaller commercial sites. Loop and device capacity per current datasheet.",
    summary:
      "Smaller addressable Pertronic panel. Common on boutique commercial fit-outs and retail where F120A or F220 scale is not required.",
    commissioningNotes: [
      "Program addresses against the site schedule; label devices clearly on the as-built before energising.",
      "Witness-test each zone with the operator; record the commissioning pack.",
    ],
    wiringQuirks: [
      "Respect loop loading rules for the panel's loop card variant.",
      "Earth shielded loop cable at the panel end only unless the manual states otherwise.",
    ],
    programmingNotes: [
      "Use the approved Pertronic programming tool for the installed firmware.",
      "Back up the configuration before any change.",
    ],
    commonFaults: [
      {
        code: "LOOP FAULT",
        meaning: "Integrity lost on the addressable loop.",
        firstCheck: "Read the event log for the reporting address, bisect to localise.",
      },
      {
        code: "EARTH FAULT",
        meaning: "Leakage between a field conductor and protective earth.",
        firstCheck: "Isolate the loop and megger each conductor to earth.",
      },
      {
        code: "DEVICE MISSING",
        meaning: "Address no longer responding to polls.",
        firstCheck: "Verify physical connection and programmed address; check the upstream isolator.",
      },
      {
        code: "BATTERY FAULT",
        meaning: "Standby battery failed voltage or load criteria.",
        firstCheck: "Load-test; replace as a matched pair.",
      },
      {
        code: "SOUNDER CIRCUIT FAULT",
        meaning: "Monitored sounder output open or short.",
        firstCheck: "Measure across the circuit; expect the documented EOL value.",
      },
    ],
    manualHint:
      "Refer to the F100A installation and programming manual for the installed firmware revision.",
    confidence: "general",
  },
  {
    id: "pertronic-f1",
    brandId: "pertronic",
    name: "F1",
    category: "conventional",
    status: "legacy",
    capacity:
      "Compact conventional panel. Encountered on smaller older installations across AU and NZ.",
    summary:
      "Legacy Pertronic conventional panel still present on maintenance rounds. Confirm firmware and supported device families from the manual before any hardware change.",
    commissioningNotes: [
      "Treat as a legacy panel - confirm firmware and tool compatibility before connecting.",
      "Back up the configuration first; legacy configs are often poorly documented on site.",
    ],
    wiringQuirks: [
      "Older loop card may not support current device families - verify compatibility before swapping heads.",
      "Earthing and shield practice per the original installation manual, not current conventions.",
    ],
    programmingNotes: [
      "Use the programming tool matched to the panel's firmware. Newer tools may not connect.",
      "Keep the existing config on hand before making any change.",
    ],
    commonFaults: [
      {
        code: "LOOP FAULT",
        meaning: "Integrity lost on the addressable loop.",
        firstCheck: "Read the event log and bisect the loop.",
      },
      {
        code: "BATTERY FAULT",
        meaning: "Standby battery failed voltage or load criteria.",
        firstCheck: "Load-test; on legacy sites batteries are often long overdue for replacement.",
      },
      {
        code: "MAINS FAULT",
        meaning: "Panel has lost mains supply.",
        firstCheck: "Confirm supplying breaker and panel fuse.",
      },
    ],
    manualHint:
      "Refer to the original F1 installation manual for the revision stamped on the panel plate. Pertronic support can assist with legacy documentation.",
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
      {
        code: "DEVICE MISSING",
        meaning: "Specific addressable device has stopped responding to polls.",
        firstCheck:
          "Confirm address and physical presence; inspect last isolator upstream before swapping hardware.",
      },
      {
        code: "ANALOGUE OUT OF RANGE",
        meaning: "A detector is reporting an analogue value outside its healthy envelope.",
        firstCheck:
          "Inspect the detector for contamination; confirm no real fire event; clean or replace.",
      },
      {
        code: "ZONE FAULT (conventional card)",
        meaning: "Conventional zone card has flagged a fault - open, short, or EOL issue.",
        firstCheck:
          "Measure across the zone pair at the panel; expect the documented EOL value.",
      },
      {
        code: "BATTERY FAULT",
        meaning: "Standby battery failed voltage or load criteria.",
        firstCheck: "Load-test under a simulated alarm; replace as a matched pair if out of spec.",
      },
      {
        code: "CHARGER FAULT",
        meaning: "Charger output outside expected range.",
        firstCheck: "Measure charger output at the battery terminals; verify against the panel spec.",
      },
      {
        code: "SOUNDER CIRCUIT FAULT",
        meaning: "Open or short on a monitored output circuit.",
        firstCheck: "Disconnect at the panel and measure; expect the circuit's documented EOL value.",
      },
      {
        code: "BRIGADE COMMS FAULT",
        meaning: "Signalling path to the monitoring station failed polling.",
        firstCheck:
          "Check signalling unit LEDs; confirm carrier line or IP link; contact the station for last good poll.",
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
      {
        code: "EARTH FAULT",
        meaning: "Leakage between a field conductor and protective earth.",
        firstCheck: "Isolate affected circuits at the panel and megger to earth.",
      },
      {
        code: "LOOP FAULT",
        meaning: "Integrity lost on an addressable loop.",
        firstCheck: "Read the event log for the reporting address or isolator; bisect and test.",
      },
      {
        code: "ZONE FAULT",
        meaning: "Conventional zone flagged as faulted.",
        firstCheck: "Measure the zone pair at the panel; expect the documented EOL value.",
      },
      {
        code: "BATTERY FAULT",
        meaning: "Standby battery failed voltage or load criteria.",
        firstCheck:
          "Load-test the batteries; replace as a matched pair. Legacy panels are often running on long-overdue batteries.",
      },
      {
        code: "CHARGER FAULT",
        meaning: "Mains or charger output out of range.",
        firstCheck:
          "Confirm mains and measure charger output; legacy chargers may need calibration or replacement.",
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
      {
        code: "SPEAKER CIRCUIT OPEN",
        meaning: "Monitored 100 V line has lost continuity.",
        firstCheck:
          "Bisect the run, measure each half, inspect terminations at speakers.",
      },
      {
        code: "SPEAKER CIRCUIT SHORT",
        meaning: "100 V line conductors shorted together.",
        firstCheck:
          "Isolate the line, walk it, inspect for pinched cable or failed speaker transformer.",
      },
      {
        code: "WIP LINE FAULT",
        meaning: "Warden intercom handset line has failed supervision.",
        firstCheck:
          "Check handset wiring and the specific WIP location flagged in the event log.",
      },
      {
        code: "AMP OVERTEMP",
        meaning: "Zone amp in thermal protection.",
        firstCheck:
          "Check ventilation in the EWIS cabinet; reduce sustained tone duration during testing; verify fan operation if fitted.",
      },
      {
        code: "INPUT FAULT (FIP alarm)",
        meaning: "Alarm input from the associated FIP has failed supervision.",
        firstCheck:
          "Check the interfacing cable between FIP output and EWIS input; confirm EOL values per the installation drawings.",
      },
    ],
    manualHint:
      "Refer to the Ampac EV3000 installation and commissioning manual for the current firmware revision.",
    confidence: "general",
  },

  {
    id: "ampac-loopsense",
    brandId: "ampac",
    name: "LoopSense",
    category: "addressable",
    status: "current",
    capacity:
      "Addressable panel in the Ampac range sized for mid-commercial sites. Loop and device capacity per current datasheet.",
    summary:
      "Ampac addressable platform encountered across AU commercial work. Used where a dedicated addressable panel is required and a hybrid platform is not needed.",
    commissioningNotes: [
      "Confirm firmware revision and supported device families before commissioning.",
      "Program addresses against the site schedule; record the commissioning pack at handover.",
      "Witness-test each zone and each output rule with the operator.",
    ],
    wiringQuirks: [
      "Follow the panel's loop topology rules - Class A and Class B are not interchangeable without hardware changes.",
      "Isolator placement follows AS 1670 plus Ampac's loop-loading rules.",
      "Earth shielded loop cable at the panel end only unless the installation manual says otherwise.",
    ],
    programmingNotes: [
      "Use the Ampac-approved programming tool matched to the installed firmware.",
      "Back up before any change; keep the config under version control.",
    ],
    commonFaults: [
      {
        code: "EARTH FAULT",
        meaning: "Leakage between a field conductor and protective earth.",
        firstCheck: "Isolate the loop and megger each conductor to earth.",
      },
      {
        code: "LOOP FAULT",
        meaning: "Poll integrity lost on the addressable loop.",
        firstCheck: "Event log first - identify the reporting address or isolator before walking the loop.",
      },
      {
        code: "DEVICE MISSING",
        meaning: "Specific address not responding to polls.",
        firstCheck: "Verify physical presence, programmed address, and upstream isolator.",
      },
      {
        code: "BATTERY FAULT",
        meaning: "Standby battery failed voltage or load criteria.",
        firstCheck: "Load-test under simulated alarm; replace as a matched pair.",
      },
      {
        code: "SOUNDER CIRCUIT FAULT",
        meaning: "Monitored sounder output open or short.",
        firstCheck: "Measure across the circuit; expect the documented EOL value.",
      },
      {
        code: "BRIGADE COMMS FAULT",
        meaning: "Signalling path failed polling.",
        firstCheck:
          "Check signalling unit status and the last successful poll with the monitoring station.",
      },
    ],
    manualHint:
      "Refer to the LoopSense installation and programming manual for the firmware on the panel plate.",
    confidence: "general",
  },

  // ── Fire Sense ──────────────────────────────────────────────────────
  {
    id: "fire-sense-1600",
    brandId: "fire-sense",
    name: "1600 Series (conventional)",
    category: "conventional",
    status: "current",
    capacity:
      "8-zone conventional panel expandable to 16 zones, 650 mm cabinet, 80-character LCD with programmable zone descriptors.",
    summary:
      "FireSense's 1600 Series conventional panel. Common on smaller NSW commercial and industrial fit-outs where a straightforward zone panel meets the brief.",
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
        code: "ZONE OPEN",
        meaning: "Open circuit on a conventional zone.",
        firstCheck:
          "Measure across the zone at the panel; expect the documented EOL value. Investigate the field wiring for a break or missing EOL.",
      },
      {
        code: "ZONE SHORT",
        meaning: "Resistance across the zone well below the documented EOL value.",
        firstCheck:
          "Disconnect the zone, walk the run, inspect for pinched cable or a stuck-alarm device.",
      },
      {
        code: "BATTERY FAULT",
        meaning: "Standby battery failed a voltage or load check.",
        firstCheck:
          "Load-test under a simulated alarm; replace as a matched pair if out of spec.",
      },
      {
        code: "MAINS FAULT",
        meaning: "Panel running on battery - mains has failed.",
        firstCheck:
          "Check the supplying breaker and panel fuse before assuming a charger fault.",
      },
      {
        code: "SOUNDER FAULT",
        meaning: "Monitored sounder output open or short.",
        firstCheck:
          "Disconnect at the panel and measure; expect the documented EOL value.",
      },
    ],
    manualHint:
      "Obtain the current 1600 Series conventional panel manual direct from FireSense for the installed revision.",
    confidence: "general",
  },

  // ── Vigilant / Johnson Controls ────────────────────────────────────
  {
    id: "vigilant-mx1",
    brandId: "vigilant",
    name: "MX1",
    category: "addressable",
    status: "current",
    capacity:
      "Analogue addressable panel, up to 250 MX devices per loop, single- or multi-loop variants. 5 A or 14 A integrated PSU, up to 40 Ah battery capacity in the standard cabinet.",
    summary:
      "Networkable multi-loop analogue addressable panel complying with AS 7240.2, AS 7240.4 and AS 4428.3. One of the most commonly encountered FIPs across NSW commercial and institutional sites.",
    commissioningNotes: [
      "Program MX device addresses against the site schedule before energising the loop. Use the approved MX1 programming tool matched to the installed firmware.",
      "Plan networking topology up-front - I-Hub RS485/fibre or PIB IP module is a hardware choice, not a later toggle.",
      "Witness-test every zone with the operator; record brigade signalling interactions in the commissioning pack.",
    ],
    wiringQuirks: [
      "MX loop cabling follows the documented loop-loading envelope - do not assume other brands' conventions apply.",
      "I-Hub networking uses its own cable plant separate from the loop wiring - keep physically separated in the cabinet.",
      "Earth shielded loop cable at the panel end only unless the installation manual explicitly calls out otherwise.",
    ],
    programmingNotes: [
      "Back up the site configuration before any change. Keep a copy on the site record and off-site.",
      "MX device labelling carries across from design - invest the time up front to match the as-built exactly.",
      "Network-level changes affect every connected panel; plan and stage them rather than making ad-hoc edits.",
    ],
    commonFaults: [
      {
        code: "EARTH FAULT",
        meaning: "Leakage between a field conductor and protective earth.",
        firstCheck:
          "Isolate the affected loop and megger each conductor to earth. Damp J-boxes and damaged insulation are the usual cause.",
      },
      {
        code: "LOOP FAULT",
        meaning: "MX loop integrity compromised - specific detail in the event log.",
        firstCheck:
          "Read the event log for the reporting device or isolator; bisect the loop from that point.",
      },
      {
        code: "DEVICE MISSING",
        meaning: "An MX device has stopped responding to polls.",
        firstCheck:
          "Confirm the physical device, its programmed address, and the state of the upstream isolator.",
      },
      {
        code: "NETWORK FAULT",
        meaning: "Inter-panel or head-end comms failed.",
        firstCheck:
          "Check the I-Hub / PIB status LEDs, confirm network cabling, and verify topology matches the site design.",
      },
      {
        code: "BATTERY FAULT",
        meaning: "Standby battery failed voltage or load criteria.",
        firstCheck: "Load-test under a simulated alarm; replace as a matched pair if out of spec.",
      },
      {
        code: "BRIGADE COMMS FAULT",
        meaning: "ASE or monitoring path has failed polling.",
        firstCheck:
          "Check signalling unit status and confirm the last successful poll with the monitoring station.",
      },
      {
        code: "SOUNDER CIRCUIT FAULT",
        meaning: "Open or short on a monitored output circuit.",
        firstCheck:
          "Disconnect at the panel and measure; compare against the documented EOL value.",
      },
    ],
    manualHint:
      "Refer to the current Vigilant MX1 installation and commissioning manual matched to the firmware on the panel plate. Johnson Controls ANZ is the authoritative source.",
    confidence: "general",
  },

  // ── Simplex / Johnson Controls ─────────────────────────────────────
  {
    id: "simplex-4010es",
    brandId: "simplex",
    name: "4010ES",
    category: "addressable",
    status: "current",
    capacity:
      "Addressable, networkable fire alarm control unit. Up to approximately 1000 points per panel, suited to mid-size commercial sites.",
    summary:
      "Simplex's mid-range addressable control unit. Encountered on NSW commercial buildings where Simplex is the specified platform.",
    commissioningNotes: [
      "Use the approved Simplex ES programming tool licensed to the panel firmware. Tool and firmware must match exactly.",
      "Follow the AU-specific programming guide (AS 4428.1) for NSW deployments rather than the US defaults.",
      "Witness-test every zone with the operator and record the commissioning pack at handover.",
    ],
    wiringQuirks: [
      "TrueAlarm sensor and TrueAlert ES notification wiring follows Simplex-specific conventions - do not assume other brands' rules.",
      "Networking between 4010ES panels uses Simplex-specific protocols that demand careful cable plant planning.",
    ],
    programmingNotes: [
      "Back up the configuration file before any change; keep the backup under version control.",
      "Point types in the programming tool map to physical behaviours - selecting the wrong type changes alarm response.",
    ],
    commonFaults: [
      {
        code: "EARTH FAULT",
        meaning: "Leakage between a field conductor and protective earth.",
        firstCheck: "Isolate affected circuits and megger to earth.",
      },
      {
        code: "SLC FAULT",
        meaning: "Signalling Line Circuit integrity lost - addressable loop equivalent.",
        firstCheck:
          "Read the event log for the reporting device and bisect the SLC to localise the fault.",
      },
      {
        code: "DEVICE MISSING",
        meaning: "Addressable device no longer responding to polls.",
        firstCheck:
          "Confirm the physical device, the programmed address and any isolators between panel and device.",
      },
      {
        code: "BATTERY FAULT",
        meaning: "Standby battery failed voltage or load criteria.",
        firstCheck: "Load-test; replace as a matched pair.",
      },
      {
        code: "NAC FAULT",
        meaning: "Notification Appliance Circuit open or short.",
        firstCheck: "Measure across the NAC at the panel and compare against the documented EOL value.",
      },
    ],
    manualHint:
      "Refer to the Simplex 4010ES installation and programming manual for the installed firmware, plus the AU programming guide.",
    confidence: "general",
  },
  {
    id: "simplex-4100es",
    brandId: "simplex",
    name: "4100ES",
    category: "addressable",
    status: "current",
    capacity:
      "Large-scale addressable fire alarm control unit. Supports up to approximately 3000 addressable points, networked voice notification, and multi-hazard release control per the current datasheet.",
    summary:
      "Simplex flagship addressable platform for large NSW sites with voice evacuation and networked campus deployments.",
    commissioningNotes: [
      "Voice notification commissioning is specialist work - confirm the zoning plan and messaging schedule before recording any custom audio.",
      "Use the licensed AU-specific programming tool. The AU programming guide differs materially from US defaults.",
      "Network topology must be planned and documented; retrofitting network changes to a live 4100ES is high-risk.",
    ],
    wiringQuirks: [
      "Voice notification circuits carry their own wiring requirements distinct from conventional NACs.",
      "Cross-panel networking uses Simplex-specific hardware - do not substitute generic network kit.",
    ],
    programmingNotes: [
      "Version-control every configuration change; keep the backup file accessible to the next tech on site.",
      "Treat AU point-type defaults as the starting position; US-sourced config examples can mislead on AS 4428.1 compliance.",
    ],
    commonFaults: [
      {
        code: "EARTH FAULT",
        meaning: "Leakage between a field conductor and protective earth.",
        firstCheck: "Isolate affected circuits and megger to earth.",
      },
      {
        code: "SLC FAULT",
        meaning: "SLC integrity lost on one of the panel's loops.",
        firstCheck: "Read the event log for the specific SLC and reporting device; bisect to localise.",
      },
      {
        code: "NETWORK FAULT",
        meaning: "Inter-panel network comms failed.",
        firstCheck:
          "Verify network cabling at both ends and confirm topology matches the site design.",
      },
      {
        code: "VOICE CIRCUIT FAULT",
        meaning: "Voice notification amplifier or circuit fault.",
        firstCheck:
          "Check the amplifier status, confirm the speaker circuit impedance, verify total load against amp rating.",
      },
      {
        code: "BATTERY FAULT",
        meaning: "Standby battery failed voltage or load criteria.",
        firstCheck: "Load-test under simulated alarm; replace as a matched pair.",
      },
    ],
    manualHint:
      "Refer to the Simplex 4100ES ES Panel Programmer's Manual (panel-firmware matched) plus the AU programming guide LT0400.",
    confidence: "general",
  },

  // ── Notifier (Honeywell) ───────────────────────────────────────────
  {
    id: "notifier-nfs2-640",
    brandId: "notifier",
    name: "NFS2-640",
    category: "addressable",
    status: "current",
    capacity:
      "ONYX Series intelligent addressable FACP. Sized for medium installations; expandable via NOTI-FIRE-NET for larger sites.",
    summary:
      "Notifier's mid-size ONYX platform. Modular architecture suited to NSW commercial fit-outs that may need to scale through networking.",
    commissioningNotes: [
      "Use the licensed Notifier programming tool matched to panel firmware.",
      "ONYX Intelligent Sensing detectors require baseline establishment after commissioning; follow the panel's documented procedure.",
      "Confirm ActivFire approval status for every device specified before commissioning a NSW site.",
    ],
    wiringQuirks: [
      "SLC wiring follows the ONYX Series loading envelope; do not extrapolate from other addressable brands.",
      "NOTI-FIRE-NET uses its own cable plant; plan network wiring separately from SLC.",
    ],
    programmingNotes: [
      "Back up before any change. Keep the configuration file under version control.",
      "Cause-and-effect logic maps into ONYX Series programming tool constructs - familiarise with the tool's terminology.",
    ],
    commonFaults: [
      {
        code: "EARTH FAULT",
        meaning: "Leakage between a field conductor and protective earth.",
        firstCheck: "Isolate affected circuits and megger to earth.",
      },
      {
        code: "SLC FAULT",
        meaning: "Signalling Line Circuit integrity lost.",
        firstCheck: "Read event log for reporting device; bisect the SLC.",
      },
      {
        code: "DEVICE MISSING",
        meaning: "Intelligent device no longer responding to polls.",
        firstCheck: "Verify physical device, programmed address, and upstream isolator state.",
      },
      {
        code: "BATTERY FAULT",
        meaning: "Standby battery failed voltage or load criteria.",
        firstCheck: "Load-test; replace as a matched pair.",
      },
      {
        code: "NETWORK FAULT",
        meaning: "NOTI-FIRE-NET inter-panel comms failed.",
        firstCheck: "Check network cabling and confirm addressing across all connected panels.",
      },
    ],
    manualHint:
      "Refer to the Notifier NFS2-640 installation and programming manual for the firmware revision on the panel plate. Honeywell Building Solutions AU is the authoritative source.",
    confidence: "general",
  },
  {
    id: "notifier-nfs2-3030",
    brandId: "notifier",
    name: "NFS2-3030",
    category: "addressable",
    status: "current",
    capacity:
      "ONYX Series large-scale FACP. Up to 10 SLCs supporting approximately 3180 addressable devices. 640-character LCD.",
    summary:
      "Notifier's large-scale ONYX platform for medium-to-large NSW facilities. Campus-scale deployments use NOTI-FIRE-NET to link multiple NFS2-3030 panels.",
    commissioningNotes: [
      "Plan SLC loading carefully - 10 loops at ~318 devices is a design envelope, not a target.",
      "Voice notification integration where fitted requires careful zoning and level setting.",
      "Network-level C&E spans panels; test across the network, not just on the local panel.",
    ],
    wiringQuirks: [
      "SLC wiring loading rules are per-loop; do not treat the panel's device count as freely reassignable across loops.",
      "Earth shielded loop cable at the panel end only unless the manual states otherwise.",
    ],
    programmingNotes: [
      "Version-control every configuration change across the whole network.",
      "Use ONYXWorks or current Notifier site software for network-level visibility and coordinated updates.",
    ],
    commonFaults: [
      {
        code: "EARTH FAULT",
        meaning: "Leakage between a field conductor and protective earth.",
        firstCheck: "Isolate affected circuits and megger to earth.",
      },
      {
        code: "SLC FAULT",
        meaning: "SLC integrity lost on one of the 10 loops.",
        firstCheck: "Read event log for the specific SLC and reporting device.",
      },
      {
        code: "NETWORK FAULT",
        meaning: "NOTI-FIRE-NET comms failed between panels or to ONYXWorks.",
        firstCheck: "Verify network cabling and addressing across the network.",
      },
      {
        code: "BATTERY FAULT",
        meaning: "Standby battery failed voltage or load criteria.",
        firstCheck: "Load-test under simulated alarm; replace as a matched pair.",
      },
      {
        code: "VOICE CIRCUIT FAULT",
        meaning: "Where voice notification is fitted, amp or circuit fault.",
        firstCheck: "Check amp status and speaker circuit impedance.",
      },
    ],
    manualHint:
      "Refer to the NFS2-3030 installation and programming manual plus current ONYXWorks documentation for network-level configuration.",
    confidence: "general",
  },

  // ── Morley-IAS (Honeywell) ─────────────────────────────────────────
  {
    id: "morley-dxc",
    brandId: "morley-ias",
    name: "DXc / DXc2",
    category: "addressable",
    status: "current",
    capacity:
      "Addressable panel for small-to-medium buildings. Multi-loop variants (DXc2 is 2 loop, DXc1 is single loop) with peer-to-peer networking via the DXc Network card.",
    summary:
      "Morley-IAS's entry-level and mid-range addressable platform. Seen on smaller NSW commercial sites where a cost-effective Honeywell platform is specified.",
    commissioningNotes: [
      "AUTOLEARN can accelerate initial device discovery but the as-built labelling still needs manual review before handover.",
      "Peer-to-peer networking via DXc Network card supports shared zones - confirm the zone sharing plan before enabling.",
      "Confirm ActivFire approval for the specific model revision before commissioning a NSW site.",
    ],
    wiringQuirks: [
      "Loop wiring follows Morley's documented envelope; do not cross-apply Notifier loop rules despite shared parent company.",
      "Network card cabling is separate from the loop wiring - plan cabinet layout accordingly.",
    ],
    programmingNotes: [
      "Back up before any change. Re-run AUTOLEARN after device additions and then review.",
      "Shared-zone behaviour on a DXc peer-to-peer network can surprise an unwary operator - document which zone lives where.",
    ],
    commonFaults: [
      {
        code: "EARTH FAULT",
        meaning: "Leakage between a field conductor and protective earth.",
        firstCheck: "Isolate affected loop and megger to earth.",
      },
      {
        code: "LOOP FAULT",
        meaning: "Loop integrity lost.",
        firstCheck: "Event log first; bisect the loop from the reporting device.",
      },
      {
        code: "DEVICE MISSING",
        meaning: "Addressable device no longer responding to polls.",
        firstCheck: "Verify physical device and programmed address.",
      },
      {
        code: "NETWORK FAULT",
        meaning: "DXc peer-to-peer network comms failed.",
        firstCheck: "Check network card status, network cabling, and addressing.",
      },
      {
        code: "BATTERY FAULT",
        meaning: "Standby battery failed voltage or load criteria.",
        firstCheck: "Load-test; replace as a matched pair.",
      },
    ],
    manualHint:
      "Refer to the Morley-IAS DXc / DXc2 installation and programming manual for the installed firmware.",
    confidence: "general",
  },
  {
    id: "morley-zxse",
    brandId: "morley-ias",
    name: "ZXSe",
    category: "addressable",
    status: "current",
    capacity:
      "Modular, scalable addressable FACP. Capacity scales with loop cards fitted per the current datasheet.",
    summary:
      "Morley-IAS's scalable platform. Modular chassis supports a range of small-to-medium NSW deployments.",
    commissioningNotes: [
      "Confirm the loop card count and type before commissioning - the chassis modularity drives both capacity and approval envelope.",
      "AUTOLEARN accelerates device discovery; manual review of the as-built is still required before handover.",
    ],
    wiringQuirks: [
      "Loop loading is per-card; treat each card as its own budget rather than a shared pool.",
      "Earth shielded loop cable at the panel end only unless the manual states otherwise.",
    ],
    programmingNotes: [
      "Back up before any change.",
      "Label zones and devices to match the as-built exactly - ZXSe's flexibility makes mismatched labelling easy to introduce.",
    ],
    commonFaults: [
      {
        code: "EARTH FAULT",
        meaning: "Leakage between a field conductor and protective earth.",
        firstCheck: "Isolate affected loop and megger to earth.",
      },
      {
        code: "LOOP FAULT",
        meaning: "Loop integrity lost on a specific loop card.",
        firstCheck: "Event log identifies the loop; bisect from the reporting device.",
      },
      {
        code: "DEVICE MISSING",
        meaning: "Addressable device no longer responding to polls.",
        firstCheck: "Verify physical device and programmed address.",
      },
      {
        code: "BATTERY FAULT",
        meaning: "Standby battery failed voltage or load criteria.",
        firstCheck: "Load-test; replace as a matched pair.",
      },
    ],
    manualHint:
      "Refer to the Morley-IAS ZXSe installation and programming manual for the installed firmware.",
    confidence: "general",
  },

  // ── FlameStop Australia ────────────────────────────────────────────
  {
    id: "flamestop-pfs200",
    brandId: "flamestop",
    name: "PFS200 (addressable)",
    category: "addressable",
    status: "current",
    capacity:
      "FlameStop own-brand addressable fire alarm panel. Capacity per the current FlameStop datasheet.",
    summary:
      "FlameStop's own-brand addressable platform. Encountered on FlameStop-supplied commercial sites across NSW.",
    commissioningNotes: [
      "Use the FlameStop-approved programming tool matched to the panel firmware.",
      "Confirm AS 1670.1 compliance scope at specification stage; the PFS200 is commonly specified to the 2004 and 2015 editions.",
      "Witness-test each zone with the operator and record the commissioning pack at handover.",
    ],
    wiringQuirks: [
      "Loop loading and isolator placement per FlameStop's documented rules for the PFS200 - do not extrapolate from other brands.",
      "Earth shielded loop cable at the panel end only unless the installation manual states otherwise.",
    ],
    programmingNotes: [
      "Back up before any change; FlameStop can assist with configuration recovery from their archive if the site record is lost.",
    ],
    commonFaults: [
      {
        code: "EARTH FAULT",
        meaning: "Leakage between a field conductor and protective earth.",
        firstCheck: "Isolate the loop and megger to earth.",
      },
      {
        code: "LOOP FAULT",
        meaning: "Loop integrity lost.",
        firstCheck: "Event log first; bisect from the reporting device.",
      },
      {
        code: "DEVICE MISSING",
        meaning: "Addressable device no longer responding to polls.",
        firstCheck: "Verify physical device and programmed address.",
      },
      {
        code: "BATTERY FAULT",
        meaning: "Standby battery failed voltage or load criteria.",
        firstCheck: "Load-test; replace as a matched pair.",
      },
    ],
    manualHint:
      "Obtain the current PFS200 installation and programming manual directly from FlameStop Australia.",
    confidence: "general",
  },
  {
    id: "flamestop-conventional",
    brandId: "flamestop",
    name: "FlameStop Conventional Series",
    category: "conventional",
    status: "current",
    capacity:
      "Conventional zone panel range compliant with AS 1670.1 (2004 and 2015 editions). Zone count per variant.",
    summary:
      "FlameStop's own-brand conventional panel range. Common on smaller NSW commercial fit-outs where a zone-based system meets the brief.",
    commissioningNotes: [
      "Fit correct EOL values as specified in the FlameStop installation manual.",
      "Witness-test each zone with the operator; document brigade output behaviour.",
    ],
    wiringQuirks: [
      "Conventional zones are 2-wire radial runs - daisy-chain detectors rather than star-wiring.",
      "Verify detector family compatibility against the FlameStop compatibility schedule before swapping heads.",
    ],
    programmingNotes: [
      "Configuration on a conventional panel is zone labelling, C&E, and brigade output. Consult the manual for the specific sequence.",
    ],
    commonFaults: [
      {
        code: "ZONE OPEN",
        meaning: "Open circuit on a conventional zone.",
        firstCheck: "Measure across the zone at the panel; expect the documented EOL value.",
      },
      {
        code: "ZONE SHORT",
        meaning: "Resistance well below the documented EOL value.",
        firstCheck: "Disconnect the zone and walk the run for pinched cable or a stuck-alarm device.",
      },
      {
        code: "BATTERY FAULT",
        meaning: "Standby battery failed voltage or load criteria.",
        firstCheck: "Load-test; replace as a matched pair.",
      },
      {
        code: "SOUNDER FAULT",
        meaning: "Monitored sounder circuit open or short.",
        firstCheck: "Measure across the circuit; compare against the documented EOL value.",
      },
    ],
    manualHint:
      "Obtain the current FlameStop Conventional Series installation manual directly from FlameStop Australia.",
    confidence: "general",
  },

  // ── Kentec / Hochiki ───────────────────────────────────────────────
  {
    id: "kentec-syncro-as",
    brandId: "kentec-hochiki",
    name: "Kentec Syncro AS",
    category: "addressable",
    status: "current",
    capacity:
      "Analogue addressable panel in 1 or 2 loop configurations. Multi-protocol - supports Apollo, Argus Vega and Hochiki detection.",
    summary:
      "Kentec's mid-range addressable panel commonly fitted with Hochiki ESP devices in AU via Incite Fire. Suits small-to-medium NSW sites.",
    commissioningNotes: [
      "Confirm the protocol running on each loop card - Syncro AS is multi-protocol but each loop is protocol-specific.",
      "Hochiki ESP devices sourced via Hochiki Australia carry AS approval; confirm approval status for any substituted device.",
      "Witness-test each zone and record the commissioning pack at handover.",
    ],
    wiringQuirks: [
      "Follow Kentec's documented loop-loading rules for the fitted loop card.",
      "Isolator placement per AS 1670 and Kentec's guidance.",
    ],
    programmingNotes: [
      "Use the Kentec programming tool matched to the Syncro AS firmware; do not assume interchangeability with the Taktis tool.",
      "Back up before any change.",
    ],
    commonFaults: [
      {
        code: "EARTH FAULT",
        meaning: "Leakage between a field conductor and protective earth.",
        firstCheck: "Isolate the loop and megger to earth.",
      },
      {
        code: "LOOP FAULT",
        meaning: "Loop integrity lost - specific detail in the event log.",
        firstCheck: "Read the event log; bisect from the reporting device.",
      },
      {
        code: "DEVICE MISSING",
        meaning: "Addressable device no longer responding to polls.",
        firstCheck: "Verify physical device, programmed address and upstream isolator.",
      },
      {
        code: "BATTERY FAULT",
        meaning: "Standby battery failed voltage or load criteria.",
        firstCheck: "Load-test; replace as a matched pair.",
      },
      {
        code: "SOUNDER CIRCUIT FAULT",
        meaning: "Monitored sounder circuit open or short.",
        firstCheck: "Measure across the circuit; compare against the documented EOL value.",
      },
    ],
    manualHint:
      "Refer to the Kentec Syncro AS installation and programming manual. Incite Fire is the AU distributor and support channel.",
    confidence: "general",
  },
  {
    id: "kentec-taktis",
    brandId: "kentec-hochiki",
    name: "Kentec Taktis",
    category: "addressable",
    status: "current",
    capacity:
      "Multi-loop analogue addressable platform. Supported protocols and loop count per the Taktis datasheet.",
    summary:
      "Kentec's scalable addressable platform, fitted for larger AU sites via Incite Fire. Similar protocol support story to the Syncro AS but with more loops and features.",
    commissioningNotes: [
      "Confirm protocol per loop card and against the fitted detection family.",
      "Taktis programming tool and firmware are separate from the Syncro AS - plan tool access before site attendance.",
    ],
    wiringQuirks: [
      "Loop-loading rules are Taktis-specific; do not cross-apply Syncro AS rules.",
      "Networked Taktis deployments use their own cable plant and topology - plan up-front.",
    ],
    programmingNotes: [
      "Back up before any change.",
      "Cause-and-effect modelling on Taktis offers flexibility that rewards careful documentation.",
    ],
    commonFaults: [
      {
        code: "EARTH FAULT",
        meaning: "Leakage between a field conductor and protective earth.",
        firstCheck: "Isolate affected loop and megger to earth.",
      },
      {
        code: "LOOP FAULT",
        meaning: "Loop integrity lost.",
        firstCheck: "Event log first; bisect from the reporting device.",
      },
      {
        code: "DEVICE MISSING",
        meaning: "Addressable device no longer responding to polls.",
        firstCheck: "Verify device, programmed address and upstream isolator.",
      },
      {
        code: "NETWORK FAULT",
        meaning: "Inter-panel comms failed on a networked Taktis deployment.",
        firstCheck: "Check network cabling and addressing.",
      },
      {
        code: "BATTERY FAULT",
        meaning: "Standby battery failed voltage or load criteria.",
        firstCheck: "Load-test; replace as a matched pair.",
      },
    ],
    manualHint:
      "Refer to the Kentec Taktis installation and programming manual. Incite Fire is the AU distributor.",
    confidence: "general",
  },

  // ── Ampac ZoneSense PLUS (conventional) ────────────────────────────
  {
    id: "ampac-zonesense-plus",
    brandId: "ampac",
    name: "ZoneSense PLUS",
    category: "conventional",
    status: "current",
    capacity:
      "4 or 8 zone conventional panel, up to 40 conventional detectors per zone. Available in ABS (BX1) and metal (BX20) cabinet variants.",
    summary:
      "Ampac's conventional zone panel. Common on smaller NSW commercial and industrial sites where a conventional zone architecture meets the brief.",
    commissioningNotes: [
      "Fit the correct EOL value specified in the ZoneSense PLUS manual - do not substitute from another brand.",
      "Witness-test each zone with an alarm device and confirm the correct zone lights on the HMI.",
      "Commission brigade outputs and sounder circuits per AS 1670 and the site fire engineering report.",
    ],
    wiringQuirks: [
      "Conventional zones are 2-wire radial runs; up to 40 detectors per zone per the Ampac spec.",
      "ABS (BX1) and metal (BX20) cabinets have different knockout patterns - plan cable entry at commissioning.",
    ],
    programmingNotes: [
      "Conventional panel configuration is zone labelling, cause-and-effect, brigade output. Follow the ZoneSense PLUS manual exactly.",
    ],
    commonFaults: [
      {
        code: "ZONE OPEN",
        meaning: "Open circuit on a conventional zone - EOL not seen.",
        firstCheck: "Measure across the zone at the panel; expect the documented EOL value.",
      },
      {
        code: "ZONE SHORT",
        meaning: "Resistance across the zone well below the EOL value.",
        firstCheck: "Disconnect the zone, walk the run, inspect for pinched cable or stuck-alarm device.",
      },
      {
        code: "BATTERY FAULT",
        meaning: "Standby battery failed voltage or load criteria.",
        firstCheck: "Load-test; replace as a matched pair.",
      },
      {
        code: "MAINS FAULT",
        meaning: "Panel has lost mains supply and is running on battery.",
        firstCheck: "Check supplying breaker and panel fuse; confirm the site-wide mains state.",
      },
      {
        code: "SOUNDER FAULT",
        meaning: "Monitored sounder circuit open or short.",
        firstCheck: "Disconnect at the panel and measure; compare against the EOL value.",
      },
    ],
    manualHint:
      "Refer to the Ampac ZoneSense PLUS installation manual for the current firmware and wiring requirements.",
    confidence: "general",
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
