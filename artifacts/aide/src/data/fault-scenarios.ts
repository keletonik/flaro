/**
 * Fault-finding scenarios - realistic field troubleshooting for dry-fire.
 *
 * Same authoring philosophy as training-modules.ts: plain structured data
 * so edits land in one file. Each scenario is a complete walk-through
 * from "what you arrive to" through "what fixes it", with the gotchas
 * that will bite a tech who hasn't seen this one before.
 */

export type Category =
  | "Earth Faults"
  | "Opens"
  | "Shorts"
  | "Intermittent"
  | "Alarms"
  | "Power"
  | "Comms"
  | "Panel"
  | "VESDA"
  | "EWIS";

export type Difficulty = "beginner" | "intermediate" | "expert";

export interface FieldStep {
  /** Imperative action - what the tech does at this step. */
  action: string;
  /** Optional tool callout surfaced alongside the step. */
  tool?: string;
}

export interface RankedCause {
  /** Short title for the cause (displayed as heading). */
  cause: string;
  /** Why this is the most likely or least likely, given the symptoms. */
  detail: string;
}

export interface FaultScenario {
  id: string;
  title: string;
  category: Category;
  difficulty: Difficulty;
  /** One-liner for the card subtitle. */
  summary: string;
  /** Rough time to diagnose + repair on a typical site. */
  estimatedTimeMin: number;
  /** Observable evidence on arrival - LEDs, sounds, user reports. */
  symptoms: string[];
  /** Causes ranked most to least likely. */
  likelyCauses: RankedCause[];
  /** Numbered field procedure with optional tool callouts. */
  fieldProcedure: FieldStep[];
  /** Traps and things that will catch out a less experienced tech. */
  gotchas: string[];
  /** Non-negotiable safety items for this scenario. */
  safety: string[];
}

export const CATEGORIES: Category[] = [
  "Earth Faults",
  "Opens",
  "Shorts",
  "Intermittent",
  "Alarms",
  "Power",
  "Comms",
  "Panel",
  "VESDA",
  "EWIS",
];

