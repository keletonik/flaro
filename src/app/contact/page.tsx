import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Phone, Mail, MapPin, Clock } from "lucide-react";

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <section className="pt-28 pb-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-red-600">Contact</span>
          <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl sm:text-4xl font-800 text-black tracking-tight">
            Get in Touch
          </h1>
          <p className="mt-4 text-lg text-gray-600">Questions about products, pricing or wholesale accounts? We&apos;re here to help.</p>
        </div>
      </section>

      <section className="pb-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              {[
                { icon: Phone, label: "Phone", value: "1300 000 000", href: "tel:1300000000" },
                { icon: Mail, label: "Email", value: "sales@flarofire.com.au", href: "mailto:sales@flarofire.com.au" },
                { icon: MapPin, label: "Address", value: "Sydney, NSW Australia", href: null },
                { icon: Clock, label: "Hours", value: "Mon-Fri 8am-5pm AEST", href: null },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-black">{item.label}</p>
                      {item.href ? (
                        <a href={item.href} className="text-sm text-gray-600 hover:text-red-600 transition-colors">{item.value}</a>
                      ) : (
                        <p className="text-sm text-gray-600">{item.value}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <form className="bg-gray-50 rounded-xl p-6 border border-gray-100 space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">Name</label>
                <input type="text" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-red-300 focus:ring-1 focus:ring-red-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Email</label>
                <input type="email" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-red-300 focus:ring-1 focus:ring-red-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Message</label>
                <textarea rows={4} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-red-300 focus:ring-1 focus:ring-red-300 resize-none" />
              </div>
              <button type="submit" className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
                Send Message
              </button>
            </form>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
