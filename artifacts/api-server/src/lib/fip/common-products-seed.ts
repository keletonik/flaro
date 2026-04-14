/**
 * Common fire-protection products — curated everyday items.
 *
 * This is the "what do I need to buy" list the technician hits when
 * pricing a repair. Not a replacement for the supplier_products
 * catalogue — that's the full price list. This is a focused 30-ish
 * item set covering the devices that show up on 90% of jobs.
 *
 * Price bands are indicative (May 2025 AUD ballpark based on
 * published reseller pricing + historical quotes). Where I can't
 * verify a code or a number, the field is null/N/A.
 *
 * Natural key: partCode (falls back to name when partCode is null).
 */

export interface CommonProductSeed {
  category: "smoke" | "heat" | "flame" | "mcp" | "sounder" | "strobe" | "base" | "isolator" | "module" | "battery" | "cable" | "other";
  name: string;
  manufacturer: string | null;
  partCode: string | null;
  description: string;
  unit: "each" | "m" | "pack";
  priceBand: "$" | "$$" | "$$$" | "N/A";
  indicativePriceAud: number | null;
  notes: string | null;
}

export const COMMON_PRODUCT_SEED: CommonProductSeed[] = [
  // ─── Smoke detectors ───────────────────────────────────────────────
  {
    category: "smoke",
    name: "Apollo XP95 Optical Smoke Detector",
    manufacturer: "Apollo",
    partCode: "55000-600APO",
    description: "Analogue addressable photoelectric smoke detector, XP95 protocol, drift-compensated.",
    unit: "each",
    priceBand: "$",
    indicativePriceAud: 95,
    notes: "Most common addressable smoke head in AU. Requires XP95 base (45681-210APO).",
  },
  {
    category: "smoke",
    name: "Hochiki ALN-EN Photoelectric",
    manufacturer: "Hochiki",
    partCode: "ALN-EN",
    description: "ESP protocol analogue addressable photoelectric smoke detector.",
    unit: "each",
    priceBand: "$$",
    indicativePriceAud: 110,
    notes: "Requires Hochiki YBN-R/3 or YBO-R/6 base.",
  },
  {
    category: "smoke",
    name: "System Sensor 2351E Photoelectric",
    manufacturer: "System Sensor",
    partCode: "2351E",
    description: "Photoelectric analogue addressable smoke sensor, Notifier FlashScan compatible.",
    unit: "each",
    priceBand: "$$",
    indicativePriceAud: 120,
    notes: "Pairs with B501 base series.",
  },
  {
    category: "smoke",
    name: "Apollo XP95 Multisensor (Photo + Heat)",
    manufacturer: "Apollo",
    partCode: "55000-885APO",
    description: "Multi-criteria head — optical smoke + thermal sensor with fusion algorithm.",
    unit: "each",
    priceBand: "$$",
    indicativePriceAud: 145,
    notes: "Reduces false alarms in kitchen-adjacent areas.",
  },

  // ─── Heat detectors ─────────────────────────────────────────────────
  {
    category: "heat",
    name: "Apollo XP95 Heat Detector (A1R)",
    manufacturer: "Apollo",
    partCode: "55000-400APO",
    description: "Analogue addressable A1R class heat detector — rate-of-rise + fixed 58°C.",
    unit: "each",
    priceBand: "$",
    indicativePriceAud: 85,
    notes: "Default heat head for kitchens, car parks, laundries.",
  },
  {
    category: "heat",
    name: "Hochiki ATJ-EN Heat Detector",
    manufacturer: "Hochiki",
    partCode: "ATJ-EN",
    description: "ESP addressable heat detector, Class A1R.",
    unit: "each",
    priceBand: "$",
    indicativePriceAud: 95,
    notes: "Hochiki equivalent to Apollo XP95 heat.",
  },
  {
    category: "heat",
    name: "System Sensor 5251B Heat Detector",
    manufacturer: "System Sensor",
    partCode: "5251B",
    description: "Notifier-compatible analogue heat detector.",
    unit: "each",
    priceBand: "$$",
    indicativePriceAud: 105,
    notes: "Pairs with B501 base.",
  },

  // ─── Flame ──────────────────────────────────────────────────────────
  {
    category: "flame",
    name: "Apollo Discovery Flame Detector",
    manufacturer: "Apollo",
    partCode: "58000-550APO",
    description: "Addressable infrared flame detector, Discovery protocol.",
    unit: "each",
    priceBand: "$$$",
    indicativePriceAud: 480,
    notes: "For fuel storage, switchrooms, hangars. Requires line-of-sight.",
  },

  // ─── MCPs ──────────────────────────────────────────────────────────
  {
    category: "mcp",
    name: "Apollo XP95 Manual Call Point",
    manufacturer: "Apollo",
    partCode: "55100-908APO",
    description: "Resettable addressable break-glass MCP, surface or flush mount.",
    unit: "each",
    priceBand: "$",
    indicativePriceAud: 75,
    notes: "Reset with test key — spare glass is 29600-246 (not needed on resettable).",
  },
  {
    category: "mcp",
    name: "Hochiki HCP-EN Manual Call Point",
    manufacturer: "Hochiki",
    partCode: "HCP-EN",
    description: "Resettable ESP addressable break-glass MCP.",
    unit: "each",
    priceBand: "$",
    indicativePriceAud: 80,
    notes: null,
  },

  // ─── Sounders + Strobes ────────────────────────────────────────────
  {
    category: "sounder",
    name: "Apollo XP95 Loop-Powered Sounder",
    manufacturer: "Apollo",
    partCode: "55000-005APO",
    description: "Addressable sounder, loop-powered, 100 dBA @ 1m.",
    unit: "each",
    priceBand: "$$",
    indicativePriceAud: 135,
    notes: "Current draw ~0.8 mA quiescent, 6 mA in alarm.",
  },
  {
    category: "sounder",
    name: "Hochiki YBO-BSB2 Base Sounder",
    manufacturer: "Hochiki",
    partCode: "YBO-BSB2",
    description: "Detector-base sounder, 95 dBA, ESP protocol.",
    unit: "each",
    priceBand: "$$",
    indicativePriceAud: 95,
    notes: "Screws directly into ESP detector base.",
  },
  {
    category: "strobe",
    name: "System Sensor SpectrAlert Advance Strobe",
    manufacturer: "System Sensor",
    partCode: "SR-ALERT",
    description: "Wall-mount strobe, 15/30/75/110/135 cd selectable.",
    unit: "each",
    priceBand: "$$",
    indicativePriceAud: 165,
    notes: "Selectable candela via onboard DIP switch.",
  },

  // ─── Bases ─────────────────────────────────────────────────────────
  {
    category: "base",
    name: "Apollo XP95 Standard Base",
    manufacturer: "Apollo",
    partCode: "45681-210APO",
    description: "Standard 4\" base for XP95 / Discovery detectors.",
    unit: "each",
    priceBand: "$",
    indicativePriceAud: 22,
    notes: "Never re-use a damaged base — replace as a matter of course.",
  },
  {
    category: "base",
    name: "Apollo XP95 Isolator Base",
    manufacturer: "Apollo",
    partCode: "45681-242APO",
    description: "Standard base with integrated short-circuit isolator.",
    unit: "each",
    priceBand: "$",
    indicativePriceAud: 65,
    notes: "Use every 20-30 devices on long loops per AS 1670.1 §3.34.",
  },

  // ─── Isolators / Modules ──────────────────────────────────────────
  {
    category: "isolator",
    name: "Apollo XP95 Standalone Isolator",
    manufacturer: "Apollo",
    partCode: "55000-700APO",
    description: "DIN-rail standalone isolator module for fault containment.",
    unit: "each",
    priceBand: "$",
    indicativePriceAud: 85,
    notes: null,
  },
  {
    category: "module",
    name: "Apollo XP95 Input/Output Unit",
    manufacturer: "Apollo",
    partCode: "55000-823APO",
    description: "1 input + 1 relay output, addressable loop device.",
    unit: "each",
    priceBand: "$",
    indicativePriceAud: 140,
    notes: "For interfacing waterflow, tamper, HVAC shutdown.",
  },
  {
    category: "module",
    name: "Apollo XP95 Switch Monitor Plus",
    manufacturer: "Apollo",
    partCode: "55000-827APO",
    description: "Dual-input switch monitor, addressable.",
    unit: "each",
    priceBand: "$",
    indicativePriceAud: 125,
    notes: "For waterflow + tamper switch on a single address.",
  },

  // ─── Batteries ──────────────────────────────────────────────────────
  {
    category: "battery",
    name: "12V 7Ah Sealed Lead Acid",
    manufacturer: "Power-Sonic / Yuasa",
    partCode: "PS-1270 / NP7-12",
    description: "12V 7Ah SLA — smallest standard FIP battery.",
    unit: "each",
    priceBand: "$",
    indicativePriceAud: 38,
    notes: "Used in small conventional panels, MCP-only systems.",
  },
  {
    category: "battery",
    name: "12V 12Ah Sealed Lead Acid",
    manufacturer: "Power-Sonic / Yuasa",
    partCode: "PS-12120 / NP12-12",
    description: "12V 12Ah SLA — small addressable panels.",
    unit: "each",
    priceBand: "$",
    indicativePriceAud: 55,
    notes: null,
  },
  {
    category: "battery",
    name: "12V 17Ah Sealed Lead Acid",
    manufacturer: "Power-Sonic / Yuasa",
    partCode: "PS-12170 / NP17-12",
    description: "12V 17Ah SLA — most common addressable panel battery.",
    unit: "each",
    priceBand: "$$",
    indicativePriceAud: 75,
    notes: "Pair in series for 24V, 2 required per panel.",
  },
  {
    category: "battery",
    name: "12V 24Ah Sealed Lead Acid",
    manufacturer: "Power-Sonic / Yuasa",
    partCode: "PS-12240",
    description: "12V 24Ah SLA — mid-size panels + VESDA hosts.",
    unit: "each",
    priceBand: "$$",
    indicativePriceAud: 105,
    notes: null,
  },
  {
    category: "battery",
    name: "12V 38Ah Sealed Lead Acid",
    manufacturer: "Power-Sonic / CSB",
    partCode: "PS-12380 / GP12400",
    description: "12V 38Ah SLA — large panels (F220, NFS2-640, Morley DX).",
    unit: "each",
    priceBand: "$$",
    indicativePriceAud: 155,
    notes: "Usually requires external battery cabinet.",
  },
  {
    category: "battery",
    name: "12V 65Ah Sealed Lead Acid",
    manufacturer: "Power-Sonic",
    partCode: "PS-12650",
    description: "12V 65Ah SLA — very large panels, always external cabinet.",
    unit: "each",
    priceBand: "$$$",
    indicativePriceAud: 245,
    notes: "AS 4428 ventilation rules apply to the battery cabinet.",
  },
  {
    category: "battery",
    name: "12V 100Ah Sealed Lead Acid",
    manufacturer: "Power-Sonic",
    partCode: "PS-121000",
    description: "12V 100Ah SLA — mega-site panels (NFS-3030 etc.).",
    unit: "each",
    priceBand: "$$$",
    indicativePriceAud: 395,
    notes: "Lift-assist required — each battery ~35 kg.",
  },

  // ─── Cables ─────────────────────────────────────────────────────────
  {
    category: "cable",
    name: "WS52B Fire-Rated 2 × 1.5 mm²",
    manufacturer: "Prysmian / Olex",
    partCode: "WS52B-1.5",
    description: "2-core 1.5 mm² pink fire-rated cable, 2-hour fire resistance.",
    unit: "m",
    priceBand: "$$",
    indicativePriceAud: 8.50,
    notes: "Pink jacket — used for sounder circuits and detection loops in AU.",
  },
  {
    category: "cable",
    name: "WS52B Fire-Rated 2 × 2.5 mm²",
    manufacturer: "Prysmian / Olex",
    partCode: "WS52B-2.5",
    description: "2-core 2.5 mm² pink fire-rated cable.",
    unit: "m",
    priceBand: "$$",
    indicativePriceAud: 12.00,
    notes: "For longer sounder circuits where voltage drop matters.",
  },

  // ─── Beam + Aspirating ─────────────────────────────────────────────
  {
    category: "smoke",
    name: "Fireray 5000 Beam Detector",
    manufacturer: "FFE",
    partCode: "FIRERAY-5000",
    description: "Motorised auto-aligning reflective beam, 8-100 m range.",
    unit: "each",
    priceBand: "$$$",
    indicativePriceAud: 2850,
    notes: "Warehouses + atria. Auto-alignment saves the annual re-aim service.",
  },
];
