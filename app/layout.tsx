import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppFooterFrame } from "@/components/app-footer-frame";
import { LandingFooter } from "@/components/landing/landing-footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MyTradeDesk | Prop firm capital & program comparison",
  description:
    "Workspace for multi-account prop futures traders: capital, progress, payouts, and a decision-grade firm comparator.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full min-h-dvh antialiased`}
    >
      <body className="flex h-full min-h-dvh flex-col">
        <div className="flex h-full min-h-0 flex-1 flex-col">{children}</div>
        <AppFooterFrame>
          <LandingFooter />
        </AppFooterFrame>
      </body>
    </html>
  );
}
