import type { Metadata, Viewport } from "next";
import { DM_Serif_Display, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/components/providers/Web3Provider";

const display = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap"
});

const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-sans",
  display: "swap"
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap"
});

export const metadata: Metadata = {
  title: "elf — leave it to elf.",
  description:
    "Cross-functional builder workspace. Devs commit code, content contributors add docs, managers control access — without anyone leaving the platform.",
  metadataBase: new URL("https://elf-it.vercel.app"),
  openGraph: {
    title: "elf — leave it to elf.",
    description: "Every great product needs an elf.",
    url: "https://elf-it.vercel.app",
    siteName: "elf",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "elf — leave it to elf.",
    description: "Every great product needs an elf."
  }
};

export const viewport: Viewport = {
  themeColor: "#0F6E56"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body>
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}
