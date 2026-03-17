"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Phone, UserPlus, LogIn } from "lucide-react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Products" },
  { href: "/about", label: "About" },
  { href: "/resources", label: "Resources" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-18">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
                <path d="M12 2C8.5 6 4 9.5 4 14a8 8 0 0016 0c0-4.5-4.5-8-8-12zm0 18a6 6 0 01-6-6c0-3.5 3-6.2 6-9.8 3 3.6 6 6.3 6 9.8a6 6 0 01-6 6z" />
              </svg>
            </div>
            <div className="leading-none">
              <span className="text-lg font-800 font-[family-name:var(--font-heading)] text-black tracking-tight">FLARO</span>
              <span className="block text-[9px] font-semibold tracking-[0.2em] uppercase text-red-600 -mt-0.5">Fire Supplies</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50/50">
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop right */}
          <div className="hidden lg:flex items-center gap-3">
            <a href="tel:1300000000" className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors">
              <Phone className="w-4 h-4" />
              1300 000 000
            </a>
            <Link href="/login" className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors">
              <LogIn className="w-4 h-4" />
              Sign In
            </Link>
            <Link href="/register" className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
              <UserPlus className="w-4 h-4" />
              Register for Pricing
            </Link>
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setOpen(!open)} className="lg:hidden p-2 text-gray-600 hover:text-black">
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden bg-white border-t border-gray-100 px-4 pb-4">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="block py-3 text-base font-medium text-gray-700 hover:text-red-600 border-b border-gray-50">
              {link.label}
            </Link>
          ))}
          <div className="flex flex-col gap-2 mt-4">
            <Link href="/login" className="text-center py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg">Sign In</Link>
            <Link href="/register" className="text-center py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg">Register for Pricing</Link>
          </div>
        </div>
      )}
    </header>
  );
}
