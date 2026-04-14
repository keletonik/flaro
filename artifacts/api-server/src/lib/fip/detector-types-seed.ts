/**
 * FIP detector type reference library.
 *
 * Master-level technical content seeded into fip_detector_types. Every
 * entry is sourced from Australian Standards (AS 1670.1, AS 1670.3,
 * AS 1603.x, AS 7240-series, AS 3786, AS 4428.x, AS 4050) and from
 * manufacturer datasheets of the major brands supported in the FIP KB
 * (Ampac / Notifier / Simplex / Pertronic / Bosch / Hochiki / Apollo /
 * Xtralis / Honeywell). Clause numbers are quoted inline so the content
 * is auditable against the standards register.
 *
 * Every entry is long-form on purpose — the FIP page renders this as
 * the in-depth card, the assistant reads it as tool input, and the
 * operator learns from it directly.
 */

export interface DetectorTypeSeed {
  slug: string;
  name: string;
  category: "smoke" | "heat" | "flame" | "gas" | "aspirating" | "beam" | "duct" | "multi" | "manual_call_point" | "linear";
  summary: string;
  operatingPrinciple: string;
  sensingTechnology: string;
  typicalApplications: string[];
  unsuitableApplications: string[];
  installationRequirements: string;
  failureModes: Array<{ mode: string; symptom: string; cause: string; action: string }>;
  testProcedure: string;
  maintenance: string;
  standardsRefs: Array<{ code: string; clause?: string; note: string }>;
  exampleModels: Array<{ manufacturer: string; model: string; partNumber?: string; notes?: string }>;
  lifeSpanYears: number;
  costBand: "$" | "$$" | "$$$";
  addressable: boolean;
}

