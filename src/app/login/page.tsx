"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, LogIn, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v: Record<string, string> = {};
    if (!formData.email.trim()) v.email = "Required";
    if (!formData.password) v.password = "Required";
    if (Object.keys(v).length > 0) { setErrors(v); return; }
    setErrors({});
    alert("Login functionality coming soon. Please register for an account.");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => { const n = { ...p }; delete n[name]; return n; });
  };

  const inputCls = "w-full pl-11 pr-4 py-3.5 rounded-xl bg-white border border-gray-200 text-black placeholder-gray-400 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-all";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <section className="relative w-full max-w-md mx-auto px-4 sm:px-6 py-32">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-5">
            <LogIn className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="font-[family-name:var(--font-heading)] text-3xl sm:text-4xl font-800 text-black tracking-tight">Sign In</h1>
          <p className="mt-3 text-gray-500">Access your account to view wholesale pricing.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@company.com" className={inputCls} />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Your password" className={inputCls} />
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
            </div>

            <button type="submit" className="w-full py-4 text-base font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-all duration-300 shadow-lg shadow-red-600/20 hover:shadow-red-700/30">
              Sign In
            </button>

            <p className="text-center text-sm text-gray-500">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-red-600 font-medium hover:underline">Register</Link>
            </p>
          </form>
        </motion.div>
      </section>
    </div>
  );
}
