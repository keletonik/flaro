"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ChevronRight, ChevronDown, ShieldCheck, Lock, UserPlus,
  Flame, Wrench, Shield, Bell, Disc3, Droplets, Lightbulb,
  Signpost, Radio, Droplet, BrickWall, Heart, LockKeyhole,
} from "lucide-react";
import { categories, products, type Product, type Category } from "@/data/products";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const iconMap: Record<string, React.ElementType> = {
  flame: Flame, wrench: Wrench, shield: Shield, bell: Bell,
  disc: Disc3, droplets: Droplets, lightbulb: Lightbulb,
  signpost: Signpost, radio: Radio, droplet: Droplet,
  brickwall: BrickWall, heart: Heart, lock: LockKeyhole,
};

function ShopContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "";

  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCats, setExpandedCats] = useState<Set<string>>(
    new Set(initialCategory ? [initialCategory] : [])
  );

  const toggleExpand = (catName: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(catName)) next.delete(catName);
      else next.add(catName);
      return next;
    });
  };

  const selectCategory = (catName: string) => {
    setSelectedCategory(catName);
    setSelectedSubcategory("");
    setExpandedCats((prev) => new Set(prev).add(catName));
  };

  const selectSubcategory = (catName: string, sub: string) => {
    setSelectedCategory(catName);
    setSelectedSubcategory(sub);
  };

  const filteredProducts = useMemo(() => {
    let items = [...products];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.subcategory.toLowerCase().includes(q)
      );
    } else if (selectedSubcategory) {
      items = items.filter((p) => p.subcategory === selectedSubcategory);
    } else if (selectedCategory) {
      items = items.filter((p) => p.category === selectedCategory);
    }
    return items;
  }, [selectedCategory, selectedSubcategory, searchQuery]);

  const activeCat = categories.find((c) => c.name === selectedCategory);

  return (
    <>
      {/* Header */}
      <section className="pt-24 pb-8 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="font-[family-name:var(--font-heading)] text-2xl sm:text-3xl font-800 text-black">
                {selectedSubcategory || (selectedCategory ? selectedCategory : "All Products")}
              </h1>
              {selectedCategory && !selectedSubcategory && activeCat && (
                <p className="mt-1 text-sm text-gray-500">{activeCat.description}</p>
              )}
            </div>
            {/* Search */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value) {
                    setSelectedCategory("");
                    setSelectedSubcategory("");
                  }
                }}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-red-300 focus:ring-1 focus:ring-red-300 bg-white"
              />
            </div>
          </div>

          {/* Breadcrumb */}
          {(selectedCategory || searchQuery) && (
            <nav className="mt-3 flex items-center gap-1.5 text-sm text-gray-400">
              <button onClick={() => { setSelectedCategory(""); setSelectedSubcategory(""); setSearchQuery(""); }} className="hover:text-red-600 transition-colors">
                All Products
              </button>
              {selectedCategory && (
                <>
                  <ChevronRight className="w-3.5 h-3.5" />
                  <button onClick={() => { selectCategory(selectedCategory); }} className="hover:text-red-600 transition-colors">
                    {selectedCategory}
                  </button>
                </>
              )}
              {selectedSubcategory && (
                <>
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span className="text-gray-700 font-medium">{selectedSubcategory}</span>
                </>
              )}
              {searchQuery && (
                <>
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span className="text-gray-700 font-medium">Search: &ldquo;{searchQuery}&rdquo;</span>
                </>
              )}
            </nav>
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

      {/* Main content */}
      <section className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex gap-8">
            {/* Sidebar - Desktop */}
            <aside className="hidden lg:block w-64 shrink-0">
              <div className="sticky top-24 bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-black">Categories</h3>
                </div>
                <nav className="p-2 max-h-[calc(100vh-140px)] overflow-y-auto">
                  {/* All Products */}
                  <button
                    onClick={() => { setSelectedCategory(""); setSelectedSubcategory(""); setSearchQuery(""); }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors mb-1 ${
                      !selectedCategory && !searchQuery
                        ? "bg-red-50 text-red-700 font-semibold"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    All Products
                  </button>

                  {categories.map((cat) => {
                    const Icon = iconMap[cat.icon] || Flame;
                    const isExpanded = expandedCats.has(cat.name);
                    const isActive = selectedCategory === cat.name && !selectedSubcategory;

                    return (
                      <div key={cat.slug} className="mb-0.5">
                        <div className="flex items-center">
                          <button
                            onClick={() => selectCategory(cat.name)}
                            className={`flex-1 flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors text-left ${
                              isActive
                                ? "bg-red-50 text-red-700 font-semibold"
                                : selectedCategory === cat.name
                                ? "text-red-600 font-medium"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            }`}
                          >
                            <Icon className="w-4 h-4 shrink-0 opacity-60" />
                            <span className="truncate">{cat.name}</span>
                          </button>
                          <button
                            onClick={() => toggleExpand(cat.name)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                          >
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          </button>
                        </div>

                        {/* Subcategories */}
                        {isExpanded && (
                          <div className="ml-6 mt-0.5 mb-1 space-y-0.5">
                            {cat.subcategories.map((sub) => (
                              <button
                                key={sub}
                                onClick={() => selectSubcategory(cat.name, sub)}
                                className={`w-full text-left px-3 py-1.5 text-xs rounded-md transition-colors ${
                                  selectedSubcategory === sub
                                    ? "bg-red-50 text-red-700 font-semibold"
                                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                                }`}
                              >
                                {sub}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </nav>
              </div>
            </aside>

            {/* Mobile category pills */}
            <div className="lg:hidden w-full">
              <div className="flex flex-wrap gap-2 mb-6">
                <button
                  onClick={() => { setSelectedCategory(""); setSelectedSubcategory(""); }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                    !selectedCategory ? "bg-red-600 text-white border-red-600" : "text-gray-600 border-gray-200 hover:border-red-200"
                  }`}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.slug}
                    onClick={() => selectCategory(cat.name)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                      selectedCategory === cat.name ? "bg-red-600 text-white border-red-600" : "text-gray-600 border-gray-200 hover:border-red-200"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Product grid */}
            <div className="flex-1 min-w-0">
              {/* Category cards if no category selected */}
              {!selectedCategory && !searchQuery && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
                  {categories.map((cat) => {
                    const Icon = iconMap[cat.icon] || Flame;
                    const count = products.filter((p) => p.category === cat.name).length;
                    return (
                      <button
                        key={cat.slug}
                        onClick={() => selectCategory(cat.name)}
                        className="group text-left bg-white rounded-xl border border-gray-100 p-5 hover:border-red-200 hover:shadow-lg hover:shadow-red-600/[0.04] transition-all duration-300"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0 group-hover:bg-red-100 transition-colors">
                            <Icon className="w-5 h-5 text-red-600" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-black group-hover:text-red-600 transition-colors">{cat.name}</h3>
                            <p className="mt-0.5 text-xs text-gray-400">{count} products</p>
                            <p className="mt-1.5 text-xs text-gray-500 line-clamp-2">{cat.description}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Subcategory pills when viewing a category */}
              {selectedCategory && !selectedSubcategory && !searchQuery && activeCat && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {activeCat.subcategories.map((sub) => {
                    const count = products.filter((p) => p.subcategory === sub).length;
                    return (
                      <button
                        key={sub}
                        onClick={() => selectSubcategory(selectedCategory, sub)}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-full hover:border-red-200 hover:text-red-600 hover:bg-red-50/50 transition-colors"
                      >
                        {sub} ({count})
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Product list */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedCategory + selectedSubcategory + searchQuery}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {(selectedCategory || searchQuery) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  )}

                  {filteredProducts.length === 0 && (selectedCategory || searchQuery) && (
                    <div className="text-center py-20">
                      <p className="text-gray-500">No products found. Try a different search or category.</p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 hover:border-red-200 hover:shadow-md transition-all duration-300 flex flex-col h-full group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded">
          {product.subcategory}
        </span>
        {product.badge && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
            {product.badge}
          </span>
        )}
      </div>

      <h3 className="text-sm font-semibold text-black leading-snug mb-2 group-hover:text-red-600 transition-colors">
        {product.name}
      </h3>

      {product.certifications.length > 0 && (
        <div className="flex items-center gap-1.5 mb-2">
          <ShieldCheck className="w-3.5 h-3.5 text-green-600 shrink-0" />
          <span className="text-[11px] font-medium text-green-700">{product.certifications.join(", ")}</span>
        </div>
      )}

      <p className="text-xs text-gray-500 leading-relaxed mb-4 flex-1">
        {product.description}
      </p>

      <div className="flex items-center gap-1.5 pt-3 border-t border-gray-50 text-xs text-gray-400">
        <Lock className="w-3.5 h-3.5" />
        <span>Register for trade pricing</span>
      </div>
    </div>
  );
}

export default function ShopPage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<div className="pt-32 text-center text-gray-400">Loading...</div>}>
        <ShopContent />
      </Suspense>
      <Footer />
    </>
  );
}

