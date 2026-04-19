import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { GaEventsBridge } from "@/components/analytics/ga-events-bridge";
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

const siteTitle = "MyTradeDesk — Prop Firm Tracker and Trading Control Center";
const siteDescription =
  "Track your prop firm accounts, payouts, fees and trading performance in one place. Built for serious traders managing multiple accounts.";

/**
 * GA4 — production only.
 * Inline stub/config: `afterInteractive` so `gtag` exists before client effects (e.g. checkout success).
 * gtag.js library: `lazyOnload` to defer the heavy download until idle.
 */
const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_ID?.trim() || "G-MYY7PCSFEB";

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "MyTradeDesk",
  url: "https://mytradedesk.app",
  logo: "https://mytradedesk.app/logo.png",
} as const;

export const metadata: Metadata = {
  metadataBase: new URL("https://mytradedesk.app"),
  title: {
    default: siteTitle,
    template: "%s | MyTradeDesk",
  },
  description: siteDescription,
  applicationName: "MyTradeDesk",
  openGraph: {
    title: "MyTradeDesk",
    description:
      "Track your prop firm accounts and trading performance in one place.",
    url: "https://mytradedesk.app",
    siteName: "MyTradeDesk",
    images: [
      {
        url: "https://mytradedesk.app/og-image.png",
        width: 1200,
        height: 630,
      },
    ],
    type: "website",
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
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
      </head>
      <body className="flex min-h-dvh flex-col">
        {process.env.NODE_ENV === "production" && GA_MEASUREMENT_ID ? (
          <>
            <Script
              id="ga4-gtag"
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="lazyOnload"
            />
            <Script id="ga4-config" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());
gtag('config','${GA_MEASUREMENT_ID}');`}
            </Script>
          </>
        ) : null}
        <SupabaseProvider>
          <Suspense fallback={null}>
            <GaEventsBridge />
          </Suspense>
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
