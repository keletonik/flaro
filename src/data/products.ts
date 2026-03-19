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
  icon: string;
  subcategories: string[];
}

const img = {
  extAbe:     "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop",
  extCo2:     "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400&h=400&fit=crop",
  extWet:     "https://images.unsplash.com/photo-1586953208270-767889fa9b0e?w=400&h=400&fit=crop",
  extFoam:    "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop",
  extSpec:    "https://images.unsplash.com/photo-1586953208270-767889fa9b0e?w=400&h=400&fit=crop",
  blanket:    "https://images.unsplash.com/photo-1586953208270-767889fa9b0e?w=400&h=400&fit=crop",
  alarmPhoto: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=400&fit=crop",
  alarmSmart: "https://images.unsplash.com/photo-1558002038-1055907df827?w=400&h=400&fit=crop",
  alarmHeat:  "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=400&fit=crop",
  hoseReel:   "https://images.unsplash.com/photo-1582139329536-e7284fece509?w=400&h=400&fit=crop",
  hydrant:    "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop",
  exitSign:   "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&h=400&fit=crop",
  emerLight:  "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&h=400&fit=crop",
  signage:    "https://images.unsplash.com/photo-1614064641938-3cb20a81aa31?w=400&h=400&fit=crop",
  cabinet:    "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=400&fit=crop",
  firstAid:   "https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=400&h=400&fit=crop",
  warden:     "https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=400&h=400&fit=crop",
  doorHw:     "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop",
  sprinkler:  "https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=400&h=400&fit=crop",
  passive:    "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=400&fit=crop",
  detection:  "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=400&fit=crop",
  testing:    "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop",
};

