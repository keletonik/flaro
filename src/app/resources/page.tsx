"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Clock, ArrowRight, Download, FileText, Mail, CheckCircle } from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const },
};

const articles = [
  {
    title: "The Complete Guide to AFSS for Sydney Building Owners",
    excerpt:
      "Annual Fire Safety Statements are a legal requirement for most NSW buildings. This guide breaks down who needs one, what\u2019s involved, and how to avoid common pitfalls.",
    tag: "Compliance",
    tagColour: "bg-cyan-500/20 text-cyan-300",
    readTime: "8 min read",
    gradient: "from-cyan-500/10 to-blue-600/10",
    slug: "complete-guide-afss-sydney",
  },
  {
    title: "AS 1851-2012: What the 2026 Mandatory Changes Mean for You",
    excerpt:
      "NSW has mandated the adoption of AS 1851-2012 for the routine servicing of fire protection systems. Here\u2019s what building owners and facility managers need to know to prepare.",
    tag: "Regulation",
    tagColour: "bg-ember-500/20 text-ember-400",
    readTime: "6 min read",
    gradient: "from-ember-500/10 to-amber-500/10",
    slug: "as-1851-2012-mandatory-changes",
  },
  {
    title: "Choosing the Right Fire Extinguisher: A Complete Australian Guide",
    excerpt:
      "ABE, CO2, wet chemical, foam \u2014 with so many types available, selecting the correct fire extinguisher for your premises can be overwhelming. This guide simplifies the decision.",
    tag: "Buying Guide",
    tagColour: "bg-green-500/20 text-green-300",
    readTime: "10 min read",
    gradient: "from-green-500/10 to-emerald-600/10",
    slug: "choosing-right-fire-extinguisher",
  },
  {
    title: "Lithium-Ion Battery Fire Safety in Strata Car Parks",
    excerpt:
      "With the rise of electric vehicles and e-bikes, lithium-ion battery fires in residential car parks are an emerging risk. Learn what strata committees should be doing now.",
    tag: "Emerging Risks",
    tagColour: "bg-red-500/20 text-red-300",
    readTime: "5 min read",
    gradient: "from-red-500/10 to-rose-600/10",
    slug: "lithium-ion-battery-fire-safety",
  },
  {
    title: "NSW Smoke Alarm Legislation: What Homeowners Must Know",
    excerpt:
      "Recent changes to NSW smoke alarm requirements affect every residential property. From photoelectric-only mandates to placement rules, here\u2019s your compliance checklist.",
    tag: "Compliance",
    tagColour: "bg-cyan-500/20 text-cyan-300",
    readTime: "7 min read",
    gradient: "from-cyan-500/10 to-indigo-500/10",
    slug: "nsw-smoke-alarm-legislation",
  },
  {
    title: "Top 5 Fire Safety Risks in Commercial Kitchens",
    excerpt:
      "Commercial kitchens face unique fire hazards from cooking oils, gas equipment, and electrical appliances. Discover the top five risks and how to mitigate them with the right equipment.",
    tag: "Industry",
    tagColour: "bg-violet-500/20 text-violet-300",
    readTime: "6 min read",
    gradient: "from-violet-500/10 to-purple-600/10",
    slug: "fire-safety-risks-commercial-kitchens",
  },
];

const downloads = [
  {
    title: "Pre-Audit Checklist for Building Owners",
    description:
      "Ensure your property is ready for a fire safety audit with this comprehensive checklist covering all essential fire safety measures.",
  },
  {
    title: "Annual Fire Safety Planning Calendar",
    description:
      "A month-by-month guide to staying on top of your fire safety maintenance obligations under AS 1851.",
  },
  {
    title: "Fire Extinguisher Selection Chart",
    description:
      "A quick-reference chart to help you choose the right extinguisher type for your specific fire risks and premises.",
  },
];

export default function ResourcesPage() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
    }
  };

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
            Knowledge Centre
          </motion.span>
          <motion.h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-[family-name:var(--font-heading)] font-bold text-white leading-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Resource Hub
          </motion.h1>
          <motion.p
            className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-slate-400 leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Expert guides, compliance updates, and practical advice to keep your property safe and
            compliant.
          </motion.p>
        </div>
      </section>

      {/* Featured Articles */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-12 md:mb-16" {...fadeUp}>
            <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400 mb-3">
              Latest Articles
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-[family-name:var(--font-heading)] font-bold text-white leading-tight">
              Featured Guides & Insights
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {articles.map((article, index) => (
              <motion.article
                key={article.slug}
                className="group relative rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-500"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: index * 0.08, ease: [0.25, 0.1, 0.25, 1] as const }}
              >
                {/* Gradient header */}
                <div className={`h-32 bg-gradient-to-br ${article.gradient} relative`}>
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 to-transparent" />
                  <div className="absolute bottom-4 left-4 flex items-center gap-3">
                    <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${article.tagColour}`}>
                      {article.tag}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="w-3 h-3" />
                      {article.readTime}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-3 leading-snug group-hover:text-cyan-400 transition-colors duration-300">
                    {article.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-4">
                    {article.excerpt}
                  </p>
                  <Link
                    href={`/resources/${article.slug}`}
                    className="inline-flex items-center gap-2 text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors duration-200 group/link"
                  >
                    Read More
                    <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform duration-200" />
                  </Link>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Downloadable Resources */}
      <section className="py-20 md:py-28 bg-navy-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-12 md:mb-16" {...fadeUp}>
            <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400 mb-3">
              Free Downloads
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-[family-name:var(--font-heading)] font-bold text-white leading-tight">
              Downloadable Resources
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {downloads.map((item, index) => (
              <motion.div
                key={item.title}
                className="group relative p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.06] hover:border-cyan-500/20 transition-all duration-500"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: index * 0.1, ease: [0.25, 0.1, 0.25, 1] as const }}
              >
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-5 group-hover:bg-cyan-500/20 transition-colors duration-300">
                  <FileText className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-3">{item.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-6">{item.description}</p>
                <button className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-all duration-300">
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-500/10 via-navy-800 to-ember-500/10 border border-white/[0.08] p-10 md:p-16 text-center"
            {...fadeUp}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-navy-950/50 to-transparent" />
            <div className="relative max-w-xl mx-auto">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-6">
                <Mail className="w-7 h-7 text-cyan-400" />
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-[family-name:var(--font-heading)] font-bold text-white leading-tight mb-4">
                Stay Informed
              </h2>
              <p className="text-slate-400 leading-relaxed mb-8">
                Stay ahead of regulatory changes and get expert fire safety insights delivered to your
                inbox.
              </p>

              {subscribed ? (
                <motion.div
                  className="flex items-center justify-center gap-3 text-green-400"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <CheckCircle className="w-6 h-6" />
                  <span className="text-lg font-medium">
                    Thanks for subscribing! Check your inbox soon.
                  </span>
                </motion.div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    required
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 px-5 py-3.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all duration-300"
                  />
                  <button
                    type="submit"
                    className="px-8 py-3.5 text-base font-semibold text-navy-950 bg-cyan-500 rounded-xl hover:bg-cyan-400 transition-all duration-300 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-400/30 hover:-translate-y-0.5 whitespace-nowrap"
                  >
                    Subscribe
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
