import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function LoginPage() {
  return (
    <>
      <Navbar />
      <section className="pt-28 pb-20 bg-gray-50 min-h-screen">
        <div className="max-w-md mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <h1 className="font-[family-name:var(--font-heading)] text-2xl sm:text-3xl font-800 text-black">
              Sign In
            </h1>
            <p className="mt-2 text-sm text-gray-500">Access your wholesale account and trade pricing.</p>
          </div>

          <form className="bg-white rounded-xl border border-gray-100 p-6 sm:p-8 space-y-4 shadow-sm">
            <div>
              <label className="block text-sm font-medium text-black mb-1">Email</label>
              <input type="email" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-red-300 focus:ring-1 focus:ring-red-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Password</label>
              <input type="password" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-red-300 focus:ring-1 focus:ring-red-300" />
            </div>
            <button type="submit" className="w-full px-4 py-3 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
              Sign In
            </button>
            <p className="text-center text-sm text-gray-500">
              Need an account? <Link href="/register" className="text-red-600 font-medium hover:underline">Register for pricing</Link>
            </p>
          </form>
        </div>
      </section>
      <Footer />
    </>
  );
}
