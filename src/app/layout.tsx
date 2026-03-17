import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flaro Fire Supplies — Wholesale Fire Safety Equipment Australia",
  description: "Australia's trusted wholesale supplier of AS/NZS certified fire extinguishers, smoke alarms, hose reels, emergency lighting, signage and more. Register for trade pricing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Sora:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-white text-charcoal antialiased font-[family-name:var(--font-body)]">
        {children}
      </body>
    </html>
  );
}
