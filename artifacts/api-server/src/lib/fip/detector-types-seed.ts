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

  // ─────────────────────────────────────────────────────────────────────
  // 4. RATE-OF-RISE HEAT DETECTOR
  // ─────────────────────────────────────────────────────────────────────
  {
    slug: "rate-of-rise-heat",
    name: "Rate-of-Rise Heat Detector",
    category: "heat",
    summary:
      "Thermistor-based heat detector that triggers on temperature rise-rate (typically 8.3 °C/min) AND a fixed back-stop (57–65 °C).",
    operatingPrinciple:
      "Two thermistors track local air temperature. Firmware compares the current value against a rolling baseline to compute a rate of change. If the rise rate exceeds a calibrated threshold (usually 8.3 °C per minute, matching AS 7240.5 Class A1R), the detector alarms immediately regardless of absolute temperature. A fixed-threshold back-stop at 57–65 °C (Class A1 / A2) catches slow-onset fires that never trigger the rate channel.",
    sensingTechnology:
      "Dual NTC thermistor with analogue reporting. On addressable heads (Apollo XP95 Heat, Hochiki ALG-H, Notifier FST-851) the panel reads both the instantaneous temperature and the rate of rise every poll. Class A1R is the Australian default; higher ambient spaces use Class B (75 °C) or Class C (90 °C). Heat detectors do NOT suffer the optical false-alarm modes of photoelectric, which makes them the default in dusty or steamy spaces.",
    typicalApplications: [
      "Kitchens and cooking areas (AS 1670.1 Clause 3.23 — heat detection where smoke detection is impractical)",
      "Laundries, showers, saunas, indoor pools",
      "Garages and vehicle workshops",
      "Mechanical plant rooms and boiler rooms",
      "Dusty storage areas where photoelectric would false-alarm",
    ],
    unsuitableApplications: [
      "Sleeping areas — heat detectors respond too late to save sleeping occupants (photoelectric is mandatory per AS 1670.1 Clause 3.22.2)",
      "Large open warehouses with high ceilings — heat stratifies before reaching the detector",
      "Unheated outdoor spaces with wide diurnal temperature swings — can false-alarm on rapid solar-driven warming",
    ],
    installationRequirements:
      "AS 1670.1 Clause 3.23 — maximum coverage area 50 m² per detector at ceiling heights ≤ 4 m, maximum spacing 7.1 m between detectors. Reduced coverage above 4 m — see Table 3.23 for the exact reduction. Mount 500 mm minimum from walls. Heat detectors are NOT a substitute for smoke detection where smoke detection is feasible.",
    failureModes: [
      { mode: "Thermistor drift", symptom: "Gradual baseline temperature offset shown on the panel analogue read", cause: "Thermistor aging or contamination", action: "Replace head on 15-year service life or when drift exceeds 5 °C." },
      { mode: "Airflow cooling false negative", symptom: "Known heat event failed to trigger", cause: "Forced air conditioning supply sweeping heat away from the detector", action: "Relocate away from supply vents; consider line-type linear heat cable for critical areas." },
      { mode: "Base disconnection", symptom: "Panel reports missing detector", cause: "Loose terminal on loop base", action: "Re-seat and re-torque the loop terminals." },
    ],
    testProcedure:
      "Heat test per AS 1851 Section 6.4 — use a certified heat-test tool (Testifire, Solo heat) that delivers hot air at a controlled temperature. Detector must alarm within 30 seconds of reaching its rated threshold. Do NOT use a naked flame or butane torch — excessive heat damages the sensor and contaminates nearby photoelectric heads.",
    maintenance:
      "6-monthly visual + loop communications check, 12-monthly functional heat test. Service life is typically 15 years versus 10 for optical heads because there is no chamber to contaminate.",
    standardsRefs: [
      { code: "AS 1670.1", clause: "3.23", note: "Heat detection spacing, coverage, and where it is permitted instead of smoke" },
      { code: "AS 7240.5", note: "Point-type heat detectors — classification A1, A1R, A2, B, C based on fixed + rate-of-rise thresholds" },
      { code: "AS 1851", clause: "6.4", note: "Routine service with certified heat-test tooling" },
    ],
    exampleModels: [
      { manufacturer: "Apollo", model: "XP95 Heat A1R", partNumber: "55000-400APO", notes: "Analogue addressable, Class A1R" },
      { manufacturer: "Hochiki", model: "ALG-EN Heat", partNumber: "ALG-EN", notes: "ESP protocol" },
      { manufacturer: "Notifier", model: "FST-851", partNumber: "FST-851", notes: "Addressable thermal detector" },
      { manufacturer: "System Sensor", model: "5251B", partNumber: "5251B", notes: "Combination fixed/rate-of-rise" },
    ],
    lifeSpanYears: 15,
    costBand: "$",
    addressable: true,
  },

  // ─────────────────────────────────────────────────────────────────────
  // 5. FIXED-TEMPERATURE HEAT DETECTOR (high-temperature variants)
  // ─────────────────────────────────────────────────────────────────────
  {
    slug: "fixed-temperature-heat",
    name: "Fixed-Temperature Heat Detector",
    category: "heat",
    summary:
      "Single-threshold heat detector — alarms only when ambient exceeds a set temperature (Class A2 58 °C through Class G 150 °C). Use where rate-of-rise false-alarms on legitimate temperature swings.",
    operatingPrinciple:
      "A bimetallic element or thermistor is calibrated to close a contact (conventional) or cross an analogue threshold (addressable) at a fixed temperature. There is no rate-of-rise channel. The detector alarms when the air temperature at the head reaches the rating regardless of how fast it got there.",
    sensingTechnology:
      "Conventional (two-wire) fixed-temperature detectors use a fusible alloy or bimetallic disc that physically deforms at the rating point, closing a pair of contacts. Addressable fixed heads use a thermistor reporting an analogue value, with the panel applying the fixed threshold in firmware. Common AS 7240.5 classifications: A2 (58 °C), B (75 °C), C (90 °C), D (105 °C), E (120 °C), F (135 °C), G (150 °C).",
    typicalApplications: [
      "Boiler rooms with high ambient temperature — use Class C or D so normal operating temperature does not trip the head",
      "Kitchens over deep-fryers and chargrills (Class B/C)",
      "Attics and roof voids in hot climates",
      "Industrial drying rooms and ovens",
      "Commercial laundry press areas",
    ],
    unsuitableApplications: [
      "Any space where rapid heat-rate detection is needed — rate-of-rise is faster",
      "Sleeping areas — smoke detection is mandatory",
      "Low-ceiling offices — a standard A1R is more appropriate",
    ],
    installationRequirements:
      "Same AS 1670.1 Clause 3.23 spacing as rate-of-rise heat. Pick the rating class per AS 7240.5 Table 1 so that the maximum static ambient temperature of the space is at least 20 °C below the detector's rating — otherwise you'll get nuisance alarms on hot days.",
    failureModes: [
      { mode: "Fusible element fatigue", symptom: "Contact fails closed (false alarm) after many heat-cycle events", cause: "Repeated thermal cycling weakens the bimetallic element", action: "Replace head — the element is not resettable once alarmed." },
      { mode: "Under-rated for the space", symptom: "Chronic nuisance alarms during hot weather", cause: "Wrong classification picked at design time", action: "Upgrade to the next class (A2 → B, or B → C)." },
    ],
    testProcedure:
      "Certified heat gun at the rated temperature per AS 1851 Section 6.4. Conventional fixed-temperature heads CANNOT be reset after a real alarm — a successful field test at the rated temperature is destructive. Test only addressable or resettable types this way.",
    maintenance:
      "6-monthly visual, 12-monthly loop communication test. Functional heat test only on addressable / resettable types. Track installation date and replace at manufacturer's service life.",
    standardsRefs: [
      { code: "AS 1670.1", clause: "3.23", note: "Spacing and permitted use" },
      { code: "AS 7240.5", note: "Classification A1 through G and associated maximum ambient temperatures" },
      { code: "AS 1851", clause: "6.4", note: "Routine service — test only resettable types" },
    ],
    exampleModels: [
      { manufacturer: "Apollo", model: "Series 65 Heat 90 °C", partNumber: "55000-125APO", notes: "Conventional Class C fixed" },
      { manufacturer: "System Sensor", model: "5602", partNumber: "5602", notes: "Conventional 135 °F (57 °C) Class A2" },
      { manufacturer: "Hochiki", model: "CDX-DIN-HT90", notes: "Conventional 90 °C Class C" },
    ],
    lifeSpanYears: 15,
    costBand: "$",
    addressable: false,
  },

  // ─────────────────────────────────────────────────────────────────────
  // 6. INFRARED (IR) FLAME DETECTOR
  // ─────────────────────────────────────────────────────────────────────
  {
    slug: "ir-flame",
    name: "Infrared (IR) Flame Detector",
    category: "flame",
    summary:
      "Line-of-sight optical detector responding to the 4.3 µm CO₂ emission band from hydrocarbon flames — fast, long range, but vulnerable to hot surface false alarms without discrimination.",
    operatingPrinciple:
      "A pyroelectric or photodiode sensor tuned to the 4.3 µm infrared band captures the flicker signature of an open flame. Flames produce a characteristic 1–12 Hz flicker from the rising hot combustion gases — the detector's signal-processing electronics look for this flicker frequency in addition to the raw IR intensity, so a static hot object (e.g. a heater) does not trigger alarm. Triple-IR (IR³) detectors add two reference bands (2.7 µm water, 3.7 µm reference) to discriminate real flames from reflected sunlight, welding flash, and hot machinery.",
    sensingTechnology:
      "Single-IR: one 4.3 µm pyroelectric sensor with flicker-frequency processing. Range 15–30 m to a 0.1 m² n-heptane pan fire (EN 54-10 reference). Dual-IR adds a second band to reject blackbody sources. Triple-IR (IR³) — the industry gold standard for hydrocarbon fuel storage — processes three wavelengths with a ratio algorithm that achieves 60+ metre range on the same reference fire. UV/IR detectors combine an IR channel with a UV solar-blind sensor for near-instant response on flames containing both radiation types.",
    typicalApplications: [
      "Fuel depots, refineries, LPG/LNG handling (AS 1670.1 Clause 3.24 — flame detection for hydrocarbon-risk spaces)",
      "Hangars and aircraft maintenance facilities",
      "Turbine halls and gas compressor stations",
      "Warehouses storing combustible liquids",
      "Transformer bays and electrical switchgear rooms",
    ],
    unsuitableApplications: [
      "Spaces with frequent welding, cutting, or grinding — weld flash produces strong IR bursts that defeat single-IR discrimination",
      "Areas with direct sunlight on reflective surfaces — use solar-blind UV/IR or triple-IR",
      "Hidden or obstructed fire zones — line-of-sight only, no response behind columns or equipment",
      "Cooking areas — cooking flames will trigger alarm on every shift",
    ],
    installationRequirements:
      "Mount so the detector's conical field of view (typically 90–100°) covers the protected area without obstruction. Keep the viewing angle away from direct sunlight and welding bays. Confirm the maximum detection distance against the datasheet's reference fire size — most specs state range for a 0.1 m² heptane pan. Power and signal cabling MUST be fire-rated per AS 1670.1 Clause 3.25, and the detector's junction box must match the hazardous area classification (Ex rated in Zone 1/2 fuel areas).",
    failureModes: [
      { mode: "Dirty viewing window", symptom: "Reduced sensitivity or self-test fault", cause: "Dust, oil film, or bird droppings on the optical window", action: "Clean with isopropyl alcohol per the datasheet. Some detectors have a built-in self-cleaning test LED." },
      { mode: "Solar false alarm", symptom: "Unexplained alarms on bright sunny days", cause: "Direct or reflected sunlight entering the field of view", action: "Reposition the detector; consider triple-IR or UV/IR upgrade." },
      { mode: "Line-of-sight blocked", symptom: "Known fire test failed to trigger", cause: "New equipment or stock blocking the viewing cone", action: "Walk the sight line during commissioning and after any plant change." },
    ],
    testProcedure:
      "Use a certified flame test lamp (e.g. Det-Tronics, Sperryn) that emits the correct IR flicker signature — do NOT use an actual lighter or gas flame indoors. The detector must alarm within the manufacturer-rated response time (typically 3–15 seconds) at the specified test distance. Log range, response time, and any self-test codes.",
    maintenance:
      "Quarterly viewing-window cleaning in dusty environments, 6-monthly elsewhere. 12-monthly full function test with certified lamp. Track detector service life and window replacement.",
    standardsRefs: [
      { code: "AS 1670.1", clause: "3.24", note: "Flame detection siting and where it is required" },
      { code: "AS 7240.10", note: "Flame detectors — product performance standard (aligns with EN 54-10)" },
      { code: "AS 1851", clause: "6.4", note: "Routine service with certified test lamp" },
      { code: "IEC 60079", note: "Explosive-atmosphere rating for hazardous-zone installations" },
    ],
    exampleModels: [
      { manufacturer: "Honeywell", model: "FS24X Triple-IR", partNumber: "FS24X", notes: "60 m range, solar-blind, hazardous area approved" },
      { manufacturer: "Det-Tronics", model: "X3301 Multispectrum IR", notes: "Multi-spectrum flame detection" },
      { manufacturer: "Apollo", model: "Discovery Flame", partNumber: "58000-550APO", notes: "Addressable IR flame" },
    ],
    lifeSpanYears: 10,
    costBand: "$$$",
    addressable: true,
  },

  // ─────────────────────────────────────────────────────────────────────
  // 7. UV/IR COMBINATION FLAME DETECTOR
  // ─────────────────────────────────────────────────────────────────────
  {
    slug: "uv-ir-flame",
    name: "UV / IR Combination Flame Detector",
    category: "flame",
    summary:
      "Dual-sensor flame detector combining a solar-blind UV channel with a 4.3 µm IR channel — near-instant alarm with strong false-alarm rejection via cross-confirmation.",
    operatingPrinciple:
      "The UV channel uses a Geiger-Müller tube or silicon carbide sensor sensitive to 185–260 nm, a band that is absorbed by the upper atmosphere and essentially solar-blind at ground level. A flame emits strongly in this band within milliseconds of ignition. The IR channel tracks the same 4.3 µm CO₂ emission and flicker signature as a single-IR detector. The detector's logic alarms only when BOTH channels confirm within a short time window (typically 1–3 seconds). Either channel alone produces a supervisory signal but not a full alarm.",
    sensingTechnology:
      "UV: solar-blind Geiger-Müller tube with lead shielding, discharging when a UV photon strikes the cathode. Sensitivity decreases with tube age. IR: pyroelectric sensor with flicker discrimination as per single-IR entry. Both channels feed a cross-confirmation ASIC. Response time on a standard n-heptane fire is typically 3–5 seconds at 15 m — faster than pure IR because the UV channel picks up the flame onset before the IR band builds intensity.",
    typicalApplications: [
      "Offshore platforms, gas compressor stations, LPG bottling plants — the combination of UV speed and IR false-alarm rejection is the industry default for hydrocarbon risk",
      "Hangars — fast fuel fire response with welding-flash rejection (UV rejects hot metal, IR rejects arc flash)",
      "Switchgear rooms and transformer bays",
      "Paint spray booths and solvent storage",
    ],
    unsuitableApplications: [
      "Welding and grinding areas without specific UV-rejection modes — arc flash triggers the UV channel; use triple-IR instead",
      "Dusty environments — the UV tube window fogs faster than an IR-only window",
      "Indoor spaces with mercury-vapour or metal-halide lighting — these lamps emit UV that can saturate the detector",
      "High-humidity tropical outdoor without a heated window — condensation blocks both channels",
    ],
    installationRequirements:
      "Same line-of-sight rules as IR flame (AS 1670.1 Clause 3.24). Mount outside the field of view of any welding, grinding, or HV arc work. UV channel has a narrower cone than IR (typically 90° vs 100°) — verify both coverage patterns against the protected area. Hazardous-area installations must use an Ex-rated housing. Never paint the viewing window.",
    failureModes: [
      { mode: "UV tube aging", symptom: "Slow decline in UV channel sensitivity; eventual tube failure flagged by self-test", cause: "Normal gas-discharge tube wear", action: "Replace detector or UV tube cartridge on manufacturer service life (typically 10 years)." },
      { mode: "Welding flash false alarm", symptom: "Recurrent alarms during hot work on adjacent plant", cause: "UV channel activated by arc", action: "Fit a UV filter or switch to triple-IR technology in welding-dense areas." },
      { mode: "Optical window fouling", symptom: "Both channel sensitivities degraded; fault flagged", cause: "Oil film, dust, or salt build-up", action: "Clean per datasheet; use neutral detergent and lint-free cloth." },
    ],
    testProcedure:
      "Certified UV/IR test lamp (e.g. Det-Tronics Q90) that emits on both channels. Verify alarm at the rated distance within the manufacturer's response time. Log per-channel response; a UV-only or IR-only response indicates one channel has failed self-test.",
    maintenance:
      "Quarterly window inspection, 6-monthly walk-down sight-line check, 12-monthly dual-channel function test. Clean the window with IPA per the datasheet — never abrasive cleaners.",
    standardsRefs: [
      { code: "AS 1670.1", clause: "3.24", note: "Flame detection siting" },
      { code: "AS 7240.10", note: "Flame detector product standard — includes UV/IR types" },
      { code: "IEC 60079", note: "Hazardous area certification" },
      { code: "AS 1851", clause: "6.4", note: "Routine service" },
    ],
    exampleModels: [
      { manufacturer: "Det-Tronics", model: "U7600B UV/IR", notes: "Solar-blind UV + 4.3 µm IR, Ex-rated" },
      { manufacturer: "Honeywell", model: "FS20X UV/IR", partNumber: "FS20X", notes: "Dual-channel with cross-confirmation" },
      { manufacturer: "MSA General Monitors", model: "FL3110", notes: "UV/IR with continuous self-test" },
    ],
    lifeSpanYears: 10,
    costBand: "$$$",
    addressable: false,
  },
];