export const SCENARIOS: FaultScenario[] = [
  // ── 1. Earth fault on addressable loop ────────────────────────────────
  {
    id: "earth-fault-addressable-loop",
    title: "Earth fault on an addressable loop",
    category: "Earth Faults",
    difficulty: "intermediate",
    summary:
      "Steady earth fault LED, no specific device flagged, worse after rain. Classic moisture ingress in a roof junction box.",
    estimatedTimeMin: 90,
    symptoms: [
      "Earth fault LED on the panel is steady, not flashing.",
      "Event log shows EARTH FAULT with no device address attached.",
      "Fault appears or worsens after rain or heavy dew.",
      "Loop still polls all devices; nothing missing or in alarm.",
      "Fault resistance to earth typically measures 10 kΩ to 100 kΩ.",
    ],
    likelyCauses: [
      {
        cause: "Moisture in a roof-space junction box",
        detail:
          "The classic one. Loop cable lands in a J-box on a tiled roof, box isn't IP-rated, water tracks along a screw thread and wets the terminals. Correlates with rainfall.",
      },
      {
        cause: "Cable insulation nicked passing through a metal stud",
        detail:
          "Usually installer damage at rough-in. Dry weather masks it; humidity lowers resistance until the panel trips the earth-fault threshold.",
      },
      {
        cause: "Shield or drain wire landed on protective earth at both ends",
        detail:
          "Shield should be earthed at the panel only. Double-earthing creates a loop; with enough length the leakage trips the detector.",
      },
      {
        cause: "Faulty isolator or detector base with internal leakage",
        detail:
          "Rare, but a degraded isolator module can leak to its chassis screw. Shows up after a firmware or hardware swap on that segment.",
      },
    ],
    fieldProcedure: [
      {
        action:
          "Read the event log. Confirm EARTH FAULT entries and check the timestamps against the weather. Rainfall correlation points to a moisture cause.",
      },
      {
        action:
          "At the panel, disconnect one loop at a time to identify which loop carries the fault. Earth fault LED clears when the offending loop is pulled.",
        tool: "Panel schematic",
      },
      {
        action:
          "With the suspect loop disconnected from the panel, megger both conductors to earth. A reading under 1 MΩ confirms leakage. Record the value for before-and-after comparison.",
        tool: "250 V insulation tester (megger)",
      },
      {
        action:
          "Split the loop at the physical midpoint (an isolator or a field J-box is the obvious splice). Megger each half. Fault follows one half.",
        tool: "250 V insulation tester (megger)",
      },
      {
        action:
          "Keep halving until one segment of cable or one device is isolated. Inspect that segment physically - roof J-boxes, conduit couplers, cable drops through metal studs.",
      },
      {
        action:
          "Repair: replace or reseal the J-box, retension terminations, replace the damaged cable run if insulation is compromised. Use IP-rated enclosures in any wet area.",
        tool: "IP66 J-box, gel-filled crimps, self-amalgamating tape",
      },
      {
        action:
          "Re-megger end-to-end. Target > 20 MΩ to earth on a healthy loop. Reconnect at the panel and confirm earth fault LED clears and stays clear for at least one complete poll cycle.",
        tool: "250 V insulation tester (megger)",
      },
    ],
    gotchas: [
      "Earth faults often don't name a device. Don't waste time swapping detectors until you've confirmed the leakage is in the cabling.",
      "Meggering with the loop still connected to the panel will blow the loop driver. Always disconnect at the panel first.",
      "A 250 V megger is the standard; anything higher can stress device electronics on the segment you're testing.",
      "Shield-earth at both ends looks identical to a wet J-box on the meter. Inspect the panel end termination before condemning the field wiring.",
    ],
    safety: [
      "Place the system on test with the monitoring service before disconnecting any loop. Brigade call-outs during fault-finding are an avoidable embarrassment.",
      "Lock out the panel charger before meggering so no voltage sources feed into the test.",
      "Roof access requires a permit, harness and observer on most commercial sites. Do not climb alone.",
    ],
  },

  // ── 2. Open circuit on a conventional zone ────────────────────────────
  {
    id: "conventional-zone-open",
    title: "Open circuit on a conventional zone",
    category: "Opens",
    difficulty: "beginner",
    summary:
      "Zone fault LED on a specific zone. EOL resistor is no longer seen by the panel. Usually a corroded terminal at a detector base.",
    estimatedTimeMin: 60,
    symptoms: [
      "Zone fault LED steady on one zone only.",
      "Event log shows OPEN or ZONE FAULT for that zone.",
      "Panel reads infinite resistance or > 50 kΩ on the zone pair.",
      "Other zones on the same panel are healthy.",
      "Often follows roof work, plumbing work, or a recent tenancy fit-out.",
    ],
    likelyCauses: [
      {
        cause: "Corroded terminal block at a detector base",
        detail:
          "Most common by far. Older bases use plated screw terminals that oxidise in humid ceiling voids. One base fails, whole daisy-chained zone reads open.",
      },
      {
        cause: "Cable severed at a building works interface",
        detail:
          "Trades cut through a cable and don't report it. Look for recent ceiling tile disturbance or new services running near the zone cabling.",
      },
      {
        cause: "Missing or failed EOL resistor at the last device",
        detail:
          "Someone swapped the last detector and didn't reinstate the EOL. Without it the panel can't distinguish open from quiescent.",
      },
      {
        cause: "Loose conductor in a J-box",
        detail:
          "Vibration or thermal cycling works the conductor out of the terminal. Tug-test each joint once you're on the run.",
      },
    ],
    fieldProcedure: [
      {
        action:
          "At the panel, disconnect the zone and measure continuity across the pair. Expect the EOL value (commonly 3.3 kΩ, 4.7 kΩ or 6.8 kΩ - check the panel data sheet). Infinite means the loop is open.",
        tool: "Multimeter set to ohms",
      },
      {
        action:
          "Temporarily fit the EOL value across the zone terminals at the panel. If the panel shows the zone healthy, the fault is confirmed in the field wiring.",
        tool: "Assorted EOL resistor pack",
      },
      {
        action:
          "Walk the zone with the panel schematic. Identify the order of detectors. Pick the physical mid-point base and open it.",
        tool: "Site drawings, headtorch",
      },
      {
        action:
          "Measure continuity from the panel to the mid-point, and from the mid-point back out to the EOL. The open is on the side that reads infinite.",
        tool: "Multimeter set to ohms",
      },
      {
        action:
          "Keep halving until the open is isolated to one base or one cable segment. Inspect the terminals. Look for green oxide, loose strands, or broken conductors.",
      },
      {
        action:
          "Repair: clean terminals, re-dress conductors with fresh copper, torque to spec. If a base is corroded, replace the base. If a cable is cut, splice using gel-filled crimps in an enclosure.",
        tool: "Terminal cleaner, cable stripper, torque screwdriver",
      },
      {
        action:
          "Reinstate EOL at the last device. Reconnect at the panel and verify the zone reads healthy under normal polling. Test an alarm on the last detector to confirm end-to-end.",
        tool: "Canned smoke for smoke detectors, test magnet for heats",
      },
    ],
    gotchas: [
      "If you leave a temporary EOL at the panel and forget to remove it, the zone will read healthy even if the whole field run is disconnected. Always pull your test resistor before leaving site.",
      "Some panels report the same zone fault for either an open OR a missing EOL. Check the exact resistance reading, not just the LED.",
      "Daisy-chained zones fail the whole zone if any single junction opens. Always halve the run to find the break rather than walking end-to-end.",
    ],
    safety: [
      "Place the zone on test with monitoring before disconnecting.",
      "Ladder work above head height needs a second person for the ceiling tile.",
      "Mind the asbestos register on pre-1990 buildings before drilling or disturbing anything in the ceiling void.",
    ],
  },

  // ── 4. Short on sounder / speaker line ───────────────────────────────
  {
    id: "sounder-line-short",
    title: "Short circuit on a sounder or speaker line",
    category: "Shorts",
    difficulty: "beginner",
    summary:
      "Sounder fault LED, panel disables outputs to that circuit. Usually rodent damage or moisture in a conduit.",
    estimatedTimeMin: 75,
    symptoms: [
      "Sounder fault or bell fault LED on the panel.",
      "Event log shows CIRCUIT SHORT or OUTPUT FAULT for a specific sounder circuit.",
      "Panel has dropped that circuit from the cause-and-effect to protect the driver.",
      "Resistance across the pair measures below 20 Ω (healthy runs sit at nominal EOL value, commonly 10 kΩ).",
    ],
    likelyCauses: [
      {
        cause: "Rodent damage to cable in a ceiling void",
        detail:
          "Rodents chew through PVC insulation, the conductors touch, panel trips. Look for droppings and gnawed cable near the run.",
      },
      {
        cause: "Water ingress in a conduit or J-box",
        detail:
          "Rain tracking down a rooftop conduit pools at the low point. Stranded conductors wick water along their length.",
      },
      {
        cause: "Cable pinched or crushed in a cable tray",
        detail:
          "Common on renovation sites where new services were laid on top of an older fire cable.",
      },
      {
        cause: "Speaker driver failed short",
        detail:
          "Rare but diagnostic: disconnect each speaker in turn. If the short clears when one is removed, that speaker has failed internally.",
      },
    ],
    fieldProcedure: [
      {
        action:
          "Disconnect the circuit at the panel. Measure resistance across the pair. A short reads close to 0 Ω. Record the reading.",
        tool: "Multimeter set to ohms",
      },
      {
        action:
          "Megger each conductor against earth. A short to earth narrows the search to wet conduit or a pinched point near a metal fixture.",
        tool: "250 V insulation tester (megger)",
      },
      {
        action:
          "Halve the run at a J-box or the nearest accessible speaker. Measure from the panel end and from the far end. The short is on whichever half still reads low.",
        tool: "Multimeter set to ohms",
      },
      {
        action:
          "Keep halving until the fault is localised to one segment or one device. Visual inspection almost always reveals the cause - chewed insulation, a wet box, a pinched cable.",
      },
      {
        action:
          "Repair: re-run damaged cable in new conduit, replace wet J-boxes with IP-rated enclosures, lift cable off the tray where it's being crushed. Use gel-filled crimps on any splice.",
        tool: "Replacement FP fire cable, IP66 J-box, gel crimps",
      },
      {
        action:
          "Reinstate EOL at the last speaker. Reconnect at the panel, test an alarm to confirm all speakers sound, and monitor SPL at the far end to ensure no speaker was damaged by the short.",
        tool: "SPL meter",
      },
    ],
    gotchas: [
      "A persistent short can damage the panel's sounder driver. If the circuit still faults after the cable is repaired, suspect the driver board.",
      "Fire-rated cable looks fine from the outside even when the conductor inside has melted. Megger before declaring it healthy.",
      "Don't bridge out a sounder circuit to 'test' it without an appropriate load - you can blow the driver.",
    ],
    safety: [
      "Place outputs on test with monitoring before working live.",
      "Rodent droppings carry leptospirosis and other zoonotic hazards. Use P2 mask and gloves when cleaning contaminated spaces.",
      "Isolate the sounder circuit at the panel before opening any speaker - 100 V line is enough to bite.",
    ],
  },

  // ── 5. False smoke alarm ─────────────────────────────────────────────
  {
    id: "kitchen-false-smoke-alarm",
    title: "Repeated false smoke alarm from one detector",
    category: "Alarms",
    difficulty: "beginner",
    summary:
      "Same head keeps going into alarm with no fire. Usually steam, dust, aerosol or the wrong detector type for the environment.",
    estimatedTimeMin: 60,
    symptoms: [
      "Same address flags ALARM, often clears quickly once ventilation carries the disturbance away.",
      "Pattern ties to a specific activity - cooking, renovation, cleaning.",
      "No fire on attendance. Occupants frustrated and asking for the system to be disabled.",
      "Analogue value (if addressable) spikes well above baseline during the event.",
    ],
    likelyCauses: [
      {
        cause: "Steam from a kitchen or bathroom reaching the detector",
        detail:
          "Ionisation and photoelectric heads see dense steam the same way they see smoke. If the detector is inside the steam path, you will get false alarms.",
      },
      {
        cause: "Construction or renovation dust",
        detail:
          "Any trade work that generates airborne particulate - cutting, sanding, demolition - will set off photoelectric heads in minutes.",
      },
      {
        cause: "Aerosol spray in the room",
        detail:
          "Deodorants, insect sprays, hairspray. Thick enough aerosol triggers the chamber. Short-term but repeatable.",
      },
      {
        cause: "Wrong detector type for the environment",
        detail:
          "Photoelectric near a kitchen, ionisation over a dusty workshop. Sometimes the install is simply inappropriate and a swap to heat or multi-criteria is the fix.",
      },
    ],
    fieldProcedure: [
      {
        action:
          "Interview the occupants. What were they doing in the 10 minutes before the last alarm? Cooking, spraying, sweeping? Get specifics.",
      },
      {
        action:
          "Pull the event log. Correlate alarm times with occupancy patterns. A detector that only alarms during business hours is responding to something people are doing.",
        tool: "Panel programming port",
      },
      {
        action:
          "Inspect the detector and its immediate environment. Is there a steam path from a kettle or shower? Is there a HVAC vent pushing contaminants across it? Is there visible dust in the grille?",
      },
      {
        action:
          "Clean the head thoroughly. For dust contamination a good vacuum may restore baseline; for heavy loading, replace the head.",
        tool: "Detector vacuum tool",
      },
      {
        action:
          "Consider relocation. AS 1670.1 requires detectors to be out of direct airflow from kitchens, bathrooms and HVAC supplies. A 1.5 m relocation is often the fix that no amount of cleaning can achieve.",
        tool: "Tape measure, AS 1670.1 reference",
      },
      {
        action:
          "If relocation isn't possible, swap to a more appropriate type - heat detector for kitchens, multi-criteria for mixed environments. Document the change in the defect log and get sign-off.",
      },
      {
        action:
          "Reset the analogue baseline and monitor the event log for 14 days. A genuine fix produces zero alarms; a partial fix produces fewer but some.",
      },
    ],
    gotchas: [
      "Occupants will pressure you to disable the detector. Don't. That's a compliance and liability fail. Relocate, change type, or adjust sensitivity within approved ranges - never just isolate long-term.",
      "Ionisation detectors are being phased out in Australia for residential use. If you're replacing, default to photoelectric unless the environment clearly needs otherwise.",
      "Sensitivity adjustment is manufacturer-specific and limited by the panel's approval. Don't push a detector outside its type-approved envelope.",
      "A detector that alarms overnight when the building is empty is not a nuisance alarm - treat it as real until proven otherwise.",
    ],
    safety: [
      "Even a 'false' alarm locks down lifts and triggers brigade signalling on many sites. Place the system on test with monitoring before any intentional alarm testing.",
      "Document every change to sensitivity, type, or location. This is fire-life-safety equipment; uncontrolled changes are how incidents happen.",
    ],
  },

  // ── 3. Intermittent detector alarm ────────────────────────────────────
  {
    id: "intermittent-detector-alarm",
    title: "Intermittent detector alarm",
    category: "Intermittent",
    difficulty: "intermediate",
    summary:
      "Same address alarms a few times a week, always clears before you arrive. Typically a loose base contact or a drifting analogue value.",
    estimatedTimeMin: 120,
    symptoms: [
      "Same detector address flags ALARM in the event log, then resets within minutes.",
      "Pattern often correlates with time of day - dawn, dusk, or HVAC cycling.",
      "No visible smoke, heat, or dust event when the tech attends.",
      "On addressable systems the analogue value is elevated but not obviously faulty.",
    ],
    likelyCauses: [
      {
        cause: "Loose contact between detector and base",
        detail:
          "Thermal cycling expands and contracts the spring contacts. When they break momentarily the panel sees alarm state for one poll cycle. Most common on older bases in ceiling voids with big day-night temperature swings.",
      },
      {
        cause: "Drifting analogue value from dust or insect contamination",
        detail:
          "Chamber gets slowly loaded with particulate. Baseline creeps up. Any minor disturbance - door slam, HVAC start - pushes it over threshold briefly.",
      },
      {
        cause: "EMI from a nearby device",
        detail:
          "New VSD, LED driver, or Wi-Fi access point installed near the cable run. Rare but real. Correlates with whatever cycle that device runs on.",
      },
      {
        cause: "Faulty detector head",
        detail:
          "Internal electronics have degraded. Swap-test is diagnostic: if the problem follows the head to a different base, the head is at fault.",
      },
    ],
    fieldProcedure: [
      {
        action:
          "Download the full event log for the last 14 days. Plot the time-of-day pattern. HVAC correlation points at airflow; dawn/dusk points at thermal; random points at dust or EMI.",
        tool: "Panel programming port + manufacturer software",
      },
      {
        action:
          "Read the analogue value of the suspect detector at the panel (addressable only). Compare against the neighbours on the same loop. An outlier more than 20 per cent above peers is suspicious.",
        tool: "Panel engineering menu",
      },
      {
        action:
          "Remove the detector. Inspect the base contacts for discolouration, bent springs, or dust build-up. Clean with contact cleaner, re-tension if possible.",
        tool: "Detector head puller, contact cleaner",
      },
      {
        action:
          "Inspect the head: dust under the grille, insect bodies in the chamber. Clean with a vacuum and compressed air, or replace if heavy contamination.",
        tool: "Detector vacuum tool or soft brush",
      },
      {
        action:
          "If the site won't accept a chance-it-and-see, swap the head to a low-risk address (store room, etc.) and move a known-good head to the suspect base. Watch logs for 7 days to confirm which location follows the fault.",
      },
      {
        action:
          "If the fault follows the head, scrap and replace. If the fault stays at the location, replace the base. Rarely do both need replacing, but always terminate to fresh copper.",
        tool: "Replacement detector and base",
      },
      {
        action:
          "After repair, reset the analogue baseline (manufacturer-specific command) and schedule a follow-up log pull at 14 days to confirm the intermittent has cleared.",
      },
    ],
    gotchas: [
      "Sites will beg you to just replace the detector. Don't, until you've checked the base contacts. Throwing heads at a base fault wastes stock and doesn't fix it.",
      "Don't clean addressable detectors with solvents unless the manufacturer explicitly approves it. Many use conductive tracks on the PCB that will short if you drip IPA into them.",
      "Pattern analysis matters more than meter readings on intermittents. If you don't have a time-of-day pattern yet, you probably don't have enough data.",
      "Remember that addressable bases can be hot-swapped on most modern panels without taking the loop down, but verify with the manufacturer docs first.",
    ],
    safety: [
      "Work at height requires a harness or platform - don't lean off a step ladder to reach a detector.",
      "Place the zone or detector on test with monitoring. Intermittents often trip exactly when you remove the head for inspection.",
    ],
  },

  // ── 6. Battery fault ─────────────────────────────────────────────────
  {
    id: "battery-wont-hold-standby",
    title: "Battery won't hold standby",
    category: "Power",
    difficulty: "beginner",
    summary:
      "Battery fault LED, voltage sags under load. Usually the batteries are end-of-life and need replacing to spec.",
    estimatedTimeMin: 45,
    symptoms: [
      "Battery fault LED steady on the panel.",
      "Event log shows LOW BATTERY or BATTERY FAIL.",
      "Battery voltage drops rapidly when mains is removed.",
      "Date-code on the batteries is more than 4 years old.",
      "Charger output voltage is correct, but batteries refuse to take charge.",
    ],
    likelyCauses: [
      {
        cause: "Batteries end-of-life",
        detail:
          "Sealed lead-acid in a FIP lives 3 to 5 years. After that the internal plates sulphate, capacity drops below the system's required standby hours, and the panel flags the fault.",
      },
      {
        cause: "Wrong amp-hour rating for system load",
        detail:
          "AS 1670.1 requires 24 hours standby plus 30 minutes alarm. If someone fitted smaller batteries than the design calls for, they will fail the load test even when new.",
      },
      {
        cause: "Charger output low or unstable",
        detail:
          "Check the float voltage with a meter while batteries are connected. Expect 27.0 to 27.6 V for a 24 V nominal SLA bank. Outside that range the charger is the problem, not the batteries.",
      },
      {
        cause: "Loose or corroded battery terminal",
        detail:
          "Resistance at the terminal drops the voltage seen by the panel under load. Looks like a bad battery, is actually a bad joint.",
      },
    ],
    fieldProcedure: [
      {
        action:
          "Record the battery date-code and the last service report. If the batteries are older than 4 years, replacement is the answer regardless of test results.",
      },
      {
        action:
          "Measure float voltage across the battery terminals with mains on. Record the reading. Check against the panel's spec (typically 27.0 to 27.6 V for a 24 V bank).",
        tool: "Multimeter",
      },
      {
        action:
          "Perform a load test. Remove mains, trigger a full system alarm, and monitor battery voltage over the 30-minute alarm period. Voltage must stay above the panel's low-battery threshold (usually 22.5 V for 24 V nominal).",
        tool: "Stopwatch, multimeter",
      },
      {
        action:
          "If the load test fails, replace batteries as a matched pair. Never mix old and new cells. Check the amp-hour rating against the panel's battery-calc sheet before ordering.",
        tool: "Replacement batteries (matched pair), battery calc sheet",
      },
      {
        action:
          "Clean terminals, re-torque to spec, re-connect. Verify polarity before energising. Let the charger float for at least 24 hours before declaring the repair complete.",
        tool: "Battery terminal brush, torque spanner",
      },
      {
        action:
          "Re-run the load test after the charge cycle. Record pass criteria in the service report and update the battery date-code sticker on the panel door.",
      },
    ],
    gotchas: [
      "Batteries in a FIP cabinet must be the same brand and date-code. Mixing invites unbalanced charging and early failure of the weaker cell.",
      "Some panels will show 'battery OK' on a surface voltage check but fail under load. Always load-test, don't just meter.",
      "If the charger is faulty, replacing the batteries alone will have them in fault again within months. Always verify charger output before fitting new batteries.",
      "Disposed lead-acid batteries are hazardous waste. Return to a recycler, don't bin them.",
    ],
    safety: [
      "SLA batteries can deliver hundreds of amps into a short. Remove metal jewellery, cover terminals while working, and never rest tools across them.",
      "Sulphuric acid electrolyte is corrosive even in sealed cells if a case cracks. Use gloves and eye protection.",
      "Two-person lift for batteries above 15 kg. Don't hurt your back on a routine job.",
    ],
  },

  // ── 7. Brigade comms fault ──────────────────────────────────────────
  {
    id: "brigade-comms-fault",
    title: "Brigade signalling comms fault",
    category: "Comms",
    difficulty: "intermediate",
    summary:
      "ASE or comms fault LED, brigade monitoring station not seeing test signals. Telephone line or IP signalling has dropped.",
    estimatedTimeMin: 90,
    symptoms: [
      "ASE fault or comms fault LED on the panel.",
      "Event log shows SIGNALLING FAIL or POLL FAIL.",
      "Monitoring station reports no test signals received.",
      "Site telephone line may have dial tone issues or the IP modem LED may be off.",
    ],
    likelyCauses: [
      {
        cause: "Telephone line dropped by the carrier",
        detail:
          "Copper PSTN is being decommissioned nationally. Lines get cut during NBN rollouts or scheduled carrier work. Check with the carrier before blaming the signalling unit.",
      },
      {
        cause: "IP signalling lost network link",
        detail:
          "Router power-cycled, patch lead pulled during office moves, or the VLAN config changed. The signalling unit sits behind the site router and is first to fail when network changes.",
      },
      {
        cause: "Signalling subscription lapsed",
        detail:
          "Monitoring contract not renewed, the station stops accepting polls. Panel-side looks healthy but nobody's listening.",
      },
      {
        cause: "Signalling unit battery or PSU failure",
        detail:
          "ASE has its own backup battery. When it dies the unit drops out during mains blips even if the comms path is fine.",
      },
    ],
    fieldProcedure: [
      {
        action:
          "Phone the monitoring station. Confirm they've lost polls and get the timestamp of the last good signal. Correlate against any known carrier or network work.",
        tool: "Phone",
      },
      {
        action:
          "At the signalling unit, check the status LEDs. Power, line, poll. Compare against the manual. Most units flash a fault code that narrows the cause.",
        tool: "Signalling unit manual",
      },
      {
        action:
          "For PSTN: plug a butt-set into the signalling unit's line-in. Dial tone confirms carrier service. No dial tone is a carrier fault, not a site fault.",
        tool: "Butt-set",
      },
      {
        action:
          "For IP: check the patch lead is seated at both ends, link LED is up on the switch port, and the signalling unit has an IP address. Ping the monitoring endpoint from a laptop on the same VLAN to confirm routing.",
        tool: "Laptop, spare patch lead",
      },
      {
        action:
          "Test signal from the panel. Use the engineering menu to send a manual test; the station should receive it within 60 seconds. If the panel sends but the station doesn't see it, the fault is downstream.",
        tool: "Panel engineering menu",
      },
      {
        action:
          "If the signalling unit's own battery is flat, replace it. Many units use a small 12 V 2.1 Ah SLA that sits inside the housing.",
        tool: "Replacement signalling unit battery",
      },
      {
        action:
          "Document the root cause. Carrier fault, network change, subscription lapse, or hardware failure. Each needs a different follow-up action and owner.",
      },
    ],
    gotchas: [
      "If the site is on managed IP signalling, the signalling vendor may want to do the diagnosis remotely first. Check the service agreement before you start pulling cables.",
      "Some ASE units retain poll history after a power cycle; others don't. Pull the event log from the unit before resetting it.",
      "A faulty patch lead can give intermittent link, which produces intermittent polls. If the link LED flickers, swap the lead before going any further.",
      "PSTN signalling is time-limited. If the site is still on copper, the customer needs a migration plan. Flag this on the service report even if today's fault was fixed.",
    ],
    safety: [
      "Place the site on test with monitoring before any comms work. The station will call the brigade if a genuine alarm arrives while you're diagnosing.",
      "Mains isolation is not needed for signalling-unit work unless you're opening the PSU section. Know where the cabinet's isolation is before you start.",
    ],
  },

  // ── 8. Panel won't silence ──────────────────────────────────────────
  {
    id: "panel-wont-silence",
    title: "Panel won't silence after an alarm",
    category: "Panel",
    difficulty: "expert",
    summary:
      "Operator presses silence, alarm re-asserts seconds later. Jumper left in, latching cause-and-effect, or a device still in alarm state.",
    estimatedTimeMin: 90,
    symptoms: [
      "Silence button appears to work, then the buzzer returns within 2 to 10 seconds.",
      "Alarm LED stays on even after a full reset.",
      "Event log shows fresh ALARM entries after each attempt to silence.",
      "On some panels the silence button does nothing at all, depending on the cause.",
    ],
    likelyCauses: [
      {
        cause: "Pull-station or manual call point latched mechanically",
        detail:
          "MCPs have a glass or plastic element that latches when broken. Until reset with a key, they keep the input in alarm. Panel can't clear what the field device is still asserting.",
      },
      {
        cause: "Detector still seeing genuine smoke or heat",
        detail:
          "Residual smoke hanging in a ceiling void after a burnt toast incident. The panel is doing its job. Ventilate, wait, re-check analogue value before assuming a fault.",
      },
      {
        cause: "Latching cause-and-effect rule",
        detail:
          "Some sites have C&E programmed to latch the alarm output until a specific reset sequence. Read the C&E table before assuming the panel is misbehaving.",
      },
      {
        cause: "Maintenance jumper left in place",
        detail:
          "Jumpers used during commissioning to simulate inputs. If the tech leaves one in the 'alarm' position, that zone is permanently asserted.",
      },
      {
        cause: "Detector head stuck in alarm state",
        detail:
          "Rare, but a failed head can latch its internal relay. Pull the head. If the zone clears, replace the head.",
      },
    ],
    fieldProcedure: [
      {
        action:
          "Read the event log and the C&E table. Identify which zone or device is driving the alarm, and whether it's programmed to latch.",
        tool: "Panel programming software",
      },
      {
        action:
          "Walk the system for pulled MCPs. Reset each with the brigade key. Even one still latched will hold the alarm.",
        tool: "Brigade key / MCP reset key",
      },
      {
        action:
          "Physically inspect the flagged detector. Any visible smoke, steam, or dust? If ambient contamination is present, ventilate and wait 5 minutes before re-attempting silence.",
      },
      {
        action:
          "Inspect the panel interior for jumpers. Compare against the site's as-built. Remove any that shouldn't be there, one at a time, checking for behaviour change.",
        tool: "Site as-built drawings",
      },
      {
        action:
          "If the C&E is latching, execute the documented reset sequence. Usually this is a key-switched ACK plus RESET, or a two-handed operation. Read the programming before pressing buttons.",
      },
      {
        action:
          "If the device is confirmed stuck, isolate it on the panel first, then physically disconnect. Verify the panel clears, then source a replacement before re-energising.",
        tool: "Replacement detector head",
      },
      {
        action:
          "Before leaving site, perform a controlled alarm test on an unrelated device to confirm the panel silences cleanly and the repair didn't break something else.",
      },
    ],
    gotchas: [
      "Never ignore the cause of an alarm that won't silence. The panel is telling you something is still in alarm. Clearing it without understanding why is how fires get missed.",
      "Jumpers left in test position are a commissioning-discipline failure. Add a visible tag next time you use one so the last-resort safety is a visual check, not memory.",
      "On networked panels, the alarm may be coming from a remote node. Check the network status, not just the local panel.",
      "Some panels treat a fault as latching too. If silencing won't clear a fault either, check whether the fault is actually cleared in the field before expecting the panel to release.",
    ],
    safety: [
      "While the alarm is asserted, brigade is receiving signals. Place the site on test with monitoring before any diagnostic work.",
      "Do not disable the alarm output to 'make it stop' unless the panel is confirmed faulted. A live alarm with silenced sounders is worse than either state alone.",
      "If residual smoke is present in an occupied space, treat it as a genuine event until the source is confirmed benign.",
    ],
  },

  // ── 9. VESDA nuisance alarm ─────────────────────────────────────────
  {
    id: "vesda-nuisance-alarm",
    title: "VESDA nuisance alarm in a loading dock",
    category: "VESDA",
    difficulty: "expert",
    summary:
      "VESDA pre-alarm or alarm 1 triggering during business hours, clean overnight. HVAC is pulling exhaust across the pipe run.",
    estimatedTimeMin: 180,
    symptoms: [
      "VESDA pre-alarm or alarm 1 triggering multiple times per day.",
      "Events always during business hours, never after-hours or weekends.",
      "Smoke level trend shows sharp spikes rather than a slow climb.",
      "No visible fire on attendance; occupants report no unusual activity.",
      "Adjacent spot detectors are quiet throughout the events.",
    ],
    likelyCauses: [
      {
        cause: "HVAC air path changed after a fit-out",
        detail:
          "A new tenancy altered return-air paths. Exhaust from a neighbouring space or an outside air intake is now sweeping across the VESDA pipework. Correlates perfectly with HVAC runtime.",
      },
      {
        cause: "Diesel or petrol exhaust entering the return-air plenum",
        detail:
          "Loading dock with vehicles idling. Fumes drawn into the building's return air, past the VESDA sampling pipes. Pre-alarm level picks it up long before human senses.",
      },
      {
        cause: "Construction or cleaning dust",
        detail:
          "Ongoing renovation in an adjacent tenancy, or aggressive cleaning chemicals near an intake. Dust loading shows as a climbing baseline rather than spikes.",
      },
      {
        cause: "Pipework hole enlargement or damage",
        detail:
          "Long-standing pipework can suffer hole-wear or crush damage. Air balance shifts, specific holes see more or less airflow than designed, sensitivity at those locations drifts.",
      },
      {
        cause: "Detector sensitivity set too low for the environment",
        detail:
          "A clean-room sensitivity (0.005% obs/m) applied to a loading dock will alarm constantly. Sensitivity must match the cleanest baseline achievable at the site.",
      },
    ],
    fieldProcedure: [
      {
        action:
          "Download the detector's smoke-level history. Plot the last 7 days against HVAC schedule and any known site activities. Time-of-day pattern drives everything that follows.",
        tool: "Xtralis VSC or VSM4 laptop software",
      },
      {
        action:
          "Inspect each sampling point during an event (or simulate via smoke pen near suspect intakes). Identify which hole(s) are contributing. Airflow readings at each point should match the design by +/- 10 per cent.",
        tool: "Smoke pen, anemometer",
      },
      {
        action:
          "Walk the return-air path upstream of the protected space. Is there an open door to a loading dock? A new exhaust fan discharging toward an intake? Correlate visible sources against the event times.",
      },
      {
        action:
          "Check the pipework for physical damage. Crushed sections, enlarged holes, or disconnections will skew the airflow balance and concentrate particulate at one point.",
        tool: "Torch, sampling-point inspection tool",
      },
      {
        action:
          "If the cause is genuine particulate from an external source, work with the site on mitigation: close loading dock doors during peak, relocate outside air intakes, add filtration at the intake, or fit a duct-mounted VESDA if return-air sampling is the actual design intent.",
      },
      {
        action:
          "If the cause is inappropriate sensitivity, recalculate using the observed clean baseline. Alarm levels must sit above the 95th percentile of healthy background and below any known real-fire signature. Document the change and get engineer sign-off.",
        tool: "AspirationCalc, site baseline data",
      },
      {
        action:
          "After changes, monitor for 14 days. A genuine fix returns the event count to zero; a partial fix reduces but doesn't eliminate. Adjust or escalate accordingly.",
      },
    ],
    gotchas: [
      "Don't just raise the alarm threshold to stop the nuisance. That makes the system blind to genuine early-warning events, which is the whole reason VESDA was specified.",
      "VESDA responds to aerosol, not just combustion smoke. Cleaning chemicals, cooking vapours, and diesel particulate all count.",
      "Pipe balance is sensitive to every hole. Adding one unauthorised sampling point anywhere on the run will change airflow at every other point.",
      "Any sensitivity change on a commissioned system needs documentation and engineer sign-off. Undocumented tweaks get commissioners and maintainers in trouble.",
    ],
    safety: [
      "Place the VESDA on test with monitoring before any intentional smoke pen use.",
      "Laser chamber is a Class 1 laser, but don't stare into the filter port during maintenance. Standard optical safety still applies.",
      "If diesel fumes are confirmed in the protected space, that's a CO hazard for occupants as well as a VESDA problem. Report both.",
    ],
  },

  // ── 10. EWIS speaker circuit fault ──────────────────────────────────
  {
    id: "ewis-speaker-circuit-fault",
    title: "EWIS speaker circuit overloaded amp",
    category: "EWIS",
    difficulty: "intermediate",
    summary:
      "Amp fault LED, speakers distorting, SPL low at the end of the run. Speaker taps set too high for the amp rating.",
    estimatedTimeMin: 120,
    symptoms: [
      "Zone amp fault or clip LED on the EWIS frame.",
      "Speakers closest to the amp sound loud, speakers at the end sound weak or clipped.",
      "SPL readings fail AS 1670.4 requirements in some but not all areas of the zone.",
      "Amp drops into thermal protection during sustained evacuation tones.",
      "Thermal magnetic breaker on the amp trips intermittently.",
    ],
    likelyCauses: [
      {
        cause: "Speaker taps set higher than the design allows",
        detail:
          "Installer set every speaker to 10 W to 'get it loud' without doing the sum. Total load exceeds the amp rating. Amp protects itself, fault LED comes on.",
      },
      {
        cause: "Speaker count exceeds amp capacity",
        detail:
          "Tenancy extended, new speakers added to the existing circuit, total load now over rating. Common after office fit-outs done without an EWIS redesign.",
      },
      {
        cause: "Short on the speaker line",
        detail:
          "A pinched conductor or moisture bridge. Presents as overload because the short is effectively a zero-ohm load on the 100 V line.",
      },
      {
        cause: "Failed output transformer in a speaker",
        detail:
          "Speaker transformer shorts, collapses the 100 V line. Isolate each speaker in turn to find the bad one.",
      },
      {
        cause: "Amp at end-of-life",
        detail:
          "Older amps lose output capacity over time. A circuit that was fine 10 years ago can exceed a tired amp's real-world headroom. Factory-spec testing confirms.",
      },
    ],
    fieldProcedure: [
      {
        action:
          "Total the speaker taps across the circuit. Use the EWIS drawings, don't trust labels on site. Sum should sit at 70 to 80 per cent of the amp's rated output - above that and there's no headroom for transformer losses or cable drop.",
        tool: "EWIS drawings, speaker tap schedule",
      },
      {
        action:
          "Measure the circuit impedance at the amp output with the amp off. For 100 V line, Z = V^2 / P = 10000 / total watts. A reading well below the calculated value means a short or failed speaker transformer.",
        tool: "Impedance meter or speaker load tester",
      },
      {
        action:
          "If impedance is wrong, bisect the run and measure each half. Narrow down to the failed speaker or the cable short. Replace the faulty component.",
        tool: "Impedance meter",
      },
      {
        action:
          "Once the circuit is electrically healthy, perform a tone test and measure SPL at the worst-case location. AS 1670.4 requires 65 dBA minimum (or 75 dBA in sleeping areas) above the ambient.",
        tool: "SPL meter, EWIS tone generator",
      },
      {
        action:
          "If SPL is still low, adjust speaker taps upward within the amp's headroom budget. Never exceed the amp rating - fit more amps if the design demands more power.",
        tool: "Speaker tap tool or replacement tapped transformer",
      },
      {
        action:
          "Perform an intelligibility check where AS 1670.4 requires it. STIPA score must pass before sign-off. Record results in the commissioning report.",
        tool: "STIPA meter",
      },
      {
        action:
          "Document the final tap settings and speaker count on the as-built. Attach a copy to the EWIS frame so future works see the correct load budget.",
      },
    ],
    gotchas: [
      "Speaker tap settings are how you change SPL, but they're bounded by the amp rating. Adding taps without adding amp power is how circuits end up in fault.",
      "100 V line is not the same as mains 100 V AC - it's a constant-voltage audio system. Treat the wiring with the same care regardless, it can still bite.",
      "Don't solve a failing circuit by disabling it. Building occupants depend on the EWIS being audible everywhere, not most places.",
      "After any tap change, re-run the intelligibility test. Louder isn't always more intelligible; too much level in a reverberant space actually degrades STIPA.",
    ],
    safety: [
      "Isolate the zone amp at the frame before opening any speaker enclosure.",
      "Place the system on test with monitoring, including any brigade signalling tied to EWIS faults.",
      "Sustained high-SPL tone testing causes hearing damage. Wear Class 5 hearing protection during tests, and warn occupants before the test starts.",
    ],
  },
];

export function scenariosByCategory(category: Category): FaultScenario[] {
  return SCENARIOS.filter((s) => s.category === category);
}

export function scenarioById(id: string): FaultScenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
