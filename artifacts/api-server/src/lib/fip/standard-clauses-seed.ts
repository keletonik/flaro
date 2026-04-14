/**
 * AS standards clause-level seed content.
 *
 * Each entry is a single clause from one of the Australian standards
 * already loaded by the V2 Master Pack standards register. The clauses
 * here are the ones the FIP assistant + page surface most often:
 * detector spacing, manual call point placement, sounder SPL, routine
 * service intervals, panel monitoring requirements.
 *
 * Content is sourced from the published AS standards and reproduced
 * here as concise plain-English summaries with the exact clause number
 * preserved so the user can verify against the official document. We
 * intentionally do NOT reproduce the full standard text — copyright
 * sits with Standards Australia.
 */

export interface StandardClauseSeed {
  /** Standard code as it appears in fip_standards.code */
  standardCode: string;
  clauseNumber: string;
  title: string;
  /** Plain-English summary of what the clause requires */
  summary: string;
  keywords: string[];
}

export const STANDARD_CLAUSE_SEED: StandardClauseSeed[] = [
  // ─────────────────────────────────────────────────────────────────────
  // AS 1670.1 — Fire detection and alarm system design
  // ─────────────────────────────────────────────────────────────────────
  {
    standardCode: "AS 1670.1",
    clauseNumber: "3.22",
    title: "Point-type smoke detector spacing and coverage",
    summary:
      "Maximum coverage area per smoke detector is 100 m² at ceiling heights up to 6 m, reducing to 80 m² between 6 m and 10.5 m, and 50 m² between 10.5 m and 25 m (with sensitivity upgrade). Maximum spacing between detectors is 14.1 m (10 m for irregular ceilings or beams). Mount detectors at least 500 mm from any wall and at least 500 mm from any air diffuser. Detectors must NOT be installed where the airflow from a supply or return vent will sweep smoke past the head before it can enter the chamber.",
    keywords: ["smoke", "spacing", "coverage", "ceiling height", "photoelectric", "ionisation"],
  },
  {
    standardCode: "AS 1670.1",
    clauseNumber: "3.22.2",
    title: "Smoke detection in sole-occupancy units",
    summary:
      "Mandatory smoke detection in every sole-occupancy unit (SOU) of an aged-care facility, residential care building, hotel, motel, or backpackers. Each bedroom and each path-of-egress corridor must have at least one smoke detector. The detector must be addressable to the building FIP, not a standalone alarm.",
    keywords: ["sole occupancy", "aged care", "hotel", "residential", "bedrooms", "smoke"],
  },
  {
    standardCode: "AS 1670.1",
    clauseNumber: "3.23",
    title: "Heat detector spacing and coverage",
    summary:
      "Maximum coverage area per heat detector is 50 m² at ceiling heights up to 4 m, reducing in steps for higher ceilings (see Table 3.23). Maximum spacing between detectors is 7.1 m. Heat detectors must NOT be used as a substitute for smoke detection where smoke detection is feasible — they detect too late to save sleeping occupants. Permitted in kitchens, laundries, garages, and other spaces where smoke detection would false-alarm.",
    keywords: ["heat", "spacing", "rate of rise", "kitchen", "laundry", "garage"],
  },
  {
    standardCode: "AS 1670.1",
    clauseNumber: "3.24",
    title: "Flame detector siting and field of view",
    summary:
      "Flame detectors require unobstructed line-of-sight to the protected area. Detection range is specified in the manufacturer's datasheet against a reference fire (typically 0.1 m² n-heptane pan). Mount so the conical field of view (typically 90–100°) covers the whole protected zone without any permanent obstruction. Avoid direct sunlight, welding bays, and reflective surfaces unless a triple-IR or solar-blind UV/IR detector is used.",
    keywords: ["flame", "IR", "UV", "line of sight", "hydrocarbon", "fuel storage"],
  },
  {
    standardCode: "AS 1670.1",
    clauseNumber: "3.25",
    title: "Optical beam smoke detector spacing",
    summary:
      "One beam per 15 m of building width (7.5 m each side of the beam). Maximum beam length 100 m for end-to-end systems and 50 m for reflective. Mount the transmitter and receiver 300–800 mm below the ceiling so the beam sits in the developing smoke layer. The beam path must remain clear of permanent obstructions and the building must not move beyond the detector's alignment range under thermal load.",
    keywords: ["beam", "infrared", "warehouse", "atrium", "high ceiling"],
  },
  {
    standardCode: "AS 1670.1",
    clauseNumber: "3.26",
    title: "Aspirating smoke detection — very early warning",
    summary:
      "Aspirating smoke detectors (VESDA / HSSD) provide very-early-warning detection by drawing air from the protected space through a sample pipe network to a centralised laser chamber. Required where the protected asset value, ceiling height (> 25 m), or operational sensitivity makes point-type detection inadequate.",
    keywords: ["VESDA", "aspirating", "HSSD", "laser", "data centre", "high value"],
  },
  {
    standardCode: "AS 1670.1",
    clauseNumber: "3.26.4",
    title: "Aspirating system maximum transport time",
    summary:
      "The maximum air transport time from the farthest sample hole on the pipe network to the detector chamber must not exceed 120 seconds. Transport time is measured at commissioning by introducing smoke at the farthest hole and timing the detector response. The reading must be logged in the as-built drawings and re-tested at every annual service.",
    keywords: ["aspirating", "transport time", "120 seconds", "commissioning", "VESDA"],
  },
  {
    standardCode: "AS 1670.1",
    clauseNumber: "3.27",
    title: "Duct-mounted smoke detection",
    summary:
      "Duct smoke detectors are required on HVAC supply air systems above the threshold airflow specified in AS 1668.1, and on return air systems where smoke recirculation could spread fire products through the building. Sample tubes must span the full duct width, mount on a straight run at least 6 duct widths downstream of any bend, and connect to a remote test/reset station accessible at 1.5 m above floor.",
    keywords: ["duct", "HVAC", "supply", "return", "AS 1668", "fan shutdown"],
  },
  {
    standardCode: "AS 1670.1",
    clauseNumber: "3.28",
    title: "Line-type heat detection",
    summary:
      "Linear heat detection cable is permitted in cable trays, conveyor systems, road and rail tunnels, cold stores, and any other space where point-type heat detection is impractical. Cable must be supported at 1-metre intervals with non-metallic clips and must sense the air temperature surrounding the hot source rather than direct conduction. Distance-addressable systems must report alarm location to within 3 metres of the actual hot spot.",
    keywords: ["linear", "heat cable", "tunnel", "conveyor", "Protectowire"],
  },
  {
    standardCode: "AS 1670.1",
    clauseNumber: "3.29",
    title: "Manual call point placement",
    summary:
      "Manual call points must be installed at a height of 1400 ± 200 mm above finished floor, within 2 m of every required exit door, and so that no person in the protected space is more than 30 m from a call point. Each MCP must have clear, unobstructed signage. Wiring must be supervised — short-circuit and open-circuit faults must annunciate as troubles on the FIP.",
    keywords: ["manual call point", "MCP", "break glass", "exit", "1400mm", "30m"],
  },
];

