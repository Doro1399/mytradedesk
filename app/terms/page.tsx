import type { Metadata } from "next";
import Navbar from "@/components/navbar";

export const metadata: Metadata = {
  title: "Terms of Service | MyTradeDesk",
  description:
    "Terms governing your use of MyTradeDesk: the prop trading workspace, disclaimers, and your responsibilities.",
};

const prose =
  "text-[15px] leading-[1.75] text-white/72 [&_strong]:font-semibold [&_strong]:text-white/95";

const h2 =
  "mt-12 scroll-mt-24 border-b border-white/[0.08] pb-3 text-xl font-semibold tracking-tight text-white sm:mt-14 sm:text-2xl";

const hr = "my-10 border-0 border-t border-white/[0.08]";

const list = "mt-4 list-disc space-y-2 pl-5 marker:text-sky-400/80";

export default function TermsPage() {
  return (
    <main className="min-h-0 flex-1 bg-[#070a10] text-white">
      <Navbar variant="compare" />
      <div className="mx-auto max-w-3xl px-4 pb-20 pt-14 md:px-6 sm:pt-20">
        <article className={prose}>
          <header className="border-b border-white/[0.08] pb-10">
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Terms of Service
            </h1>
            <p className="mt-4 text-sm font-medium text-sky-400/90">
              Last updated: 16th April 2026
            </p>
          </header>

          <p className="mt-10">
            These Terms of Service (&quot;Terms&quot;) govern your use of MyTradeDesk (&quot;the
            Service&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).
          </p>
          <p className="mt-4">
            By accessing or using the platform, you agree to these Terms.
          </p>

          <hr className={hr} />

          <section>
            <h2 className={h2}>1. Description of the Service</h2>
            <p className="mt-4">MyTradeDesk is a software platform that allows users to:</p>
            <ul className={list}>
              <li>Track and manage prop firm trading accounts</li>
              <li>Analyze performance (profits, payouts, fees)</li>
              <li>Import and organize trading data</li>
              <li>
                Compare proprietary trading firms based on publicly available information
              </li>
            </ul>
            <p className="mt-4">
              The Service is provided for informational and organizational purposes only.
            </p>
          </section>

          <hr className={hr} />

          <section>
            <h2 className={h2}>2. No Financial Advice</h2>
            <p className="mt-4">
              MyTradeDesk does not provide financial, investment, or trading advice.
            </p>
            <p className="mt-4">
              All content, tools, and insights are for informational purposes only and should not
              be considered as recommendations.
            </p>
            <p className="mt-4">You are solely responsible for your trading decisions.</p>
          </section>

          <hr className={hr} />

          <section>
            <h2 className={h2}>3. Prop Firm Disclaimer</h2>
            <p className="mt-4">
              MyTradeDesk is an independent platform and is not affiliated with, endorsed by, or
              officially connected to any proprietary trading firm listed on the platform.
            </p>
            <p className="mt-4">
              All comparisons, data, and ratings are provided for informational purposes only. They
              are based on publicly available information, platform rules, pricing structures, and
              internal evaluation criteria.
            </p>
            <p className="mt-4">
              We do not guarantee the accuracy, completeness, or reliability of this information.
            </p>
            <p className="mt-4">
              Some links may be affiliate links. We may receive a commission at no additional cost
              to you.
            </p>
          </section>

          <hr className={hr} />

          <section>
            <h2 className={h2}>4. User Responsibilities</h2>
            <p className="mt-4">By using the Service, you agree to:</p>
            <ul className={list}>
              <li>Provide accurate information</li>
              <li>Use the platform in compliance with applicable laws</li>
              <li>Maintain the confidentiality of your account</li>
            </ul>
            <p className="mt-4">You are responsible for all activity under your account.</p>
          </section>

          <hr className={hr} />

          <section>
            <h2 className={h2}>5. Data and Platform Usage</h2>
            <p className="mt-4">
              You retain ownership of the data you input into the platform.
            </p>
            <p className="mt-4">
              You grant us permission to process and store this data solely for the purpose of
              operating the Service.
            </p>
            <p className="mt-4">
              We do <strong>not sell your personal data</strong>.
            </p>
          </section>

          <hr className={hr} />

          <section>
            <h2 className={h2}>6. Accuracy of Data</h2>
            <p className="mt-4">
              The platform relies on user-provided data and external information.
            </p>
            <p className="mt-4">We do not guarantee that:</p>
            <ul className={list}>
              <li>calculations are error-free</li>
              <li>imported or displayed data is accurate</li>
              <li>platform outputs reflect real trading results</li>
            </ul>
            <p className="mt-4">You should independently verify all critical information.</p>
          </section>

          <hr className={hr} />

          <section>
            <h2 className={h2}>7. Limitation of Liability</h2>
            <p className="mt-4">To the fullest extent permitted by law:</p>
            <p className="mt-4">MyTradeDesk shall not be liable for:</p>
            <ul className={list}>
              <li>trading losses</li>
              <li>financial decisions made based on the platform</li>
              <li>inaccuracies in data or calculations</li>
              <li>service interruptions</li>
            </ul>
            <p className="mt-4">Use of the Service is at your own risk.</p>
          </section>

          <hr className={hr} />

          <section>
            <h2 className={h2}>8. Availability of the Service</h2>
            <p className="mt-4">We do not guarantee uninterrupted access to the platform.</p>
            <p className="mt-4">
              We may modify, suspend, or discontinue the Service at any time without notice.
            </p>
          </section>

          <hr className={hr} />

          <section>
            <h2 className={h2}>9. Termination</h2>
            <p className="mt-4">We reserve the right to suspend or terminate your account if:</p>
            <ul className={list}>
              <li>you violate these Terms</li>
              <li>you misuse the platform</li>
            </ul>
            <p className="mt-4">You may stop using the Service at any time.</p>
          </section>

          <hr className={hr} />

          <section>
            <h2 className={h2}>10. Third-Party Services</h2>
            <p className="mt-4">
              The platform may include links or integrations with third-party services.
            </p>
            <p className="mt-4">
              We are not responsible for their content, policies, or practices.
            </p>
          </section>

          <hr className={hr} />

          <section>
            <h2 className={h2}>11. Changes to the Terms</h2>
            <p className="mt-4">We may update these Terms at any time.</p>
            <p className="mt-4">
              Continued use of the platform constitutes acceptance of the updated Terms.
            </p>
          </section>

          <hr className={hr} />

          <section>
            <h2 className={h2}>12. Governing Law</h2>
            <p className="mt-4">
              These Terms are governed by the laws of New Mexico, United States of America.
            </p>
          </section>

          <hr className={hr} />

          <section>
            <h2 className={h2}>13. Contact</h2>
            <p className="mt-4">For any questions regarding these Terms:</p>
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
