"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import {
  ShieldCheck, Award, Users, CheckCircle2, ArrowRight,
  Truck, Headphones, UserPlus, Lock, Star, Building2,
  Flame, Wrench, Shield, Bell, Disc3, Droplets, Lightbulb,
  Signpost, Radio, Droplet, BrickWall, Heart, LockKeyhole,
} from "lucide-react";
import { categories, products } from "@/data/products";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

function FadeIn({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 40 }} animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }} transition={{ duration: 0.7, delay, ease: [0.25, 0.1, 0.25, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

const iconMap: Record<string, React.ElementType> = {
  flame: Flame, wrench: Wrench, shield: Shield, bell: Bell,
  disc: Disc3, droplets: Droplets, lightbulb: Lightbulb,
  signpost: Signpost, radio: Radio, droplet: Droplet,
  brickwall: BrickWall, heart: Heart, lock: LockKeyhole,
};

/* ── HERO ── */
function HeroSection() {
  return (
    <section className="relative min-h-[85vh] flex flex-col justify-center overflow-hidden bg-white">
      <div className="absolute top-0 right-0 w-[700px] h-[700px] rounded-full bg-red-50 blur-[120px] opacity-60" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-orange-50 blur-[100px] opacity-60" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <span className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 text-xs font-semibold tracking-widest uppercase text-red-600 border border-red-200 rounded-full bg-red-50">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
            Wholesale Fire Safety Supplier
          </span>

          <h1 className="font-[family-name:var(--font-heading)] text-4xl sm:text-5xl md:text-6xl lg:text-[64px] font-800 text-black leading-[1.05] tracking-tight max-w-4xl">
            Every fire safety product.{" "}
            <span className="bg-gradient-to-r from-red-600 via-orange-500 to-red-600 bg-clip-text text-transparent animate-gradient">
              One supplier.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl leading-relaxed">
            Australia&apos;s trusted wholesale source for AS/NZS certified fire extinguishers, alarms, hose reels, emergency lighting, signage and more. Register for trade pricing.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-start gap-4">
            <Link href="/shop" className="inline-flex items-center px-8 py-4 text-base font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-all duration-300 shadow-lg shadow-red-600/20 hover:shadow-red-700/30 hover:-translate-y-0.5">
              Browse Products
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link href="/register" className="inline-flex items-center px-8 py-4 text-base font-semibold text-black border-2 border-gray-200 rounded-xl hover:border-red-300 hover:bg-red-50 transition-all duration-300 hover:-translate-y-0.5">
              <UserPlus className="w-5 h-5 mr-2" />
              Register for Pricing
            </Link>
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
    </section>
  );
}

/* ── TRUST MARQUEE ── */
function TrustMarquee() {
  const items = [
    "AS/NZS 1841 Certified", "AS 3786 Compliant", "AS 2293 Compliant", "AS 1319 Signage",
    "AS/NZS 3504 Blankets", "AS 1221 Hose Reels", "AS 2419 Hydrants", "AS 4072 Passive Fire",
    "Wholesale Pricing", "Australia-Wide Delivery", "Sydney Based",
  ];

  return (
    <section className="py-4 bg-black text-white overflow-hidden">
      <div className="animate-marquee flex whitespace-nowrap">
        {[...items, ...items].map((item, i) => (
          <span key={i} className="mx-8 text-sm font-medium text-gray-300 flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-red-500" />
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ── CATEGORIES GRID ── */
function CategoriesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section ref={ref} className="relative py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-12">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-red-600">Full Product Range</span>
          <h2 className="mt-3 font-[family-name:var(--font-heading)] text-3xl sm:text-4xl lg:text-5xl font-800 text-black tracking-tight">
            Browse by Category
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            Everything you need from a single wholesale supplier. All AS/NZS certified.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categories.map((cat, i) => {
            const Icon = iconMap[cat.icon] || Flame;
            const count = products.filter((p) => p.category === cat.name).length;
            return (
              <motion.div
                key={cat.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
              >
                <Link href={`/shop?category=${encodeURIComponent(cat.name)}`} className="group block bg-white rounded-xl border border-gray-100 p-5 hover:border-red-200 hover:shadow-xl hover:shadow-red-600/[0.04] transition-all duration-500 h-full">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center shrink-0 group-hover:bg-red-100 transition-colors">
                      <Icon className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-black group-hover:text-red-600 transition-colors">{cat.name}</h3>
                      <p className="mt-0.5 text-xs text-gray-400">{count} products</p>
                      <p className="mt-1.5 text-xs text-gray-500 line-clamp-2">{cat.description}</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── WHY FLARO ── */
const whyCards = [
  { icon: Award, title: "100% AS/NZS Certified", description: "Every product meets or exceeds Australian and New Zealand Standards." },
  { icon: Users, title: "Wholesale Pricing", description: "Register for exclusive trade pricing. Competitive rates for resellers and contractors." },
  { icon: CheckCircle2, title: "Massive Range", description: "13 categories across fire extinguishers, alarms, detection, lighting, passive fire and more." },
  { icon: Truck, title: "Australia-Wide Delivery", description: "Fast dispatch from our Sydney warehouse. Same-day on orders before 12pm AEST." },
  { icon: Headphones, title: "Expert Support", description: "Fire safety professionals available for product selection and compliance questions." },
  { icon: Building2, title: "Trusted by Industry", description: "Strata managers, facility managers, contractors and resellers trust Flaro." },
];

function WhyFlaroSection() {
  return (
    <section className="relative py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-12">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-red-600">Why Flaro</span>
          <h2 className="mt-3 font-[family-name:var(--font-heading)] text-3xl sm:text-4xl lg:text-5xl font-800 text-black tracking-tight">
            Your wholesale fire safety partner
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {whyCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <FadeIn key={card.title} delay={i * 0.06}>
                <div className="bg-gray-50 rounded-xl p-7 h-full hover:bg-red-50/50 border border-transparent hover:border-red-100 transition-all duration-500 group">
                  <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center mb-5 group-hover:bg-red-100 transition-colors">
                    <Icon className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-base font-semibold text-black mb-2">{card.title}</h3>
                  <p className="text-gray-500 leading-relaxed text-sm">{card.description}</p>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── REGISTER CTA ── */
function RegisterCTA() {
  return (
    <section className="relative py-20 bg-black text-white overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-red-600/10 blur-[120px]" />
      <FadeIn>
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 text-xs font-semibold tracking-widest uppercase text-orange-400 border border-orange-500/30 rounded-full bg-orange-500/10">
            <Lock className="w-3.5 h-3.5" />
            Trade Pricing
          </div>
          <h2 className="font-[family-name:var(--font-heading)] text-3xl sm:text-4xl lg:text-5xl font-800 text-white tracking-tight leading-tight">
            Register to unlock wholesale pricing
          </h2>
          <p className="mt-6 text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Create a free account to view exclusive trade pricing on our entire range. Ideal for contractors, resellers, strata managers and facility managers.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="inline-flex items-center px-8 py-4 text-base font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-all duration-300 shadow-lg shadow-red-600/20">
              <UserPlus className="w-5 h-5 mr-2" />
              Create Free Account
            </Link>
            <Link href="/shop" className="inline-flex items-center px-8 py-4 text-base font-semibold text-white border border-white/20 rounded-xl hover:border-white/40 hover:bg-white/5 transition-all duration-300">
              Browse Products
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}

/* ── TESTIMONIALS ── */
const testimonials = [
  { quote: "Flaro made our strata compliance upgrade seamless. Every product certified and delivered on time.", name: "Sarah M.", role: "Strata Manager, Drummoyne" },
  { quote: "We outfitted three restaurant locations with Flaro. The wholesale pricing saved us thousands.", name: "James K.", role: "Restaurant Group Owner" },
  { quote: "As a fire safety contractor, I need reliable wholesale supply. Flaro is the best in the business.", name: "David L.", role: "Fire Safety Contractor, Parramatta" },
];

function TestimonialsSection() {
  return (
    <section className="relative py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-12">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-red-600">Testimonials</span>
          <h2 className="mt-3 font-[family-name:var(--font-heading)] text-3xl sm:text-4xl lg:text-5xl font-800 text-black tracking-tight">
            Trusted by professionals
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <FadeIn key={t.name} delay={i * 0.1}>
              <div className="bg-white rounded-xl border border-gray-100 p-7 h-full flex flex-col hover:shadow-lg transition-shadow duration-500">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-orange-400 text-orange-400" />
                  ))}
                </div>
                <p className="text-gray-600 leading-relaxed flex-1 text-sm">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <p className="font-semibold text-black text-sm">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.role}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── HOMEPAGE ── */
export default function HomePage() {
  return (
    <>
      <Navbar />
      <HeroSection />
      <TrustMarquee />
      <CategoriesSection />
      <WhyFlaroSection />
      <RegisterCTA />
      <TestimonialsSection />
      <Footer />
    </>
  );
}
