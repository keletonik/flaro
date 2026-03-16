"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Package, Wrench, RefreshCw, UserCheck, Building, Factory, ArrowRight, Phone } from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const },
};

const services = [
  {
    icon: Package,
    title: "Bulk & Trade Pricing",
    description:
      "Outfitting a multi-storey building or managing equipment across a portfolio of properties? Our trade pricing is designed for volume purchasers. Contact us for a tailored quote that reflects your requirements.",
    gradient: "from-cyan-500/20 to-blue-600/20",
    borderHover: "hover:border-cyan-500/30",
  },
  {
    icon: Wrench,
    title: "Compliance Kit Builder",
    description:
      "Our interactive compliance kit builder takes the guesswork out of equipping your property. Answer a few questions about your building class, size, and usage, and we\u2019ll generate a recommended equipment list aligned with current Australian Standards and NSW regulations.",
    gradient: "from-ember-500/20 to-amber-500/20",
    borderHover: "hover:border-ember-500/30",
  },
  {
    icon: RefreshCw,
    title: "Subscription & Auto-Replenishment",
    description:
      "Never miss a service deadline. Our compliance subscription automatically reminds you when equipment is due for testing or replacement under AS 1851. Opt in to auto-replenishment for consumables like extinguisher service tags and smoke alarm batteries.",
    gradient: "from-violet-500/20 to-purple-600/20",
    borderHover: "hover:border-violet-500/30",
  },
  {
    icon: UserCheck,
    title: "Dedicated Account Management",
    description:
      "Enterprise clients receive a dedicated Flaro account manager \u2014 your single point of contact for quotes, orders, compliance queries, and product recommendations. We\u2019re an extension of your team.",
    gradient: "from-green-500/20 to-emerald-600/20",
    borderHover: "hover:border-green-500/30",
  },
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/[0.03] to-transparent" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyan-500/[0.04] rounded-full blur-[120px]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.span
            className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400 mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            B2B Solutions
          </motion.span>
          <motion.h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-[family-name:var(--font-heading)] font-bold text-white leading-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Business & Trade Services
          </motion.h1>
          <motion.p
            className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-slate-400 leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Dedicated solutions for strata managers, facility managers, and commercial property
            owners across Sydney and NSW.
          </motion.p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-12 md:mb-16" {...fadeUp}>
            <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400 mb-3">
              What We Offer
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-[family-name:var(--font-heading)] font-bold text-white leading-tight">
              Services Built for Business
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {services.map((service, index) => (
              <motion.div
                key={service.title}
                className={`group relative p-8 lg:p-10 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm ${service.borderHover} transition-all duration-500 hover:bg-white/[0.06]`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: index * 0.1, ease: [0.25, 0.1, 0.25, 1] as const }}
              >
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${service.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative">
                  <div className="w-14 h-14 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-6 group-hover:bg-cyan-500/20 transition-colors duration-300">
                    <service.icon className="w-7 h-7 text-cyan-400" />
                  </div>
                  <h3 className="text-xl lg:text-2xl font-semibold text-white mb-4">
                    {service.title}
                  </h3>
                  <p className="text-slate-400 leading-relaxed">{service.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* For Strata Managers */}
      <section className="py-20 md:py-28 bg-navy-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            <motion.div {...fadeUp}>
              <div className="w-14 h-14 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-6">
                <Building className="w-7 h-7 text-cyan-400" />
              </div>
              <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400 mb-3">
                Strata Solutions
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-[family-name:var(--font-heading)] font-bold text-white leading-tight">
                For Strata Managers
              </h2>
            </motion.div>
            <motion.div
              className="space-y-6 text-slate-300 leading-relaxed text-base sm:text-lg"
              {...fadeUp}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] as const }}
            >
              <p>
                Managing fire safety compliance across a strata scheme is complex. Between Annual
                Fire Safety Statements (AFSS), tenant coordination, and evolving NSW regulations, the
                burden on strata committees and managers is significant.
              </p>
              <p>
                Flaro simplifies this. We supply all the certified equipment your building needs
                &mdash; from photoelectric smoke alarms compliant with the latest NSW legislation to
                fire extinguishers, blankets, and signage. Our team understands the specific
                requirements for Class 2 and Class 3 buildings under the Building Code of Australia,
                and we&apos;re here to ensure your property meets every obligation.
              </p>
              <p className="text-white font-medium">
                Need a complete AFSS-ready equipment audit? Contact us for a free consultation.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-medium transition-colors duration-200 group"
              >
                Request a Free Consultation
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* For Facility Managers */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            <motion.div {...fadeUp}>
              <div className="w-14 h-14 rounded-xl bg-ember-500/10 flex items-center justify-center mb-6">
                <Factory className="w-7 h-7 text-ember-400" />
              </div>
              <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400 mb-3">
                Commercial Solutions
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-[family-name:var(--font-heading)] font-bold text-white leading-tight">
                For Facility Managers
              </h2>
            </motion.div>
            <motion.div
              className="space-y-6 text-slate-300 leading-relaxed text-base sm:text-lg"
              {...fadeUp}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] as const }}
            >
              <p>
                For facility managers overseeing commercial, industrial, or mixed-use sites, Flaro
                offers a streamlined procurement solution. Our product range covers every category of
                fire safety equipment required under AS 1851, from portable extinguishers to emergency
                lighting and hydrant fittings.
              </p>
              <p>
                We understand the pressures of managing multiple sites, tight maintenance windows, and
                strict compliance timelines. That&apos;s why we offer same-day dispatch from our
                Sydney warehouse, bulk pricing, and dedicated account support to keep your properties
                safe and compliant.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-medium transition-colors duration-200 group"
              >
                Get in Touch
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28 bg-navy-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-500/10 via-navy-800 to-ember-500/10 border border-white/[0.08] p-10 md:p-16 text-center"
            {...fadeUp}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-navy-950/50 to-transparent" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-[family-name:var(--font-heading)] font-bold text-white leading-tight mb-4">
                Ready to Streamline Your Fire Safety Procurement?
              </h2>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">
                Whether you manage one building or one hundred, Flaro has the solutions, pricing, and
                expertise to support your fire safety needs.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-navy-950 bg-cyan-500 rounded-xl hover:bg-cyan-400 transition-all duration-300 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-400/30 hover:-translate-y-0.5"
                >
                  Contact Our Team
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <a
                  href="tel:0405605196"
                  className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-white bg-white/[0.06] border border-white/[0.1] rounded-xl hover:bg-white/[0.1] transition-all duration-300"
                >
                  <Phone className="w-5 h-5" />
                  0405 605 196
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
