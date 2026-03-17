"use client";

import { useState, useRef, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  SlidersHorizontal, ChevronDown, ShieldCheck, Lock, Search, X,
  UserPlus, ArrowRight, Package,
} from "lucide-react";
import { products, categories, type Product } from "@/data/products";

function FadeIn({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }} transition={{ duration: 0.6, delay, ease: [0.25, 0.1, 0.25, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

function ProductCard({ product, index }: { product: Product; index: number }) {
  return (
    <FadeIn delay={Math.min(index * 0.04, 0.4)}>
      <motion.div whileHover={{ y: -4 }} className="bg-white rounded-2xl border border-gray-100 overflow-hidden group h-full flex flex-col hover:border-red-200 hover:shadow-xl hover:shadow-red-600/[0.04] transition-all duration-500">
        {/* Image */}
        <div className="relative h-48 bg-gray-50 overflow-hidden">
          <Image src={product.image} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
          {/* Category badge */}
          <span className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase bg-white/90 backdrop-blur text-gray-700 rounded-md border border-gray-200">
            {product.subcategory}
          </span>
          {product.badge && (
            <span className="absolute top-3 right-3 px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase bg-red-600 text-white rounded-md">
              {product.badge}
            </span>
          )}
        </div>

        {/* Details */}
        <div className="p-5 flex flex-col flex-1">
          <h3 className="text-sm font-semibold text-black mb-1.5 leading-snug group-hover:text-red-600 transition-colors duration-300">
            {product.name}
          </h3>

          {product.certifications.length > 0 && (
            <div className="flex items-center gap-1.5 mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span className="text-xs font-medium text-red-600">{product.certifications.join(", ")}</span>
            </div>
          )}

          <p className="text-sm text-gray-500 leading-relaxed mb-5 flex-1">{product.description}</p>

          <div className="flex items-center justify-between mt-auto">
            <div className="flex items-center gap-1.5 text-gray-400">
              <Lock className="w-4 h-4" />
              <span className="text-sm font-medium">Register for pricing</span>
            </div>
          </div>
        </div>
      </motion.div>
    </FadeIn>
  );
}

function ShopContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "All";

  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOpen, setSortOpen] = useState(false);
  const [sort, setSort] = useState<"name-asc" | "name-desc" | "category">("category");

  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) setActiveCategory(cat);
  }, [searchParams]);

  const categoryNames = ["All", ...categories.map((c) => c.name)];

  const filtered = useMemo(() => {
    let items = activeCategory === "All" ? [...products] : products.filter((p) => p.category === activeCategory);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.subcategory.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    switch (sort) {
      case "name-asc":
        items.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        items.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "category":
        items.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
        break;
    }
    return items;
  }, [activeCategory, searchQuery, sort]);

  const sortOptions = [
    { label: "Category", value: "category" as const },
    { label: "Name A\u2013Z", value: "name-asc" as const },
    { label: "Name Z\u2013A", value: "name-desc" as const },
  ];

  const currentSortLabel = sortOptions.find((o) => o.value === sort)?.label ?? "Sort";

  return (
    <>
      {/* Hero */}
      <section className="relative pt-32 pb-16 bg-white overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[400px] rounded-full bg-red-50 blur-[100px] opacity-50" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <h1 className="font-[family-name:var(--font-heading)] text-4xl sm:text-5xl lg:text-6xl font-800 text-black tracking-tight">
              Product Catalogue
            </h1>
            <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
              {products.length} products across {categories.length} categories. All AS/NZS certified.{" "}
              <Link href="/register" className="text-red-600 font-medium hover:underline">Register</Link> to view pricing.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filters & Grid */}
      <section className="relative pb-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Search */}
          <div className="relative max-w-lg mx-auto mb-8 -mt-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-12 pr-10 py-3.5 bg-white border border-gray-200 rounded-xl text-black placeholder-gray-400 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400 hover:text-black" />
              </button>
            )}
          </div>

          {/* Category filters */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-8">
            <div className="flex flex-wrap gap-2">
              {categoryNames.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200 cursor-pointer ${
                    activeCategory === cat
                      ? "bg-red-600 text-white border-red-600 shadow-md shadow-red-600/20"
                      : "text-gray-600 border-gray-200 hover:border-red-200 hover:text-red-600 bg-white"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="relative">
              <button onClick={() => setSortOpen(!sortOpen)} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors cursor-pointer">
                <SlidersHorizontal className="w-4 h-4" />
                {currentSortLabel}
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${sortOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {sortOpen && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} className="absolute right-0 mt-2 w-44 rounded-xl bg-white border border-gray-200 shadow-xl z-30 overflow-hidden">
                    {sortOptions.map((opt) => (
                      <button key={opt.value} onClick={() => { setSort(opt.value); setSortOpen(false); }} className={`block w-full text-left px-4 py-3 text-sm cursor-pointer ${sort === opt.value ? "text-red-600 bg-red-50" : "text-gray-600 hover:bg-gray-50"}`}>
                        {opt.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Count */}
          <p className="text-sm text-gray-500 mb-6">
            Showing {filtered.length} product{filtered.length !== 1 ? "s" : ""}
            {activeCategory !== "All" && <> in <span className="text-black font-medium">{activeCategory}</span></>}
            {searchQuery && <> matching &ldquo;<span className="text-black font-medium">{searchQuery}</span>&rdquo;</>}
          </p>

          {/* Grid */}
          <AnimatePresence mode="wait">
            <motion.div key={activeCategory + sort + searchQuery} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </motion.div>
          </AnimatePresence>

          {filtered.length === 0 && (
            <div className="text-center py-20">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg text-gray-500">No products found. Try a different search or category.</p>
            </div>
          )}

          {/* Register CTA */}
          <div className="mt-16 bg-black rounded-2xl p-8 sm:p-12 text-center">
            <h3 className="font-[family-name:var(--font-heading)] text-2xl sm:text-3xl font-700 text-white mb-3">
              Want to see pricing?
            </h3>
            <p className="text-gray-400 mb-6 max-w-lg mx-auto">
              Register for a free account to view exclusive wholesale pricing on our entire catalogue.
            </p>
            <Link href="/register" className="inline-flex items-center px-8 py-4 text-base font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-all duration-300 shadow-lg shadow-red-600/20 hover:-translate-y-0.5">
              <UserPlus className="w-5 h-5 mr-2" />
              Register for Pricing
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Loading products...</p></div>}>
      <ShopContent />
    </Suspense>
  );
}
