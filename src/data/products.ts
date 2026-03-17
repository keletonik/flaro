export interface Product {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  description: string;
  certifications: string[];
  image: string;
  badge?: string;
}

export interface Category {
  name: string;
  slug: string;
  description: string;
  image: string;
  subcategories: string[];
}

export const categories: Category[] = [
  {
    name: "Fire Extinguishers",
    slug: "fire-extinguishers",
    description: "ABE, CO2, Wet Chemical, Foam, Water & specialty extinguishers. All sizes from 1kg to 9kg+.",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=400&fit=crop",
    subcategories: ["ABE Dry Chemical Powder", "CO2 Carbon Dioxide", "Wet Chemical", "Foam", "Water", "Lithium Battery (AVD)", "Vehicle & Marine", "Stainless Steel"],
  },
  {
    name: "Fire Blankets",
    slug: "fire-blankets",
    description: "AS/NZS 3504 certified fire blankets for kitchens, workshops, vehicles and industrial use.",
    image: "https://images.unsplash.com/photo-1586953208270-767889fa9b0e?w=600&h=400&fit=crop",
    subcategories: ["Kitchen Fire Blankets", "Commercial Fire Blankets", "Industrial Fire Blankets", "Welding Blankets"],
  },
  {
    name: "Smoke Alarms & Detectors",
    slug: "smoke-alarms",
    description: "Photoelectric, interconnected, smart WiFi and hardwired smoke alarms. Heat and CO detectors.",
    image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&h=400&fit=crop",
    subcategories: ["Photoelectric Smoke Alarms", "Interconnected Wireless", "Smart WiFi Alarms", "Heat Detectors", "Carbon Monoxide Detectors", "Multi-Sensor Detectors", "240V Hardwired"],
  },
  {
    name: "Fire Hose Reels",
    slug: "fire-hose-reels",
    description: "Complete hose reel systems, swing arm and fixed, with nozzles and fittings.",
    image: "https://images.unsplash.com/photo-1582139329536-e7284fece509?w=600&h=400&fit=crop",
    subcategories: ["Swing Arm Hose Reels", "Fixed Hose Reels", "Hose Reel Nozzles", "Hose Reel Covers", "Replacement Hose"],
  },
  {
    name: "Fire Hydrant Equipment",
    slug: "fire-hydrant-equipment",
    description: "Hydrant boosters, valves, landing valves, standpipe kits, hydrant keys and accessories.",
    image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&h=400&fit=crop",
    subcategories: ["Hydrant Boosters", "Landing Valves", "Standpipe Kits", "Hydrant Covers", "Hydrant Keys & Spanners", "Storz Fittings"],
  },
  {
    name: "Emergency & Exit Lighting",
    slug: "emergency-lighting",
    description: "LED exit signs, emergency lights, bulkhead lights. AS 2293 compliant with battery backup.",
    image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=600&h=400&fit=crop",
    subcategories: ["LED Exit Signs", "Twin-Spot Emergency Lights", "Single-Spot Emergency Lights", "Bulkhead Emergency Lights", "Recessed Emergency Lights", "Weatherproof Emergency Lights"],
  },
  {
    name: "Fire Safety Signage",
    slug: "fire-safety-signage",
    description: "AS 1319 compliant safety signage. Photoluminescent, self-adhesive and rigid mounting options.",
    image: "https://images.unsplash.com/photo-1614064641938-3cb20a81aa31?w=600&h=400&fit=crop",
    subcategories: ["Extinguisher Location Signs", "Hose Reel Signs", "Fire Blanket Signs", "Exit & Evacuation Signs", "Fire Door Signs", "Assembly Point Signs", "Fire Hydrant Signs", "No Smoking Signs"],
  },
  {
    name: "Fire Cabinets & Brackets",
    slug: "fire-cabinets",
    description: "Extinguisher cabinets, hose reel cabinets, wall brackets, vehicle brackets and stands.",
    image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&h=400&fit=crop",
    subcategories: ["Single Extinguisher Cabinets", "Double Extinguisher Cabinets", "Hose Reel Cabinets", "Fire Blanket Cabinets", "Wall Brackets", "Vehicle Brackets", "Chrome Stands"],
  },
  {
    name: "First Aid",
    slug: "first-aid",
    description: "Workplace, vehicle and burns first aid kits. Eye wash stations and first aid cabinets.",
    image: "https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=600&h=400&fit=crop",
    subcategories: ["Workplace First Aid Kits", "Vehicle First Aid Kits", "Burns Kits", "Eye Wash Stations", "First Aid Cabinets", "Refill Supplies"],
  },
  {
    name: "Fire Warden Equipment",
    slug: "fire-warden-equipment",
    description: "Fire warden helmets, hi-vis vests, megaphones, evacuation chairs and warden kits.",
    image: "https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=600&h=400&fit=crop",
    subcategories: ["Warden Helmets", "Hi-Vis Warden Vests", "Warden Kits", "Megaphones", "Evacuation Chairs", "Torches"],
  },
  {
    name: "Fire Door Hardware",
    slug: "fire-door-hardware",
    description: "Door closers, electromagnetic door holders, fire door signs and hold-open devices.",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=400&fit=crop",
    subcategories: ["Door Closers", "Electromagnetic Door Holders", "Hold-Open Devices", "Fire Door Signs", "Door Seals"],
  },
  {
    name: "Sprinkler Components",
    slug: "sprinkler-components",
    description: "Sprinkler heads, cages, guards, escutcheons and accessories for fire sprinkler systems.",
    image: "https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=600&h=400&fit=crop",
    subcategories: ["Sprinkler Heads", "Sprinkler Cages & Guards", "Escutcheons", "Sprinkler Accessories"],
  },
];

