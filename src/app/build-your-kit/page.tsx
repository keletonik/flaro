"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type PropertyType =
  | "residential"
  | "strata"
  | "commercial"
  | "retail"
  | "industrial"
  | "mixed";

type PropertySize = "small" | "medium" | "large" | "very-large";

type SpecificRisk =
  | "kitchen"
  | "server-room"
  | "flammable-liquids"
  | "vehicle-parking"
  | "workshop"
  | "lithium-battery";

type CurrentEquipment = "fresh" | "partial" | "replacement";

interface KitItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

/* ------------------------------------------------------------------ */
/*  Step option data                                                    */
/* ------------------------------------------------------------------ */

const propertyOptions: {
  value: PropertyType;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "residential",
    label: "Residential Home",
    description: "Houses, townhouses, and individual dwellings",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
        />
      </svg>
    ),
  },
  {
    value: "strata",
    label: "Strata / Apartment Building",
    description: "Class 2 residential buildings with common areas",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
        />
      </svg>
    ),
  },
  {
    value: "commercial",
    label: "Commercial Office",
    description: "Office spaces, co-working, and professional suites",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z"
        />
      </svg>
    ),
  },
  {
    value: "retail",
    label: "Retail / Hospitality",
    description: "Shops, restaurants, cafes, and food service venues",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.15c0 .415.336.75.75.75z"
        />
      </svg>
    ),
  },
  {
    value: "industrial",
    label: "Industrial / Warehouse",
    description: "Factories, workshops, storage, and distribution centres",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h1.5c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819"
        />
      </svg>
    ),
  },
  {
    value: "mixed",
    label: "Mixed Use",
    description:
      "Buildings combining residential, commercial, or industrial uses",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z"
        />
      </svg>
    ),
  },
];

const sizeOptions: {
  value: PropertySize;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "small",
    label: "Small",
    description: "Under 200m\u00B2 / Under 10 occupants",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
        />
      </svg>
    ),
  },
  {
    value: "medium",
    label: "Medium",
    description: "200\u2013500m\u00B2 / 10\u201350 occupants",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
        />
      </svg>
    ),
  },
  {
    value: "large",
    label: "Large",
    description: "500\u20132,000m\u00B2 / 50\u2013200 occupants",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
        />
      </svg>
    ),
  },
  {
    value: "very-large",
    label: "Very Large",
    description: "Over 2,000m\u00B2 / Over 200 occupants",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
        />
      </svg>
    ),
  },
];

const riskOptions: {
  value: SpecificRisk;
  label: string;
}[] = [
  { value: "kitchen", label: "Commercial Kitchen / Cooking Equipment" },
  { value: "server-room", label: "Server Room / Electrical Equipment" },
  { value: "flammable-liquids", label: "Flammable Liquids or Chemicals" },
  {
    value: "vehicle-parking",
    label: "Vehicle Parking (including EVs / E-bikes)",
  },
  { value: "workshop", label: "Workshop / Power Tools" },
  { value: "lithium-battery", label: "Lithium-Ion Battery Storage" },
];

const equipmentOptions: {
  value: CurrentEquipment;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "fresh",
    label: "Starting Fresh",
    description: "No existing fire safety equipment",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 4.5v15m7.5-7.5h-15"
        />
      </svg>
    ),
  },
  {
    value: "partial",
    label: "Partial Setup",
    description: "Some equipment but gaps or expired items",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M11.42 15.17l-5.384-5.383a1.5 1.5 0 010-2.121l.707-.707a1.5 1.5 0 012.121 0L12 10.086l3.136-3.127a1.5 1.5 0 012.121 0l.707.707a1.5 1.5 0 010 2.121L12.58 15.17a.82.82 0 01-1.16 0z"
        />
      </svg>
    ),
  },
  {
    value: "replacement",
    label: "Full Replacement",
    description: "Replacing all existing equipment",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
        />
      </svg>
    ),
  },
];

/* ------------------------------------------------------------------ */
/*  Recommendation engine                                              */
/* ------------------------------------------------------------------ */

