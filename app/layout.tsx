import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppFooterFrame } from "@/components/app-footer-frame";
import { SupabaseProvider } from "@/components/auth/supabase-provider";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} min-h-dvh antialiased`}
    >
      <body className="flex min-h-dvh flex-col">
        <SupabaseProvider>{children}</SupabaseProvider>
        <AppFooterFrame>
          <LandingFooter />
        </AppFooterFrame>
      </body>
    </html>
  );
}
