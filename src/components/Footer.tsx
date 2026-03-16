"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Phone,
  MapPin,
  Mail,
  ShieldCheck,
  Truck,
  Award,
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
} from "lucide-react";

const footerColumns = [
  {
    title: "Products",
    links: [
      { label: "Fire Extinguishers", href: "/shop/fire-extinguishers" },
      { label: "Fire Blankets", href: "/shop/fire-blankets" },
      { label: "Smoke Alarms", href: "/shop/smoke-alarms" },
      { label: "Safety Kits", href: "/shop/safety-kits" },
      { label: "First Aid Kits", href: "/shop/first-aid" },
      { label: "Signage", href: "/shop/signage" },
    ],
  },
  {
    title: "Services",
    links: [
      { label: "Fire Risk Assessment", href: "/services/fire-risk-assessment" },
      { label: "Equipment Servicing", href: "/services/equipment-servicing" },
      { label: "Installation", href: "/services/installation" },
      { label: "Staff Training", href: "/services/training" },
      { label: "Compliance Audits", href: "/services/compliance-audits" },
      { label: "Emergency Planning", href: "/services/emergency-planning" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Fire Safety Guides", href: "/resources/guides" },
      { label: "Australian Standards", href: "/resources/australian-standards" },
      { label: "Maintenance Schedule", href: "/resources/maintenance" },
      { label: "FAQs", href: "/resources/faqs" },
      { label: "Blog", href: "/resources/blog" },
      { label: "Video Tutorials", href: "/resources/videos" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Flaro", href: "/about" },
      { label: "Contact Us", href: "/contact" },
      { label: "Careers", href: "/careers" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms & Conditions", href: "/terms" },
      { label: "Shipping & Returns", href: "/shipping" },
    ],
  },
];

const trustBadges = [
  {
    icon: ShieldCheck,
    label: "Australian Standards",
    description: "All products meet AS/NZS standards",
  },
  {
    icon: Award,
    label: "AS/NZS Certified",
    description: "Independently tested & certified",
  },
  {
    icon: Truck,
    label: "Free Shipping",
    description: "On orders over $200",
  },
];

const socialLinks = [
  { icon: Facebook, href: "https://facebook.com/flaro", label: "Facebook" },
  { icon: Instagram, href: "https://instagram.com/flaro", label: "Instagram" },
  { icon: Linkedin, href: "https://linkedin.com/company/flaro", label: "LinkedIn" },
  { icon: Youtube, href: "https://youtube.com/@flaro", label: "YouTube" },
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
    <footer className="relative bg-navy-950 border-t border-white/[0.06]">
      {/* Trust badges */}
      <div className="border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {trustBadges.map((badge) => (
              <div
                key={badge.label}
                className="flex items-center gap-4 justify-center md:justify-start"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <badge.icon className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {badge.label}
                  </p>
                  <p className="text-sm text-slate-400">{badge.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-12 lg:gap-8">
          {/* Branding column */}
          <div className="lg:col-span-2 space-y-6">
            <Link href="/" className="inline-flex items-center gap-2 group">
              <svg
                viewBox="0 0 36 36"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-8 h-8"
              >
                <defs>
                  <linearGradient
                    id="footerFlameGrad"
                    x1="0"
                    y1="1"
                    x2="0"
                    y2="0"
                  >
                    <stop offset="0%" stopColor="#ea580c" />
                    <stop offset="50%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#fb923c" />
                  </linearGradient>
                </defs>
                <path
                  d="M18 4C18 4 10 14 10 22C10 26.4 13.6 30 18 30C22.4 30 26 26.4 26 22C26 14 18 4 18 4Z"
                  fill="url(#footerFlameGrad)"
                />
              </svg>
              <span className="text-xl font-[family-name:var(--font-heading)] font-bold text-white tracking-wide">
                Flaro
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-slate-400 max-w-sm">
              Expert-curated fire safety equipment for Australian homes and
              businesses. Trusted by thousands of property owners across Sydney
              and New South Wales.
            </p>
            <div className="space-y-3">
              <a
                href="https://maps.google.com/?q=Breakfast+Point+NSW"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
              >
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span>Breakfast Point, NSW</span>
              </a>
              <a
                href="tel:0405605196"
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
              >
                <Phone className="w-4 h-4 flex-shrink-0" />
                <span>0405 605 196</span>
              </a>
              <a
                href="mailto:hello@flaro.com.au"
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
              >
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span>hello@flaro.com.au</span>
              </a>
            </div>

            {/* Social links */}
            <div className="flex items-center gap-3 pt-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/10 transition-all duration-200"
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                {column.title}
              </h3>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-400 hover:text-cyan-400 transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter */}
        <div className="mt-16 pt-10 border-t border-white/[0.06]">
          <div className="max-w-md">
            <h3 className="text-base font-semibold text-white mb-2">
              Stay fire-safe
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              Get fire safety tips, product updates and exclusive offers
              delivered to your inbox.
            </p>
            {subscribed ? (
              <div className="flex items-center gap-2 text-sm text-cyan-400">
                <ShieldCheck className="w-5 h-5" />
                <span>
                  Thanks for subscribing! Check your inbox to confirm.
                </span>
              </div>
            ) : (
              <form
                onSubmit={handleNewsletterSubmit}
                className="flex gap-2"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  required
                  className="flex-1 px-4 py-2.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-semibold text-navy-950 bg-cyan-500 rounded-lg hover:bg-cyan-400 transition-all duration-300 whitespace-nowrap"
                >
                  Subscribe
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <p>&copy; 2026 Flaro Pty Ltd. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link
                href="/privacy"
                className="hover:text-slate-300 transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="hover:text-slate-300 transition-colors"
              >
                Terms
              </Link>
              <Link
                href="/sitemap"
                className="hover:text-slate-300 transition-colors"
              >
                Sitemap
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
