"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import {
  ShieldCheck, FlameKindling, Siren, Construction, Lightbulb,
  SignpostBig, Award, Users, CheckCircle2, ArrowRight,
  Truck, Headphones, UserPlus, Package, Lock, Star,
  Zap, Heart, Building2,
} from "lucide-react";
import { categories } from "@/data/products";

/* ── Reusable scroll-animated wrapper ── */
function FadeIn({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 40 }} animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }} transition={{ duration: 0.7, delay, ease: [0.25, 0.1, 0.25, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

/* ── Category icons map ── */
const categoryIcons: Record<string, React.ElementType> = {
  "Fire Extinguishers": FlameKindling,
  "Fire Blankets": ShieldCheck,
  "Smoke Alarms & Detectors": Siren,
  "Fire Hose Reels": Construction,
  "Fire Hydrant Equipment": Construction,
  "Emergency & Exit Lighting": Lightbulb,
  "Fire Safety Signage": SignpostBig,
  "Fire Cabinets & Brackets": Package,
  "First Aid": Heart,
  "Fire Warden Equipment": Users,
  "Fire Door Hardware": Lock,
  "Sprinkler Components": Zap,
};

/* ═══════════════════════════════════════════════════════════════ */
/*  HERO SECTION                                                   */
/* ═══════════════════════════════════════════════════════════════ */
function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex flex-col justify-center overflow-hidden bg-white">
      {/* Subtle background accents */}
      <div className="absolute top-0 right-0 w-[700px] h-[700px] rounded-full bg-red-50 blur-[120px] opacity-60" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-orange-50 blur-[100px] opacity-60" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text */}
          <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}>
            <span className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 text-xs font-semibold tracking-widest uppercase text-red-600 border border-red-200 rounded-full bg-red-50">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
              Wholesale Fire Safety Supplier
            </span>

            <h1 className="font-[family-name:var(--font-heading)] text-4xl sm:text-5xl md:text-6xl lg:text-[64px] font-800 text-black leading-[1.05] tracking-tight">
              Every fire safety product.{" "}
              <span className="bg-gradient-to-r from-red-600 via-orange-500 to-red-600 bg-clip-text text-transparent animate-gradient">
                One supplier.
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-xl leading-relaxed">
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

            {/* Stats */}
            <div className="mt-12 flex flex-wrap gap-8">
              {[
                { value: "100+", label: "Products" },
                { value: "12", label: "Categories" },
                { value: "AS/NZS", label: "Certified" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl font-800 font-[family-name:var(--font-heading)] text-black">{stat.value}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: Featured image / visual */}
          <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }} className="relative hidden lg:block">
            <div className="relative aspect-square max-w-lg mx-auto">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-red-100 via-orange-50 to-red-50 border border-red-100/50" />
              <div className="absolute inset-4 rounded-2xl overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=600&fit=crop"
                  alt="Fire safety equipment"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
              {/* Floating badge */}
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-4 -right-4 bg-white rounded-2xl p-4 shadow-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-black">AS/NZS Certified</p>
                    <p className="text-xs text-gray-500">Every product</p>
                  </div>
                </div>
              </motion.div>
              {/* Floating badge 2 */}
              <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="absolute -bottom-4 -left-4 bg-white rounded-2xl p-4 shadow-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-black">Australia-Wide</p>
                    <p className="text-xs text-gray-500">Fast delivery</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom divider */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  TRUST MARQUEE                                                  */
/* ═══════════════════════════════════════════════════════════════ */
function TrustMarquee() {
  const items = [
    "AS/NZS 1841 Certified", "AS 3786 Compliant", "AS 2293 Compliant", "AS 1319 Signage",
    "AS/NZS 3504 Blankets", "AS 1221 Hose Reels", "AS 2419 Hydrants", "100+ Products",
    "12 Categories", "Wholesale Pricing", "Australia-Wide Delivery", "Sydney Based",
  ];

  return (
    <section className="py-5 bg-black text-white overflow-hidden">
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

/* ═══════════════════════════════════════════════════════════════ */
/*  PRODUCT CATEGORIES GRID                                        */
/* ═══════════════════════════════════════════════════════════════ */
function CategoriesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section ref={ref} className="relative py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-16">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-red-600">Full Product Range</span>
          <h2 className="mt-3 font-[family-name:var(--font-heading)] text-3xl sm:text-4xl lg:text-5xl font-800 text-black tracking-tight">
            12 Categories. Hundreds of Products.
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            Everything you need from a single wholesale supplier. All AS/NZS certified.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {categories.map((cat, i) => {
            const Icon = categoryIcons[cat.name] || Package;
            return (
              <motion.div
                key={cat.slug}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={{ duration: 0.5, delay: i * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <Link href={`/shop?category=${encodeURIComponent(cat.name)}`} className="group block bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-red-200 hover:shadow-xl hover:shadow-red-600/[0.04] transition-all duration-500 h-full">
                  {/* Image */}
                  <div className="relative h-40 overflow-hidden bg-gray-100">
                    <Image src={cat.image} alt={cat.name} fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <div className="absolute bottom-3 left-3">
                      <div className="w-9 h-9 rounded-lg bg-white/90 backdrop-blur flex items-center justify-center">
                        <Icon className="w-5 h-5 text-red-600" />
                      </div>
                    </div>
                  </div>
                  {/* Text */}
                  <div className="p-5">
                    <h3 className="text-base font-semibold text-black group-hover:text-red-600 transition-colors duration-300">{cat.name}</h3>
                    <p className="mt-1.5 text-sm text-gray-500 leading-relaxed line-clamp-2">{cat.description}</p>
                    <div className="mt-3 flex items-center text-sm font-medium text-red-600 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                      View Products <ArrowRight className="w-4 h-4 ml-1" />
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

/* ═══════════════════════════════════════════════════════════════ */
/*  WHY FLARO                                                      */
/* ═══════════════════════════════════════════════════════════════ */
const whyCards = [
  { icon: Award, title: "100% AS/NZS Certified", description: "Every product meets or exceeds Australian and New Zealand Standards. No exceptions." },
  { icon: Users, title: "Wholesale Pricing", description: "Register for exclusive trade pricing. Competitive rates for resellers, contractors and property managers." },
  { icon: CheckCircle2, title: "Massive Range", description: "12 categories, 100+ products. Fire extinguishers to sprinkler components — all from one supplier." },
  { icon: Truck, title: "Australia-Wide Delivery", description: "Fast dispatch from our Sydney warehouse. Same-day dispatch on orders placed before 12pm AEST." },
  { icon: Headphones, title: "Expert Support", description: "Our team of fire safety professionals are available to help with product selection and compliance questions." },
  { icon: Building2, title: "Trusted by Industry", description: "Strata managers, facility managers, contractors and resellers trust Flaro for reliable supply." },
];

function WhyFlaroSection() {
  return (
    <section className="relative py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-16">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-red-600">Why Flaro</span>
          <h2 className="mt-3 font-[family-name:var(--font-heading)] text-3xl sm:text-4xl lg:text-5xl font-800 text-black tracking-tight">
            Your wholesale fire safety partner
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {whyCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <FadeIn key={card.title} delay={i * 0.08}>
                <div className="bg-gray-50 rounded-2xl p-8 h-full hover:bg-red-50/50 border border-transparent hover:border-red-100 transition-all duration-500 group">
                  <div className="w-14 h-14 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center mb-6 group-hover:bg-red-100 transition-colors duration-300">
                    <Icon className="w-7 h-7 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-black mb-2">{card.title}</h3>
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

/* ═══════════════════════════════════════════════════════════════ */
/*  REGISTER CTA                                                   */
/* ═══════════════════════════════════════════════════════════════ */
function RegisterCTA() {
  return (
    <section className="relative py-24 bg-black text-white overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-red-600/10 blur-[120px]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-orange-500/10 blur-[100px]" />

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
            <Link href="/register" className="inline-flex items-center px-8 py-4 text-base font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-all duration-300 shadow-lg shadow-red-600/20 hover:shadow-red-700/30 hover:-translate-y-0.5">
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

/* ═══════════════════════════════════════════════════════════════ */
/*  TESTIMONIALS                                                   */
/* ═══════════════════════════════════════════════════════════════ */
const testimonials = [
  { quote: "Flaro made our strata compliance upgrade seamless. Every product certified and delivered on time. Our go-to fire safety supplier now.", name: "Sarah M.", role: "Strata Manager, Drummoyne" },
  { quote: "We outfitted three restaurant locations with Flaro. The wholesale pricing and product range saved us thousands compared to retail suppliers.", name: "James K.", role: "Restaurant Group Owner" },
  { quote: "As a fire safety contractor, I need reliable wholesale supply. Flaro's range, pricing and fast dispatch make them the best in the business.", name: "David L.", role: "Fire Safety Contractor, Parramatta" },
];

function TestimonialsSection() {
  return (
    <section className="relative py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-16">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-red-600">Testimonials</span>
          <h2 className="mt-3 font-[family-name:var(--font-heading)] text-3xl sm:text-4xl lg:text-5xl font-800 text-black tracking-tight">
            Trusted by professionals
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <FadeIn key={t.name} delay={i * 0.12}>
              <div className="bg-white rounded-2xl border border-gray-100 p-8 h-full flex flex-col hover:shadow-lg transition-shadow duration-500">
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-orange-400 text-orange-400" />
                  ))}
                </div>
                <p className="text-gray-600 leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-6 pt-5 border-t border-gray-100">
                  <p className="font-semibold text-black">{t.name}</p>
                  <p className="text-sm text-gray-500">{t.role}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  HOMEPAGE                                                       */
/* ═══════════════════════════════════════════════════════════════ */
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <TrustMarquee />
      <CategoriesSection />
      <WhyFlaroSection />
      <RegisterCTA />
      <TestimonialsSection />
    </>
  );
}
