import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const csvPath = path.join(root, "CSV Propfirm Rules", "Funded Next Futures Rules.csv");
const outPath = path.join(root, "lib", "journal", "funded-next-legacy-funded-csv.generated.ts");

function parseCsvLine(line) {
  const result = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && c === ",") {
      result.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  result.push(cur);
  return result;
}

function mergeCsvRecords(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  let buf = "";
  for (const line of lines) {
    if (buf) buf += "\n" + line;
    else buf = line;
    const q = (buf.match(/"/g) || []).length;
    if (q % 2 === 0) {
      out.push(buf);
      buf = "";
    }
  }
  if (buf.trim()) out.push(buf);
  return out;
}

function parseMoneyUsd(raw) {
  if (raw == null) return NaN;
  let s = String(raw)
    .trim()
    .replace(/\$/g, "")
    .replace(/\u202f/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s/g, "");
  if (s === "-" || s === "—" || s === "") return NaN;
  if (s.includes(",") && !s.includes(".")) s = s.replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

const t = fs.readFileSync(csvPath, "utf8");
const records = mergeCsvRecords(t);

const rows = [];
for (const rec of records) {
  const trimmed = rec.trim();
  if (!trimmed) continue;
  if (/^#,/.test(trimmed)) continue;
  if (!/^\d+,Funded Next Futures,/.test(trimmed)) continue;
  const fields = parseCsvLine(trimmed);
  const program = (fields[4] ?? "").trim();
  if (program !== "Funded Next Futures Legacy") continue;
  rows.push(trimmed);
}

if (rows.length === 0) {
  console.error("No Funded Next Futures Legacy rows found in", csvPath);
  process.exit(1);
}

/**
 * Funded columns align with Rapid/Bolt (same CSV layout).
 * f[26] Buffer → Legacy funded uses $500 as min cycle profit (same cell as Buffer in sheet).
 * f[28] Min trading days (funded) → benchmark days threshold (single column in file).
 */
function rowLegacy(line) {
  const f = parseCsvLine(line);
  const sizeRaw = (f[5] ?? "").trim().toLowerCase().replace(/\s+/g, "");
  const overnight = (f[20] ?? "").trim();
  const tradingNews = (f[21] ?? "").trim();
  const sizing = (f[22] ?? "").trim();
  const maxDrawdownUsd = parseMoneyUsd(f[24]);
  const dllParsed = parseMoneyUsd(f[25]);
  const cycleProfitMinUsd = parseMoneyUsd(f[26]);
  const fundedConsistencyCell = (f[27] ?? "").trim();
  const requiredBenchmarkDays = Number.parseInt(String(f[28] ?? "").replace(/\s/g, ""), 10);
  const benchmarkMinProfitPerDayUsd = parseMoneyUsd(f[29]);
  const payoutMiniUsd = parseMoneyUsd(f[30]);
  const payoutCapStandardUsd = parseMoneyUsd(f[31]);
  const payoutMaxTierLabel = (f[32] ?? "").trim();
  const profitSplitLabel = (f[33] ?? "").trim();
  const notes = (f[34] ?? "").trim().replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  /**
   * Funded Next help centre: 100% withdrawable gain only after **30** benchmark days.
   * CSV funded « Min trading days » is **5** (minimum to request a payout) — not the uncap tier.
   */
  const uncapBenchmarkDays = 30;

  /**
   * Legacy policy: 50% of cycle before uncap benchmark count; not expressed as a number in the CSV row.
   * Regenerate after CSV adds a dedicated column if needed.
   */
  const earlyPhaseWithdrawalFractionOfCycle = 0.5;

  if (
    !/^\d+k$/.test(sizeRaw) ||
    !Number.isFinite(cycleProfitMinUsd) ||
    !Number.isFinite(requiredBenchmarkDays) ||
    requiredBenchmarkDays <= 0 ||
    !Number.isFinite(benchmarkMinProfitPerDayUsd) ||
    benchmarkMinProfitPerDayUsd <= 0 ||
    !Number.isFinite(payoutMiniUsd) ||
    !Number.isFinite(payoutCapStandardUsd) ||
    !Number.isFinite(maxDrawdownUsd) ||
    !Number.isFinite(uncapBenchmarkDays) ||
    !profitSplitLabel
  ) {
    console.error("Bad Legacy parse", sizeRaw, f);
    process.exit(1);
  }

  return {
    size: sizeRaw,
    overnight,
    tradingNews,
    sizing,
    maxDrawdownUsd,
    dllUsd: Number.isFinite(dllParsed) ? dllParsed : null,
    fundedConsistencyCell,
    cycleProfitMinUsd,
    requiredBenchmarkDays,
    uncapBenchmarkDays,
    benchmarkMinProfitPerDayUsd,
    payoutMiniUsd,
    payoutCapStandardUsd,
    payoutMaxTierLabel,
    profitSplitLabel,
    notes,
    earlyPhaseWithdrawalFractionOfCycle,
  };
}

const bySize = {};
for (const line of rows) {
  const r = rowLegacy(line);
  bySize[r.size] = r;
}

const order = ["25k", "50k", "100k"];
for (const sz of order) {
  if (!bySize[sz]) {
    console.error("Missing Legacy size", sz);
    process.exit(1);
  }
}

function esc(s) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "")
    .replace(/\n/g, "\\n");
}

let out =
  "/** Auto-generated from CSV Propfirm Rules/Funded Next Futures Rules.csv (Legacy funded) — run: `npm run gen:funded-next-legacy` */\n\n";
out += 'export type FundedNextLegacyCsvSize = "25k" | "50k" | "100k";\n\n';
out += "export type FundedNextLegacyFundedCsvRow = {\n";
out += "  overnight: string;\n";
out += "  tradingNews: string;\n";
out += "  sizing: string;\n";
out += "  maxDrawdownUsd: number;\n";
out += "  dllUsd: number | null;\n";
out += "  /** Funded « Consistency » cell (often « - » for Legacy). */\n";
out += "  fundedConsistencyCell: string;\n";
out += "  /** Min profit required on the payout cycle (CSV Buffer column on Legacy funded rows). */\n";
out += "  cycleProfitMinUsd: number;\n";
out += "  /** Min benchmark days in cycle before payout request (CSV Min trading days, funded payout block). */\n";
out += "  requiredBenchmarkDays: number;\n";
  out += "  /** Benchmark days after which withdrawable gross = full balance gain (help centre: 30; not in CSV). */\n";
out += "  uncapBenchmarkDays: number;\n";
out += "  /** Min net P/L per calendar day to count one benchmark day (CSV Min Profit per day). */\n";
out += "  benchmarkMinProfitPerDayUsd: number;\n";
out += "  payoutMiniUsd: number;\n";
out += "  /** Max gross per cycle while in 50% + cap phase (CSV 4st column). */\n";
out += "  payoutCapStandardUsd: number;\n";
out += "  payoutMaxTierLabel: string;\n";
out += "  profitSplitLabel: string;\n";
out += "  notes: string;\n";
out += "  /** Share of cycle profit used as withdrawable base before uncapBenchmarkDays (not in CSV numerically). */\n";
out += "  earlyPhaseWithdrawalFractionOfCycle: number;\n";
out += "};\n\n";
out +=
  "export const FUNDED_NEXT_LEGACY_FUNDED_FROM_CSV: Record<FundedNextLegacyCsvSize, FundedNextLegacyFundedCsvRow> = {\n";

for (const sz of order) {
  const r = bySize[sz];
  out += `  "${sz}": {\n`;
  out += `    overnight: "${esc(r.overnight)}",\n`;
  out += `    tradingNews: "${esc(r.tradingNews)}",\n`;
  out += `    sizing: "${esc(r.sizing)}",\n`;
  out += `    maxDrawdownUsd: ${r.maxDrawdownUsd},\n`;
  out += `    dllUsd: ${r.dllUsd == null ? "null" : r.dllUsd},\n`;
  out += `    fundedConsistencyCell: "${esc(r.fundedConsistencyCell)}",\n`;
  out += `    cycleProfitMinUsd: ${r.cycleProfitMinUsd},\n`;
  out += `    requiredBenchmarkDays: ${r.requiredBenchmarkDays},\n`;
  out += `    uncapBenchmarkDays: ${r.uncapBenchmarkDays},\n`;
  out += `    benchmarkMinProfitPerDayUsd: ${r.benchmarkMinProfitPerDayUsd},\n`;
  out += `    payoutMiniUsd: ${r.payoutMiniUsd},\n`;
  out += `    payoutCapStandardUsd: ${r.payoutCapStandardUsd},\n`;
  out += `    payoutMaxTierLabel: "${esc(r.payoutMaxTierLabel)}",\n`;
  out += `    profitSplitLabel: "${esc(r.profitSplitLabel)}",\n`;
  out += `    notes: "${esc(r.notes)}",\n`;
  out += `    earlyPhaseWithdrawalFractionOfCycle: ${r.earlyPhaseWithdrawalFractionOfCycle},\n`;
  out += `  },\n`;
}
out += "};\n";

fs.writeFileSync(outPath, out);
console.log("Wrote", path.relative(root, outPath));
