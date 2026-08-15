import type { Metadata } from "next";
import { Young_Serif, Albert_Sans, DM_Mono } from "next/font/google";
import "./globals.css";

const youngSerif = Young_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-young-serif",
  display: "swap",
});

const albertSans = Albert_Sans({
  subsets: ["latin"],
  variable: "--font-albert-sans",
  display: "swap",
});

const dmMono = DM_Mono({
  weight: ["300", "400", "500"],
  subsets: ["latin"],
  variable: "--font-dm-mono",
  display: "swap",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Lily's Safe Haven — a shop that shelters",
    template: "%s · Lily's Safe Haven",
  },
  description:
    "Comfort goods, kind apparel, and care kits. Every purchase funds real help for people facing cancer.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${youngSerif.variable} ${albertSans.variable} ${dmMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
