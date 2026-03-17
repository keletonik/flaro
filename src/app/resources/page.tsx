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
  { title: "The Complete Guide to AFSS for Sydney Building Owners", excerpt: "Annual Fire Safety Statements are a legal requirement for most NSW buildings. This guide breaks down who needs one, what\u2019s involved, and how to avoid common pitfalls.", tag: "Compliance", tagColour: "bg-red-50 text-red-600", readTime: "8 min read", slug: "#" },
  { title: "AS 1851-2012: What the 2026 Mandatory Changes Mean for You", excerpt: "NSW has mandated the adoption of AS 1851-2012 for the routine servicing of fire protection systems. Here\u2019s what building owners and facility managers need to know.", tag: "Regulation", tagColour: "bg-orange-50 text-orange-600", readTime: "6 min read", slug: "#" },
  { title: "Choosing the Right Fire Extinguisher: A Complete Australian Guide", excerpt: "ABE, CO2, wet chemical, foam \u2014 with so many types available, selecting the correct fire extinguisher can be overwhelming. This guide simplifies the decision.", tag: "Buying Guide", tagColour: "bg-green-50 text-green-700", readTime: "10 min read", slug: "#" },
  { title: "Lithium-Ion Battery Fire Safety in Strata Car Parks", excerpt: "With the rise of EVs and e-bikes, lithium-ion battery fires in residential car parks are an emerging risk. Learn what strata committees should be doing now.", tag: "Emerging Risks", tagColour: "bg-red-50 text-red-600", readTime: "5 min read", slug: "#" },
  { title: "NSW Smoke Alarm Legislation: What Homeowners Must Know", excerpt: "Recent changes to NSW smoke alarm requirements affect every residential property. From photoelectric-only mandates to placement rules, here\u2019s your checklist.", tag: "Compliance", tagColour: "bg-red-50 text-red-600", readTime: "7 min read", slug: "#" },
  { title: "Top 5 Fire Safety Risks in Commercial Kitchens", excerpt: "Commercial kitchens face unique fire hazards from cooking oils, gas equipment, and electrical appliances. Discover the top five risks and how to mitigate them.", tag: "Industry", tagColour: "bg-purple-50 text-purple-600", readTime: "6 min read", slug: "#" },
];

const downloads = [
  { title: "Pre-Audit Checklist for Building Owners", description: "Ensure your property is ready for a fire safety audit with this comprehensive checklist covering all essential fire safety measures." },
  { title: "Annual Fire Safety Planning Calendar", description: "A month-by-month guide to staying on top of your fire safety maintenance obligations under AS 1851." },
  { title: "Fire Extinguisher Selection Chart", description: "A quick-reference chart to help you choose the right extinguisher type for your specific fire risks and premises." },
];

export default function ResourcesPage() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) { setSubscribed(true); setEmail(""); }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-50 rounded-full blur-[120px] opacity-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-red-600 mb-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>Knowledge Centre</motion.span>
          <motion.h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-[family-name:var(--font-heading)] font-800 text-black leading-tight tracking-tight" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>Resource Hub</motion.h1>
          <motion.p className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-gray-500 leading-relaxed" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
            Expert guides, compliance updates, and practical advice to keep your property safe and compliant.
          </motion.p>
        </div>
      </section>

      {/* Articles */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-12 md:mb-16" {...fadeUp}>
            <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-red-600 mb-3">Latest Articles</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-[family-name:var(--font-heading)] font-800 text-black leading-tight tracking-tight">Featured Guides & Insights</h2>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {articles.map((article, index) => (
              <motion.article key={article.title} className="group rounded-2xl overflow-hidden bg-white border border-gray-100 hover:border-red-200 hover:shadow-lg transition-all duration-500" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5, delay: index * 0.08, ease: [0.25, 0.1, 0.25, 1] as const }}>
                <div className="h-4 bg-gradient-to-r from-red-600 to-orange-500" />
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${article.tagColour}`}>{article.tag}</span>
                    <span className="flex items-center gap-1 text-xs text-gray-400"><Clock className="w-3 h-3" />{article.readTime}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-black mb-3 leading-snug group-hover:text-red-600 transition-colors duration-300">{article.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed mb-4">{article.excerpt}</p>
                  <Link href={article.slug} className="inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors group/link">
                    Read More <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Downloads */}
      <section className="py-20 md:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-12 md:mb-16" {...fadeUp}>
            <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-red-600 mb-3">Free Downloads</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-[family-name:var(--font-heading)] font-800 text-black leading-tight tracking-tight">Downloadable Resources</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {downloads.map((item, index) => (
              <motion.div key={item.title} className="group p-8 rounded-2xl bg-white border border-gray-100 hover:border-red-200 hover:shadow-lg transition-all duration-500" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5, delay: index * 0.1, ease: [0.25, 0.1, 0.25, 1] as const }}>
                <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-5 group-hover:bg-red-100 transition-colors"><FileText className="w-6 h-6 text-red-600" /></div>
                <h3 className="text-lg font-semibold text-black mb-3">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-6">{item.description}</p>
                <button className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-all">
                  <Download className="w-4 h-4" /> Download PDF
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="relative overflow-hidden rounded-3xl bg-black p-10 md:p-16 text-center" {...fadeUp}>
            <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-red-600/10 blur-[100px]" />
            <div className="relative max-w-xl mx-auto">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-red-600/10 flex items-center justify-center mb-6"><Mail className="w-7 h-7 text-red-500" /></div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-[family-name:var(--font-heading)] font-800 text-white leading-tight mb-4">Stay Informed</h2>
              <p className="text-gray-400 leading-relaxed mb-8">Get compliance updates and expert fire safety insights delivered to your inbox.</p>
              {subscribed ? (
                <motion.div className="flex items-center justify-center gap-3 text-green-400" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                  <CheckCircle className="w-6 h-6" /><span className="text-lg font-medium">Thanks for subscribing!</span>
                </motion.div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3">
                  <input type="email" required placeholder="Enter your email address" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 px-5 py-3.5 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all" />
                  <button type="submit" className="px-8 py-3.5 text-base font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/20">Subscribe</button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
