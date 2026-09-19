import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RADAAR — AI Growth Radar for Paytm Merchants",
  description:
    "Your business is generating signals. RADAAR tells you what they mean: What happened → Why → What to do → Expected impact.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Sora:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
