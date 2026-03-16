"use client";

import { useState, useRef, useMemo } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  SlidersHorizontal,
  ChevronDown,
  ShieldCheck,
  FlameKindling,
  Siren,
  Construction,
  Lightbulb,
  RectangleEllipsis,
  SignpostBig,
  Wrench,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types & data                                                      */
/* ------------------------------------------------------------------ */
type Category =
  | "All"
  | "Extinguishers"
  | "Alarms"
  | "Hose Reels"
  | "Lighting"
  | "Blankets"
  | "Signage"
  | "Accessories";

type SortOption = "price-asc" | "price-desc" | "name-asc";

interface Product {
  id: number;
  name: string;
  category: Exclude<Category, "All">;
  price: number;
  cert: string;
  desc: string;
}

const products: Product[] = [
  {
    id: 1,
    name: "4.5kg ABE Dry Powder Extinguisher",
    category: "Extinguishers",
    price: 89.95,
    cert: "AS/NZS 1841.5",
    desc: "Multi-purpose. Suitable for Class A, B, and E fires.",
  },
  {
    id: 2,
    name: "2.5kg CO2 Fire Extinguisher",
    category: "Extinguishers",
    price: 149.95,
    cert: "AS/NZS 1841.6",
    desc: "Clean agent. Ideal for server rooms and electrical equipment.",
  },
  {
    id: 3,
    name: "7.0L Wet Chemical Extinguisher",
    category: "Extinguishers",
    price: 179.95,
    cert: "AS/NZS 1841.4",
    desc: "Purpose-built for commercial kitchen fires (Class F).",
  },
  {
    id: 4,
    name: "9.0kg ABE Dry Powder Extinguisher",
    category: "Extinguishers",
    price: 129.95,
    cert: "AS/NZS 1841.5",
    desc: "Heavy-duty. For warehouses, factories, and large commercial spaces.",
  },
  {
    id: 5,
    name: "Photoelectric Smoke Alarm \u2014 10 Year",
    category: "Alarms",
    price: 49.95,
    cert: "AS 3786-2014",
    desc: "Sealed lithium battery. No maintenance for 10 years.",
  },
  {
    id: 6,
    name: "Wireless Interconnected Smoke Alarm",
    category: "Alarms",
    price: 79.95,
    cert: "AS 3786-2014",
    desc: "RF interconnect up to 40 alarms. When one triggers, all sound.",
  },
  {
    id: 7,
    name: "Smart WiFi Smoke Alarm",
    category: "Alarms",
    price: 119.95,
    cert: "AS 3786-2014",
    desc: "App notifications, remote monitoring, and smart home integration.",
  },
  {
    id: 8,
    name: "36m Fire Hose Reel \u2014 Complete",
    category: "Hose Reels",
    price: 349.95,
    cert: "AS 1221",
    desc: "Swing arm hose reel with 36m lay-flat hose and nozzle.",
  },
  {
    id: 9,
    name: "LED Emergency Exit Sign",
    category: "Lighting",
    price: 129.95,
    cert: "AS 2293.1",
    desc: "Maintained LED. 3-hour battery backup. Surface or recessed mount.",
  },
  {
    id: 10,
    name: "Twin-Spot Emergency Light",
    category: "Lighting",
    price: 89.95,
    cert: "AS 2293.1",
    desc: "Dual adjustable LED heads. 3-hour duration. Auto self-test.",
  },
  {
    id: 11,
    name: "1.2m x 1.8m Fire Blanket",
    category: "Blankets",
    price: 34.95,
    cert: "AS/NZS 3504",
    desc: "Commercial grade. Quick-release wall mount included.",
  },
  {
    id: 12,
    name: "Fire Extinguisher Location Sign",
    category: "Signage",
    price: 12.95,
    cert: "AS 1319",
    desc: "Self-adhesive. 300mm x 225mm. High-visibility photoluminescent.",
  },
];

const categories: Category[] = [
  "All",
  "Extinguishers",
  "Alarms",
  "Hose Reels",
  "Lighting",
  "Blankets",
  "Signage",
  "Accessories",
];

const categoryGradients: Record<string, string> = {
  Extinguishers: "from-red-700/50 to-orange-600/25",
  Alarms: "from-cyan-700/50 to-blue-600/25",
  "Hose Reels": "from-emerald-700/50 to-teal-600/25",
  Lighting: "from-yellow-700/50 to-amber-600/25",
  Blankets: "from-purple-700/50 to-violet-600/25",
  Signage: "from-pink-700/50 to-rose-600/25",
  Accessories: "from-slate-700/50 to-slate-600/25",
};

const categoryIcons: Record<string, React.ElementType> = {
  Extinguishers: FlameKindling,
  Alarms: Siren,
  "Hose Reels": Construction,
  Lighting: Lightbulb,
  Blankets: RectangleEllipsis,
  Signage: SignpostBig,
  Accessories: Wrench,
};

const sortOptions: { label: string; value: SortOption }[] = [
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
  { label: "Name A\u2013Z", value: "name-asc" },
];

