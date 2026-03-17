import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flaro Fire Supplies | Wholesale Fire Safety Equipment | Australia",
  description:
    "Australia's trusted wholesale fire safety supplier. Fire extinguishers, blankets, alarms, hose reels, emergency lighting, signage and more. AS/NZS certified. Register for trade pricing.",
  keywords: [
    "fire safety wholesale",
    "fire extinguisher wholesale Australia",
    "fire blanket supplier",
    "smoke alarm wholesale",
    "fire hose reel",
    "emergency lighting",
    "fire safety signage",
    "AS/NZS certified",
    "fire safety equipment Sydney",
    "wholesale fire products",
  ],
  openGraph: {
    title: "Flaro Fire Supplies | Wholesale Fire Safety Equipment",
    description:
      "Australia's trusted wholesale fire safety supplier. Full product range. AS/NZS certified. Register for trade pricing.",
    locale: "en_AU",
    type: "website",
    siteName: "Flaro Fire Supplies",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-AU">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-white text-charcoal antialiased">
        <Navbar />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
