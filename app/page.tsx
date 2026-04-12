import Navbar from "../components/navbar";
import Link from "next/link";

const features = [
  {
    label: "Comparator",
    title: "Compare prop firms with real trading context",
    description:
      "Quickly review evaluation costs, payout logic, scaling limits, account caps, and trader-relevant rules without digging through multiple websites.",
    points: [
      "Funding models and evaluation fees",
      "Payout rules and account limits",
      "Built for futures prop traders",
    ],
  },
  {
    label: "Journal",
    title: "Journal sessions with a structure built for execution",
    description:
      "Track your sessions, decision quality, discipline, recurring mistakes, and account-by-account performance in a format adapted to multi-account prop trading.",
    points: [
      "Session notes and discipline tracking",
      "Execution review by account",
      "Structured journaling workflow",
    ],
  },
  {
    label: "Multi-account",
    title: "Track all your accounts in one clear workspace",
    description:
      "Monitor evaluation accounts, funded accounts, payout readiness, minimum trading days, and account status across multiple prop firms from a single view.",
    points: [
      "Evaluation and funded account status",
      "Payout readiness and minimum days",
      "One dashboard for all firms",
    ],
  },
];

const summaryCards = [
  { title: "Active Accounts", value: "14", note: "Across multiple prop firms" },
  { title: "Accounts Near Payout", value: "3", note: "Ready for review soon" },
  { title: "Tracked Firms", value: "8", note: "Comparator-ready structure" },
  { title: "Journal Score", value: "8.4", note: "Discipline improving" },
];

const faqs = [
  {
    question: "Is MyTradeDesk built specifically for prop firm traders?",
    answer:
      "Yes. The product is designed around prop firm comparison, multi-account tracking, and journaling workflows relevant to evaluation and funded accounts.",
  },
  {
    question: "Can I track multiple firms and multiple accounts?",
    answer:
      "Yes. Multi-account tracking is one of the core parts of the product, with a structure meant for traders managing several firms and account states at once.",
  },
  {
    question: "Will the comparator include payout rules and account limits?",
    answer:
      "Yes. The goal is to centralize trader-relevant rules such as payout logic, scaling limits, account caps, and other constraints that matter in real usage.",
  },
  {
    question: "Is the journal only for prop traders?",
    answer:
      "No, but it is designed with prop firm workflows in mind first, especially for traders who need structured tracking across multiple accounts.",
  },
  {
    question: "Will there be an AI assistant later?",
    answer:
      "Yes. A future version may include an assistant trained on listed prop firm rules and questions related to multi-account journaling workflows.",
  },
];

