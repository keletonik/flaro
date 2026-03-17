import Link from "next/link";

const productCols = [
  { heading: "Products", links: [
    { label: "Fire Extinguishers", href: "/shop?category=Fire+Extinguishers" },
    { label: "Extinguisher Accessories", href: "/shop?category=Fire+Extinguisher+Accessories" },
    { label: "Fire Blankets", href: "/shop?category=Fire+Blankets" },
    { label: "Smoke Alarms", href: "/shop?category=Smoke+Alarms+%26+Detection" },
    { label: "Fire Hose Reels", href: "/shop?category=Fire+Hose+Reels" },
    { label: "Emergency Lighting", href: "/shop?category=Emergency+%26+Exit+Lighting" },
  ]},
  { heading: "More Products", links: [
    { label: "Hydrant Equipment", href: "/shop?category=Fire+Hydrant+Equipment" },
    { label: "Safety Signage", href: "/shop?category=Fire+Safety+Signage" },
    { label: "Detection & Alarms", href: "/shop?category=Fire+Detection+%26+Alarm+Systems" },
    { label: "Sprinkler & Wet Fire", href: "/shop?category=Sprinkler+%26+Wet+Fire" },
    { label: "Passive Fire", href: "/shop?category=Passive+Fire+Protection" },
    { label: "First Aid & Safety", href: "/shop?category=First+Aid+%26+Safety" },
  ]},
  { heading: "Company", links: [
    { label: "About Us", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Resources", href: "/resources" },
    { label: "Register", href: "/register" },
    { label: "Sign In", href: "/login" },
  ]},
];

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
                  <path d="M12 2C8.5 6 4 9.5 4 14a8 8 0 0016 0c0-4.5-4.5-8-8-12zm0 18a6 6 0 01-6-6c0-3.5 3-6.2 6-9.8 3 3.6 6 6.3 6 9.8a6 6 0 01-6 6z" />
                </svg>
              </div>
              <div className="leading-none">
                <span className="text-lg font-800 font-[family-name:var(--font-heading)] text-white tracking-tight">FLARO</span>
                <span className="block text-[9px] font-semibold tracking-[0.2em] uppercase text-red-400 -mt-0.5">Fire Supplies</span>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              Australia&apos;s trusted wholesale supplier of AS/NZS certified fire safety equipment. Register for trade pricing.
            </p>
            <div className="flex gap-3 text-xs text-gray-500">
              <span className="px-2 py-1 border border-gray-700 rounded">AS/NZS Certified</span>
              <span className="px-2 py-1 border border-gray-700 rounded">Wholesale</span>
              <span className="px-2 py-1 border border-gray-700 rounded">Australia-Wide</span>
            </div>
          </div>

          {/* Link columns */}
          {productCols.map((col) => (
            <div key={col.heading}>
              <h4 className="text-sm font-semibold text-white mb-4">{col.heading}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-gray-400 hover:text-red-400 transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Flaro Fire Supplies. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
