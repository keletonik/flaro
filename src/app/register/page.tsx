import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <>
      <Navbar />
      <section className="pt-28 pb-20 bg-gray-50 min-h-screen">
        <div className="max-w-lg mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <h1 className="font-[family-name:var(--font-heading)] text-2xl sm:text-3xl font-800 text-black">
              Register for Wholesale Pricing
            </h1>
            <p className="mt-2 text-sm text-gray-500">Create a free account to access trade pricing on our full range.</p>
          </div>

          <form className="bg-white rounded-xl border border-gray-100 p-6 sm:p-8 space-y-4 shadow-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">First Name</label>
                <input type="text" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-red-300 focus:ring-1 focus:ring-red-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Last Name</label>
                <input type="text" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-red-300 focus:ring-1 focus:ring-red-300" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Email</label>
              <input type="email" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-red-300 focus:ring-1 focus:ring-red-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Phone</label>
              <input type="tel" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-red-300 focus:ring-1 focus:ring-red-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Company Name</label>
              <input type="text" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-red-300 focus:ring-1 focus:ring-red-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">ABN</label>
              <input type="text" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-red-300 focus:ring-1 focus:ring-red-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Account Type</label>
              <select className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-red-300 focus:ring-1 focus:ring-red-300 bg-white">
                <option value="">Select...</option>
                <option>Contractor</option>
                <option>Reseller</option>
                <option>Strata Manager</option>
                <option>Facility Manager</option>
                <option>Property Manager</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Password</label>
              <input type="password" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-red-300 focus:ring-1 focus:ring-red-300" />
            </div>
            <button type="submit" className="w-full px-4 py-3 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors mt-2">
              Create Account
            </button>
            <p className="text-center text-sm text-gray-500">
              Already have an account? <Link href="/login" className="text-red-600 font-medium hover:underline">Sign in</Link>
            </p>
          </form>
        </div>
      </section>
      <Footer />
    </>
  );
}