export const categories: Category[] = [
  { name: "Fire Extinguishers", slug: "fire-extinguishers", description: "ABE, CO2, Wet Chemical, Foam, Water & specialty extinguishers in all sizes.", image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=400&fit=crop", icon: "flame", subcategories: ["ABE Dry Chemical Powder", "CO2 Carbon Dioxide", "Wet Chemical", "Foam", "Water", "Lithium Battery (AVD)", "Clean Agent", "Vehicle & Marine", "Stainless Steel", "Mobile / Wheeled"] },
  { name: "Fire Extinguisher Accessories", slug: "extinguisher-accessories", description: "Cabinets, brackets, stands, covers, signage and servicing equipment.", image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&h=400&fit=crop", icon: "wrench", subcategories: ["Wall Brackets", "Vehicle Brackets", "Cabinets", "Chrome Stands", "UV Covers", "Servicing Equipment"] },
  { name: "Fire Blankets", slug: "fire-blankets", description: "AS/NZS 3504 certified fire blankets for kitchens, workshops and industrial use.", image: "https://images.unsplash.com/photo-1586953208270-767889fa9b0e?w=600&h=400&fit=crop", icon: "shield", subcategories: ["Kitchen Fire Blankets", "Commercial Fire Blankets", "Industrial Fire Blankets", "Welding Blankets"] },
  { name: "Smoke Alarms & Detection", slug: "smoke-alarms", description: "Photoelectric, interconnected, hardwired and smart smoke alarms. Heat and CO detectors.", image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&h=400&fit=crop", icon: "bell", subcategories: ["Photoelectric Smoke Alarms", "Interconnected Wireless", "Smart WiFi Alarms", "240V Hardwired", "Heat Detectors", "Carbon Monoxide Detectors", "Multi-Sensor Detectors", "Smoke Alarm Batteries", "Testing Equipment"] },
  { name: "Fire Hose Reels", slug: "fire-hose-reels", description: "Complete hose reel systems with nozzles, covers, replacement hose and fittings.", image: "https://images.unsplash.com/photo-1582139329536-e7284fece509?w=600&h=400&fit=crop", icon: "disc", subcategories: ["Swing Arm Hose Reels", "Fixed Hose Reels", "Hose Reel Nozzles", "Hose Reel Covers", "Replacement Hose", "Hose Reel Cabinets"] },
  { name: "Fire Hydrant Equipment", slug: "fire-hydrant-equipment", description: "Boosters, landing valves, standpipe kits, hydrant keys, Storz fittings and accessories.", image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&h=400&fit=crop", icon: "droplets", subcategories: ["Hydrant Boosters", "Landing Valves", "Standpipe Kits", "Hydrant Covers", "Hydrant Keys & Spanners", "Storz Fittings", "Flow Testing Equipment"] },
  { name: "Emergency & Exit Lighting", slug: "emergency-lighting", description: "LED exit signs, emergency lights, battens, floodlights. AS 2293 compliant.", image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=600&h=400&fit=crop", icon: "lightbulb", subcategories: ["LED Exit Signs", "Twin-Spot Emergency Lights", "Single-Spot Emergency Lights", "Bulkhead Emergency Lights", "Recessed Emergency Lights", "Weatherproof Emergency Lights", "LED Battens", "LED Floodlights", "Test Switches"] },
  { name: "Fire Safety Signage", slug: "fire-safety-signage", description: "AS 1319 compliant photoluminescent, self-adhesive and rigid safety signs.", image: "https://images.unsplash.com/photo-1614064641938-3cb20a81aa31?w=600&h=400&fit=crop", icon: "signpost", subcategories: ["Extinguisher Location Signs", "Extinguisher ID Signs", "Hose Reel Signs", "Fire Blanket Signs", "Exit & Evacuation Signs", "Fire Door Signs", "Assembly Point Signs", "Fire Hydrant Signs", "Fire Alarm Signs", "No Smoking Signs"] },
  { name: "Fire Detection & Alarm Systems", slug: "fire-detection-alarm", description: "Fire alarm panels, detectors, manual call points, sounders and system accessories.", image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&h=400&fit=crop", icon: "radio", subcategories: ["Fire Alarm Panels", "Addressable Detectors", "Conventional Detectors", "Manual Call Points", "Sounders & Strobes", "Magnetic Door Holders", "Alarm Cables", "System Accessories"] },
  { name: "Sprinkler & Wet Fire", slug: "sprinkler-wet-fire", description: "Sprinkler heads, valves, gauges, cages, escutcheons and pipe fittings.", image: "https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=600&h=400&fit=crop", icon: "droplet", subcategories: ["Sprinkler Heads", "Sprinkler Cages & Guards", "Escutcheons", "Sprinkler Valves", "Pressure Gauges", "Sprinkler Accessories"] },
  { name: "Passive Fire Protection", slug: "passive-fire-protection", description: "Fire collars, batts, sealants, wraps and penetration sealing products.", image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&h=400&fit=crop", icon: "brickwall", subcategories: ["Fire Collars", "Fire Batts", "Fire Sealant", "Fire Pillows", "Fire Wraps", "Fire Mortar"] },
  { name: "First Aid & Safety", slug: "first-aid-safety", description: "Workplace & vehicle first aid kits, burns kits, eye wash stations, warden equipment.", image: "https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=600&h=400&fit=crop", icon: "heart", subcategories: ["Workplace First Aid Kits", "Vehicle First Aid Kits", "Burns Kits", "Eye Wash Stations", "First Aid Cabinets", "Warden Helmets", "Warden Vests", "Warden Kits", "Megaphones", "Evacuation Chairs"] },
  { name: "Fire Door Hardware", slug: "fire-door-hardware", description: "Door closers, electromagnetic holders, panic hardware, seals and signage.", image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=400&fit=crop", icon: "lock", subcategories: ["Door Closers", "Electromagnetic Door Holders", "Hold-Open Devices", "Panic Hardware", "Door Seals", "Fire Door Signs"] },
];

export const products: Product[] = [
  // FIRE EXTINGUISHERS - ABE
  { id: "ext-abe-1kg", name: "1kg ABE Dry Chemical Fire Extinguisher", category: "Fire Extinguishers", subcategory: "ABE Dry Chemical Powder", description: "Compact multi-purpose extinguisher for vehicles, caravans and small spaces. Class A, B & E fires.", certifications: ["AS/NZS 1841.5"], image: img.extAbe, badge: "Popular" },
  { id: "ext-abe-1.5kg", name: "1.5kg ABE Dry Chemical Fire Extinguisher", category: "Fire Extinguishers", subcategory: "ABE Dry Chemical Powder", description: "Lightweight multi-purpose extinguisher ideal for boats, food trucks and compact spaces.", certifications: ["AS/NZS 1841.5"], image: img.extAbe },
  { id: "ext-abe-2.5kg", name: "2.5kg ABE Dry Chemical Fire Extinguisher", category: "Fire Extinguishers", subcategory: "ABE Dry Chemical Powder", description: "Versatile medium-sized extinguisher ideal for offices, retail and light commercial use.", certifications: ["AS/NZS 1841.5"], image: img.extAbe },
  { id: "ext-abe-4.5kg", name: "4.5kg ABE Dry Chemical Fire Extinguisher", category: "Fire Extinguishers", subcategory: "ABE Dry Chemical Powder", description: "Industry standard multi-purpose extinguisher. Most popular for offices and workshops.", certifications: ["AS/NZS 1841.5"], image: img.extAbe, badge: "Best Seller" },
  { id: "ext-abe-9kg", name: "9kg ABE Dry Chemical Fire Extinguisher", category: "Fire Extinguishers", subcategory: "ABE Dry Chemical Powder", description: "Heavy-duty for warehouses, factories, workshops and large commercial spaces.", certifications: ["AS/NZS 1841.5"], image: img.extAbe },
  // CO2
  { id: "ext-co2-2kg", name: "2kg CO2 Fire Extinguisher", category: "Fire Extinguishers", subcategory: "CO2 Carbon Dioxide", description: "Clean agent for electrical equipment, server rooms and sensitive electronics.", certifications: ["AS/NZS 1841.6"], image: img.extCo2 },
  { id: "ext-co2-3.5kg", name: "3.5kg CO2 Fire Extinguisher", category: "Fire Extinguishers", subcategory: "CO2 Carbon Dioxide", description: "Medium CO2 for data centres, switchrooms and laboratory environments.", certifications: ["AS/NZS 1841.6"], image: img.extCo2 },
  { id: "ext-co2-5kg", name: "5kg CO2 Fire Extinguisher", category: "Fire Extinguishers", subcategory: "CO2 Carbon Dioxide", description: "Large CO2 for industrial electrical applications and large server rooms.", certifications: ["AS/NZS 1841.6"], image: img.extCo2 },
  // Wet Chemical
  { id: "ext-wet-2l", name: "2L Wet Chemical Fire Extinguisher", category: "Fire Extinguishers", subcategory: "Wet Chemical", description: "Compact wet chemical for small kitchens and food trucks.", certifications: ["AS/NZS 1841.4"], image: img.extWet },
  { id: "ext-wet-7l", name: "7L Wet Chemical Fire Extinguisher", category: "Fire Extinguishers", subcategory: "Wet Chemical", description: "Full-size wet chemical for commercial kitchen fires (Class F). Essential for restaurants.", certifications: ["AS/NZS 1841.4"], image: img.extWet, badge: "Essential" },
  // Foam
  { id: "ext-foam-4.5l", name: "4.5L AFFF Foam Fire Extinguisher", category: "Fire Extinguishers", subcategory: "Foam", description: "Medium foam extinguisher for Class A and B fires. Workshops and fuel storage areas.", certifications: ["AS/NZS 1841.3"], image: img.extFoam },
  { id: "ext-foam-9l", name: "9L AFFF Foam Fire Extinguisher", category: "Fire Extinguishers", subcategory: "Foam", description: "Full-size foam for petrochemical environments and fuel depots.", certifications: ["AS/NZS 1841.3"], image: img.extFoam },
  // Water
  { id: "ext-water-9l", name: "9L Water Fire Extinguisher", category: "Fire Extinguishers", subcategory: "Water", description: "Water extinguisher for Class A fires: paper, wood, textiles.", certifications: ["AS/NZS 1841.1"], image: img.extFoam },
  // Lithium Battery
  { id: "ext-lith-2l", name: "2L AVD Lithium Battery Fire Extinguisher", category: "Fire Extinguishers", subcategory: "Lithium Battery (AVD)", description: "Compact AVD for lithium-ion battery fires. Offices and small EV areas.", certifications: ["AS/NZS 1841"], image: img.extSpec, badge: "New" },
  { id: "ext-lith-6l", name: "6L AVD Lithium Battery Fire Extinguisher", category: "Fire Extinguishers", subcategory: "Lithium Battery (AVD)", description: "Medium AVD for EV charging stations and battery storage facilities.", certifications: ["AS/NZS 1841"], image: img.extSpec },
  { id: "ext-lith-9l", name: "9L AVD Lithium Battery Fire Extinguisher", category: "Fire Extinguishers", subcategory: "Lithium Battery (AVD)", description: "Large AVD for warehouses, data centres and large EV charging hubs.", certifications: ["AS/NZS 1841"], image: img.extSpec },
  // Clean Agent
  { id: "ext-clean-2kg", name: "2kg Clean Agent (FE-36) Extinguisher", category: "Fire Extinguishers", subcategory: "Clean Agent", description: "Halocarbon clean agent for sensitive equipment. Zero residue.", certifications: ["AS/NZS 1841"], image: img.extCo2 },
  // Vehicle & Marine
  { id: "ext-veh-1kg", name: "1kg Vehicle Fire Extinguisher with Bracket", category: "Fire Extinguishers", subcategory: "Vehicle & Marine", description: "Compact ABE with vehicle mounting bracket. Cars, 4WDs, boats.", certifications: ["AS/NZS 1841.5"], image: img.extAbe },
  { id: "ext-marine-2kg", name: "2kg Marine Fire Extinguisher", category: "Fire Extinguishers", subcategory: "Vehicle & Marine", description: "Corrosion-resistant marine-grade for boats and maritime vessels.", certifications: ["AS/NZS 1841.5"], image: img.extAbe },
  // Stainless Steel
  { id: "ext-ss-2kg", name: "2kg Stainless Steel ABE Extinguisher", category: "Fire Extinguishers", subcategory: "Stainless Steel", description: "Premium polished stainless steel. Hotels, high-end fit-outs.", certifications: ["AS/NZS 1841.5"], image: img.extAbe },
  { id: "ext-ss-4.5kg", name: "4.5kg Stainless Steel ABE Extinguisher", category: "Fire Extinguishers", subcategory: "Stainless Steel", description: "Full-size stainless steel for architecturally designed spaces.", certifications: ["AS/NZS 1841.5"], image: img.extAbe },
  // Mobile / Wheeled
  { id: "ext-mob-50kg", name: "50kg ABE Mobile Wheeled Extinguisher", category: "Fire Extinguishers", subcategory: "Mobile / Wheeled", description: "Heavy-duty wheeled ABE for warehouses, mines and industrial sites.", certifications: ["AS/NZS 1841.5"], image: img.extSpec },
  { id: "ext-mob-50l-foam", name: "50L AFFF Mobile Wheeled Extinguisher", category: "Fire Extinguishers", subcategory: "Mobile / Wheeled", description: "Wheeled foam for fuel depots, petrochemical and mining operations.", certifications: ["AS/NZS 1841.3"], image: img.extSpec },

  // FIRE EXTINGUISHER ACCESSORIES
  { id: "acc-wb-univ", name: "Universal Wall Bracket", category: "Fire Extinguisher Accessories", subcategory: "Wall Brackets", description: "Suits 1kg to 4.5kg ABE. Powder-coated steel with rubber grips.", certifications: [], image: img.cabinet },
  { id: "acc-wb-9kg", name: "9kg Wall Bracket — Heavy Duty", category: "Fire Extinguisher Accessories", subcategory: "Wall Brackets", description: "Heavy-duty wall bracket designed for 9kg ABE extinguishers.", certifications: [], image: img.cabinet },
  { id: "acc-wb-co2", name: "CO2 Wall Bracket", category: "Fire Extinguisher Accessories", subcategory: "Wall Brackets", description: "Bracket for 2kg, 3.5kg and 5kg CO2 extinguishers.", certifications: [], image: img.cabinet },
  { id: "acc-wb-beam", name: "Beam Clamp Bracket", category: "Fire Extinguisher Accessories", subcategory: "Wall Brackets", description: "Clamp-style for mounting on I-beams and structural steel.", certifications: [], image: img.cabinet },
  { id: "acc-vb-strap", name: "Vehicle Bracket with Strap", category: "Fire Extinguisher Accessories", subcategory: "Vehicle Brackets", description: "Heavy-duty vehicle bracket with adjustable web strap. 1kg-4.5kg.", certifications: [], image: img.cabinet },
  { id: "acc-cab-single", name: "Single Extinguisher Cabinet", category: "Fire Extinguisher Accessories", subcategory: "Cabinets", description: "Powder-coated steel for single extinguisher up to 9kg. Break-glass.", certifications: [], image: img.cabinet },
  { id: "acc-cab-double", name: "Double Extinguisher Cabinet", category: "Fire Extinguisher Accessories", subcategory: "Cabinets", description: "Powder-coated steel for two extinguishers. Break-glass panel.", certifications: [], image: img.cabinet },
  { id: "acc-cab-plastic", name: "Plastic Extinguisher Cabinet — Red", category: "Fire Extinguisher Accessories", subcategory: "Cabinets", description: "UV-resistant red plastic cabinet. Indoor/outdoor use.", certifications: [], image: img.cabinet },
  { id: "acc-stand-chrome", name: "Chrome Extinguisher Stand", category: "Fire Extinguisher Accessories", subcategory: "Chrome Stands", description: "Free-standing chrome stand for lobbies and reception areas.", certifications: [], image: img.cabinet },
  { id: "acc-cover-uv", name: "UV Extinguisher Cover", category: "Fire Extinguisher Accessories", subcategory: "UV Covers", description: "UV-stabilised cover for outdoor extinguisher protection. Fits up to 9kg.", certifications: [], image: img.cabinet },
  { id: "acc-service-tag", name: "Servicing Tags (100 pack)", category: "Fire Extinguisher Accessories", subcategory: "Servicing Equipment", description: "AS 1851 compliant servicing tags with ties. Pack of 100.", certifications: ["AS 1851"], image: img.cabinet },
  { id: "acc-service-punch", name: "Tag Hole Punch", category: "Fire Extinguisher Accessories", subcategory: "Servicing Equipment", description: "Professional tag hole punch for AS 1851 servicing records.", certifications: [], image: img.cabinet },

  // FIRE BLANKETS
  { id: "blk-1x1", name: "1.0m x 1.0m Fire Blanket", category: "Fire Blankets", subcategory: "Kitchen Fire Blankets", description: "Compact fire blanket for domestic kitchens. Quick-release wall-mount.", certifications: ["AS/NZS 3504"], image: img.blanket },
  { id: "blk-1.2x1.2", name: "1.2m x 1.2m Fire Blanket", category: "Fire Blankets", subcategory: "Kitchen Fire Blankets", description: "Standard size for kitchens, laboratories and small commercial spaces.", certifications: ["AS/NZS 3504"], image: img.blanket, badge: "Popular" },
  { id: "blk-1.2x1.8", name: "1.2m x 1.8m Fire Blanket", category: "Fire Blankets", subcategory: "Commercial Fire Blankets", description: "Commercial-grade for restaurants, kitchens and workshops.", certifications: ["AS/NZS 3504"], image: img.blanket, badge: "Best Seller" },
  { id: "blk-1.8x1.8", name: "1.8m x 1.8m Fire Blanket", category: "Fire Blankets", subcategory: "Industrial Fire Blankets", description: "Large industrial fire blanket for factories and heavy environments.", certifications: ["AS/NZS 3504"], image: img.blanket },
  { id: "blk-1.8x2.4", name: "1.8m x 2.4m Fire Blanket", category: "Fire Blankets", subcategory: "Industrial Fire Blankets", description: "Extra-large industrial blanket for machinery and large equipment.", certifications: ["AS/NZS 3504"], image: img.blanket },
  { id: "blk-weld-1.8", name: "1.8m x 1.8m Welding Blanket", category: "Fire Blankets", subcategory: "Welding Blankets", description: "Heavy-duty fibreglass welding blanket for spark and splatter protection.", certifications: ["AS/NZS 3504"], image: img.blanket },

  // SMOKE ALARMS & DETECTION
  { id: "alarm-photo-10yr", name: "Photoelectric Smoke Alarm — 10 Year Battery", category: "Smoke Alarms & Detection", subcategory: "Photoelectric Smoke Alarms", description: "Sealed lithium battery, no maintenance for 10 years. No wiring.", certifications: ["AS 3786-2014"], image: img.alarmPhoto, badge: "Best Seller" },
  { id: "alarm-photo-9v", name: "Photoelectric Smoke Alarm — 9V Battery", category: "Smoke Alarms & Detection", subcategory: "Photoelectric Smoke Alarms", description: "Budget-friendly with replaceable 9V battery. Easy DIY install.", certifications: ["AS 3786-2014"], image: img.alarmPhoto },
  { id: "alarm-photo-slim", name: "Photoelectric Smoke Alarm — Slim Profile", category: "Smoke Alarms & Detection", subcategory: "Photoelectric Smoke Alarms", description: "Ultra-slim design with 10-year sealed battery. Minimalist mount.", certifications: ["AS 3786-2014"], image: img.alarmPhoto },
  { id: "alarm-photo-240v", name: "Photoelectric Smoke Alarm — 240V Hardwired", category: "Smoke Alarms & Detection", subcategory: "240V Hardwired", description: "Mains-powered with 9V battery backup. Requires licensed electrician.", certifications: ["AS 3786-2014"], image: img.alarmPhoto },
  { id: "alarm-photo-240v-int", name: "240V Hardwired Interconnected Smoke Alarm", category: "Smoke Alarms & Detection", subcategory: "240V Hardwired", description: "Mains-powered interconnectable alarm. When one triggers, all sound.", certifications: ["AS 3786-2014"], image: img.alarmPhoto },
  { id: "alarm-wireless", name: "Wireless Interconnected Smoke Alarm", category: "Smoke Alarms & Detection", subcategory: "Interconnected Wireless", description: "RF interconnect up to 40 alarms. 10-year sealed battery.", certifications: ["AS 3786-2014"], image: img.alarmSmart, badge: "Popular" },
  { id: "alarm-wifi", name: "Smart WiFi Smoke Alarm", category: "Smoke Alarms & Detection", subcategory: "Smart WiFi Alarms", description: "App notifications, remote monitoring, smart home integration.", certifications: ["AS 3786-2014"], image: img.alarmSmart, badge: "New" },
  { id: "alarm-heat-ror", name: "Heat Detector — Rate of Rise", category: "Smoke Alarms & Detection", subcategory: "Heat Detectors", description: "For kitchens, garages and bathrooms where smoke alarms false trigger.", certifications: ["AS 1603.2"], image: img.alarmHeat },
  { id: "alarm-heat-fixed", name: "Heat Detector — Fixed Temperature 57C", category: "Smoke Alarms & Detection", subcategory: "Heat Detectors", description: "Fixed temperature heat detector. Activates at 57 degrees C.", certifications: ["AS 1603.2"], image: img.alarmHeat },
  { id: "alarm-co", name: "Carbon Monoxide Detector", category: "Smoke Alarms & Detection", subcategory: "Carbon Monoxide Detectors", description: "Electrochemical CO sensor with digital display. 10-year battery.", certifications: ["AS 1603"], image: img.alarmSmart },
  { id: "alarm-multi", name: "Multi-Sensor Smoke & Heat Detector", category: "Smoke Alarms & Detection", subcategory: "Multi-Sensor Detectors", description: "Combined photoelectric smoke and thermistor heat detection.", certifications: ["AS 3786-2014"], image: img.alarmSmart },
  { id: "alarm-batt-9v", name: "9V Smoke Alarm Battery (10 pack)", category: "Smoke Alarms & Detection", subcategory: "Smoke Alarm Batteries", description: "Alkaline 9V batteries for smoke alarms. Pack of 10.", certifications: [], image: img.alarmPhoto },
  { id: "alarm-test-spray", name: "Smoke Alarm Test Spray (250ml)", category: "Smoke Alarms & Detection", subcategory: "Testing Equipment", description: "Aerosol smoke simulation spray for alarm testing. AS 1851.", certifications: ["AS 1851"], image: img.testing },
  { id: "alarm-test-solo", name: "Solo Smoke Detector Test Kit", category: "Smoke Alarms & Detection", subcategory: "Testing Equipment", description: "Telescopic pole test kit for ceiling-mounted alarm testing.", certifications: ["AS 1851"], image: img.testing },

  // FIRE HOSE REELS
  { id: "hose-swing-36m", name: "36m Swing Arm Fire Hose Reel — Complete", category: "Fire Hose Reels", subcategory: "Swing Arm Hose Reels", description: "Complete swing arm hose reel with 36m hose, nozzle and wall bracket.", certifications: ["AS 1221"], image: img.hoseReel, badge: "Best Seller" },
  { id: "hose-fixed-36m", name: "36m Fixed Fire Hose Reel — Complete", category: "Fire Hose Reels", subcategory: "Fixed Hose Reels", description: "Fixed-mount hose reel with 36m hose. For straight-pull installations.", certifications: ["AS 1221"], image: img.hoseReel },
  { id: "hose-nozzle-brass", name: "Fire Hose Reel Nozzle — Brass", category: "Fire Hose Reels", subcategory: "Hose Reel Nozzles", description: "Replacement brass shut-off nozzle. Jet and spray pattern.", certifications: ["AS 1221"], image: img.hoseReel },
  { id: "hose-cover-uv", name: "Fire Hose Reel Cover — UV Resistant", category: "Fire Hose Reels", subcategory: "Hose Reel Covers", description: "UV-stabilised PVC cover for outdoor hose reel protection.", certifications: [], image: img.hoseReel },
  { id: "hose-replacement-36m", name: "36m Replacement Fire Hose", category: "Fire Hose Reels", subcategory: "Replacement Hose", description: "19mm lay-flat replacement hose. UV-stabilised.", certifications: ["AS 1221"], image: img.hoseReel },
  { id: "hose-cab-recessed", name: "Hose Reel Cabinet — Recessed", category: "Fire Hose Reels", subcategory: "Hose Reel Cabinets", description: "Recessed cabinet with lockable door and break-glass panel.", certifications: [], image: img.cabinet },

  // FIRE HYDRANT EQUIPMENT
  { id: "hydrant-booster-dual", name: "Fire Hydrant Booster Assembly — Dual Inlet", category: "Fire Hydrant Equipment", subcategory: "Hydrant Boosters", description: "Complete dual-inlet booster assembly with non-return valves.", certifications: ["AS 2419.1"], image: img.hydrant },
  { id: "hydrant-landing-65", name: "65mm Landing Valve — Brass", category: "Fire Hydrant Equipment", subcategory: "Landing Valves", description: "65mm brass landing valve with Storz coupling.", certifications: ["AS 2419.1"], image: img.hydrant },
  { id: "hydrant-landing-80", name: "80mm Landing Valve — Brass", category: "Fire Hydrant Equipment", subcategory: "Landing Valves", description: "80mm brass landing valve for high-rise hydrant risers.", certifications: ["AS 2419.1"], image: img.hydrant },
  { id: "hydrant-standpipe", name: "Standpipe Kit — Complete", category: "Fire Hydrant Equipment", subcategory: "Standpipe Kits", description: "Complete standpipe kit with key, coupling and landing valve.", certifications: ["AS 2419.1"], image: img.hydrant },
  { id: "hydrant-cover-round", name: "Fire Hydrant Cover Plate — Round", category: "Fire Hydrant Equipment", subcategory: "Hydrant Covers", description: "Cast aluminium cover plate. Road-rated for in-ground hydrants.", certifications: [], image: img.hydrant },
  { id: "hydrant-key", name: "Fire Hydrant Key / Spanner", category: "Fire Hydrant Equipment", subcategory: "Hydrant Keys & Spanners", description: "Universal key/spanner for operating hydrant valves.", certifications: [], image: img.hydrant },
  { id: "hydrant-storz-65", name: "65mm Storz Coupling — Brass", category: "Fire Hydrant Equipment", subcategory: "Storz Fittings", description: "65mm brass Storz symmetrical coupling for hydrant connections.", certifications: ["AS 2419.1"], image: img.hydrant },
  { id: "hydrant-storz-100", name: "100mm Storz Coupling — Brass", category: "Fire Hydrant Equipment", subcategory: "Storz Fittings", description: "100mm brass Storz coupling for large-diameter connections.", certifications: ["AS 2419.1"], image: img.hydrant },
  { id: "hydrant-flow-gauge", name: "Hydrant Flow Test Gauge", category: "Fire Hydrant Equipment", subcategory: "Flow Testing Equipment", description: "Pitot gauge kit for hydrant flow testing. AS 2419 compliant.", certifications: ["AS 2419.1"], image: img.testing },

  // EMERGENCY & EXIT LIGHTING
  { id: "light-exit-m", name: "LED Exit Sign — Maintained", category: "Emergency & Exit Lighting", subcategory: "LED Exit Signs", description: "Maintained LED exit sign with 3-hour battery backup.", certifications: ["AS 2293.1"], image: img.exitSign, badge: "Best Seller" },
  { id: "light-exit-nm", name: "LED Exit Sign — Non-Maintained", category: "Emergency & Exit Lighting", subcategory: "LED Exit Signs", description: "Non-maintained. Illuminates only during power failure.", certifications: ["AS 2293.1"], image: img.exitSign },
  { id: "light-exit-blade", name: "LED Exit Sign — Blade Mount", category: "Emergency & Exit Lighting", subcategory: "LED Exit Signs", description: "Wall-mounted blade-style for corridors and hallways.", certifications: ["AS 2293.1"], image: img.exitSign },
  { id: "light-twin", name: "Twin-Spot LED Emergency Light", category: "Emergency & Exit Lighting", subcategory: "Twin-Spot Emergency Lights", description: "Dual adjustable LED heads. 3-hour duration. Auto self-test.", certifications: ["AS 2293.1"], image: img.emerLight, badge: "Popular" },
  { id: "light-single", name: "Single-Spot LED Emergency Light", category: "Emergency & Exit Lighting", subcategory: "Single-Spot Emergency Lights", description: "Compact single LED head. 3-hour with self-test.", certifications: ["AS 2293.1"], image: img.emerLight },
  { id: "light-bulkhead", name: "Bulkhead LED Emergency Light", category: "Emergency & Exit Lighting", subcategory: "Bulkhead Emergency Lights", description: "Enclosed for stairwells and plant rooms. IP65.", certifications: ["AS 2293.1"], image: img.emerLight },
  { id: "light-recessed", name: "Recessed LED Emergency Light", category: "Emergency & Exit Lighting", subcategory: "Recessed Emergency Lights", description: "Flush-mounted for clean ceiling installations.", certifications: ["AS 2293.1"], image: img.emerLight },
  { id: "light-weather", name: "Weatherproof LED Emergency Light — IP65", category: "Emergency & Exit Lighting", subcategory: "Weatherproof Emergency Lights", description: "IP65-rated for car parks, loading docks and outdoor areas.", certifications: ["AS 2293.1"], image: img.emerLight },
  { id: "light-batten-4ft", name: "LED Emergency Batten — 4ft", category: "Emergency & Exit Lighting", subcategory: "LED Battens", description: "1200mm LED batten with emergency battery. Plant rooms.", certifications: ["AS 2293.1"], image: img.emerLight },
  { id: "light-flood", name: "LED Emergency Floodlight", category: "Emergency & Exit Lighting", subcategory: "LED Floodlights", description: "High-output LED floodlight with emergency battery. Car parks.", certifications: ["AS 2293.1"], image: img.emerLight },
  { id: "light-test-switch", name: "Emergency Light Test Switch", category: "Emergency & Exit Lighting", subcategory: "Test Switches", description: "Key-operated test switch for emergency lighting circuits.", certifications: [], image: img.emerLight },

  // FIRE SAFETY SIGNAGE
  { id: "sign-ext-loc", name: "Fire Extinguisher Location Sign", category: "Fire Safety Signage", subcategory: "Extinguisher Location Signs", description: "Photoluminescent. Self-adhesive. 300mm x 225mm.", certifications: ["AS 1319"], image: img.signage },
  { id: "sign-ext-id-abe", name: "Extinguisher ID Sign — ABE", category: "Fire Safety Signage", subcategory: "Extinguisher ID Signs", description: "Colour-coded ABE identification sign with instructions.", certifications: ["AS 1319"], image: img.signage },
  { id: "sign-ext-id-co2", name: "Extinguisher ID Sign — CO2", category: "Fire Safety Signage", subcategory: "Extinguisher ID Signs", description: "Colour-coded CO2 identification sign with instructions.", certifications: ["AS 1319"], image: img.signage },
  { id: "sign-ext-id-wet", name: "Extinguisher ID Sign — Wet Chemical", category: "Fire Safety Signage", subcategory: "Extinguisher ID Signs", description: "Colour-coded wet chemical sign with instructions.", certifications: ["AS 1319"], image: img.signage },
  { id: "sign-ext-id-foam", name: "Extinguisher ID Sign — Foam", category: "Fire Safety Signage", subcategory: "Extinguisher ID Signs", description: "Colour-coded foam identification sign with instructions.", certifications: ["AS 1319"], image: img.signage },
  { id: "sign-hose", name: "Fire Hose Reel Location Sign", category: "Fire Safety Signage", subcategory: "Hose Reel Signs", description: "Photoluminescent hose reel location sign. 300mm x 225mm.", certifications: ["AS 1319"], image: img.signage },
  { id: "sign-blanket", name: "Fire Blanket Location Sign", category: "Fire Safety Signage", subcategory: "Fire Blanket Signs", description: "Photoluminescent fire blanket location sign.", certifications: ["AS 1319"], image: img.signage },
  { id: "sign-exit-left", name: "Exit Sign — Left Arrow", category: "Fire Safety Signage", subcategory: "Exit & Evacuation Signs", description: "Photoluminescent exit sign with left arrow.", certifications: ["AS 1319"], image: img.signage },
  { id: "sign-exit-right", name: "Exit Sign — Right Arrow", category: "Fire Safety Signage", subcategory: "Exit & Evacuation Signs", description: "Photoluminescent exit sign with right arrow.", certifications: ["AS 1319"], image: img.signage },
  { id: "sign-evac-diagram", name: "Custom Evacuation Diagram", category: "Fire Safety Signage", subcategory: "Exit & Evacuation Signs", description: "Custom-designed evacuation diagram. AS 3745 compliant.", certifications: ["AS 3745"], image: img.signage },
  { id: "sign-assembly", name: "Assembly Point Sign", category: "Fire Safety Signage", subcategory: "Assembly Point Signs", description: "Large format assembly point sign. 600mm x 450mm.", certifications: ["AS 1319"], image: img.signage },
  { id: "sign-fire-door", name: "Fire Door Keep Closed Sign", category: "Fire Safety Signage", subcategory: "Fire Door Signs", description: "Fire door signage: Keep Closed / Do Not Obstruct.", certifications: ["AS 1319"], image: img.signage },
  { id: "sign-hydrant", name: "Fire Hydrant Location Sign", category: "Fire Safety Signage", subcategory: "Fire Hydrant Signs", description: "Photoluminescent hydrant location sign.", certifications: ["AS 1319"], image: img.signage },
  { id: "sign-alarm-mcp", name: "Fire Alarm / Break Glass Sign", category: "Fire Safety Signage", subcategory: "Fire Alarm Signs", description: "Fire alarm break glass location sign.", certifications: ["AS 1319"], image: img.signage },
  { id: "sign-no-smoking", name: "No Smoking Sign", category: "Fire Safety Signage", subcategory: "No Smoking Signs", description: "Regulatory no smoking sign. Self-adhesive or screw-mount.", certifications: ["AS 1319"], image: img.signage },

  // FIRE DETECTION & ALARM SYSTEMS
  { id: "det-panel-conv-4", name: "Conventional Fire Alarm Panel — 4 Zone", category: "Fire Detection & Alarm Systems", subcategory: "Fire Alarm Panels", description: "4-zone conventional fire alarm control panel.", certifications: ["AS 1670.1"], image: img.detection },
  { id: "det-panel-conv-8", name: "Conventional Fire Alarm Panel — 8 Zone", category: "Fire Detection & Alarm Systems", subcategory: "Fire Alarm Panels", description: "8-zone conventional panel for medium to large buildings.", certifications: ["AS 1670.1"], image: img.detection },
  { id: "det-panel-addr", name: "Addressable Fire Alarm Panel", category: "Fire Detection & Alarm Systems", subcategory: "Fire Alarm Panels", description: "Single-loop addressable panel. Up to 127 devices per loop.", certifications: ["AS 1670.1"], image: img.detection },
  { id: "det-addr-smoke", name: "Addressable Photoelectric Smoke Detector", category: "Fire Detection & Alarm Systems", subcategory: "Addressable Detectors", description: "Addressable photoelectric detector with base.", certifications: ["AS 1670.1"], image: img.detection },
  { id: "det-addr-heat", name: "Addressable Heat Detector", category: "Fire Detection & Alarm Systems", subcategory: "Addressable Detectors", description: "Addressable rate-of-rise heat detector.", certifications: ["AS 1670.1"], image: img.detection },
  { id: "det-conv-smoke", name: "Conventional Photoelectric Smoke Detector", category: "Fire Detection & Alarm Systems", subcategory: "Conventional Detectors", description: "Conventional photoelectric detector. 2-wire connection.", certifications: ["AS 1670.1"], image: img.detection },
  { id: "det-conv-heat", name: "Conventional Heat Detector", category: "Fire Detection & Alarm Systems", subcategory: "Conventional Detectors", description: "Conventional rate-of-rise heat detector. 2-wire.", certifications: ["AS 1670.1"], image: img.detection },
  { id: "det-mcp-red", name: "Manual Call Point — Red", category: "Fire Detection & Alarm Systems", subcategory: "Manual Call Points", description: "Break glass manual call point. Resettable. Red.", certifications: ["AS 1670.1"], image: img.detection },
  { id: "det-sounder", name: "Fire Alarm Sounder — Red", category: "Fire Detection & Alarm Systems", subcategory: "Sounders & Strobes", description: "Wall-mount fire alarm sounder. 100dB output.", certifications: ["AS 1670.1"], image: img.detection },
  { id: "det-sounder-strobe", name: "Fire Alarm Sounder/Strobe Combo", category: "Fire Detection & Alarm Systems", subcategory: "Sounders & Strobes", description: "Combined sounder and visual strobe indicator.", certifications: ["AS 1670.1"], image: img.detection },
  { id: "det-mag-door", name: "Magnetic Door Holder — 240V", category: "Fire Detection & Alarm Systems", subcategory: "Magnetic Door Holders", description: "Electromagnetic holder. Releases on fire alarm activation.", certifications: ["AS 1905.1"], image: img.doorHw },
  { id: "det-cable-tps", name: "Fire Alarm Cable TPS 2C 1.0mm (100m)", category: "Fire Detection & Alarm Systems", subcategory: "Alarm Cables", description: "2-core 1.0mm TPS fire alarm cable. 100m. Red sheath.", certifications: [], image: img.detection },
  { id: "det-cable-2hr", name: "2-Hour Fire Rated Cable 2C 1.5mm (100m)", category: "Fire Detection & Alarm Systems", subcategory: "Alarm Cables", description: "2-hour fire rated alarm cable. 2-core 1.5mm. 100m.", certifications: ["AS 3013"], image: img.detection },

  // SPRINKLER & WET FIRE
  { id: "sprink-pend-68", name: "Sprinkler Head — Pendent 68C", category: "Sprinkler & Wet Fire", subcategory: "Sprinkler Heads", description: "Standard pendent sprinkler. 68C activation. 15mm BSP. K80.", certifications: ["AS 2118"], image: img.sprinkler },
  { id: "sprink-upright-68", name: "Sprinkler Head — Upright 68C", category: "Sprinkler & Wet Fire", subcategory: "Sprinkler Heads", description: "Standard upright sprinkler. 68C activation. 15mm BSP.", certifications: ["AS 2118"], image: img.sprinkler },
  { id: "sprink-sidewall", name: "Sprinkler Head — Sidewall", category: "Sprinkler & Wet Fire", subcategory: "Sprinkler Heads", description: "Horizontal sidewall sprinkler for wall-mounted installations.", certifications: ["AS 2118"], image: img.sprinkler },
  { id: "sprink-concealed", name: "Sprinkler Head — Concealed", category: "Sprinkler & Wet Fire", subcategory: "Sprinkler Heads", description: "Concealed pendent sprinkler with cover plate. Flush ceiling.", certifications: ["AS 2118"], image: img.sprinkler },
  { id: "sprink-cage", name: "Sprinkler Head Guard Cage", category: "Sprinkler & Wet Fire", subcategory: "Sprinkler Cages & Guards", description: "Protective wire cage for high-risk impact areas.", certifications: [], image: img.sprinkler },
  { id: "sprink-esc-chrome", name: "Escutcheon Plate — Chrome", category: "Sprinkler & Wet Fire", subcategory: "Escutcheons", description: "Chrome escutcheon for clean ceiling finish.", certifications: [], image: img.sprinkler },
  { id: "sprink-valve-alarm", name: "Alarm Check Valve — 100mm", category: "Sprinkler & Wet Fire", subcategory: "Sprinkler Valves", description: "100mm alarm check valve for wet sprinkler systems.", certifications: ["AS 2118"], image: img.sprinkler },
  { id: "sprink-gauge", name: "Pressure Gauge 100mm (0-1600kPa)", category: "Sprinkler & Wet Fire", subcategory: "Pressure Gauges", description: "100mm pressure gauge for sprinkler system monitoring.", certifications: [], image: img.sprinkler },
  { id: "sprink-wrench", name: "Sprinkler Head Wrench", category: "Sprinkler & Wet Fire", subcategory: "Sprinkler Accessories", description: "Purpose-built wrench for installing and removing heads.", certifications: [], image: img.sprinkler },

  // PASSIVE FIRE PROTECTION
  { id: "pas-collar-50", name: "Fire Collar — 50mm", category: "Passive Fire Protection", subcategory: "Fire Collars", description: "Intumescent fire collar for 50mm PVC pipe penetrations.", certifications: ["AS 4072.1"], image: img.passive },
  { id: "pas-collar-100", name: "Fire Collar — 100mm", category: "Passive Fire Protection", subcategory: "Fire Collars", description: "Intumescent fire collar for 100mm PVC pipe penetrations.", certifications: ["AS 4072.1"], image: img.passive },
  { id: "pas-collar-150", name: "Fire Collar — 150mm", category: "Passive Fire Protection", subcategory: "Fire Collars", description: "Intumescent fire collar for 150mm PVC pipe penetrations.", certifications: ["AS 4072.1"], image: img.passive },
  { id: "pas-collar-retro-100", name: "Retro-Fit Fire Collar — 100mm", category: "Passive Fire Protection", subcategory: "Fire Collars", description: "Split-style retro-fit collar for existing penetrations.", certifications: ["AS 4072.1"], image: img.passive },
  { id: "pas-batt-50", name: "Fire Batt 50mm (600x1200)", category: "Passive Fire Protection", subcategory: "Fire Batts", description: "50mm fire rated mineral wool batt for penetration sealing.", certifications: ["AS 4072.1"], image: img.passive },
  { id: "pas-sealant-fire", name: "Fire Retardant Sealant — 600ml", category: "Passive Fire Protection", subcategory: "Fire Sealant", description: "Intumescent fire sealant for gaps and joints. 600ml.", certifications: ["AS 4072.1"], image: img.passive },
  { id: "pas-sealant-acrylic", name: "Fire Rated Acrylic Sealant — 300ml", category: "Passive Fire Protection", subcategory: "Fire Sealant", description: "Paintable acrylic fire sealant. 300ml cartridge.", certifications: ["AS 4072.1"], image: img.passive },
  { id: "pas-pillow-std", name: "Fire Pillow — Standard", category: "Passive Fire Protection", subcategory: "Fire Pillows", description: "Intumescent fire pillow for cable tray penetrations.", certifications: ["AS 4072.1"], image: img.passive },
  { id: "pas-wrap", name: "Fire Wrap — Intumescent", category: "Passive Fire Protection", subcategory: "Fire Wraps", description: "Intumescent wrap for ductwork and steel penetrations.", certifications: ["AS 4072.1"], image: img.passive },
  { id: "pas-mortar-20kg", name: "Fire Mortar — 20kg Bag", category: "Passive Fire Protection", subcategory: "Fire Mortar", description: "Dry-mix fire rated mortar for large penetrations. 20kg.", certifications: ["AS 4072.1"], image: img.passive },

  // FIRST AID & SAFETY
  { id: "fa-work-small", name: "Workplace First Aid Kit — Small (1-25)", category: "First Aid & Safety", subcategory: "Workplace First Aid Kits", description: "Complete kit for 1-25 employees. Wall-mount hard case.", certifications: ["AS 2675"], image: img.firstAid },
  { id: "fa-work-med", name: "Workplace First Aid Kit — Medium (25-50)", category: "First Aid & Safety", subcategory: "Workplace First Aid Kits", description: "Medium kit for 25-50 employees. Comprehensive supplies.", certifications: ["AS 2675"], image: img.firstAid },
  { id: "fa-work-large", name: "Workplace First Aid Kit — Large (50-100)", category: "First Aid & Safety", subcategory: "Workplace First Aid Kits", description: "Large kit for 50-100 employees. Full-size metal cabinet.", certifications: ["AS 2675"], image: img.firstAid },
  { id: "fa-vehicle", name: "Vehicle First Aid Kit", category: "First Aid & Safety", subcategory: "Vehicle First Aid Kits", description: "Compact kit for vehicles. Soft pouch with essentials.", certifications: ["AS 2675"], image: img.firstAid },
  { id: "fa-burns", name: "Burns First Aid Kit", category: "First Aid & Safety", subcategory: "Burns Kits", description: "Specialised burns kit with hydrogel dressings.", certifications: ["AS 2675"], image: img.firstAid },
  { id: "fa-eyewash", name: "Eye Wash Station — Wall Mount", category: "First Aid & Safety", subcategory: "Eye Wash Stations", description: "Wall-mounted eye wash station with sterile saline.", certifications: ["AS 2675"], image: img.firstAid },
  { id: "fa-cabinet", name: "First Aid Cabinet — Metal Wall Mount", category: "First Aid & Safety", subcategory: "First Aid Cabinets", description: "Lockable metal cabinet for wall mounting. Empty.", certifications: [], image: img.firstAid },
  { id: "warden-helmet-red", name: "Fire Warden Helmet — Red", category: "First Aid & Safety", subcategory: "Warden Helmets", description: "Red helmet with FIRE WARDEN label.", certifications: ["AS/NZS 1801"], image: img.warden },
  { id: "warden-helmet-white", name: "Chief Warden Helmet — White", category: "First Aid & Safety", subcategory: "Warden Helmets", description: "White helmet with CHIEF WARDEN label.", certifications: ["AS/NZS 1801"], image: img.warden },
  { id: "warden-vest", name: "Hi-Vis Fire Warden Vest", category: "First Aid & Safety", subcategory: "Warden Vests", description: "Fluorescent yellow vest with FIRE WARDEN print.", certifications: ["AS/NZS 4602"], image: img.warden },
  { id: "warden-kit", name: "Complete Fire Warden Kit", category: "First Aid & Safety", subcategory: "Warden Kits", description: "Complete kit: helmet, vest, torch, megaphone, clipboard.", certifications: [], image: img.warden, badge: "Popular" },
  { id: "warden-megaphone", name: "Megaphone — 25W", category: "First Aid & Safety", subcategory: "Megaphones", description: "25W megaphone with siren function.", certifications: [], image: img.warden },
  { id: "warden-evac-chair", name: "Evacuation Chair", category: "First Aid & Safety", subcategory: "Evacuation Chairs", description: "Stairway evacuation chair for mobility-impaired occupants.", certifications: [], image: img.warden },

  // FIRE DOOR HARDWARE
  { id: "door-closer-over", name: "Overhead Door Closer — Adjustable", category: "Fire Door Hardware", subcategory: "Door Closers", description: "Adjustable overhead hydraulic closer for doors up to 80kg.", certifications: ["AS 1905.1"], image: img.doorHw },
  { id: "door-closer-conc", name: "Concealed Door Closer", category: "Fire Door Hardware", subcategory: "Door Closers", description: "Concealed overhead closer for clean door aesthetics.", certifications: ["AS 1905.1"], image: img.doorHw },
  { id: "door-emag-240", name: "Electromagnetic Door Holder — 240V", category: "Fire Door Hardware", subcategory: "Electromagnetic Door Holders", description: "240V electromagnetic holder. Releases on fire alarm.", certifications: ["AS 1905.1"], image: img.doorHw },
  { id: "door-emag-floor", name: "Floor-Mounted Electromagnetic Door Holder", category: "Fire Door Hardware", subcategory: "Electromagnetic Door Holders", description: "Floor-mounted electromagnetic holder for heavy fire doors.", certifications: ["AS 1905.1"], image: img.doorHw },
  { id: "door-hold-batt", name: "Hold-Open Device — Battery Operated", category: "Fire Door Hardware", subcategory: "Hold-Open Devices", description: "Battery-operated hold-open with integrated smoke detector.", certifications: ["AS 1905.1"], image: img.doorHw },
  { id: "door-panic-bar", name: "Panic Exit Bar — Single Door", category: "Fire Door Hardware", subcategory: "Panic Hardware", description: "Push-bar panic exit device for single fire doors.", certifications: ["AS 1905.1"], image: img.doorHw },
  { id: "door-seal-15", name: "Intumescent Door Seal — 15mm x 4mm", category: "Fire Door Hardware", subcategory: "Door Seals", description: "Intumescent seal strips that expand when heated. 2100mm.", certifications: ["AS 1905.1"], image: img.doorHw },
  { id: "door-sign-close", name: "Fire Door Keep Closed Sign", category: "Fire Door Hardware", subcategory: "Fire Door Signs", description: "Self-adhesive fire door sign.", certifications: ["AS 1319"], image: img.signage },
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

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}

export function searchProducts(query: string): Product[] {
  const q = query.toLowerCase();
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.subcategory.toLowerCase().includes(q)
  );
}
