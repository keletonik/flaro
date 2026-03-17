"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, MapPin, Mail, Send, ChevronDown, CheckCircle } from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const },
};

const contactInfo = [
  { icon: Phone, label: "Phone", value: "0405 605 196", detail: "Monday to Friday, 7:00 AM \u2014 5:00 PM AEST", href: "tel:0405605196" },
  { icon: MapPin, label: "Location", value: "Breakfast Point, NSW 2137", detail: "Sydney, Australia", href: undefined },
  { icon: Mail, label: "Email", value: "hello@flarofire.com.au", detail: "We typically respond within 2 business hours", href: "mailto:hello@flarofire.com.au" },
];

const subjectOptions = ["General Enquiry", "Request a Quote", "Bulk / Wholesale Order", "Product Question", "Compliance Question", "Other"];

const faqs = [
  { question: "Do you offer same-day dispatch?", answer: "Yes. Orders placed before 12:00 PM AEST on business days are dispatched same day from our Sydney warehouse. Standard delivery within the Sydney metro area is typically 1\u20132 business days." },
  { question: "Are all your products certified to Australian Standards?", answer: "Absolutely. Every product we stock has been verified against the relevant Australian and/or New Zealand Standard. You\u2019ll find the specific certification displayed on each product listing." },
  { question: "How do I view pricing?", answer: "Pricing is available to registered customers only. Create a free account to view exclusive wholesale pricing on our entire catalogue. Registration is reviewed and approved within 24 hours." },
  { question: "Do you offer bulk or trade pricing?", answer: "Yes. As a wholesale supplier, we offer competitive pricing for all registered customers. Volume discounts are available for large orders. Contact us for a tailored quote." },
  { question: "What is your returns policy?", answer: "We offer a 30-day returns policy on all unused, unopened products in their original packaging. Faulty items are covered by the manufacturer\u2019s warranty. Contact us to arrange a return." },
  { question: "Do you deliver Australia-wide?", answer: "Yes. While we\u2019re based in Sydney and offer same-day metro dispatch, we deliver to all states and territories across Australia. Regional and remote delivery times may vary." },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-5 text-left group">
        <span className="text-base sm:text-lg font-medium text-black group-hover:text-red-600 transition-colors duration-200 pr-4">{question}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.3 }} className="flex-shrink-0">
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
            <p className="pb-5 text-gray-500 leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", company: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.name.trim()) e.name = "Name is required";
    if (!formData.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = "Invalid email";
    if (!formData.subject) e.subject = "Please select a subject";
    if (!formData.message.trim()) e.message = "Message is required";
    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length > 0) { setErrors(v); return; }
    setErrors({});
    setSubmitted(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => { const n = { ...p }; delete n[name]; return n; });
  };

  const inputCls = "w-full px-5 py-3.5 rounded-xl bg-white border border-gray-200 text-black placeholder-gray-400 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-all";
  const errorCls = "w-full px-5 py-3.5 rounded-xl bg-white border border-red-300 text-black placeholder-gray-400 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all";

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-50 rounded-full blur-[120px] opacity-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-red-600 mb-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>Contact Us</motion.span>
          <motion.h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-[family-name:var(--font-heading)] font-800 text-black leading-tight tracking-tight" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>Get in Touch</motion.h1>
          <motion.p className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-gray-500 leading-relaxed" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
            Whether you need a quote, have a product question, or want to discuss a wholesale order, our Sydney-based team is here to help.
          </motion.p>
        </div>
      </section>

      {/* Contact Info */}
      <section className="py-10 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            {contactInfo.map((info, index) => {
              const Wrapper = info.href ? "a" : "div";
              const wrapperProps = info.href ? { href: info.href } : {};
              return (
                <motion.div key={info.label} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5, delay: index * 0.1, ease: [0.25, 0.1, 0.25, 1] as const }}>
                  <Wrapper {...wrapperProps} className="group block p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:border-red-200 hover:shadow-lg transition-all duration-500 text-center">
                    <div className="w-14 h-14 mx-auto rounded-xl bg-red-50 flex items-center justify-center mb-5 group-hover:bg-red-100 transition-colors duration-300">
                      <info.icon className="w-7 h-7 text-red-600" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-400 mb-2">{info.label}</p>
                    <p className="text-xl font-semibold text-black mb-1">{info.value}</p>
                    <p className="text-sm text-gray-500">{info.detail}</p>
                  </Wrapper>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-12" {...fadeUp}>
            <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-red-600 mb-3">Send a Message</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-[family-name:var(--font-heading)] font-800 text-black leading-tight tracking-tight">How Can We Help?</h2>
          </motion.div>
          <motion.div className="p-8 md:p-10 rounded-2xl bg-gray-50 border border-gray-100" {...fadeUp}>
            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="text-center py-12">
                  <div className="w-16 h-16 mx-auto rounded-full bg-green-50 flex items-center justify-center mb-6"><CheckCircle className="w-8 h-8 text-green-600" /></div>
                  <h3 className="text-2xl font-semibold text-black mb-3">Thank You!</h3>
                  <p className="text-gray-500 leading-relaxed max-w-md mx-auto">Your message has been received. Our team will get back to you within 2 business hours.</p>
                  <button onClick={() => { setSubmitted(false); setFormData({ name: "", email: "", phone: "", company: "", subject: "", message: "" }); }} className="mt-8 inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-all">Send Another Message</button>
                </motion.div>
              ) : (
                <motion.form key="form" onSubmit={handleSubmit} className="space-y-6" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">Name <span className="text-red-500">*</span></label>
                      <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Your full name" className={errors.name ? errorCls : inputCls} />
                      {errors.name && <p className="mt-1.5 text-sm text-red-500">{errors.name}</p>}
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email <span className="text-red-500">*</span></label>
                      <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" className={errors.email ? errorCls : inputCls} />
                      {errors.email && <p className="mt-1.5 text-sm text-red-500">{errors.email}</p>}
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="04XX XXX XXX" className={inputCls} />
                    </div>
                    <div>
                      <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                      <input type="text" id="company" name="company" value={formData.company} onChange={handleChange} placeholder="Company name" className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">Subject <span className="text-red-500">*</span></label>
                    <select id="subject" name="subject" value={formData.subject} onChange={handleChange} className={`${errors.subject ? errorCls : inputCls} ${!formData.subject ? "text-gray-400" : ""}`}>
                      <option value="" disabled>Select a subject</option>
                      {subjectOptions.map((o) => <option key={o} value={o} className="text-black">{o}</option>)}
                    </select>
                    {errors.subject && <p className="mt-1.5 text-sm text-red-500">{errors.subject}</p>}
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">Message <span className="text-red-500">*</span></label>
                    <textarea id="message" name="message" value={formData.message} onChange={handleChange} rows={5} placeholder="Tell us how we can help..." className={`${errors.message ? errorCls : inputCls} resize-none`} />
                    {errors.message && <p className="mt-1.5 text-sm text-red-500">{errors.message}</p>}
                  </div>
                  <button type="submit" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-all duration-300 shadow-lg shadow-red-600/20 hover:-translate-y-0.5">
                    <Send className="w-5 h-5" /> Send Message
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 md:py-28 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-12 md:mb-16" {...fadeUp}>
            <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-red-600 mb-3">Common Questions</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-[family-name:var(--font-heading)] font-800 text-black leading-tight tracking-tight">FAQ</h2>
          </motion.div>
          <motion.div className="rounded-2xl bg-white border border-gray-100 p-6 md:p-8" {...fadeUp}>
            {faqs.map((faq) => <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />)}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