function buildRecommendation(
  propertyType: PropertyType,
  propertySize: PropertySize,
  risks: SpecificRisk[],
): KitItem[] {
  const items: KitItem[] = [];

  const sizeMultiplier: Record<PropertySize, number> = {
    small: 1,
    medium: 2,
    large: 3,
    "very-large": 4,
  };

  const smokeAlarmQty: Record<string, Record<PropertySize, number>> = {
    residential: { small: 2, medium: 3, large: 5, "very-large": 8 },
    strata: { small: 4, medium: 8, large: 16, "very-large": 24 },
    commercial: { small: 3, medium: 6, large: 12, "very-large": 20 },
    retail: { small: 3, medium: 6, large: 12, "very-large": 20 },
    industrial: { small: 2, medium: 4, large: 8, "very-large": 14 },
    mixed: { small: 4, medium: 8, large: 14, "very-large": 22 },
  };

  /* --- Always included --- */
  const alarmQty = smokeAlarmQty[propertyType]?.[propertySize] ?? 2;
  items.push({
    name: "Photoelectric Smoke Alarm \u2014 10 Year",
    quantity: alarmQty,
    unitPrice: 49.95,
  });

  /* --- Property-type logic --- */
  switch (propertyType) {
    case "residential": {
      items.push({
        name: "2.5kg ABE Dry Chemical Fire Extinguisher",
        quantity: 1,
        unitPrice: 69.95,
      });
      items.push({
        name: "Fire Blanket 1.0m \u00D7 1.0m",
        quantity: 1,
        unitPrice: 34.95,
      });
      break;
    }

    case "strata": {
      const abeQty: Record<PropertySize, number> = {
        small: 2,
        medium: 4,
        large: 8,
        "very-large": 12,
      };
      const blanketQty: Record<PropertySize, number> = {
        small: 1,
        medium: 2,
        large: 4,
        "very-large": 6,
      };
      items.push({
        name: "4.5kg ABE Dry Chemical Fire Extinguisher",
        quantity: abeQty[propertySize],
        unitPrice: 89.95,
      });
      items.push({
        name: "Fire Blanket 1.2m \u00D7 1.8m",
        quantity: blanketQty[propertySize],
        unitPrice: 44.95,
      });
      if (propertySize !== "small") {
        const hoseQty: Record<PropertySize, number> = {
          small: 0,
          medium: 1,
          large: 2,
          "very-large": 4,
        };
        items.push({
          name: "Fire Hose Reel \u2014 36m",
          quantity: hoseQty[propertySize],
          unitPrice: 349.95,
        });
      }
      if (propertySize !== "small") {
        const exitQty: Record<PropertySize, number> = {
          small: 0,
          medium: 2,
          large: 4,
          "very-large": 8,
        };
        items.push({
          name: "Emergency Exit Sign \u2014 LED Illuminated",
          quantity: exitQty[propertySize],
          unitPrice: 64.95,
        });
      }
      break;
    }

    case "commercial": {
      const abeQty: Record<PropertySize, number> = {
        small: 2,
        medium: 4,
        large: 8,
        "very-large": 12,
      };
      const blanketQty: Record<PropertySize, number> = {
        small: 1,
        medium: 2,
        large: 4,
        "very-large": 6,
      };
      items.push({
        name: "4.5kg ABE Dry Chemical Fire Extinguisher",
        quantity: abeQty[propertySize],
        unitPrice: 89.95,
      });
      items.push({
        name: "Fire Blanket 1.2m \u00D7 1.8m",
        quantity: blanketQty[propertySize],
        unitPrice: 44.95,
      });
      if (propertySize !== "small") {
        const hoseQty: Record<PropertySize, number> = {
          small: 0,
          medium: 1,
          large: 2,
          "very-large": 4,
        };
        items.push({
          name: "Fire Hose Reel \u2014 36m",
          quantity: hoseQty[propertySize],
          unitPrice: 349.95,
        });
        const exitQty: Record<PropertySize, number> = {
          small: 0,
          medium: 2,
          large: 4,
          "very-large": 8,
        };
        items.push({
          name: "Emergency Exit Sign \u2014 LED Illuminated",
          quantity: exitQty[propertySize],
          unitPrice: 64.95,
        });
      }
      if (risks.includes("server-room")) {
        items.push({
          name: "3.5kg CO\u2082 Fire Extinguisher",
          quantity: sizeMultiplier[propertySize],
          unitPrice: 139.95,
        });
      }
      break;
    }

    case "retail": {
      const abeQty: Record<PropertySize, number> = {
        small: 2,
        medium: 4,
        large: 8,
        "very-large": 12,
      };
      const blanketQty: Record<PropertySize, number> = {
        small: 1,
        medium: 2,
        large: 4,
        "very-large": 6,
      };
      items.push({
        name: "4.5kg ABE Dry Chemical Fire Extinguisher",
        quantity: abeQty[propertySize],
        unitPrice: 89.95,
      });
      items.push({
        name: "Fire Blanket 1.2m \u00D7 1.8m",
        quantity: blanketQty[propertySize],
        unitPrice: 44.95,
      });
      if (propertySize !== "small") {
        const hoseQty: Record<PropertySize, number> = {
          small: 0,
          medium: 1,
          large: 2,
          "very-large": 4,
        };
        items.push({
          name: "Fire Hose Reel \u2014 36m",
          quantity: hoseQty[propertySize],
          unitPrice: 349.95,
        });
        const exitQty: Record<PropertySize, number> = {
          small: 0,
          medium: 2,
          large: 4,
          "very-large": 8,
        };
        items.push({
          name: "Emergency Exit Sign \u2014 LED Illuminated",
          quantity: exitQty[propertySize],
          unitPrice: 64.95,
        });
      }
      if (risks.includes("kitchen")) {
        items.push({
          name: "7.0L Wet Chemical Fire Extinguisher",
          quantity: sizeMultiplier[propertySize],
          unitPrice: 179.95,
        });
        items.push({
          name: "Fire Blanket 1.8m \u00D7 1.8m (Kitchen)",
          quantity: sizeMultiplier[propertySize],
          unitPrice: 54.95,
        });
      }
      break;
    }

    case "industrial": {
      const largeAbeQty: Record<PropertySize, number> = {
        small: 2,
        medium: 4,
        large: 8,
        "very-large": 14,
      };
      const blanketQty: Record<PropertySize, number> = {
        small: 2,
        medium: 4,
        large: 6,
        "very-large": 10,
      };
      items.push({
        name: "9.0kg ABE Dry Chemical Fire Extinguisher",
        quantity: largeAbeQty[propertySize],
        unitPrice: 129.95,
      });
      items.push({
        name: "9.0L AFFF Foam Fire Extinguisher",
        quantity: Math.ceil(largeAbeQty[propertySize] / 2),
        unitPrice: 149.95,
      });
      items.push({
        name: "Fire Blanket 1.8m \u00D7 1.8m",
        quantity: blanketQty[propertySize],
        unitPrice: 54.95,
      });
      if (propertySize !== "small") {
        const hoseQty: Record<PropertySize, number> = {
          small: 0,
          medium: 2,
          large: 4,
          "very-large": 8,
        };
        items.push({
          name: "Fire Hose Reel \u2014 36m",
          quantity: hoseQty[propertySize],
          unitPrice: 349.95,
        });
        const exitQty: Record<PropertySize, number> = {
          small: 0,
          medium: 4,
          large: 6,
          "very-large": 12,
        };
        items.push({
          name: "Emergency Exit Sign \u2014 LED Illuminated",
          quantity: exitQty[propertySize],
          unitPrice: 64.95,
        });
      }
      if (risks.includes("flammable-liquids")) {
        items.push({
          name: "9.0L AFFF Foam Fire Extinguisher (Hazmat)",
          quantity: sizeMultiplier[propertySize],
          unitPrice: 159.95,
        });
      }
      break;
    }

    case "mixed": {
      /* Residential portion */
      items.push({
        name: "2.5kg ABE Dry Chemical Fire Extinguisher",
        quantity: sizeMultiplier[propertySize],
        unitPrice: 69.95,
      });
      items.push({
        name: "Fire Blanket 1.0m \u00D7 1.0m",
        quantity: sizeMultiplier[propertySize],
        unitPrice: 34.95,
      });
      /* Commercial portion */
      const commAbeQty: Record<PropertySize, number> = {
        small: 2,
        medium: 3,
        large: 6,
        "very-large": 10,
      };
      items.push({
        name: "4.5kg ABE Dry Chemical Fire Extinguisher",
        quantity: commAbeQty[propertySize],
        unitPrice: 89.95,
      });
      items.push({
        name: "Fire Blanket 1.2m \u00D7 1.8m",
        quantity: Math.ceil(commAbeQty[propertySize] / 2),
        unitPrice: 44.95,
      });
      if (propertySize !== "small") {
        const hoseQty: Record<PropertySize, number> = {
          small: 0,
          medium: 1,
          large: 2,
          "very-large": 4,
        };
        items.push({
          name: "Fire Hose Reel \u2014 36m",
          quantity: hoseQty[propertySize],
          unitPrice: 349.95,
        });
        const exitQty: Record<PropertySize, number> = {
          small: 0,
          medium: 2,
          large: 4,
          "very-large": 8,
        };
        items.push({
          name: "Emergency Exit Sign \u2014 LED Illuminated",
          quantity: exitQty[propertySize],
          unitPrice: 64.95,
        });
      }
      if (risks.includes("server-room")) {
        items.push({
          name: "3.5kg CO\u2082 Fire Extinguisher",
          quantity: sizeMultiplier[propertySize],
          unitPrice: 139.95,
        });
      }
      if (risks.includes("kitchen")) {
        items.push({
          name: "7.0L Wet Chemical Fire Extinguisher",
          quantity: sizeMultiplier[propertySize],
          unitPrice: 179.95,
        });
      }
      break;
    }
  }

  /* --- Risk-specific additions for all types --- */
  if (
    risks.includes("lithium-battery") ||
    risks.includes("vehicle-parking")
  ) {
    items.push({
      name: "Lithium-Ion Battery Fire Extinguisher \u2014 AVD Agent",
      quantity: sizeMultiplier[propertySize],
      unitPrice: 219.95,
    });
  }

  if (risks.includes("workshop")) {
    items.push({
      name: "First Aid Kit \u2014 Burns Module",
      quantity: sizeMultiplier[propertySize],
      unitPrice: 59.95,
    });
  }

  /* --- Sign qty matches extinguisher count --- */
  const totalExtinguishers = items
    .filter((i) => i.name.toLowerCase().includes("extinguisher"))
    .reduce((acc, i) => acc + i.quantity, 0);

  items.push({
    name: "Fire Extinguisher Location Sign",
    quantity: Math.max(totalExtinguishers, 1),
    unitPrice: 12.95,
  });

  return items;
}