export const products: Product[] = [
  // ═══════════════════════════════════════════════════════════════
  // FIRE EXTINGUISHERS - ABE Dry Chemical Powder
  // ═══════════════════════════════════════════════════════════════
  { id: "ext-abe-1kg", name: "1kg ABE Dry Chemical Powder Fire Extinguisher", category: "Fire Extinguishers", subcategory: "ABE Dry Chemical Powder", description: "Compact multi-purpose extinguisher for vehicles, caravans and small spaces. Suitable for Class A, B and E fires.", certifications: ["AS/NZS 1841.5"], image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop", badge: "Popular" },
  { id: "ext-abe-2.5kg", name: "2.5kg ABE Dry Chemical Powder Fire Extinguisher", category: "Fire Extinguishers", subcategory: "ABE Dry Chemical Powder", description: "Versatile medium-sized extinguisher ideal for offices, retail spaces and light commercial use.", certifications: ["AS/NZS 1841.5"], image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop" },
  { id: "ext-abe-4.5kg", name: "4.5kg ABE Dry Chemical Powder Fire Extinguisher", category: "Fire Extinguishers", subcategory: "ABE Dry Chemical Powder", description: "Industry standard multi-purpose extinguisher. Most popular size for offices, workshops and commercial premises.", certifications: ["AS/NZS 1841.5"], image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop", badge: "Best Seller" },
  { id: "ext-abe-9kg", name: "9kg ABE Dry Chemical Powder Fire Extinguisher", category: "Fire Extinguishers", subcategory: "ABE Dry Chemical Powder", description: "Heavy-duty extinguisher for warehouses, factories, workshops and large commercial spaces.", certifications: ["AS/NZS 1841.5"], image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop" },

  // CO2 Carbon Dioxide
  { id: "ext-co2-2kg", name: "2kg CO2 Fire Extinguisher", category: "Fire Extinguishers", subcategory: "CO2 Carbon Dioxide", description: "Clean agent extinguisher for electrical equipment, server rooms and sensitive electronics. Leaves no residue.", certifications: ["AS/NZS 1841.6"], image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop" },
  { id: "ext-co2-3.5kg", name: "3.5kg CO2 Fire Extinguisher", category: "Fire Extinguishers", subcategory: "CO2 Carbon Dioxide", description: "Medium CO2 extinguisher for data centres, electrical switchrooms and laboratory environments.", certifications: ["AS/NZS 1841.6"], image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop" },
  { id: "ext-co2-5kg", name: "5kg CO2 Fire Extinguisher", category: "Fire Extinguishers", subcategory: "CO2 Carbon Dioxide", description: "Large CO2 extinguisher for industrial electrical applications and large server environments.", certifications: ["AS/NZS 1841.6"], image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop" },

  // Wet Chemical
  { id: "ext-wet-2l", name: "2L Wet Chemical Fire Extinguisher", category: "Fire Extinguishers", subcategory: "Wet Chemical", description: "Compact wet chemical extinguisher for small kitchens, food trucks and domestic cooking areas.", certifications: ["AS/NZS 1841.4"], image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop" },
  { id: "ext-wet-7l", name: "7L Wet Chemical Fire Extinguisher", category: "Fire Extinguishers", subcategory: "Wet Chemical", description: "Full-size wet chemical extinguisher purpose-built for commercial kitchen fires (Class F). Essential for restaurants.", certifications: ["AS/NZS 1841.4"], image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop", badge: "Essential" },

  // Foam
  { id: "ext-foam-9l", name: "9L AFFF Foam Fire Extinguisher", category: "Fire Extinguishers", subcategory: "Foam", description: "Aqueous film-forming foam extinguisher for Class A and B fires. Ideal for petrochemical environments.", certifications: ["AS/NZS 1841.3"], image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop" },

  // Water
  { id: "ext-water-9l", name: "9L Water Fire Extinguisher", category: "Fire Extinguishers", subcategory: "Water", description: "Water extinguisher for Class A fires involving paper, wood, textiles and general combustibles.", certifications: ["AS/NZS 1841.1"], image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop" },

  // Lithium Battery
  { id: "ext-lith-9l", name: "9L AVD Lithium Battery Fire Extinguisher", category: "Fire Extinguishers", subcategory: "Lithium Battery (AVD)", description: "Aqueous Vermiculite Dispersion agent for lithium-ion battery fires. For EV charging stations, warehouses and data centres.", certifications: ["AS/NZS 1841"], image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop", badge: "New" },

  // Vehicle & Marine
  { id: "ext-veh-1kg", name: "1kg Vehicle Fire Extinguisher with Bracket", category: "Fire Extinguishers", subcategory: "Vehicle & Marine", description: "Compact ABE extinguisher with metal vehicle mounting bracket. Suits cars, 4WDs, boats and caravans.", certifications: ["AS/NZS 1841.5"], image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop" },
  { id: "ext-marine-2kg", name: "2kg Marine Fire Extinguisher", category: "Fire Extinguishers", subcategory: "Vehicle & Marine", description: "Corrosion-resistant marine-grade extinguisher for boats, yachts and maritime vessels.", certifications: ["AS/NZS 1841.5"], image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop" },

  // Stainless Steel
  { id: "ext-ss-2kg", name: "2kg Stainless Steel ABE Extinguisher", category: "Fire Extinguishers", subcategory: "Stainless Steel", description: "Premium polished stainless steel finish. For architecturally-designed spaces, hotels and high-end commercial fit-outs.", certifications: ["AS/NZS 1841.5"], image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop" },

  // ═══════════════════════════════════════════════════════════════
  // FIRE BLANKETS
  // ═══════════════════════════════════════════════════════════════
  { id: "blk-1x1", name: "1.0m x 1.0m Fire Blanket", category: "Fire Blankets", subcategory: "Kitchen Fire Blankets", description: "Compact fire blanket for domestic kitchens. Quick-release wall-mount container included.", certifications: ["AS/NZS 3504"], image: "https://images.unsplash.com/photo-1586953208270-767889fa9b0e?w=400&h=400&fit=crop" },
  { id: "blk-1.2x1.2", name: "1.2m x 1.2m Fire Blanket", category: "Fire Blankets", subcategory: "Kitchen Fire Blankets", description: "Standard size fire blanket suitable for kitchens, laboratories and small commercial spaces.", certifications: ["AS/NZS 3504"], image: "https://images.unsplash.com/photo-1586953208270-767889fa9b0e?w=400&h=400&fit=crop", badge: "Popular" },
  { id: "blk-1.2x1.8", name: "1.2m x 1.8m Fire Blanket", category: "Fire Blankets", subcategory: "Commercial Fire Blankets", description: "Commercial-grade fire blanket for restaurants, commercial kitchens and workshops.", certifications: ["AS/NZS 3504"], image: "https://images.unsplash.com/photo-1586953208270-767889fa9b0e?w=400&h=400&fit=crop", badge: "Best Seller" },
  { id: "blk-1.8x1.8", name: "1.8m x 1.8m Fire Blanket", category: "Fire Blankets", subcategory: "Industrial Fire Blankets", description: "Large industrial fire blanket for factories, warehouses and heavy industrial environments.", certifications: ["AS/NZS 3504"], image: "https://images.unsplash.com/photo-1586953208270-767889fa9b0e?w=400&h=400&fit=crop" },
  { id: "blk-weld-1.8x1.8", name: "1.8m x 1.8m Welding Blanket", category: "Fire Blankets", subcategory: "Welding Blankets", description: "Heavy-duty welding blanket for spark and splatter protection during hot works. Fibreglass construction.", certifications: ["AS/NZS 3504"], image: "https://images.unsplash.com/photo-1586953208270-767889fa9b0e?w=400&h=400&fit=crop" },

  // ═══════════════════════════════════════════════════════════════
  // SMOKE ALARMS & DETECTORS
  // ═══════════════════════════════════════════════════════════════
  { id: "alarm-photo-10yr", name: "Photoelectric Smoke Alarm — 10 Year Battery", category: "Smoke Alarms & Detectors", subcategory: "Photoelectric Smoke Alarms", description: "Sealed lithium battery, no maintenance for 10 years. Australian-made. No wiring required.", certifications: ["AS 3786-2014"], image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=400&fit=crop", badge: "Best Seller" },
  { id: "alarm-photo-9v", name: "Photoelectric Smoke Alarm — 9V Battery", category: "Smoke Alarms & Detectors", subcategory: "Photoelectric Smoke Alarms", description: "Budget-friendly photoelectric alarm with replaceable 9V battery. Easy DIY installation.", certifications: ["AS 3786-2014"], image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=400&fit=crop" },
  { id: "alarm-photo-240v", name: "Photoelectric Smoke Alarm — 240V Hardwired", category: "Smoke Alarms & Detectors", subcategory: "240V Hardwired", description: "Mains-powered photoelectric smoke alarm with 9V battery backup. Requires licensed electrician for installation.", certifications: ["AS 3786-2014"], image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=400&fit=crop" },
  { id: "alarm-wireless", name: "Wireless Interconnected Smoke Alarm", category: "Smoke Alarms & Detectors", subcategory: "Interconnected Wireless", description: "RF interconnect up to 40 alarms. When one triggers, all sound. 10-year sealed battery.", certifications: ["AS 3786-2014"], image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=400&fit=crop", badge: "Popular" },
  { id: "alarm-wifi", name: "Smart WiFi Smoke Alarm", category: "Smoke Alarms & Detectors", subcategory: "Smart WiFi Alarms", description: "App notifications, remote monitoring, smart home integration. Alerts to your phone anywhere.", certifications: ["AS 3786-2014"], image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=400&fit=crop", badge: "New" },
  { id: "alarm-heat", name: "Heat Detector — Rate of Rise", category: "Smoke Alarms & Detectors", subcategory: "Heat Detectors", description: "For kitchens, garages and bathrooms where smoke alarms cause false triggers. Activates on rapid temperature rise.", certifications: ["AS 1603.2"], image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=400&fit=crop" },
  { id: "alarm-heat-fixed", name: "Heat Detector — Fixed Temperature 57°C", category: "Smoke Alarms & Detectors", subcategory: "Heat Detectors", description: "Fixed temperature heat detector for areas prone to false alarms. Activates at 57°C.", certifications: ["AS 1603.2"], image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=400&fit=crop" },
  { id: "alarm-co", name: "Carbon Monoxide Detector", category: "Smoke Alarms & Detectors", subcategory: "Carbon Monoxide Detectors", description: "Electrochemical CO sensor with digital display. Essential for gas appliance areas. 10-year battery.", certifications: ["AS 1603"], image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=400&fit=crop" },
  { id: "alarm-multi", name: "Multi-Sensor Smoke & Heat Detector", category: "Smoke Alarms & Detectors", subcategory: "Multi-Sensor Detectors", description: "Combined photoelectric smoke and thermistor heat detection for reduced false alarms and faster response.", certifications: ["AS 3786-2014"], image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=400&fit=crop" },

  // ═══════════════════════════════════════════════════════════════
  // FIRE HOSE REELS
  // ═══════════════════════════════════════════════════════════════
  { id: "hose-swing-36m", name: "36m Swing Arm Fire Hose Reel — Complete", category: "Fire Hose Reels", subcategory: "Swing Arm Hose Reels", description: "Complete swing arm hose reel with 36m lay-flat hose, shut-off nozzle and wall mounting bracket.", certifications: ["AS 1221"], image: "https://images.unsplash.com/photo-1582139329536-e7284fece509?w=400&h=400&fit=crop", badge: "Best Seller" },
  { id: "hose-fixed-36m", name: "36m Fixed Fire Hose Reel — Complete", category: "Fire Hose Reels", subcategory: "Fixed Hose Reels", description: "Fixed-mount hose reel with 36m lay-flat hose, shut-off nozzle and wall bracket. For straight-pull installations.", certifications: ["AS 1221"], image: "https://images.unsplash.com/photo-1582139329536-e7284fece509?w=400&h=400&fit=crop" },
  { id: "hose-nozzle", name: "Fire Hose Reel Nozzle — Brass", category: "Fire Hose Reels", subcategory: "Hose Reel Nozzles", description: "Replacement brass shut-off nozzle for fire hose reels. Jet and spray pattern.", certifications: ["AS 1221"], image: "https://images.unsplash.com/photo-1582139329536-e7284fece509?w=400&h=400&fit=crop" },
  { id: "hose-cover", name: "Fire Hose Reel Cover — UV Resistant", category: "Fire Hose Reels", subcategory: "Hose Reel Covers", description: "UV-stabilised PVC cover to protect outdoor hose reels from weather damage.", certifications: [], image: "https://images.unsplash.com/photo-1582139329536-e7284fece509?w=400&h=400&fit=crop" },
  { id: "hose-replacement", name: "36m Replacement Fire Hose", category: "Fire Hose Reels", subcategory: "Replacement Hose", description: "19mm lay-flat replacement hose for standard fire hose reels. UV-stabilised.", certifications: ["AS 1221"], image: "https://images.unsplash.com/photo-1582139329536-e7284fece509?w=400&h=400&fit=crop" },

  // ═══════════════════════════════════════════════════════════════
  // FIRE HYDRANT EQUIPMENT
  // ═══════════════════════════════════════════════════════════════
  { id: "hydrant-booster", name: "Fire Hydrant Booster Assembly", category: "Fire Hydrant Equipment", subcategory: "Hydrant Boosters", description: "Complete hydrant booster assembly with dual inlets, outlet and non-return valves.", certifications: ["AS 2419.1"], image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop" },
  { id: "hydrant-landing-65", name: "65mm Landing Valve — Brass", category: "Fire Hydrant Equipment", subcategory: "Landing Valves", description: "65mm brass landing valve with Storz coupling for fire hydrant risers.", certifications: ["AS 2419.1"], image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop" },
  { id: "hydrant-standpipe", name: "Standpipe Kit — Complete", category: "Fire Hydrant Equipment", subcategory: "Standpipe Kits", description: "Complete standpipe kit with key, coupling, and 65mm landing valve connection.", certifications: ["AS 2419.1"], image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop" },
  { id: "hydrant-cover", name: "Fire Hydrant Cover Plate — Round", category: "Fire Hydrant Equipment", subcategory: "Hydrant Covers", description: "Cast aluminium hydrant cover plate. Road-rated for in-ground hydrant protection.", certifications: [], image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop" },
  { id: "hydrant-key", name: "Fire Hydrant Key / Spanner", category: "Fire Hydrant Equipment", subcategory: "Hydrant Keys & Spanners", description: "Universal hydrant key and spanner for operating street and building hydrant valves.", certifications: [], image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop" },
  { id: "hydrant-storz-65", name: "65mm Storz Coupling — Brass", category: "Fire Hydrant Equipment", subcategory: "Storz Fittings", description: "65mm brass Storz symmetrical coupling for fire hydrant and hose reel connections.", certifications: ["AS 2419.1"], image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop" },

  // ═══════════════════════════════════════════════════════════════
  // EMERGENCY & EXIT LIGHTING
  // ═══════════════════════════════════════════════════════════════
  { id: "light-exit-m", name: "LED Emergency Exit Sign — Maintained", category: "Emergency & Exit Lighting", subcategory: "LED Exit Signs", description: "Maintained LED exit sign with 3-hour battery backup. Surface or recessed ceiling mount.", certifications: ["AS 2293.1"], image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&h=400&fit=crop", badge: "Best Seller" },
  { id: "light-exit-nm", name: "LED Emergency Exit Sign — Non-Maintained", category: "Emergency & Exit Lighting", subcategory: "LED Exit Signs", description: "Non-maintained LED exit sign. Illuminates only during power failure. 3-hour battery.", certifications: ["AS 2293.1"], image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&h=400&fit=crop" },
  { id: "light-exit-blade", name: "LED Exit Sign — Blade Mount", category: "Emergency & Exit Lighting", subcategory: "LED Exit Signs", description: "Wall-mounted blade-style LED exit sign for corridor and hallway installations.", certifications: ["AS 2293.1"], image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&h=400&fit=crop" },
  { id: "light-twin", name: "Twin-Spot LED Emergency Light", category: "Emergency & Exit Lighting", subcategory: "Twin-Spot Emergency Lights", description: "Dual adjustable LED heads. 3-hour duration. Auto self-test function. Surface mount.", certifications: ["AS 2293.1"], image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&h=400&fit=crop", badge: "Popular" },
  { id: "light-single", name: "Single-Spot LED Emergency Light", category: "Emergency & Exit Lighting", subcategory: "Single-Spot Emergency Lights", description: "Compact single LED head emergency light. 3-hour duration with self-test.", certifications: ["AS 2293.1"], image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&h=400&fit=crop" },
  { id: "light-bulkhead", name: "Bulkhead LED Emergency Light", category: "Emergency & Exit Lighting", subcategory: "Bulkhead Emergency Lights", description: "Enclosed bulkhead emergency light for stairwells, corridors and plant rooms. IP65 rated.", certifications: ["AS 2293.1"], image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&h=400&fit=crop" },
  { id: "light-recessed", name: "Recessed LED Emergency Light", category: "Emergency & Exit Lighting", subcategory: "Recessed Emergency Lights", description: "Flush-mounted recessed emergency light for clean ceiling installations. Auto self-test.", certifications: ["AS 2293.1"], image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&h=400&fit=crop" },
  { id: "light-weather", name: "Weatherproof LED Emergency Light — IP65", category: "Emergency & Exit Lighting", subcategory: "Weatherproof Emergency Lights", description: "IP65-rated weatherproof emergency light for car parks, loading docks and outdoor areas.", certifications: ["AS 2293.1"], image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&h=400&fit=crop" },

  // ═══════════════════════════════════════════════════════════════
  // FIRE SAFETY SIGNAGE
  // ═══════════════════════════════════════════════════════════════
  { id: "sign-ext-loc", name: "Fire Extinguisher Location Sign — Photoluminescent", category: "Fire Safety Signage", subcategory: "Extinguisher Location Signs", description: "Glows in the dark. Self-adhesive. 300mm x 225mm. High-visibility photoluminescent.", certifications: ["AS 1319"], image: "https://images.unsplash.com/photo-1614064641938-3cb20a81aa31?w=400&h=400&fit=crop" },
  { id: "sign-ext-id", name: "Fire Extinguisher ID Sign — ABE/CO2/Wet Chem", category: "Fire Safety Signage", subcategory: "Extinguisher Location Signs", description: "Colour-coded extinguisher identification sign. Available in ABE, CO2, Wet Chemical and Foam variants.", certifications: ["AS 1319"], image: "https://images.unsplash.com/photo-1614064641938-3cb20a81aa31?w=400&h=400&fit=crop" },
  { id: "sign-hose", name: "Fire Hose Reel Location Sign", category: "Fire Safety Signage", subcategory: "Hose Reel Signs", description: "Photoluminescent fire hose reel location sign. Self-adhesive. 300mm x 225mm.", certifications: ["AS 1319"], image: "https://images.unsplash.com/photo-1614064641938-3cb20a81aa31?w=400&h=400&fit=crop" },
  { id: "sign-blanket", name: "Fire Blanket Location Sign", category: "Fire Safety Signage", subcategory: "Fire Blanket Signs", description: "Photoluminescent fire blanket location sign. Self-adhesive mounting.", certifications: ["AS 1319"], image: "https://images.unsplash.com/photo-1614064641938-3cb20a81aa31?w=400&h=400&fit=crop" },
  { id: "sign-exit-photo", name: "Exit Sign — Photoluminescent", category: "Fire Safety Signage", subcategory: "Exit & Evacuation Signs", description: "Glow-in-the-dark exit sign for power failure visibility. Multiple arrow direction options.", certifications: ["AS 1319"], image: "https://images.unsplash.com/photo-1614064641938-3cb20a81aa31?w=400&h=400&fit=crop" },
  { id: "sign-assembly", name: "Assembly Point Sign", category: "Fire Safety Signage", subcategory: "Assembly Point Signs", description: "Large format assembly point sign for emergency evacuation points. 600mm x 450mm.", certifications: ["AS 1319"], image: "https://images.unsplash.com/photo-1614064641938-3cb20a81aa31?w=400&h=400&fit=crop" },
  { id: "sign-fire-door", name: "Fire Door — Keep Closed Sign", category: "Fire Safety Signage", subcategory: "Fire Door Signs", description: "Fire door signage — Keep Closed / Do Not Obstruct. Self-adhesive.", certifications: ["AS 1319"], image: "https://images.unsplash.com/photo-1614064641938-3cb20a81aa31?w=400&h=400&fit=crop" },
  { id: "sign-hydrant", name: "Fire Hydrant Location Sign", category: "Fire Safety Signage", subcategory: "Fire Hydrant Signs", description: "Photoluminescent fire hydrant location sign. High-visibility. 300mm x 225mm.", certifications: ["AS 1319"], image: "https://images.unsplash.com/photo-1614064641938-3cb20a81aa31?w=400&h=400&fit=crop" },
  { id: "sign-no-smoking", name: "No Smoking Sign", category: "Fire Safety Signage", subcategory: "No Smoking Signs", description: "Regulatory no smoking sign. Self-adhesive or screw-mount options.", certifications: ["AS 1319"], image: "https://images.unsplash.com/photo-1614064641938-3cb20a81aa31?w=400&h=400&fit=crop" },
  { id: "sign-evac-diagram", name: "Custom Evacuation Diagram", category: "Fire Safety Signage", subcategory: "Exit & Evacuation Signs", description: "Custom-designed evacuation diagram for your specific premises. AS 3745 compliant layout.", certifications: ["AS 3745"], image: "https://images.unsplash.com/photo-1614064641938-3cb20a81aa31?w=400&h=400&fit=crop" },

  // ═══════════════════════════════════════════════════════════════
  // FIRE CABINETS & BRACKETS
  // ═══════════════════════════════════════════════════════════════
  { id: "cab-single", name: "Single Fire Extinguisher Cabinet — White", category: "Fire Cabinets & Brackets", subcategory: "Single Extinguisher Cabinets", description: "Powder-coated steel cabinet for single extinguisher up to 9kg. Lockable with break-glass panel.", certifications: [], image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=400&fit=crop" },
  { id: "cab-double", name: "Double Fire Extinguisher Cabinet — White", category: "Fire Cabinets & Brackets", subcategory: "Double Extinguisher Cabinets", description: "Powder-coated steel cabinet for two extinguishers. Lockable with break-glass panel.", certifications: [], image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=400&fit=crop" },
  { id: "cab-hose", name: "Fire Hose Reel Cabinet — Recessed", category: "Fire Cabinets & Brackets", subcategory: "Hose Reel Cabinets", description: "Recessed fire hose reel cabinet with lockable door and break-glass panel.", certifications: [], image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=400&fit=crop" },
  { id: "cab-blanket", name: "Fire Blanket Cabinet", category: "Fire Cabinets & Brackets", subcategory: "Fire Blanket Cabinets", description: "Wall-mount cabinet for fire blanket storage. Red powder-coated steel with clear window.", certifications: [], image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=400&fit=crop" },
  { id: "bracket-wall", name: "Wall Bracket — Universal", category: "Fire Cabinets & Brackets", subcategory: "Wall Brackets", description: "Universal wall-mount bracket for fire extinguishers from 1kg to 9kg.", certifications: [], image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=400&fit=crop" },
  { id: "bracket-vehicle", name: "Vehicle Bracket — Heavy Duty", category: "Fire Cabinets & Brackets", subcategory: "Vehicle Brackets", description: "Heavy-duty metal vehicle bracket with quick-release strap for extinguishers up to 4.5kg.", certifications: [], image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=400&fit=crop" },
  { id: "stand-chrome", name: "Chrome Extinguisher Stand", category: "Fire Cabinets & Brackets", subcategory: "Chrome Stands", description: "Free-standing chrome extinguisher stand for reception areas, lobbies and hallways.", certifications: [], image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=400&fit=crop" },

  // ═══════════════════════════════════════════════════════════════
  // FIRST AID
  // ═══════════════════════════════════════════════════════════════
  { id: "fa-work-small", name: "Workplace First Aid Kit — Small (1-25 people)", category: "First Aid", subcategory: "Workplace First Aid Kits", description: "Complete workplace first aid kit for 1-25 employees. Wall-mount hard case.", certifications: ["AS 2675"], image: "https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=400&h=400&fit=crop" },
  { id: "fa-work-med", name: "Workplace First Aid Kit — Medium (25-50 people)", category: "First Aid", subcategory: "Workplace First Aid Kits", description: "Medium workplace first aid kit for 25-50 employees. Wall-mount hard case with comprehensive supplies.", certifications: ["AS 2675"], image: "https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=400&h=400&fit=crop" },
  { id: "fa-work-large", name: "Workplace First Aid Kit — Large (50-100 people)", category: "First Aid", subcategory: "Workplace First Aid Kits", description: "Large workplace first aid kit for 50-100 employees. Full-size wall-mount metal cabinet.", certifications: ["AS 2675"], image: "https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=400&h=400&fit=crop" },
  { id: "fa-vehicle", name: "Vehicle First Aid Kit", category: "First Aid", subcategory: "Vehicle First Aid Kits", description: "Compact first aid kit designed for vehicles. Soft pouch with essential supplies.", certifications: ["AS 2675"], image: "https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=400&h=400&fit=crop" },
  { id: "fa-burns", name: "Burns First Aid Kit", category: "First Aid", subcategory: "Burns Kits", description: "Specialised burns treatment kit with hydrogel dressings, burn sheets and eye wash.", certifications: ["AS 2675"], image: "https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=400&h=400&fit=crop" },
  { id: "fa-eyewash", name: "Eye Wash Station — Wall Mount", category: "First Aid", subcategory: "Eye Wash Stations", description: "Wall-mounted eye wash station with sterile saline solution and mirror.", certifications: ["AS 2675"], image: "https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=400&h=400&fit=crop" },
  { id: "fa-cabinet", name: "First Aid Cabinet — Metal Wall Mount", category: "First Aid", subcategory: "First Aid Cabinets", description: "Lockable metal first aid cabinet for wall mounting. Empty — ready to be stocked.", certifications: [], image: "https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=400&h=400&fit=crop" },

  // ═══════════════════════════════════════════════════════════════
  // FIRE WARDEN EQUIPMENT
  // ═══════════════════════════════════════════════════════════════
  { id: "warden-helmet-red", name: "Fire Warden Helmet — Red", category: "Fire Warden Equipment", subcategory: "Warden Helmets", description: "Red fire warden helmet with 'FIRE WARDEN' label. Adjustable headband.", certifications: ["AS/NZS 1801"], image: "https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=400&h=400&fit=crop" },
  { id: "warden-helmet-white", name: "Chief Warden Helmet — White", category: "Fire Warden Equipment", subcategory: "Warden Helmets", description: "White chief warden helmet with 'CHIEF WARDEN' label. Adjustable headband.", certifications: ["AS/NZS 1801"], image: "https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=400&h=400&fit=crop" },
  { id: "warden-vest", name: "Hi-Vis Fire Warden Vest", category: "Fire Warden Equipment", subcategory: "Hi-Vis Warden Vests", description: "Fluorescent yellow hi-vis vest with 'FIRE WARDEN' print. Reflective tape strips.", certifications: ["AS/NZS 4602"], image: "https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=400&h=400&fit=crop" },
  { id: "warden-kit", name: "Complete Fire Warden Kit", category: "Fire Warden Equipment", subcategory: "Warden Kits", description: "Complete kit with helmet, vest, torch, megaphone, clipboard, whistle and armband.", certifications: [], image: "https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=400&h=400&fit=crop", badge: "Popular" },
  { id: "warden-megaphone", name: "Megaphone — 25W", category: "Fire Warden Equipment", subcategory: "Megaphones", description: "25W megaphone with siren function for emergency evacuation communication.", certifications: [], image: "https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=400&h=400&fit=crop" },
  { id: "warden-evac-chair", name: "Evacuation Chair", category: "Fire Warden Equipment", subcategory: "Evacuation Chairs", description: "Stairway evacuation chair for mobility-impaired building occupants. Folds flat for storage.", certifications: [], image: "https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=400&h=400&fit=crop" },
  { id: "warden-torch", name: "LED Emergency Torch — Rechargeable", category: "Fire Warden Equipment", subcategory: "Torches", description: "High-powered rechargeable LED torch for fire warden use during emergencies and evacuations.", certifications: [], image: "https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=400&h=400&fit=crop" },

  // ═══════════════════════════════════════════════════════════════
  // FIRE DOOR HARDWARE
  // ═══════════════════════════════════════════════════════════════
  { id: "door-closer", name: "Door Closer — Overhead Hydraulic", category: "Fire Door Hardware", subcategory: "Door Closers", description: "Adjustable overhead hydraulic door closer for fire-rated doors up to 80kg.", certifications: ["AS 1905.1"], image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop" },
  { id: "door-emag", name: "Electromagnetic Door Holder — 240V", category: "Fire Door Hardware", subcategory: "Electromagnetic Door Holders", description: "240V electromagnetic door holder with fire alarm release. Holds doors open, releases on alarm.", certifications: ["AS 1905.1"], image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop" },
  { id: "door-hold-open", name: "Hold-Open Device — Battery Operated", category: "Fire Door Hardware", subcategory: "Hold-Open Devices", description: "Battery-operated door hold-open device with smoke detector release. No wiring required.", certifications: ["AS 1905.1"], image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop" },
  { id: "door-seal", name: "Intumescent Fire Door Seal — 15mm", category: "Fire Door Hardware", subcategory: "Door Seals", description: "Intumescent fire door seal strips that expand when heated to seal gaps. 15mm x 4mm x 2100mm.", certifications: ["AS 1905.1"], image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop" },

  // ═══════════════════════════════════════════════════════════════
  // SPRINKLER COMPONENTS
  // ═══════════════════════════════════════════════════════════════
  { id: "sprink-pend-68", name: "Sprinkler Head — Pendent 68°C", category: "Sprinkler Components", subcategory: "Sprinkler Heads", description: "Standard pendent sprinkler head. 68°C activation. 15mm BSP thread. K-factor 80.", certifications: ["AS 2118"], image: "https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=400&h=400&fit=crop" },
  { id: "sprink-upright-68", name: "Sprinkler Head — Upright 68°C", category: "Sprinkler Components", subcategory: "Sprinkler Heads", description: "Standard upright sprinkler head. 68°C activation. 15mm BSP thread.", certifications: ["AS 2118"], image: "https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=400&h=400&fit=crop" },
  { id: "sprink-sidewall", name: "Sprinkler Head — Sidewall", category: "Sprinkler Components", subcategory: "Sprinkler Heads", description: "Horizontal sidewall sprinkler head for wall-mounted installations. 68°C activation.", certifications: ["AS 2118"], image: "https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=400&h=400&fit=crop" },
  { id: "sprink-cage", name: "Sprinkler Head Guard Cage", category: "Sprinkler Components", subcategory: "Sprinkler Cages & Guards", description: "Protective wire cage for sprinkler heads in high-risk impact areas. Chrome finish.", certifications: [], image: "https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=400&h=400&fit=crop" },
  { id: "sprink-escutcheon", name: "Sprinkler Escutcheon Plate — Chrome", category: "Sprinkler Components", subcategory: "Escutcheons", description: "Chrome escutcheon plate for a clean ceiling finish around pendent sprinkler heads.", certifications: [], image: "https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=400&h=400&fit=crop" },
  { id: "sprink-wrench", name: "Sprinkler Head Wrench", category: "Sprinkler Components", subcategory: "Sprinkler Accessories", description: "Purpose-built wrench for installing and removing sprinkler heads without damage.", certifications: [], image: "https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=400&h=400&fit=crop" },
];

export function getProductsByCategory(categoryName: string): Product[] {
  return products.filter((p) => p.category === categoryName);
}

export function getProductsBySubcategory(subcategory: string): Product[] {
  return products.filter((p) => p.subcategory === subcategory);
}

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}