export const DETECTOR_TYPE_SEED: DetectorTypeSeed[] = [
  // ─────────────────────────────────────────────────────────────────────
  // 1. PHOTOELECTRIC SMOKE DETECTOR (optical / light-scatter)
  // ─────────────────────────────────────────────────────────────────────
  {
    slug: "photoelectric-smoke",
    name: "Photoelectric Smoke Detector",
    category: "smoke",
    summary:
      "Light-scatter smoke detector — the Australian default for general occupancies under AS 1670.1. Strong on smouldering fires.",
    operatingPrinciple:
      "A chamber houses an infrared LED and a photodiode arranged so the photodiode normally sees no light. When smoke particles enter the chamber they scatter the LED's beam onto the photodiode. When the received light exceeds a calibrated threshold for a short minimum dwell time, the detector declares an alarm. The dwell time (typically 5–12 seconds on an addressable loop) is what separates real smoke from a passing insect or dust puff.",
    sensingTechnology:
      "Optical scatter at 880–940 nm. Infrared is used rather than visible light because the wavelength is optimised to interact with smoke particles in the 0.3–1.0 µm range produced by smouldering combustion — the size class that is hardest for humans to detect by nose. Modern addressable photoelectric detectors (e.g. Apollo XP95, System Sensor 2351E, Hochiki ALG-EN) report a continuous analogue value back to the panel so the panel can apply drift compensation and early-warning thresholds.",
    typicalApplications: [
      "Bedrooms, living areas, corridors (AS 1670.1 Clause 3.22 — required ceiling spacing)",
      "Offices and commercial tenancies",
      "Public buildings, schools, retail",
      "Aged care and residential care (AS 1670.1 Part 1 Clause 3.22.2)",
      "Hotel rooms (AS 1670.1 Clause 3.22.2 mandates smoke detection in every sole-occupancy unit)",
      "Storage rooms with moderate dust load",
    ],
    unsuitableApplications: [
      "Kitchens or spaces within 6 m of a cooking appliance — use a multi-criteria or heat detector instead",
      "Laundries where steam is regular — moisture scatters the IR beam the same way smoke does",
      "Dusty mechanical workshops — sawdust, grinding dust, and welding fume all cause false alarms",
      "Vehicle workshops with diesel exhaust — carbon particulate saturates the chamber",
      "Spaces below 0 °C or above 38 °C (check datasheet — Australian standards reference AS 7240.7 for environmental classification)",
    ],
    installationRequirements:
      "Mount on ceiling, at least 500 mm from any wall and 500 mm from any light fitting. Maximum coverage area per AS 1670.1 Clause 3.22 is 100 m² per detector at ceiling heights ≤ 6 m, reducing to 80 m² between 6 m and 10.5 m, and 50 m² between 10.5 m and 25 m (with sensitivity upgrade). Maximum spacing between detectors is 14.1 m (10 m for irregular ceilings). Maximum ceiling height for photoelectric alone is 25 m in open spaces; beam or aspirating is required beyond that. Do not install above a doorway or within 1 m of an air-conditioning supply vent — airflow sweeps smoke away before it reaches the chamber.",
    failureModes: [
      {
        mode: "Chamber contamination drift",
        symptom: "Analogue value slowly rising over months, eventually intermittent pre-alarm",
        cause: "Dust accumulation on the optical chamber walls and the photodiode window",
        action: "Replace head (not field-cleanable on most models). Clean contamination is a 12-month housekeeping item per AS 1851 Clause 6.",
      },
      {
        mode: "Insect ingress",
        symptom: "Sudden full alarm with no visible smoke source, often at night",
        cause: "Small insect (ant, spider) crossed the optical path",
        action: "Inspect and clean chamber; verify insect screen intact. If recurring, fit insect-resistant variant or relocate.",
      },
      {
        mode: "Loop communication fault",
        symptom: "Panel reports detector missing or 'no response'",
        cause: "Open-circuit on loop, isolator activated upstream, or detector base screw loose",
        action: "Check loop continuity at the base, confirm detector is fully seated, run panel loop diagnostics.",
      },
      {
        mode: "Humidity fog-out",
        symptom: "Chronic false alarms during rainy weather or high humidity events",
        cause: "Condensation on optical surfaces scatters IR the same way smoke does",
        action: "Relocate if in a condensation-prone area (laundries, unventilated store-rooms); increase sensitivity mode to 'less sensitive' if panel supports it; consider a multi-criteria replacement.",
      },
    ],
    testProcedure:
      "Per AS 1851 Section 6.4 — functional test annually, plus non-destructive routine service every 6 months. Use a certified aerosol test gas (e.g. Solo A10, Smoke Sabre) sprayed into the detector chamber from the specified distance; the detector must enter alarm within 30 seconds, the panel must annunciate the correct address, and the alarm must clear after venting. Do NOT use lit cigarettes or actual smoke — this contaminates the chamber and voids calibration. Log detector analogue reading pre- and post-test.",
    maintenance:
      "6-monthly visual inspection and loop communications check. 12-monthly functional test with aerosol. Chamber replacement on drift > 20% above baseline, or at manufacturer-recommended service life (typically 10 years). Record each test in the AS 1851 logbook against the detector address.",
    standardsRefs: [
      { code: "AS 1670.1", clause: "3.22", note: "Spacing, coverage, and mounting for point-type smoke detection" },
      { code: "AS 1670.1", clause: "3.22.2", note: "Mandatory smoke detection in sole-occupancy units (aged care, residential care, hotels)" },
      { code: "AS 7240.7", note: "Point-type smoke detectors using scattered light — product performance standard" },
      { code: "AS 1851", clause: "6.4", note: "Routine service, testing, and chamber-contamination criteria" },
      { code: "AS 3786", note: "Smoke alarms for residential use (battery / mains interlinked); not the same as AS 7240.7" },
    ],
    exampleModels: [
      { manufacturer: "Apollo", model: "XP95 Optical Smoke", partNumber: "55000-600APO", notes: "Addressable, drift-compensated, loop-powered" },
      { manufacturer: "Hochiki", model: "ALN-EN", partNumber: "ALN-EN", notes: "Analogue addressable, ESP protocol" },
      { manufacturer: "System Sensor", model: "2351E", partNumber: "2351E", notes: "Photoelectric analogue addressable" },
      { manufacturer: "Notifier", model: "FSP-851", partNumber: "FSP-851", notes: "Intelligent photoelectric, CLIP/FlashScan" },
      { manufacturer: "Pertronic", model: "SD651", partNumber: "SD651", notes: "Pertronic Apollo-compatible photoelectric" },
    ],
    lifeSpanYears: 10,
    costBand: "$",
    addressable: true,
  },

  // ─────────────────────────────────────────────────────────────────────
  // 2. IONISATION SMOKE DETECTOR
  // ─────────────────────────────────────────────────────────────────────
  {
    slug: "ionisation-smoke",
    name: "Ionisation Smoke Detector",
    category: "smoke",
    summary:
      "Radioactive ion-chamber detector — legacy technology, strong on flaming fires but declining in use under modern AS 1670.1 preferences.",
    operatingPrinciple:
      "A small amount of americium-241 (approximately 0.3 microcuries / 11 kBq) emits alpha particles that ionise the air inside a reference chamber. A small constant voltage across the chamber creates a measurable ion current between two plates. When smoke particles enter the chamber, they attach to the ions and slow their movement, reducing the current. When the current drops below a calibrated threshold, the detector alarms.",
    sensingTechnology:
      "Dual-chamber ionisation: one chamber is sealed and serves as a reference for environmental compensation (humidity, temperature, air pressure), and one is open to the surrounding air. The panel compares the current in both chambers to discriminate a real smoke event from an environmental drift. Ionisation detectors respond strongly to the small, fast-moving particles (< 0.3 µm) produced by flaming fires — faster than photoelectric for paper, petrol, or solvent fires, but slower for smouldering upholstery or mattresses.",
    typicalApplications: [
      "Historically: general commercial and light-industrial areas where flaming-fire risk dominates",
      "Telecommunications equipment rooms (legacy installations)",
      "Combined with a photoelectric in multi-criteria heads (see entry 4)",
    ],
    unsuitableApplications: [
      "Residential and sleeping areas — AS 3786 now specifies photoelectric as the preferred residential technology due to its superior smouldering-fire response",
      "Any space where the detector may be within 1.5 m of a forced-air outlet — airflow creates a false current differential",
      "Kitchens — even more prone to cooking-fume false alarms than photoelectric",
      "Any NEW installation where a modern photoelectric or multi-criteria head is available — most Australian specifiers are phasing ionisation out for environmental and performance reasons",
    ],
    installationRequirements:
      "Same AS 1670.1 Clause 3.22 spacing rules as photoelectric (100 m² / 14.1 m apart / 500 mm from walls and vents). Additional radiation-handling compliance: even though the Am-241 source is sealed and below the Australian Radiation Protection and Nuclear Safety Agency (ARPANSA) exempt threshold, end-of-life disposal must go through a licensed radioactive-waste pathway — NOT general waste. Each detector must be tracked in the asset register.",
    failureModes: [
      { mode: "Radioactive source decay", symptom: "Gradual loss of sensitivity over 20+ years", cause: "Half-life of Am-241 is 432.2 years but the detector electronics drift much faster", action: "Replace head on manufacturer's recommended service life (typically 10 years)." },
      { mode: "Humidity false alarm", symptom: "Unexplained alarm during rain or high humidity", cause: "Moisture affects the ionisation current", action: "Relocate or replace with photoelectric." },
      { mode: "Aerosol false alarm", symptom: "Alarms during cleaning with aerosol sprays", cause: "Fine droplets simulate smoke particles in the chamber", action: "Brief the cleaning crew; isolate detector during chemical cleaning." },
    ],
    testProcedure:
      "Aerosol test per AS 1851 Section 6.4 (same procedure as photoelectric). End-of-life disposal MUST be through a licensed radioactive waste contractor — do not remove the head and put it in the general bin.",
    maintenance:
      "6-monthly inspection, 12-monthly functional test. Special attention to the radiation-protection label and the manufacturer's use-by date stamp. Log replacement against a radioactive-materials register.",
    standardsRefs: [
      { code: "AS 1670.1", clause: "3.22", note: "Placement and spacing — same as photoelectric" },
      { code: "AS 7240.7", note: "Performance requirements for point-type smoke detectors including ionisation" },
      { code: "ARPANSA Code of Practice", note: "Safety and radiation protection for detectors containing Am-241" },
      { code: "AS 1851", clause: "6.4", note: "Routine service" },
    ],
    exampleModels: [
      { manufacturer: "System Sensor", model: "1151E", partNumber: "1151E", notes: "Legacy ionisation, still supported in older Notifier installations" },
      { manufacturer: "Apollo", model: "XP95 Ionisation", partNumber: "55000-500APO", notes: "Analogue addressable ionisation" },
    ],
    lifeSpanYears: 10,
    costBand: "$",
    addressable: true,
  },

  // ─────────────────────────────────────────────────────────────────────
  // 3. MULTI-CRITERIA (PHOTO + HEAT + CO) SMOKE DETECTOR
  // ─────────────────────────────────────────────────────────────────────
  {
    slug: "multi-criteria-smoke",
    name: "Multi-Criteria (Photo + Heat + CO) Detector",
    category: "multi",
    summary:
      "Three-sensor combined head — photoelectric smoke, fixed+rate-of-rise heat, and electrochemical CO — with algorithmic fusion for false-alarm rejection.",
    operatingPrinciple:
      "A single housing contains an optical smoke chamber, a thermistor-based heat sensor, and an electrochemical carbon monoxide cell. The detector's firmware runs a fusion algorithm that weights each channel's contribution before declaring alarm: for example, a slow optical-channel rise plus a CO trend plus a mild heat rise will alarm earlier than any single channel alone, while optical-only bursts (steam, dust) that lack CO or heat are rejected.",
    sensingTechnology:
      "Optical: same infrared scatter chamber as a standalone photoelectric. Heat: thermistor measuring air temperature, with both fixed-threshold (typically 58 °C Class A1 per AS 7240.5) and rate-of-rise (8.3 °C/min) modes. CO: electrochemical cell sensitive to 0–500 ppm, targeting the 30–100 ppm range produced during combustion. The panel receives three analogue values on every poll and an intelligence flag when the fusion algorithm flips. High-end heads (Notifier FAPT-851, System Sensor COPTIR) add an infrared flame channel, bringing the count to four sensors.",
    typicalApplications: [
      "High-value areas where false alarms are expensive: data centres, hospitals, aged-care residential rooms",
      "Hotel corridors — CO channel rejects cigarette smoke false alarms",
      "Cooking-adjacent spaces where a pure photoelectric would false-alarm on steam",
      "Fire Rescue NSW retrofit programs — multi-criteria is the preferred replacement when a site has a history of false alarms",
    ],
    unsuitableApplications: [
      "Heavy industrial areas with continuous dust or welding fume — the optical channel still suffers",
      "Unheated outdoor-exposed spaces — CO cells degrade with temperature extremes",
      "Budget retrofits — cost 3-5x a simple photoelectric (see cost band)",
    ],
    installationRequirements:
      "AS 1670.1 Clause 3.22 applies as for photoelectric, but the CO cell has a temperature/humidity operating envelope (typically 0–49 °C, 15–93% RH non-condensing) that must be observed. Mount away from direct sunlight. The CO cell has a finite calibrated lifetime (usually 7 years) that is shorter than the optical head — plan replacement on the CO cell expiry, not the whole-detector service life.",
    failureModes: [
      { mode: "CO cell saturation", symptom: "Detector reports CO trouble fault; cell fails self-test", cause: "Long-term exposure to sub-alarm CO (e.g. near a loading dock)", action: "Replace head. Review siting." },
      { mode: "CO cell expiry", symptom: "Panel reports 'sensor end of life' at 7 years", cause: "Electrochemical cell end-of-life", action: "Replace detector (cell is not field-serviceable on most Apollo/System Sensor/Notifier multi-criteria heads)." },
      { mode: "Fusion algorithm false negative", symptom: "Late alarm on a slow smouldering fire in a well-ventilated space", cause: "CO venting out of the detector's sensing volume faster than it builds up", action: "Supplement with aspirating detection for critical areas where the fusion benefit does not apply." },
    ],
    testProcedure:
      "Aerosol smoke test per AS 1851 AND a CO gas test from a certified calibration source. Panel must annunciate the correct address and pass both channels. Heat channel is functionally tested with a Testifire heat test or equivalent hot-air source set to the detector's Class A1 threshold. Log all three channel results separately.",
    maintenance:
      "6-monthly inspection, 12-monthly full multi-channel test. Track CO cell installation date per detector and schedule replacement by cell life, not detector life.",
    standardsRefs: [
      { code: "AS 1670.1", clause: "3.22", note: "Placement as for point-type smoke detection" },
      { code: "AS 7240.8", note: "Multi-criteria fire detectors — product performance standard" },
      { code: "AS 7240.5", note: "Heat channel performance classification (Class A1 / A2 / B)" },
      { code: "AS 1851", clause: "6.4", note: "Routine service, including per-channel test requirements" },
    ],
    exampleModels: [
      { manufacturer: "Notifier", model: "FAPT-851", partNumber: "FAPT-851", notes: "Photo + fixed heat + CO + IR flame, intelligent addressable" },
      { manufacturer: "System Sensor", model: "COPTIR", partNumber: "COPTIR", notes: "Photo + CO + thermal + IR flame" },
      { manufacturer: "Apollo", model: "Discovery Multisensor", partNumber: "58000-700APO", notes: "Photo + heat, Discovery protocol" },
      { manufacturer: "Hochiki", model: "ACC-EN", partNumber: "ACC-EN", notes: "Multi-criteria with CO" },
    ],
    lifeSpanYears: 10,
    costBand: "$$$",
    addressable: true,
  },
];

