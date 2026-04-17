import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

const siteTitle = "MyTradeDesk — Prop Firm Tracker & Trading Control Center";
const siteDescription =
  "Track your prop firm accounts, payouts, fees and performance in one place. Built for serious traders.";

export const metadata: Metadata = {
  metadataBase: new URL("https://mytradedesk.app"),
  title: {
    default: siteTitle,
    template: "%s | MyTradeDesk",
  },
  description: siteDescription,
  applicationName: "MyTradeDesk",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://mytradedesk.app",
    siteName: "MyTradeDesk",
    title: siteTitle,
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
  // Icons: file conventions `app/icon.jpg` + `app/apple-icon.jpg` (correct JPEG MIME types).
  // `/favicon.ico` redirects to `/icon.jpg` in next.config.ts.
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
      </body>
    </html>
  );
}
