import type { ReactNode } from "react";
import { PlatformLogos } from "@/components/platform-logos";
import type { AccountRulesBrief } from "@/lib/prop-firms";

type Props = {
  rules: AccountRulesBrief;
  /** Opens journal-style funded rules (e.g. from Compare). */
  onFundedRules?: () => void;
};

function normalizeConsistency(value: string): string {
  const v = value.trim();
  return v === "-" || v === "—" || v === "–" ? "100%" : value;
}

function RuleCard({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-[100px] flex-1 rounded-xl border border-slate-600/25 bg-black/30 px-2.5 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-sky-400/75">
        {label}
      </p>
      <div className="mt-1 text-[11px] leading-snug text-white/82">{children}</div>
    </div>
  );
}

export function AccountRulesBanner({ rules, onFundedRules }: Props) {
  return (
    <div className="flex flex-col border-t border-slate-600/20 bg-slate-950/35">
      <div
        className={`flex flex-wrap gap-2 px-4 pt-3 ${onFundedRules ? "pb-2" : "pb-3"}`}
      >
      <RuleCard label="Daily loss limit">{rules.dailyLossLimit}</RuleCard>
      <RuleCard label="Sizing">
        <span className="whitespace-pre-line">{rules.sizing}</span>
      </RuleCard>
      <RuleCard label="Consistency">{normalizeConsistency(rules.consistency)}</RuleCard>
      <RuleCard label="Minimum days">{rules.minDays}</RuleCard>
      <RuleCard label="Scalping">
        <span>{rules.scalping}</span>
        {rules.scalpingDetail ? (
          <p className="mt-0.5 text-[10px] text-slate-500">{rules.scalpingDetail}</p>
        ) : null}
      </RuleCard>
      <RuleCard label="Max accounts">{rules.maxAccounts}</RuleCard>
      <RuleCard label="Platform license">
        <div className="mt-1">
          <PlatformLogos platforms={rules.licensePlatforms} compact />
        </div>
      </RuleCard>
      </div>
      {onFundedRules ? (
        <div className="flex justify-center px-4 pb-3 pt-0">
          <button
            type="button"
            data-row-click-ignore="true"
            onClick={(e) => {
              e.stopPropagation();
              onFundedRules();
            }}
            className="rounded-lg border border-sky-500/35 bg-sky-500/12 px-3 py-1.5 text-[11px] font-semibold text-sky-100 transition hover:border-sky-400/45 hover:bg-sky-500/18"
          >
            Funded Rules
          </button>
        </div>
      ) : null}
    </div>
  );
}