/* ------------------------------------------------------------------ */
/*  Reusable fade-in wrapper                                          */
/* ------------------------------------------------------------------ */
function FadeIn({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Product card                                                      */
/* ------------------------------------------------------------------ */
function ProductCard({ product, index }: { product: Product; index: number }) {
  const gradient = categoryGradients[product.category] ?? "from-slate-700/50 to-slate-600/25";
  const Icon = categoryIcons[product.category] ?? Wrench;

  return (
    <FadeIn delay={index * 0.06}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="glass rounded-2xl overflow-hidden group h-full flex flex-col hover:border-cyan-500/20 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/[0.06]"
      >
        {/* Image area */}
        <div
          className={`relative h-48 bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden`}
        >
          <Icon className="w-16 h-16 text-white/20 group-hover:text-white/40 transition-colors duration-300 group-hover:scale-110 transform" />

          {/* Category badge */}
          <span className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase bg-black/30 backdrop-blur-md text-white/90 rounded-md border border-white/10">
            {product.category}
          </span>
        </div>

        {/* Details */}
        <div className="p-5 flex flex-col flex-1">
          <h3 className="text-base font-semibold text-white mb-1.5 leading-snug">
            {product.name}
          </h3>

          {/* Cert badge */}
          <div className="flex items-center gap-1.5 mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-xs font-medium text-cyan-400">
              {product.cert}
            </span>
          </div>

          <p className="text-sm text-slate-400 leading-relaxed mb-5 flex-1">
            {product.desc}
          </p>

          <div className="flex items-center justify-between mt-auto">
            <span className="text-xl font-bold text-white">
              ${product.price.toFixed(2)}
            </span>
            <button className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-navy-950 bg-cyan-400 rounded-lg hover:bg-cyan-300 transition-all duration-300 shadow-md shadow-cyan-500/15 hover:shadow-cyan-400/25 cursor-pointer">
              <ShoppingCart className="w-4 h-4" />
              Add to Cart
            </button>
          </div>
        </div>
      </motion.div>
    </FadeIn>
  );
}

/* ------------------------------------------------------------------ */
/*  Shop page                                                         */
/* ------------------------------------------------------------------ */
export default function ShopPage() {
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [sort, setSort] = useState<SortOption>("price-asc");
  const [sortOpen, setSortOpen] = useState(false);

  const filtered = useMemo(() => {
    let items =
      activeCategory === "All"
        ? [...products]
        : products.filter((p) => p.category === activeCategory);

    switch (sort) {
      case "price-asc":
        items.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        items.sort((a, b) => b.price - a.price);
        break;
      case "name-asc":
        items.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return items;
  }, [activeCategory, sort]);

  const currentSortLabel =
    sortOptions.find((o) => o.value === sort)?.label ?? "Sort";

  return (
    <>
      {/* ---- Hero banner ---- */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950" />
        <div className="noise-overlay absolute inset-0" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full bg-cyan-500/[0.04] blur-[120px]" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <h1 className="font-[family-name:var(--font-heading)] text-4xl sm:text-5xl lg:text-6xl font-bold text-white">
              Shop Fire Safety Equipment
            </h1>
            <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Australian Standards certified equipment for homes, businesses, and
              commercial properties.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ---- Filters & grid ---- */}
      <section className="relative pb-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-10">
            {/* Category filters */}
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200 cursor-pointer ${
                    activeCategory === cat
                      ? "bg-cyan-400 text-navy-950 border-cyan-400 shadow-md shadow-cyan-500/20"
                      : "text-slate-400 border-white/10 hover:border-white/20 hover:text-white bg-white/[0.03]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Sort dropdown */}
            <div className="relative">
              <button
                onClick={() => setSortOpen(!sortOpen)}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-300 bg-white/[0.04] border border-white/10 rounded-lg hover:border-white/20 transition-colors duration-200 cursor-pointer"
              >
                <SlidersHorizontal className="w-4 h-4" />
                {currentSortLabel}
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    sortOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {sortOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-52 rounded-xl glass border border-white/10 shadow-2xl shadow-black/40 z-30 overflow-hidden"
                  >
                    {sortOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setSort(opt.value);
                          setSortOpen(false);
                        }}
                        className={`block w-full text-left px-4 py-3 text-sm transition-colors duration-150 cursor-pointer ${
                          sort === opt.value
                            ? "text-cyan-400 bg-cyan-500/[0.08]"
                            : "text-slate-300 hover:bg-white/[0.04]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Results count */}
          <p className="text-sm text-slate-500 mb-6">
            Showing {filtered.length} product{filtered.length !== 1 ? "s" : ""}
            {activeCategory !== "All" && (
              <>
                {" "}
                in <span className="text-slate-300">{activeCategory}</span>
              </>
            )}
          </p>

          {/* Product grid */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory + sort}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {filtered.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </motion.div>
          </AnimatePresence>

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="text-center py-20">
              <p className="text-lg text-slate-400">
                No products found in this category. Check back soon &mdash; new stock
                arriving regularly.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
