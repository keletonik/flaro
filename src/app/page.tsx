"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import {
  ShieldCheck,
  FlameKindling,
  Siren,
  Construction,
  Lightbulb,
  RectangleEllipsis,
  SignpostBig,
  Award,
  Users,
  CheckCircle2,
  ShoppingCart,
  Star,
  AlertTriangle,
  ArrowRight,
  Package,
  Truck,
  Headphones,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Reusable scroll-animated wrapper                                  */
/* ------------------------------------------------------------------ */
function FadeInSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Ember particles (CSS-based)                                       */
/* ------------------------------------------------------------------ */
function EmberParticles() {
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    size: 2 + Math.random() * 4,
    duration: 6 + Math.random() * 10,
    delay: Math.random() * 8,
    opacity: 0.25 + Math.random() * 0.4,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="fire-particle absolute rounded-full"
          style={{
            left: p.left,
            bottom: "-10px",
            width: p.size,
            height: p.size,
            background: `radial-gradient(circle, #fb923c 0%, #ea580c 100%)`,
            opacity: p.opacity,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero section                                                      */
/* ------------------------------------------------------------------ */
function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950 animate-gradient" />
      <div className="noise-overlay absolute inset-0" />

      {/* Subtle radial glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] rounded-full bg-cyan-500/[0.04] blur-[120px]" />

      <EmberParticles />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <span className="inline-block mb-6 px-4 py-1.5 text-xs font-semibold tracking-widest uppercase text-cyan-400 border border-cyan-500/30 rounded-full bg-cyan-500/[0.06]">
            Trusted across NSW since 2024
          </span>

          <h1 className="font-[family-name:var(--font-heading)] text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1] max-w-4xl mx-auto">
            Unwavering Fire Safety for Every Australian Property
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Expert-curated, Australian Standards certified fire safety equipment.
            From smoke alarms to complete building compliance kits &mdash; delivered to
            your door.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/shop"
              className="inline-flex items-center px-8 py-4 text-base font-semibold text-navy-950 bg-cyan-400 rounded-xl hover:bg-cyan-300 transition-all duration-300 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-400/40 hover:-translate-y-0.5"
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Shop Equipment
            </Link>
            <Link
              href="/build-your-kit"
              className="inline-flex items-center px-8 py-4 text-base font-semibold text-white border border-white/20 rounded-xl hover:border-white/40 hover:bg-white/[0.04] transition-all duration-300 hover:-translate-y-0.5"
            >
              Build Your Kit
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-20 grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto"
        >
          {[
            { icon: Package, label: "10,000+ Products Shipped" },
            { icon: ShieldCheck, label: "100% AS/NZS Certified" },
            { icon: Truck, label: "Same-Day Sydney Dispatch" },
            { icon: Headphones, label: "Expert Support" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-2 text-center"
            >
              <Icon className="w-6 h-6 text-cyan-400" />
              <span className="text-sm font-medium text-slate-300">
                {label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-navy-950 to-transparent" />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Bento grid section                                                */
/* ------------------------------------------------------------------ */
const bentoItems = [
  {
    title: "Fire Extinguishers",
    description:
      "ABE, CO2, Wet Chemical & more. Every type certified to AS/NZS 1841.",
    icon: FlameKindling,
    gradient: "from-red-600/20 to-orange-600/10",
    large: true,
  },
  {
    title: "Smoke & Fire Alarms",
    description:
      "Photoelectric, smart IoT, interconnected wireless. Compliant with AS 3786.",
    icon: Siren,
    gradient: "from-cyan-600/20 to-blue-600/10",
    large: true,
  },
  {
    title: "Fire Hose Reels",
    description:
      "Complete hose reel systems, nozzles, and fittings for commercial properties.",
    icon: Construction,
    gradient: "from-emerald-600/20 to-teal-600/10",
    large: false,
  },
  {
    title: "Emergency & Exit Lighting",
    description:
      "LED exit signs, emergency lights. Certified to AS 2293.",
    icon: Lightbulb,
    gradient: "from-yellow-600/20 to-amber-600/10",
    large: false,
  },
  {
    title: "Fire Blankets",
    description:
      "AS/NZS 3504 certified blankets for kitchens, workshops, and vehicles.",
    icon: RectangleEllipsis,
    gradient: "from-purple-600/20 to-violet-600/10",
    large: false,
  },
  {
    title: "Safety Signage",
    description:
      "Full range of AS 1319 compliant safety and evacuation signage.",
    icon: SignpostBig,
    gradient: "from-pink-600/20 to-rose-600/10",
    large: false,
  },
];

function BentoGridSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section ref={ref} className="relative py-28 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeInSection className="text-center mb-16">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-cyan-400">
            Our Range
          </span>
          <h2 className="mt-4 font-[family-name:var(--font-heading)] text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
            Everything You Need. Expertly Curated.
          </h2>
        </FadeInSection>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {bentoItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={{
                  duration: 0.6,
                  delay: i * 0.1,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                whileHover={{ scale: 1.03 }}
                className={`group relative rounded-2xl overflow-hidden cursor-pointer ${
                  item.large ? "lg:col-span-2 min-h-[280px]" : "min-h-[220px]"
                }`}
              >
                {/* Background gradient */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${item.gradient}`}
                />
                <div className="absolute inset-0 glass" />

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-end h-full p-6 sm:p-8">
                  <div className="mb-4 w-12 h-12 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center group-hover:bg-cyan-500/10 group-hover:border-cyan-500/20 transition-colors duration-300">
                    <Icon className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="mt-4 flex items-center text-sm font-medium text-cyan-400 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                    Shop now
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Why Flaro section                                                 */
/* ------------------------------------------------------------------ */
const whyFlaroCards = [
  {
    icon: Award,
    title: "Certified to Australian Standards",
    description:
      "Every product we sell meets or exceeds the relevant Australian and New Zealand Standards. No exceptions, no compromises.",
  },
  {
    icon: Users,
    title: "Expert-Curated Selection",
    description:
      "Our range is hand-selected by fire safety professionals with decades of industry experience across NSW.",
  },
  {
    icon: CheckCircle2,
    title: "Compliance Made Simple",
    description:
      "From individual smoke alarms to complete building compliance kits, we make meeting your obligations straightforward.",
  },
];

function WhyFlaroSection() {
  return (
    <section className="relative py-28 overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-ember-500/[0.03] blur-[100px]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeInSection className="text-center mb-16">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-ember-400">
            Why Flaro
          </span>
          <h2 className="mt-4 font-[family-name:var(--font-heading)] text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
            The Standard You Deserve
          </h2>
        </FadeInSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {whyFlaroCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <FadeInSection key={card.title} delay={i * 0.15}>
                <div className="glass rounded-2xl p-8 h-full hover:border-cyan-500/20 transition-colors duration-300">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/10 flex items-center justify-center mb-6">
                    <Icon className="w-7 h-7 text-cyan-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">
                    {card.title}
                  </h3>
                  <p className="text-slate-400 leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </FadeInSection>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Featured products section                                         */
/* ------------------------------------------------------------------ */
const featuredProducts = [
  {
    name: "4.5kg ABE Dry Powder Fire Extinguisher",
    price: 89.95,
    description:
      "Suitable for Class A, B, and E fires. Ideal for offices, workshops, and vehicles.",
    gradient: "from-red-700/40 to-orange-600/20",
    icon: FlameKindling,
  },
  {
    name: "Photoelectric Smoke Alarm \u2014 10 Year Battery",
    price: 49.95,
    description:
      "Australian-made. Compliant with AS 3786-2014. No wiring required.",
    gradient: "from-cyan-700/40 to-blue-600/20",
    icon: Siren,
  },
  {
    name: "1.2m x 1.8m Fire Blanket \u2014 Commercial Grade",
    price: 34.95,
    description:
      "AS/NZS 3504 certified. Essential for commercial kitchens and workshops.",
    gradient: "from-purple-700/40 to-violet-600/20",
    icon: RectangleEllipsis,
  },
  {
    name: "LED Emergency Exit Sign \u2014 Maintained",
    price: 129.95,
    description:
      "AS 2293 compliant. Energy-efficient LED with 3-hour battery backup.",
    gradient: "from-yellow-700/40 to-amber-600/20",
    icon: Lightbulb,
  },
];

function FeaturedProductsSection() {
  return (
    <section className="relative py-28 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeInSection className="text-center mb-16">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-cyan-400">
            Popular Picks
          </span>
          <h2 className="mt-4 font-[family-name:var(--font-heading)] text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
            Best Sellers
          </h2>
        </FadeInSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product, i) => {
            const Icon = product.icon;
            return (
              <FadeInSection key={product.name} delay={i * 0.12}>
                <div className="glass rounded-2xl overflow-hidden group hover:border-cyan-500/20 transition-all duration-300">
                  {/* Image placeholder */}
                  <div
                    className={`relative h-48 bg-gradient-to-br ${product.gradient} flex items-center justify-center`}
                  >
                    <Icon className="w-16 h-16 text-white/30 group-hover:text-white/50 transition-colors duration-300" />
                  </div>

                  {/* Details */}
                  <div className="p-5">
                    <h3 className="text-base font-semibold text-white mb-2 leading-snug">
                      {product.name}
                    </h3>
                    <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                      {product.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-white">
                        ${product.price.toFixed(2)}
                      </span>
                      <button className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-navy-950 bg-cyan-400 rounded-lg hover:bg-cyan-300 transition-all duration-300 shadow-md shadow-cyan-500/15 hover:shadow-cyan-400/25">
                        <ShoppingCart className="w-4 h-4" />
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              </FadeInSection>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Testimonials section                                              */
/* ------------------------------------------------------------------ */
const testimonials = [
  {
    quote:
      "Flaro made our strata compliance upgrade painless. Every product arrived certified and ready to install. Highly recommend for any building manager.",
    name: "Sarah M.",
    role: "Strata Manager, Drummoyne",
  },
  {
    quote:
      "We outfitted our entire restaurant with Flaro equipment. The compliance kit tool saved us hours of research. Everything met Australian Standards.",
    name: "James K.",
    role: "Restaurant Owner, Breakfast Point",
  },
  {
    quote:
      "As a facility manager overseeing multiple sites, I need a supplier I can trust. Flaro\u2019s expert curation and fast dispatch are unmatched.",
    name: "David L.",
    role: "Facility Manager, Parramatta",
  },
];

function TestimonialsSection() {
  return (
    <section className="relative py-28 overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-cyan-500/[0.02] blur-[100px]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeInSection className="text-center mb-16">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-cyan-400">
            Testimonials
          </span>
          <h2 className="mt-4 font-[family-name:var(--font-heading)] text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
            Trusted by Professionals
          </h2>
        </FadeInSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <FadeInSection key={t.name} delay={i * 0.15}>
              <div className="glass rounded-2xl p-8 h-full flex flex-col">
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star
                      key={j}
                      className="w-4 h-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
                <p className="text-slate-300 leading-relaxed flex-1 italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-6 pt-5 border-t border-white/[0.06]">
                  <p className="font-semibold text-white">{t.name}</p>
                  <p className="text-sm text-slate-400">{t.role}</p>
                </div>
              </div>
            </FadeInSection>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  CTA banner                                                        */
/* ------------------------------------------------------------------ */
function CtaBanner() {
  return (
    <section className="relative py-28 overflow-hidden">
      <FadeInSection>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-navy-800 via-navy-900 to-navy-800" />
            <div className="absolute inset-0 noise-overlay" />
            {/* Ember glow */}
            <div className="absolute -top-20 right-20 w-60 h-60 rounded-full bg-ember-500/10 blur-[80px]" />
            <div className="absolute -bottom-20 left-20 w-60 h-60 rounded-full bg-cyan-500/10 blur-[80px]" />

            <div className="relative z-10 py-16 px-8 sm:px-16 text-center">
              <h2 className="font-[family-name:var(--font-heading)] text-3xl sm:text-4xl font-bold text-white mb-4">
                Not Sure What You Need?
              </h2>
              <p className="text-lg text-slate-400 max-w-xl mx-auto mb-8">
                Use our free Compliance Kit Builder to get a personalised
                recommendation based on your property type and size.
              </p>
              <Link
                href="/build-your-kit"
                className="inline-flex items-center px-8 py-4 text-base font-semibold text-navy-950 bg-cyan-400 rounded-xl hover:bg-cyan-300 transition-all duration-300 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-400/40 hover:-translate-y-0.5"
              >
                Build Your Kit
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </FadeInSection>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Regulatory alert banner                                           */
/* ------------------------------------------------------------------ */
function RegulatoryAlertBanner() {
  return (
    <section className="relative py-12 overflow-hidden">
      <FadeInSection>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-2xl border border-ember-500/30 bg-ember-500/[0.04] p-6 sm:p-8 flex flex-col sm:flex-row items-start gap-5">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-ember-500/10 border border-ember-500/20 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-ember-400" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <span className="inline-block px-3 py-1 text-xs font-bold tracking-wide uppercase text-ember-400 bg-ember-500/10 border border-ember-500/20 rounded-full">
                  2026 AS 1851 Update
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                New mandatory maintenance requirements under AS 1851-2012 are
                now in effect across NSW. Ensure your fire protection equipment
                meets the latest standards.
              </p>
              <Link
                href="/resources"
                className="inline-flex items-center mt-3 text-sm font-semibold text-ember-400 hover:text-ember-300 transition-colors duration-200"
              >
                Learn More
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      </FadeInSection>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Homepage                                                          */
/* ------------------------------------------------------------------ */
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <BentoGridSection />
      <WhyFlaroSection />
      <FeaturedProductsSection />
      <TestimonialsSection />
      <CtaBanner />
      <RegulatoryAlertBanner />
    </>
  );
}
