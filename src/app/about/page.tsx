import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ShieldCheck, Users, Truck, Award, Building2, MapPin } from "lucide-react";

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <section className="pt-28 pb-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-red-600">About Us</span>
          <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl sm:text-4xl lg:text-5xl font-800 text-black tracking-tight">
            Australia&apos;s Trusted Fire Safety Wholesaler
          </h1>
          <p className="mt-6 text-lg text-gray-600 leading-relaxed">
            Flaro Fire Supplies is a leading Australian wholesale supplier of fire safety equipment. We provide AS/NZS certified products to contractors, resellers, strata managers, and facility managers across the country.
          </p>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { icon: ShieldCheck, title: "AS/NZS Certified", desc: "Every product meets Australian and New Zealand fire safety standards." },
            { icon: Users, title: "Wholesale Only", desc: "Competitive trade pricing for registered businesses. No retail markup." },
            { icon: Truck, title: "Australia-Wide", desc: "Fast dispatch from Sydney. Same-day shipping on orders before 12pm." },
            { icon: Award, title: "Quality Guaranteed", desc: "We only stock products from trusted manufacturers with proven track records." },
            { icon: Building2, title: "Industry Experts", desc: "Our team has decades of experience in fire safety equipment supply." },
            { icon: MapPin, title: "Sydney Based", desc: "Australian owned and operated. Local support when you need it." },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="bg-white rounded-xl border border-gray-100 p-6 flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-black">{item.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <Footer />
    </>
  );
}
