import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LucidGuidePage } from "@/components/prop-firm/lucid/lucid-guide-page";
import Navbar from "@/components/navbar";
import { LUCID_GUIDE_SLUG } from "@/lib/lucid-guide-nav";
import { propFirms } from "@/lib/prop-firms";
import { propFirmSlug } from "@/lib/prop-firm-slug";

function displayNameForSlug(slug: string): string | null {
  for (const f of propFirms) {
    if (propFirmSlug(f.name) === slug) {
      return f.name;
    }
  }
  return null;
}

export function generateStaticParams(): { slug: string }[] {
  const slugs = new Set<string>();
  for (const f of propFirms) {
    slugs.add(propFirmSlug(f.name));
  }
  return [...slugs].map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const name = displayNameForSlug(slug);
  if (!name) {
    return { title: "Prop firm | MyTradeDesk" };
  }
  if (slug === LUCID_GUIDE_SLUG) {
    return {
      title: "Lucid Trading — Guide | MyTradeDesk",
      description:
        "Lucid Trading — presentation, evaluations, rules, platforms, and FAQ.",
    };
  }
  return {
    title: `${name} | MyTradeDesk`,
    description: `${name} — firm details (coming soon).`,
  };
}

export default async function PropFirmDetailPage({ params }: Props) {
  const { slug } = await params;
  const displayName = displayNameForSlug(slug);
  if (!displayName) {
    notFound();
  }

  if (slug === LUCID_GUIDE_SLUG) {
    return <LucidGuidePage />;
  }

  return (
    <main className="relative flex min-h-0 flex-1 flex-col bg-gradient-to-b from-[#101012] via-[#0b0b0d] to-[#080809] text-white">
      <Navbar />

      <div className="mx-auto flex max-w-3xl flex-col items-center justify-center px-6 pb-24 pt-28 text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/40">
          Prop firm
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white/95">
          {displayName}
        </h1>
        <p className="mt-6 rounded-2xl border border-white/[0.09] bg-zinc-900/45 px-8 py-10 text-lg text-white/75 shadow-[0_1px_8px_rgba(0,0,0,0.28)] ring-1 ring-inset ring-white/[0.09]">
          Coming Soon
        </p>
        <Link
          href="/compare"
          className="mt-10 text-sm font-medium text-white/55 underline-offset-4 transition hover:text-white/85 hover:underline"
        >
          Back to Compare
        </Link>
      </div>
    </main>
  );
}
