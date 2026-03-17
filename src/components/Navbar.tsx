"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Menu, X, User } from "lucide-react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Products" },
  { href: "/about", label: "About" },
  { href: "/resources", label: "Resources" },
  { href: "/contact", label: "Contact" },
];

function FlareLogoMark() {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
      <defs>
        <linearGradient id="logoFlame" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#DC2626" />
          <stop offset="50%" stopColor="#EA580C" />
          <stop offset="100%" stopColor="#F97316" />
        </linearGradient>
        <linearGradient id="logoInner" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#FB923C" />
        </linearGradient>
      </defs>
      <path
        d="M20 2C20 2 10 14 10 24C10 29.5 14.5 34 20 34C25.5 34 30 29.5 30 24C30 14 20 2 20 2Z"
        fill="url(#logoFlame)"
      />
      <path
        d="M20 12C20 12 15 19 15 25C15 27.8 17.2 30 20 30C22.8 30 25 27.8 25 25C25 19 20 12 20 12Z"
        fill="url(#logoInner)"
      />
    </svg>
  );
}

function FlareLogo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 group">
      <FlareLogoMark />
      <div className="flex flex-col leading-none">
        <span className="text-[22px] font-[family-name:var(--font-heading)] font-800 tracking-tight text-black uppercase">
          Flaro
        </span>
        <span className="text-[8px] font-semibold tracking-[0.25em] uppercase text-red-600 mt-0.5">
          Fire Supplies
        </span>
      </div>
    </Link>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/90 backdrop-blur-xl border-b border-gray-200 shadow-sm"
          : "bg-white/60 backdrop-blur-md"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between h-20">
          <FlareLogo />

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative px-4 py-2 text-sm font-medium text-gray-600 hover:text-black transition-colors duration-200 group"
              >
                {link.label}
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-red-600 transition-all duration-300 group-hover:w-3/4 rounded-full" />
              </Link>
            ))}
          </div>

          {/* Right section */}
          <div className="hidden lg:flex items-center gap-4">
            <a
              href="tel:0405605196"
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors duration-200"
            >
              <Phone className="w-4 h-4" />
              <span>0405 605 196</span>
            </a>
            <Link
              href="/login"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-black transition-colors"
            >
              <User className="w-4 h-4" />
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all duration-300 shadow-md shadow-red-600/20 hover:shadow-red-700/30 hover:-translate-y-0.5"
            >
              Register for Pricing
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden relative w-10 h-10 flex items-center justify-center text-gray-600 hover:text-black transition-colors"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            <AnimatePresence mode="wait">
              {mobileOpen ? (
                <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <X className="w-6 h-6" />
                </motion.div>
              ) : (
                <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <Menu className="w-6 h-6" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </nav>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const }}
            className="lg:hidden overflow-hidden bg-white border-b border-gray-200"
          >
            <div className="px-4 py-6 space-y-1">
              {navLinks.map((link, i) => (
                <motion.div key={link.href} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06, duration: 0.3 }}>
                  <Link
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-3 text-lg font-medium text-gray-700 hover:text-black hover:bg-gray-50 rounded-lg transition-all duration-200"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: navLinks.length * 0.06, duration: 0.3 }} className="pt-4 space-y-3">
                <a href="tel:0405605196" className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:text-red-600 transition-colors">
                  <Phone className="w-5 h-5" />
                  <span className="text-lg">0405 605 196</span>
                </a>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="block mx-4 text-center px-5 py-3 text-base font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all duration-300"
                >
                  Register for Pricing
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
