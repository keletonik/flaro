"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { UserPlus, Mail, Lock, User, Building2, Phone, CheckCircle, ArrowRight, ShieldCheck } from "lucide-react";

export default function RegisterPage() {
  const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "", phone: "", company: "", abn: "", password: "", confirmPassword: "", accountType: "" });
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.firstName.trim()) e.firstName = "Required";
    if (!formData.lastName.trim()) e.lastName = "Required";
    if (!formData.email.trim()) e.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = "Invalid email";
    if (!formData.password) e.password = "Required";
    else if (formData.password.length < 8) e.password = "Minimum 8 characters";
    if (formData.password !== formData.confirmPassword) e.confirmPassword = "Passwords don't match";
    if (!formData.accountType) e.accountType = "Please select account type";
    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length > 0) { setErrors(v); return; }
    setErrors({});
    setSubmitted(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => { const n = { ...p }; delete n[name]; return n; });
  };

  const inputCls = "w-full pl-11 pr-4 py-3.5 rounded-xl bg-white border border-gray-200 text-black placeholder-gray-400 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-all";
  const errorCls = "w-full pl-11 pr-4 py-3.5 rounded-xl bg-white border border-red-300 text-black placeholder-gray-400 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all";

  const accountTypes = ["Contractor / Installer", "Reseller / Distributor", "Strata Manager", "Facility Manager", "Property Developer", "Government / Council", "Other"];

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-red-50 blur-[120px] opacity-50" />
        <div className="relative z-10 max-w-lg mx-auto px-4 sm:px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center mb-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-5">
              <UserPlus className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="font-[family-name:var(--font-heading)] text-3xl sm:text-4xl font-800 text-black tracking-tight">Create Account</h1>
            <p className="mt-3 text-gray-500">Register to view wholesale pricing on our entire catalogue.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto rounded-full bg-green-50 flex items-center justify-center mb-6">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-semibold text-black mb-3">Registration Submitted</h3>
                <p className="text-gray-500 mb-6">We&apos;ll review your application and activate your account within 24 hours. You&apos;ll receive a confirmation email shortly.</p>
                <Link href="/shop" className="inline-flex items-center gap-2 text-red-600 font-semibold hover:underline">Browse Products <ArrowRight className="w-4 h-4" /></Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name *</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="First" className={errors.firstName ? errorCls : inputCls} />
                    </div>
                    {errors.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name *</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Last" className={errors.lastName ? errorCls : inputCls} />
                    </div>
                    {errors.lastName && <p className="mt-1 text-xs text-red-500">{errors.lastName}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@company.com" className={errors.email ? errorCls : inputCls} />
                  </div>
                  {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="04XX XXX XXX" className={inputCls} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Company</label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" name="company" value={formData.company} onChange={handleChange} placeholder="Company name" className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">ABN</label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" name="abn" value={formData.abn} onChange={handleChange} placeholder="XX XXX XXX XXX" className={inputCls} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Account Type *</label>
                  <select name="accountType" value={formData.accountType} onChange={handleChange} className={`w-full px-4 py-3.5 rounded-xl bg-white border ${errors.accountType ? "border-red-300" : "border-gray-200"} text-black focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-all ${!formData.accountType ? "text-gray-400" : ""}`}>
                    <option value="" disabled>Select account type</option>
                    {accountTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {errors.accountType && <p className="mt-1 text-xs text-red-500">{errors.accountType}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Min 8 chars" className={errors.password ? errorCls : inputCls} />
                    </div>
                    {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm *</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm" className={errors.confirmPassword ? errorCls : inputCls} />
                    </div>
                    {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>}
                  </div>
                </div>

                <button type="submit" className="w-full py-4 text-base font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-all duration-300 shadow-lg shadow-red-600/20 hover:shadow-red-700/30">
                  Create Account
                </button>

                <p className="text-center text-sm text-gray-500">
                  Already have an account?{" "}
                  <Link href="/login" className="text-red-600 font-medium hover:underline">Sign In</Link>
                </p>
              </form>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
