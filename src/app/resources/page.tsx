import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { FileText, BookOpen, Download, ExternalLink } from "lucide-react";

export default function ResourcesPage() {
  return (
    <>
      <Navbar />
      <section className="pt-28 pb-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-red-600">Resources</span>
          <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl sm:text-4xl font-800 text-black tracking-tight">
            Fire Safety Resources
          </h1>
          <p className="mt-4 text-lg text-gray-600">Guides, standards references and compliance information.</p>
        </div>
      </section>

      <section className="pb-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            { icon: FileText, title: "Fire Extinguisher Selection Guide", desc: "How to choose the right type and size of fire extinguisher for your premises." },
            { icon: BookOpen, title: "AS 1851 Maintenance Schedule", desc: "Overview of mandatory inspection and testing requirements under AS 1851." },
            { icon: FileText, title: "Smoke Alarm Compliance Guide", desc: "State-by-state smoke alarm legislation and compliance requirements." },
            { icon: Download, title: "Emergency Lighting Standards", desc: "Understanding AS 2293 requirements for emergency and exit lighting." },
            { icon: BookOpen, title: "Fire Safety Signage Guide", desc: "AS 1319 signage requirements including placement and sizing guidelines." },
            { icon: FileText, title: "Passive Fire Protection Guide", desc: "Understanding fire collars, batts, sealants and penetration sealing requirements." },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="bg-gray-50 rounded-xl border border-gray-100 p-6 hover:border-red-200 transition-colors group">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0 group-hover:bg-red-100 transition-colors">
                    <Icon className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-black group-hover:text-red-600 transition-colors">{item.title}</h3>
                    <p className="mt-1 text-sm text-gray-500">{item.desc}</p>
                    <span className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-red-600">
                      Read More <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
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