function FeatureCardsSection() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-28">
      <div className="max-w-3xl">
        <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70 backdrop-blur">
          Core features
        </div>

        <h2 className="mt-6 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
          One product, three core layers.
        </h2>

        <p className="mt-5 max-w-2xl text-lg leading-8 text-white/60">
          MyTradeDesk is designed to help serious prop traders compare firms,
          track multiple accounts, and journal sessions with a structure that
          actually reflects how prop trading works.
        </p>
      </div>

      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="group rounded-[28px] border border-white/10 bg-white/3 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/5"
          >
            <p className="text-sm text-blue-300/80">{feature.label}</p>

            <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-white">
              {feature.title}
            </h3>

            <p className="mt-4 text-base leading-7 text-white/60">
              {feature.description}
            </p>

            <div className="mt-8 space-y-3">
              {feature.points.map((point) => (
                <div
                  key={point}
                  className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/30 px-4 py-3"
                >
                  <div className="h-2 w-2 rounded-full bg-blue-400/80" />
                  <span className="text-sm text-white/75">{point}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SummarySection() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-28">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70 backdrop-blur">
            Summary view
          </div>

          <h2 className="mt-6 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            A dashboard that feels like a real trading workspace.
          </h2>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/60">
            Get a clean overview of your accounts, payouts, firm comparison data,
            and journaling metrics without bouncing between spreadsheets, notes,
            and dashboards.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {summaryCards.map((card) => (
              <div
                key={card.title}
                className="rounded-[28px] border border-white/10 bg-white/3 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
              >
                <p className="text-sm text-white/45">{card.title}</p>
                <p className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white">
                  {card.value}
                </p>
                <p className="mt-2 text-sm text-white/55">{card.note}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 rounded-[36px] bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_42%)] blur-2xl" />

          <div className="relative overflow-hidden rounded-[36px] border border-white/8 bg-white/4 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_18%,rgba(255,255,255,0)_42%)]" />

            <div className="relative">
              <p className="text-sm text-white/40">Preview</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                Comparator snapshot
              </h3>

              <div className="mt-8 space-y-3">
                {[
                  ["Topstep", "Fast payout / Clean rules"],
                  ["Apex Trader Funding", "Flexible scaling / Up to 20 accounts"],
                  ["Take Profit Trader", "Scalper-friendly / Lower friction"],
                ].map(([name, desc]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between rounded-[20px] bg-white/3 px-4 py-4 ring-1 ring-white/8"
                  >
                    <span className="text-sm font-medium text-white/85">
                      {name}
                    </span>
                    <span className="text-sm text-white/45">{desc}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-3xl bg-black/30 p-5 ring-1 ring-white/8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/40">Rule alert</p>
                    <p className="mt-2 text-xl font-semibold text-white">
                      2 accounts close to payout threshold
                    </p>
                  </div>
                  <div className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-200">
                    Monitor
                  </div>
                </div>

                <div className="mt-5 h-24 rounded-[20px] bg-[linear-gradient(90deg,rgba(8,12,20,0.9)_0%,rgba(10,28,60,0.95)_35%,rgba(6,40,92,0.98)_65%,rgba(12,74,110,0.9)_100%)] ring-1 ring-white/8" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  return (
    <section id="faq" className="mx-auto max-w-5xl px-6 py-28">
      <div className="text-center">
        <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70 backdrop-blur">
          FAQ
        </div>

        <h2 className="mt-6 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
          Frequently asked questions
        </h2>
      </div>

      <div className="mt-14 space-y-4">
        {faqs.map((faq) => (
          <div
            key={faq.question}
            className="rounded-3xl border border-white/10 bg-white/3 p-6"
          >
            <h3 className="text-lg font-medium text-white">{faq.question}</h3>
            <p className="mt-3 text-base leading-7 text-white/60">
              {faq.answer}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FooterSection() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-3">
          <div>
            <h3 className="text-2xl font-semibold tracking-[-0.03em] text-white">
              MyTradeDesk
            </h3>
            <p className="mt-4 max-w-sm text-sm leading-7 text-white/55">
              Comparator, journaling, and multi-account tracking for serious prop
              firm traders.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-white">Product</h4>
            <div className="mt-4 space-y-3 text-sm text-white/55">
              <p>Comparator</p>
              <p>Journal</p>
              <p>Multi-account tracking</p>
              <p>FAQ</p>
              <p>Blog</p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-white">Legal</h4>
            <div className="mt-4 space-y-3 text-sm text-white/55">
              <p>Privacy Policy</p>
              <p>Terms of Service</p>
              <p>Affiliate Disclosure</p>
              <p>Contact</p>
            </div>
          </div>
        </div>

        <div className="mt-14 border-t border-white/10 pt-8 text-sm text-white/35">
          © 2026 MyTradeDesk. Built for serious prop firm traders.
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <Navbar />

      <section className="relative">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-24 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-700/20 blur-3xl" />
          <div className="absolute right-24 top-40 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute left-24 top-72 h-56 w-56 rounded-full bg-white/5 blur-3xl" />
        </div>

        <div className="mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl items-center gap-16 px-6 py-20 lg:grid-cols-2 lg:py-28">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70 backdrop-blur">
              Built for multi-account prop traders
            </div>

            <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
              The prop firm comparator and trading journal built for
              multi-account traders.
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-8 text-white/65 sm:text-xl">
              Compare prop firms, track your accounts, monitor key rules, and
              journal your sessions in one clean, structured platform.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/compare"
                className="rounded-2xl bg-white px-6 py-3.5 text-sm font-medium text-black transition hover:bg-white/90"
              >
                Get Started
              </Link>
              <Link
                href="/compare"
                className="rounded-2xl border border-white/12 bg-white/5 px-6 py-3.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                Explore Comparator
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-white/45">
              <span>Compare firms faster</span>
              <span className="h-1 w-1 rounded-full bg-white/20" />
              <span>Track multiple accounts</span>
              <span className="h-1 w-1 rounded-full bg-white/20" />
              <span>Journal with structure</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-[36px] bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_42%)] blur-2xl" />

            <div className="relative overflow-hidden rounded-[36px] border border-white/8 bg-white/4 p-5 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_18%,rgba(255,255,255,0)_42%)]" />

              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-sm text-white/40">Workspace</p>
                  <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-white">
                    MyTradeDesk Overview
                  </h2>
                </div>

                <div className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-200">
                  Live
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <div className="rounded-[28px] bg-black/35 p-5 ring-1 ring-white/8">
                  <p className="text-sm text-white/40">Active Accounts</p>
                  <p className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white">
                    14
                  </p>
                  <p className="mt-2 text-sm text-white/50">
                    Across multiple prop firms
                  </p>
                </div>

                <div className="rounded-[28px] bg-black/35 p-5 ring-1 ring-white/8">
                  <p className="text-sm text-white/40">Eligible Payouts</p>
                  <p className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white">
                    3
                  </p>
                  <p className="mt-2 text-sm text-white/50">
                    Accounts ready for review
                  </p>
                </div>

                <div className="rounded-[28px] bg-black/35 p-5 ring-1 ring-white/8 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white/40">Comparator Snapshot</p>
                    <span className="text-xs text-white/30">Updated daily</span>
                  </div>

                  <div className="mt-5 space-y-3">
                    {[
                      ["Topstep", "Fast payout / Clean rules"],
                      ["Apex Trader Funding", "Flexible scaling / Multiple accounts"],
                      ["Take Profit Trader", "Scalper-friendly / Lower friction"],
                    ].map(([name, desc]) => (
                      <div
                        key={name}
                        className="flex items-center justify-between rounded-[20px] bg-white/3 px-4 py-3 ring-1 ring-white/8"
                      >
                        <span className="text-sm font-medium text-white/85">
                          {name}
                        </span>
                        <span className="text-sm text-white/45">{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[28px] bg-black/35 p-5 ring-1 ring-white/8 md:col-span-2">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-sm text-white/40">Journal Score</p>
                      <p className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white">
                        8.4 / 10
                      </p>
                    </div>
                    <p className="text-sm text-white/42">Discipline improving</p>
                  </div>

                  <div className="mt-5 h-28 overflow-hidden rounded-[22px] bg-black/30 ring-1 ring-white/8">
                    <div className="h-full w-full bg-[linear-gradient(90deg,rgba(8,12,20,0.9)_0%,rgba(10,28,60,0.95)_35%,rgba(6,40,92,0.98)_65%,rgba(12,74,110,0.9)_100%)]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FeatureCardsSection />
      <SummarySection />
      <FAQSection />
      <FooterSection />
    </main>
  );
}