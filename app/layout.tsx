import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { AppFooterFrame } from "@/components/app-footer-frame";
import { OauthHashRedirect } from "@/components/auth/oauth-hash-redirect";
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
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
    apple: [{ url: "/apple-icon.png", type: "image/png" }],
  },
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
        <SupabaseProvider>
          <OauthHashRedirect />
          {children}
        </SupabaseProvider>
        <AppFooterFrame>
          <LandingFooter />
        </AppFooterFrame>
        <Analytics />
      </body>
    </html>
  );
}
