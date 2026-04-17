import type { Metadata } from "next";
import Navbar from "@/components/navbar";

export const metadata: Metadata = {
  title: "Privacy Policy | MyTradeDesk",
  description:
    "How MyTradeDesk collects, uses, and protects your data when you use our platform.",
};

const prose =
  "text-[15px] leading-[1.75] text-white/72 [&_strong]:font-semibold [&_strong]:text-white/95";

const h2 =
  "mt-12 scroll-mt-24 border-b border-white/[0.08] pb-3 text-xl font-semibold tracking-tight text-white sm:mt-14 sm:text-2xl";

const h3 = "mt-8 text-base font-semibold tracking-tight text-white sm:text-lg";

const hr = "my-10 border-0 border-t border-white/[0.08]";

const list = "mt-4 list-disc space-y-2 pl-5 marker:text-sky-400/80";

export default function PrivacyPage() {
  return (
    <main className="min-h-0 flex-1 bg-[#070a10] text-white">
      <Navbar variant="compare" />
      <div className="mx-auto max-w-3xl px-4 pb-20 pt-14 md:px-6 sm:pt-20">
        <article className={prose}>
          <header className="border-b border-white/[0.08] pb-10">
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Privacy Policy
            </h1>
            <p className="mt-4 text-sm font-medium text-sky-400/90">
              Last updated: 16th April 2026
            </p>
          </header>

          <p className="mt-10">
            MyTradeDesk (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) respects your privacy
            and is committed to protecting your data.
          </p>
          <p className="mt-4">
            This Privacy Policy explains what information we collect, how we use it, and your
            rights when using our platform.
          </p>

          <hr className={hr} />

          <section>
            <h2 className={h2}>1. Information We Collect</h2>

            <h3 className={h3}>1.1 Account Information</h3>
            <p className="mt-3">When you create an account, we may collect:</p>
            <ul className={list}>
              <li>Email address</li>
              <li>Login credentials</li>
            </ul>

            <hr className={hr} />

            <h3 className={h3}>1.2 Trading and Account Data</h3>
            <p className="mt-3">
              When using the platform, we collect data necessary to provide our services,
              including:
            </p>
            <ul className={list}>
              <li>Prop firm accounts (name, size, status)</li>
              <li>Trading performance (profits, payouts, fees)</li>
              <li>Account configurations and activity</li>
            </ul>

            <hr className={hr} />

            <h3 className={h3}>1.3 Imported Data</h3>
            <p className="mt-3">You may choose to import data into the platform.</p>
            <p className="mt-4">
              This data is processed to populate your account and provide insights. We do not
              retain unnecessary raw files after processing.
            </p>

            <hr className={hr} />

            <h3 className={h3}>1.4 Usage Data</h3>
            <p className="mt-3">We automatically collect limited usage data, such as:</p>
            <ul className={list}>
              <li>Pages visited</li>
              <li>Device and browser type</li>
              <li>Approximate location</li>
            </ul>
          </section>

          <hr className={hr} />

          <section>
            <h2 className={h2}>2. Analytics and Tracking</h2>
            <p className="mt-4">
              We use third-party tools to understand how users interact with our platform.
            </p>

            <h3 className={h3}>Google Analytics</h3>
            <p className="mt-3">We use Google Analytics to measure traffic and usage patterns.</p>
            <p className="mt-4">Google may collect:</p>
            <ul className={list}>
              <li>IP address</li>
              <li>Device information</li>
              <li>Interaction data</li>
            </ul>
            <p className="mt-4">
              More info:{" "}
              <a
                href="https://policies.google.com/privacy"
                className="font-medium text-sky-400 underline decoration-sky-400/40 underline-offset-2 transition hover:text-sky-300 hover:decoration-sky-300/60"
                target="_blank"
                rel="noreferrer"
              >
                https://policies.google.com/privacy
              </a>
            </p>

            <hr className={hr} />

            <h3 className={h3}>Advertising Tools</h3>
            <p className="mt-3">
              We may use advertising tools such as Meta (Facebook) Pixel to:
            </p>
            <ul className={list}>
              <li>Measure ad performance</li>
              <li>Improve marketing campaigns</li>
            </ul>
            <p className="mt-4">These tools may use cookies or similar technologies.</p>
          </section>

          <hr className={hr} />

          <section>
            <h2 className={h2}>3. How We Use Your Data</h2>
            <p className="mt-4">We use your data to:</p>
            <ul className={list}>
              <li>Provide and operate the platform</li>
              <li>Display account insights and analytics</li>
              <li>Improve product performance</li>
              <li>Monitor usage and prevent abuse</li>
              <li>Measure marketing effectiveness</li>
            </ul>
          </section>

          <hr className={hr} />

          <section>
            <h2 className={h2}>4. Data Sharing</h2>
            <p className="mt-4">
              We do <strong>not sell your personal data</strong>.
            </p>
            <p className="mt-4">We may share limited data with:</p>
            <ul className={list}>
              <li>Analytics providers</li>
              <li>Advertising platforms</li>
            </ul>
            <p className="mt-4">These providers process data on our behalf.</p>
          </section>

          <hr className={hr} />

          <section>
            <h2 className={h2}>5. Data Security</h2>
            <p className="mt-4">
              We take reasonable measures to protect your data using standard security practices.
            </p>
          </section>

          <hr className={hr} />

          <section>
            <h2 className={h2}>6. Data Retention</h2>
            <p className="mt-4">We retain your data while your account is active.</p>
            <p className="mt-4">You may request deletion of your data at any time.</p>
          </section>

          <hr className={hr} />

          <section>
            <h2 className={h2}>7. Your Rights</h2>
            <p className="mt-4">You may request:</p>
            <ul className={list}>
              <li>Access to your data</li>
              <li>Correction of your data</li>
              <li>Deletion of your data</li>
            </ul>
            <p className="mt-4">
              Contact:{" "}
              <a
                href="mailto:contact@mytradedesk.app"
                className="font-medium text-sky-400 underline decoration-sky-400/40 underline-offset-2 transition hover:text-sky-300"
              >
                contact@mytradedesk.app
              </a>
            </p>
          </section>

          <hr className={hr} />

          <section>
            <h2 className={h2}>8. Third-Party Links</h2>
            <p className="mt-4">
              We are not responsible for the privacy practices of external websites.
            </p>
          </section>

          <hr className={hr} />

          <section>
            <h2 className={h2}>9. Children&apos;s Privacy</h2>
            <p className="mt-4">Our services are not intended for individuals under 18.</p>
          </section>

          <hr className={hr} />

          <section>
            <h2 className={h2}>10. Changes</h2>
            <p className="mt-4">We may update this policy at any time.</p>
          </section>

          <hr className={hr} />

          <section>
            <h2 className={h2}>11. Contact</h2>
            <p className="mt-4">
              <a
                href="mailto:contact@mytradedesk.app"
                className="font-medium text-sky-400 underline decoration-sky-400/40 underline-offset-2 transition hover:text-sky-300"
              >
                contact@mytradedesk.app
              </a>
            </p>
          </section>
        </article>
      </div>
    </main>
  );
}
