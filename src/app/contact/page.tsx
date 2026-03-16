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
  {
    icon: Phone,
    label: "Phone",
    value: "0405 605 196",
    detail: "Monday to Friday, 7:00 AM \u2014 5:00 PM AEST",
    href: "tel:0405605196",
  },
  {
    icon: MapPin,
    label: "Location",
    value: "Breakfast Point, NSW 2137",
    detail: "Sydney, Australia",
    href: undefined,
  },
  {
    icon: Mail,
    label: "Email",
    value: "hello@flaro.com.au",
    detail: "We typically respond within 2 business hours",
    href: "mailto:hello@flaro.com.au",
  },
];

const subjectOptions = [
  "General Enquiry",
  "Request a Quote",
  "Bulk Order",
  "Compliance Question",
  "Other",
];

const faqs = [
  {
    question: "Do you offer same-day dispatch?",
    answer:
      "Yes. Orders placed before 12:00 PM AEST on business days are dispatched same day from our Sydney warehouse. Standard delivery within the Sydney metro area is typically 1\u20132 business days.",
  },
  {
    question: "Are all your products certified to Australian Standards?",
    answer:
      "Absolutely. Every product we stock has been verified against the relevant Australian and/or New Zealand Standard. You\u2019ll find the specific certification displayed on each product page.",
  },
  {
    question: "Do you offer bulk or trade pricing?",
    answer:
      "Yes. We offer competitive pricing for bulk orders, strata schemes, facility managers, and trade customers. Contact us with your requirements for a tailored quote.",
  },
  {
    question: "Can you help me determine what equipment I need?",
    answer:
      "Of course. Our Compliance Kit Builder tool provides personalised recommendations based on your property type and size. For more complex requirements, our team is available for a free consultation.",
  },
  {
    question: "What is your returns policy?",
    answer:
      "We offer a 30-day returns policy on all unused, unopened products in their original packaging. Faulty items are covered by the manufacturer\u2019s warranty. Contact us to arrange a return.",
  },
  {
    question: "Do you deliver Australia-wide?",
    answer:
      "Yes. While we\u2019re based in Sydney and offer same-day metro dispatch, we deliver to all states and territories across Australia. Regional and remote delivery times may vary.",
  },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-white/[0.06] last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="text-base sm:text-lg font-medium text-white group-hover:text-cyan-400 transition-colors duration-200 pr-4">
          {question}
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex-shrink-0"
        >
          <ChevronDown className="w-5 h-5 text-slate-400" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-slate-400 leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!formData.subject) newErrors.subject = "Please select a subject";
    if (!formData.message.trim()) newErrors.message = "Message is required";
    return newErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setSubmitted(true);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const inputClasses =
    "w-full px-5 py-3.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all duration-300";
  const errorInputClasses =
    "w-full px-5 py-3.5 rounded-xl bg-white/[0.06] border border-red-500/50 text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all duration-300";

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
            Contact Us
          </motion.span>
          <motion.h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-[family-name:var(--font-heading)] font-bold text-white leading-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Get in Touch
          </motion.h1>
          <motion.p
            className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-slate-400 leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Whether you need a quote, have a compliance question, or want to discuss a bulk order,
            our Sydney-based team is here to help.
          </motion.p>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-10 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            {contactInfo.map((info, index) => {
              const Wrapper = info.href ? "a" : "div";
              const wrapperProps = info.href ? { href: info.href } : {};
              return (
                <motion.div
                  key={info.label}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{
                    duration: 0.5,
                    delay: index * 0.1,
                    ease: [0.25, 0.1, 0.25, 1] as const,
                  }}
                >
                  <Wrapper
                    {...wrapperProps}
                    className="group block p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.06] hover:border-cyan-500/20 transition-all duration-500 text-center"
                  >
                    <div className="w-14 h-14 mx-auto rounded-xl bg-cyan-500/10 flex items-center justify-center mb-5 group-hover:bg-cyan-500/20 transition-colors duration-300">
                      <info.icon className="w-7 h-7 text-cyan-400" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 mb-2">
                      {info.label}
                    </p>
                    <p className="text-xl font-semibold text-white mb-1">{info.value}</p>
                    <p className="text-sm text-slate-400">{info.detail}</p>
                  </Wrapper>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-12" {...fadeUp}>
            <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400 mb-3">
              Send a Message
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-[family-name:var(--font-heading)] font-bold text-white leading-tight">
              How Can We Help?
            </h2>
          </motion.div>

          <motion.div
            className="p-8 md:p-10 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm"
            {...fadeUp}
          >
            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="text-center py-12"
                >
                  <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center mb-6">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-2xl font-semibold text-white mb-3">Thank You!</h3>
                  <p className="text-slate-400 leading-relaxed max-w-md mx-auto">
                    Your message has been received. Our team will get back to you within 2 business
                    hours. If your enquiry is urgent, please call us on{" "}
                    <a href="tel:0405605196" className="text-cyan-400 hover:text-cyan-300">
                      0405 605 196
                    </a>
                    .
                  </p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({
                        name: "",
                        email: "",
                        phone: "",
                        company: "",
                        subject: "",
                        message: "",
                      });
                    }}
                    className="mt-8 inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-cyan-400 border border-cyan-500/30 rounded-xl hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-all duration-300"
                  >
                    Send Another Message
                  </button>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  onSubmit={handleSubmit}
                  className="space-y-6"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
                        Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Your full name"
                        className={errors.name ? errorInputClasses : inputClasses}
                      />
                      {errors.name && (
                        <p className="mt-1.5 text-sm text-red-400">{errors.name}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                        Email <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="you@example.com.au"
                        className={errors.email ? errorInputClasses : inputClasses}
                      />
                      {errors.email && (
                        <p className="mt-1.5 text-sm text-red-400">{errors.email}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-slate-300 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="04XX XXX XXX"
                        className={inputClasses}
                      />
                    </div>
                    <div>
                      <label htmlFor="company" className="block text-sm font-medium text-slate-300 mb-2">
                        Company <span className="text-slate-600">(optional)</span>
                      </label>
                      <input
                        type="text"
                        id="company"
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        placeholder="Your company name"
                        className={inputClasses}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-slate-300 mb-2">
                      Subject <span className="text-red-400">*</span>
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className={`${errors.subject ? errorInputClasses : inputClasses} ${
                        !formData.subject ? "text-slate-500" : ""
                      }`}
                    >
                      <option value="" disabled>
                        Select a subject
                      </option>
                      {subjectOptions.map((option) => (
                        <option key={option} value={option} className="bg-navy-900 text-white">
                          {option}
                        </option>
                      ))}
                    </select>
                    {errors.subject && (
                      <p className="mt-1.5 text-sm text-red-400">{errors.subject}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-slate-300 mb-2">
                      Message <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows={5}
                      placeholder="Tell us how we can help..."
                      className={`${errors.message ? errorInputClasses : inputClasses} resize-none`}
                    />
                    {errors.message && (
                      <p className="mt-1.5 text-sm text-red-400">{errors.message}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-navy-950 bg-cyan-500 rounded-xl hover:bg-cyan-400 transition-all duration-300 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-400/30 hover:-translate-y-0.5"
                  >
                    <Send className="w-5 h-5" />
                    Send Message
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 md:py-28 bg-navy-900/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-12 md:mb-16" {...fadeUp}>
            <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400 mb-3">
              Common Questions
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-[family-name:var(--font-heading)] font-bold text-white leading-tight">
              Frequently Asked Questions
            </h2>
          </motion.div>

          <motion.div
            className="rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm p-6 md:p-8"
            {...fadeUp}
          >
            {faqs.map((faq) => (
              <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
