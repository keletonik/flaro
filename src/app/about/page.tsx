"use client";

import { motion } from "framer-motion";
import { Shield, Search, Eye, Handshake, Award, CheckCircle, Building2, Flag } from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const },
};

const staggerContainer = {
  initial: {},
  whileInView: { transition: { staggerChildren: 0.1 } },
  viewport: { once: true, margin: "-80px" },
};

const staggerItem = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const } },
  viewport: { once: true, margin: "-80px" },
};

const values = [
  {
    icon: Shield,
    title: "Uncompromising Quality",
    description:
      "We stock only equipment that meets or exceeds Australian Standards. If it doesn\u2019t pass our vetting process, it doesn\u2019t make our shelves.",
  },
  {
    icon: Search,
    title: "Expert Curation",
    description:
      "Our team includes certified fire safety practitioners who review every product we carry. When we recommend something, it\u2019s backed by real-world expertise.",
  },
  {
    icon: Eye,
    title: "Radical Transparency",
    description:
      "No hidden fees. No confusing jargon. Clear product certifications, honest pricing, and straightforward compliance guidance.",
  },
  {
    icon: Handshake,
    title: "Customer Partnership",
    description:
      "We don\u2019t see customers \u2014 we see partners in safety. From a single smoke alarm to a full building fit-out, we\u2019re with you every step.",
  },
];

const team = [
  {
    name: "Michael Chen",
    role: "Founder & Managing Director",
    bio: "With over 15 years in fire protection services across Sydney, Michael founded Flaro to bridge the gap between compliance complexity and accessible safety solutions.",
    gradient: "from-cyan-500 to-blue-600",
    initials: "MC",
  },
  {
    name: "Sarah Thompson",
    role: "Head of Product & Compliance",
    bio: "A certified fire safety practitioner (FPAS), Sarah leads our product vetting process. Her expertise ensures every item meets the strictest Australian Standards.",
    gradient: "from-ember-500 to-amber-500",
    initials: "ST",
  },
  {
    name: "David Okafor",
    role: "Operations & Customer Experience",
    bio: "David ensures every order is dispatched accurately and on time. His background in logistics and supply chain management keeps Flaro running smoothly.",
    gradient: "from-violet-500 to-purple-600",
    initials: "DO",
  },
];

const certifications = [
  { icon: Award, label: "FPAS Accredited", description: "Fire Protection Association Australia" },
  { icon: CheckCircle, label: "AS/NZS Certified Products", description: "Australian & New Zealand Standards" },
  { icon: Flag, label: "Australian Owned", description: "Proudly local, independently operated" },
  { icon: Building2, label: "NSW Fire & Rescue Aligned", description: "Aligned with state fire safety guidelines" },
];

export default function AboutPage() {
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
            Who We Are
          </motion.span>
          <motion.h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-[family-name:var(--font-heading)] font-bold text-white leading-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            About Flaro
          </motion.h1>
          <motion.p
            className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-slate-400 leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Born from a belief that fire safety should be simple, transparent, and expertly guided.
          </motion.p>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            <motion.div {...fadeUp}>
              <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400 mb-3">
                Our Story
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-[family-name:var(--font-heading)] font-bold text-white leading-tight">
                Simplifying fire safety for Australia
              </h2>
            </motion.div>
            <motion.div
              className="space-y-6 text-slate-300 leading-relaxed text-base sm:text-lg"
              {...fadeUp}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] as const }}
            >
              <p>
                Flaro was founded in Breakfast Point, NSW, with a singular mission: to become
                Australia&apos;s most trusted source of fire safety equipment. We saw an industry
                plagued by confusion, outdated suppliers, and a lack of transparency. Property
                owners, strata managers, and business operators were left navigating a maze of
                Australian Standards and compliance requirements with little guidance.
              </p>
              <p>We decided to change that.</p>
              <p>
                Every product in our catalogue is hand-selected by our team of fire safety
                professionals. We don&apos;t just sell equipment &mdash; we curate solutions. Each
                item is verified against the relevant Australian and New Zealand Standards, so when
                you purchase from Flaro, you purchase with absolute confidence.
              </p>
              <p>
                Our name, derived from &lsquo;flare,&rsquo; represents our energy, our visibility,
                and our commitment to shining a light on what truly matters: the safety of people and
                property.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-20 md:py-28 bg-navy-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-12 md:mb-16" {...fadeUp}>
            <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400 mb-3">
              What Drives Us
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-[family-name:var(--font-heading)] font-bold text-white leading-tight">
              Our Values
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                className="group relative p-6 sm:p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.06] hover:border-cyan-500/20 transition-all duration-500"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: index * 0.1, ease: [0.25, 0.1, 0.25, 1] as const }}
              >
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-5 group-hover:bg-cyan-500/20 transition-colors duration-300">
                  <value.icon className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-3">{value.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Team */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-12 md:mb-16" {...fadeUp}>
            <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400 mb-3">
              The People Behind Flaro
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-[family-name:var(--font-heading)] font-bold text-white leading-tight">
              Our Team
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
              A dedicated group of fire safety professionals committed to keeping Australians safe.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <motion.div
                key={member.name}
                className="group relative p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm text-center hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-500"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: index * 0.1, ease: [0.25, 0.1, 0.25, 1] as const }}
              >
                <div
                  className={`w-24 h-24 mx-auto rounded-full bg-gradient-to-br ${member.gradient} flex items-center justify-center mb-6 shadow-lg`}
                >
                  <span className="text-2xl font-bold text-white">{member.initials}</span>
                </div>
                <h3 className="text-xl font-semibold text-white">{member.name}</h3>
                <p className="text-sm text-cyan-400 font-medium mt-1 mb-4">{member.role}</p>
                <p className="text-sm text-slate-400 leading-relaxed">{member.bio}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Certifications & Partnerships */}
      <section className="py-20 md:py-28 bg-navy-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-12 md:mb-16" {...fadeUp}>
            <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400 mb-3">
              Trust & Credentials
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-[family-name:var(--font-heading)] font-bold text-white leading-tight">
              Certifications & Partnerships
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {certifications.map((cert, index) => (
              <motion.div
                key={cert.label}
                className="group relative p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm text-center hover:bg-white/[0.06] hover:border-cyan-500/20 transition-all duration-500"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: index * 0.1, ease: [0.25, 0.1, 0.25, 1] as const }}
              >
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-cyan-500/10 to-ember-500/10 border border-cyan-500/20 flex items-center justify-center mb-4 group-hover:border-cyan-500/40 transition-colors duration-300">
                  <cert.icon className="w-8 h-8 text-cyan-400" />
                </div>
                <h3 className="text-base font-semibold text-white mb-1">{cert.label}</h3>
                <p className="text-sm text-slate-500">{cert.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
