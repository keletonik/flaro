"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Phone, MapPin, Mail, ShieldCheck, Truck, Award,
  Facebook, Instagram, Linkedin, Youtube,
} from "lucide-react";

const footerColumns = [
  {
    title: "Products",
    links: [
      { label: "Fire Extinguishers", href: "/shop?category=Fire+Extinguishers" },
      { label: "Fire Blankets", href: "/shop?category=Fire+Blankets" },
      { label: "Smoke Alarms & Detectors", href: "/shop?category=Smoke+Alarms+%26+Detectors" },
      { label: "Fire Hose Reels", href: "/shop?category=Fire+Hose+Reels" },
      { label: "Emergency Lighting", href: "/shop?category=Emergency+%26+Exit+Lighting" },
      { label: "Fire Safety Signage", href: "/shop?category=Fire+Safety+Signage" },
    ],
  },
  {
    title: "More Products",
    links: [
      { label: "Fire Hydrant Equipment", href: "/shop?category=Fire+Hydrant+Equipment" },
      { label: "Fire Cabinets & Brackets", href: "/shop?category=Fire+Cabinets+%26+Brackets" },
      { label: "First Aid", href: "/shop?category=First+Aid" },
      { label: "Fire Warden Equipment", href: "/shop?category=Fire+Warden+Equipment" },
      { label: "Fire Door Hardware", href: "/shop?category=Fire+Door+Hardware" },
      { label: "Sprinkler Components", href: "/shop?category=Sprinkler+Components" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Fire Safety Guides", href: "/resources" },
      { label: "Australian Standards", href: "/resources" },
      { label: "Compliance Checklists", href: "/resources" },
      { label: "FAQs", href: "/contact" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Flaro", href: "/about" },
      { label: "Contact Us", href: "/contact" },
      { label: "Register for Pricing", href: "/register" },
      { label: "Sign In", href: "/login" },
    ],
  },
];

const trustBadges = [
  { icon: ShieldCheck, label: "AS/NZS Certified", description: "All products meet Australian Standards" },
  { icon: Award, label: "Wholesale Pricing", description: "Register for exclusive trade rates" },
  { icon: Truck, label: "Australia-Wide Delivery", description: "Fast dispatch from Sydney" },
];

const socialLinks = [
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Youtube, href: "#", label: "YouTube" },
];

export function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <footer className="bg-black text-white">
      {/* Trust badges */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {trustBadges.map((badge) => (
              <div key={badge.label} className="flex items-center gap-4 justify-center md:justify-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-red-600/10 border border-red-600/20 flex items-center justify-center">
                  <badge.icon className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{badge.label}</p>
                  <p className="text-sm text-gray-400">{badge.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-12 lg:gap-8">
          {/* Branding */}
          <div className="lg:col-span-2 space-y-6">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
                <defs>
                  <linearGradient id="footerFlame" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#DC2626" />
                    <stop offset="50%" stopColor="#EA580C" />
                    <stop offset="100%" stopColor="#F97316" />
                  </linearGradient>
                </defs>
                <path d="M18 2C18 2 9 13 9 22C9 27 13 31 18 31C23 31 27 27 27 22C27 13 18 2 18 2Z" fill="url(#footerFlame)" />
              </svg>
              <div className="flex flex-col leading-none">
                <span className="text-xl font-[family-name:var(--font-heading)] font-bold tracking-tight text-white uppercase">Flaro</span>
                <span className="text-[7px] font-semibold tracking-[0.25em] uppercase text-red-500 mt-0.5">Fire Supplies</span>
              </div>
            </Link>
            <p className="text-sm leading-relaxed text-gray-400 max-w-sm">
              Australia&apos;s trusted wholesale fire safety supplier. Full product range, AS/NZS certified. Register for exclusive trade pricing.
            </p>
            <div className="space-y-3">
              <a href="https://maps.google.com/?q=Breakfast+Point+NSW" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-500 transition-colors">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span>Breakfast Point, NSW 2137</span>
              </a>
              <a href="tel:0405605196" className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-500 transition-colors">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <span>0405 605 196</span>
              </a>
              <a href="mailto:hello@flarofire.com.au" className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-500 transition-colors">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span>hello@flarofire.com.au</span>
              </a>
            </div>
            <div className="flex items-center gap-3 pt-2">
              {socialLinks.map((social) => (
                <a key={social.label} href={social.href} aria-label={social.label} className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/10 transition-all duration-200">
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">{column.title}</h3>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link href={link.href} className="text-sm text-gray-400 hover:text-red-500 transition-colors duration-200">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter */}
        <div className="mt-16 pt-10 border-t border-white/10">
          <div className="max-w-md">
            <h3 className="text-base font-semibold text-white mb-2">Stay Updated</h3>
            <p className="text-sm text-gray-400 mb-4">Get product updates, compliance alerts and exclusive offers.</p>
            {subscribed ? (
              <div className="flex items-center gap-2 text-sm text-red-500">
                <ShieldCheck className="w-5 h-5" />
                <span>Thanks for subscribing!</span>
              </div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email address" required className="flex-1 px-4 py-2.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all" />
                <button type="submit" className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all duration-300">Subscribe</button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <p>&copy; 2026 Flaro Fire Supplies Pty Ltd. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link href="/contact" className="hover:text-gray-300 transition-colors">Privacy</Link>
              <Link href="/contact" className="hover:text-gray-300 transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
