import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flaro | Premium Fire Safety Equipment | Sydney",
  description:
    "Expert-curated fire safety equipment for Australian homes and businesses. Premium fire extinguishers, blankets, alarms and safety kits. Serving Breakfast Point, Sydney and all of NSW.",
  keywords: [
    "fire safety",
    "fire extinguisher",
    "fire blanket",
    "smoke alarm",
    "fire safety equipment Sydney",
    "Australian Standards",
    "AS/NZS certified",
    "fire safety kit",
  ],
  openGraph: {
    title: "Flaro | Premium Fire Safety Equipment | Sydney",
    description:
      "Expert-curated fire safety equipment for Australian homes and businesses.",
    locale: "en_AU",
    type: "website",
    siteName: "Flaro",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-AU">
      <body className="bg-navy-950 text-slate-200 antialiased">
        <Navbar />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