/* ------------------------------------------------------------------ */
/*  Motion helpers                                                     */
/* ------------------------------------------------------------------ */

const fadeSlide = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
  transition: { duration: 0.35, ease: "easeInOut" as const },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.07 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function BuildYourKitPage() {
  const [step, setStep] = useState(1);
  const [propertyType, setPropertyType] = useState<PropertyType | null>(null);
  const [propertySize, setPropertySize] = useState<PropertySize | null>(null);
  const [risks, setRisks] = useState<SpecificRisk[]>([]);
  const [currentEquipment, setCurrentEquipment] =
    useState<CurrentEquipment | null>(null);
  const [showResults, setShowResults] = useState(false);

  const totalSteps = 4;

  const canAdvance = (): boolean => {
    switch (step) {
      case 1:
        return propertyType !== null;
      case 2:
        return propertySize !== null;
      case 3:
        return true; // risks are optional
      case 4:
        return currentEquipment !== null;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      setShowResults(true);
    }
  };

  const handleBack = () => {
    if (showResults) {
      setShowResults(false);
      return;
    }
    if (step > 1) setStep(step - 1);
  };

  const handleStartOver = () => {
    setStep(1);
    setPropertyType(null);
    setPropertySize(null);
    setRisks([]);
    setCurrentEquipment(null);
    setShowResults(false);
  };

  const toggleRisk = (risk: SpecificRisk) => {
    setRisks((prev) =>
      prev.includes(risk) ? prev.filter((r) => r !== risk) : [...prev, risk],
    );
  };

  const kitItems = useMemo(() => {
    if (!propertyType || !propertySize) return [];
    return buildRecommendation(propertyType, propertySize, risks);
  }, [propertyType, propertySize, risks]);

  const totalItemCount = kitItems.reduce((acc, i) => acc + i.quantity, 0);
  const totalPrice = kitItems.reduce(
    (acc, i) => acc + i.quantity * i.unitPrice,
    0,
  );

  const progressPercent = showResults
    ? 100
    : ((step - 1) / totalSteps) * 100;

  /* ---------------------------------------------------------------- */
  /*  Sub-components                                                   */
  /* ---------------------------------------------------------------- */

  const ProgressBar = () => (
    <div className="w-full max-w-3xl mx-auto mb-10">
      <div className="flex justify-between text-sm text-slate-400 mb-2">
        {["Property Type", "Property Size", "Specific Risks", "Current Setup"].map(
          (label, i) => (
            <span
              key={label}
              className={`transition-colors duration-300 ${
                i + 1 <= step || showResults
                  ? "text-cyan-400 font-medium"
                  : ""
              }`}
            >
              {label}
            </span>
          ),
        )}
      </div>
      <div className="h-2 w-full rounded-full bg-navy-800 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </div>
      {!showResults && (
        <p className="text-center text-slate-500 text-sm mt-2">
          Step {step} of {totalSteps}
        </p>
      )}
    </div>
  );

  const NavigationButtons = () => (
    <div className="flex justify-between mt-10 max-w-3xl mx-auto">
      <button
        onClick={handleBack}
        className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
          step === 1 && !showResults
            ? "opacity-0 pointer-events-none"
            : "bg-navy-800 text-slate-300 hover:bg-navy-700 hover:text-white border border-white/10"
        }`}
      >
        Back
      </button>
      <button
        onClick={handleNext}
        disabled={!canAdvance()}
        className={`px-8 py-3 rounded-lg font-semibold transition-all duration-200 ${
          canAdvance()
            ? "bg-cyan-500 text-navy-950 hover:bg-cyan-400 shadow-lg shadow-cyan-500/20"
            : "bg-navy-700 text-slate-500 cursor-not-allowed"
        }`}
      >
        {step === totalSteps ? "View Recommendations" : "Next"}
      </button>
    </div>
  );

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-navy-950 pt-24 pb-20">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-12">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative max-w-4xl mx-auto text-center">
          <motion.h1
            className="font-[family-name:var(--font-heading)] text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Build Your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-500">
              Compliance Kit
            </span>
          </motion.h1>
          <motion.p
            className="text-lg text-slate-400 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            Answer a few questions about your property and we&rsquo;ll recommend
            the exact fire safety equipment you need to meet Australian
            Standards.
          </motion.p>
        </div>
      </section>

      {/* Wizard */}
      <section className="px-4">
        <ProgressBar />

        <AnimatePresence mode="wait">
          {!showResults ? (
            <motion.div key={`step-${step}`} {...fadeSlide}>
              {/* Step 1 – Property Type */}
              {step === 1 && (
                <div className="max-w-4xl mx-auto">
                  <h2 className="font-[family-name:var(--font-heading)] text-2xl md:text-3xl font-semibold text-white text-center mb-8">
                    What type of property do you need to protect?
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {propertyOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setPropertyType(opt.value)}
                        className={`group relative p-6 rounded-2xl text-left transition-all duration-200 border ${
                          propertyType === opt.value
                            ? "bg-cyan-500/10 border-cyan-500/50 shadow-lg shadow-cyan-500/10"
                            : "glass border-white/[0.08] hover:border-cyan-500/30 hover:bg-cyan-500/5"
                        }`}
                      >
                        <div
                          className={`mb-4 ${
                            propertyType === opt.value
                              ? "text-cyan-400"
                              : "text-slate-400 group-hover:text-cyan-400"
                          } transition-colors`}
                        >
                          {opt.icon}
                        </div>
                        <h3 className="text-white font-semibold text-lg mb-1">
                          {opt.label}
                        </h3>
                        <p className="text-sm text-slate-400">
                          {opt.description}
                        </p>
                        {propertyType === opt.value && (
                          <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center">
                            <svg
                              className="w-4 h-4 text-navy-950"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2 – Property Size */}
              {step === 2 && (
                <div className="max-w-3xl mx-auto">
                  <h2 className="font-[family-name:var(--font-heading)] text-2xl md:text-3xl font-semibold text-white text-center mb-8">
                    How large is your property?
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {sizeOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setPropertySize(opt.value)}
                        className={`group relative p-6 rounded-2xl text-left transition-all duration-200 border ${
                          propertySize === opt.value
                            ? "bg-cyan-500/10 border-cyan-500/50 shadow-lg shadow-cyan-500/10"
                            : "glass border-white/[0.08] hover:border-cyan-500/30 hover:bg-cyan-500/5"
                        }`}
                      >
                        <div
                          className={`mb-4 ${
                            propertySize === opt.value
                              ? "text-cyan-400"
                              : "text-slate-400 group-hover:text-cyan-400"
                          } transition-colors`}
                        >
                          {opt.icon}
                        </div>
                        <h3 className="text-white font-semibold text-lg mb-1">
                          {opt.label}
                        </h3>
                        <p className="text-sm text-slate-400">
                          {opt.description}
                        </p>
                        {propertySize === opt.value && (
                          <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center">
                            <svg
                              className="w-4 h-4 text-navy-950"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3 – Specific Risks */}
              {step === 3 && (
                <div className="max-w-3xl mx-auto">
                  <h2 className="font-[family-name:var(--font-heading)] text-2xl md:text-3xl font-semibold text-white text-center mb-3">
                    Any specific risks on your property?
                  </h2>
                  <p className="text-center text-slate-400 mb-8">
                    Select all that apply, or skip if none.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {riskOptions.map((opt) => {
                      const selected = risks.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          onClick={() => toggleRisk(opt.value)}
                          className={`group relative flex items-center gap-4 p-5 rounded-2xl text-left transition-all duration-200 border ${
                            selected
                              ? "bg-cyan-500/10 border-cyan-500/50 shadow-lg shadow-cyan-500/10"
                              : "glass border-white/[0.08] hover:border-cyan-500/30 hover:bg-cyan-500/5"
                          }`}
                        >
                          {/* Checkbox */}
                          <div
                            className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                              selected
                                ? "bg-cyan-500 border-cyan-500"
                                : "border-slate-600 group-hover:border-cyan-500/50"
                            }`}
                          >
                            {selected && (
                              <svg
                                className="w-4 h-4 text-navy-950"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                          <span className="text-white font-medium">
                            {opt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 4 – Current Equipment */}
              {step === 4 && (
                <div className="max-w-3xl mx-auto">
                  <h2 className="font-[family-name:var(--font-heading)] text-2xl md:text-3xl font-semibold text-white text-center mb-8">
                    What&rsquo;s your current equipment situation?
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {equipmentOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setCurrentEquipment(opt.value)}
                        className={`group relative p-6 rounded-2xl text-center transition-all duration-200 border ${
                          currentEquipment === opt.value
                            ? "bg-cyan-500/10 border-cyan-500/50 shadow-lg shadow-cyan-500/10"
                            : "glass border-white/[0.08] hover:border-cyan-500/30 hover:bg-cyan-500/5"
                        }`}
                      >
                        <div
                          className={`mx-auto mb-4 ${
                            currentEquipment === opt.value
                              ? "text-cyan-400"
                              : "text-slate-400 group-hover:text-cyan-400"
                          } transition-colors flex justify-center`}
                        >
                          {opt.icon}
                        </div>
                        <h3 className="text-white font-semibold text-lg mb-1">
                          {opt.label}
                        </h3>
                        <p className="text-sm text-slate-400">
                          {opt.description}
                        </p>
                        {currentEquipment === opt.value && (
                          <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center">
                            <svg
                              className="w-4 h-4 text-navy-950"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <NavigationButtons />
            </motion.div>
          ) : (
            /* -------------------------------------------------------- */
            /*  Results                                                  */
            /* -------------------------------------------------------- */
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="max-w-4xl mx-auto"
            >
              {/* Summary header */}
              <motion.div
                className="glass rounded-2xl border border-white/[0.08] p-8 mb-8 text-center"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="font-[family-name:var(--font-heading)] text-2xl md:text-3xl font-semibold text-white mb-2">
                  Your Recommended Compliance Kit
                </h2>
                <p className="text-slate-400 mb-6">
                  Based on your{" "}
                  {propertyOptions.find((o) => o.value === propertyType)?.label}{" "}
                  property ({sizeOptions.find((o) => o.value === propertySize)?.label})
                </p>
                <div className="flex justify-center gap-8 flex-wrap">
                  <div>
                    <p className="text-sm text-slate-500 uppercase tracking-wider mb-1">
                      Total Items
                    </p>
                    <p className="text-3xl font-bold text-white">
                      {totalItemCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 uppercase tracking-wider mb-1">
                      Estimated Total
                    </p>
                    <p className="text-3xl font-bold text-ember-500">
                      ${totalPrice.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Item cards */}
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {kitItems.map((item, i) => (
                  <motion.div
                    key={item.name}
                    variants={staggerItem}
                    className="glass rounded-xl border border-white/[0.08] p-5 flex flex-col justify-between"
                  >
                    <div>
                      <h3 className="text-white font-semibold mb-1">
                        {item.name}
                      </h3>
                      <p className="text-sm text-slate-400">
                        ${item.unitPrice.toFixed(2)} each
                      </p>
                    </div>
                    <div className="flex items-end justify-between mt-4">
                      <span className="text-sm text-slate-500">
                        Qty: {item.quantity}
                      </span>
                      <span className="text-lg font-bold text-cyan-400">
                        $
                        {(item.quantity * item.unitPrice).toLocaleString(
                          "en-AU",
                          { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                        )}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* CTA buttons */}
              <motion.div
                className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
              >
                <button className="w-full sm:w-auto px-8 py-4 rounded-xl bg-cyan-500 text-navy-950 font-bold text-lg hover:bg-cyan-400 transition-all duration-200 shadow-lg shadow-cyan-500/25">
                  Add Entire Kit to Cart
                </button>
                <button className="w-full sm:w-auto px-8 py-4 rounded-xl border border-cyan-500/40 text-cyan-400 font-semibold hover:bg-cyan-500/10 transition-all duration-200">
                  Customise Kit
                </button>
                <button className="text-slate-400 hover:text-cyan-400 underline underline-offset-4 transition-colors text-sm">
                  Download Kit List as PDF
                </button>
              </motion.div>

              {/* Restart */}
              <motion.div
                className="flex justify-center gap-4 mb-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <button
                  onClick={handleBack}
                  className="px-6 py-3 rounded-lg bg-navy-800 text-slate-300 hover:bg-navy-700 hover:text-white border border-white/10 font-medium transition-all duration-200"
                >
                  Back
                </button>
                <button
                  onClick={handleStartOver}
                  className="px-6 py-3 rounded-lg bg-navy-800 text-slate-300 hover:bg-navy-700 hover:text-white border border-white/10 font-medium transition-all duration-200"
                >
                  Start Over
                </button>
              </motion.div>

              {/* Disclaimer */}
              <motion.div
                className="glass rounded-xl border border-white/[0.08] p-6 max-w-3xl mx-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <div className="flex gap-3">
                  <svg
                    className="w-5 h-5 text-ember-400 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                    />
                  </svg>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    This recommendation is a guide based on general Australian
                    Standards requirements. Specific requirements may vary based
                    on your local council regulations and fire safety assessment.
                    We recommend consulting a qualified fire safety practitioner
                    for a formal assessment.
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}
