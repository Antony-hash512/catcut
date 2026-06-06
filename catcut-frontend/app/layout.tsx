import type { Metadata } from "next";
import { Outfit, Fira_Code } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "catcut — AI CapCut-Style Subtitle Generator",
  description: "Generate beautiful, animated word-level ASS subtitles for Shorts, Reels, and TikTok with high accuracy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${outfit.variable} ${firaCode.variable}`}>
      <body>{children}</body>
    </html>
  );
}

