import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const csvPath = path.join(root, "CSV Propfirm Rules", "Funded Next Futures Rules.csv");
const outPath = path.join(root, "lib", "journal", "funded-next-rapid-funded-csv.generated.ts");

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

function parsePercentRatio(raw) {
  const t = String(raw ?? "")
    .trim()
    .replace(/\s/g, "");
  const m = t.match(/^([\d.,]+)\s*%$/);
  if (!m) return NaN;
  const n = Number(m[1].replace(",", "."));
  return Number.isFinite(n) && n > 0 && n <= 100 ? n / 100 : NaN;
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
  if (program !== "Funded Next Futures Rapid") continue;
  rows.push(trimmed);
}

if (rows.length === 0) {
  console.error("No Funded Next Futures Rapid rows found in", csvPath);
  process.exit(1);
}

function rowRapid(line) {
  const f = parseCsvLine(line);
  const sizeRaw = (f[5] ?? "").trim().toLowerCase().replace(/\s+/g, "");
  const overnight = (f[20] ?? "").trim();
  const tradingNews = (f[21] ?? "").trim();
  const sizing = (f[22] ?? "").trim();
  const maxDrawdownUsd = parseMoneyUsd(f[24]);
  const dllParsed = parseMoneyUsd(f[25]);
  const bufferParsed = parseMoneyUsd(f[26]);
  const consistencyRatio = parsePercentRatio(f[27]);
  const minTradingDays = Number.parseInt(String(f[28] ?? "").replace(/\s/g, ""), 10);
  const cycleProfitMinUsd = parseMoneyUsd(f[29]);
  const payoutMiniUsd = parseMoneyUsd(f[30]);
  const payoutMaxStandardUsd = parseMoneyUsd(f[31]);
  const payoutMaxTierLabel = (f[32] ?? "").trim();
  const profitSplitLabel = (f[33] ?? "").trim();
  const notes = (f[34] ?? "").trim().replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  if (
    !/^\d+k$/.test(sizeRaw) ||
    !Number.isFinite(consistencyRatio) ||
    !Number.isFinite(payoutMiniUsd) ||
    !Number.isFinite(payoutMaxStandardUsd) ||
    !Number.isFinite(maxDrawdownUsd) ||
    !profitSplitLabel
  ) {
    console.error("Bad Rapid parse", sizeRaw, f);
    process.exit(1);
  }

  const capUnlimited =
    /no\s*limit/i.test(payoutMaxTierLabel) || payoutMaxTierLabel === "—" || payoutMaxTierLabel === "-";
  /** CSV sub-columns « 4st » / « 5th »: cap applies until N withdrawals, then tier 2 (No limit). */
  const capRemovalWithdrawalCount = 4;

  return {
    size: sizeRaw,
    overnight,
    tradingNews,
    sizing,
    maxDrawdownUsd,
    dllUsd: Number.isFinite(dllParsed) ? dllParsed : null,
    bufferUsd: Number.isFinite(bufferParsed) ? bufferParsed : null,
    consistencyRatio,
    minTradingDays: Number.isFinite(minTradingDays) ? minTradingDays : null,
    cycleProfitMinUsd: Number.isFinite(cycleProfitMinUsd) ? cycleProfitMinUsd : null,
    payoutMiniUsd,
    payoutMaxStandardUsd,
    payoutMaxTierLabel,
    capUnlimited,
    capRemovalWithdrawalCount,
    profitSplitLabel,
    notes,
  };
}

const bySize = {};
for (const line of rows) {
  const r = rowRapid(line);
  bySize[r.size] = r;
}

const order = ["25k", "50k", "100k"];
for (const sz of order) {
  if (!bySize[sz]) {
    console.error("Missing Rapid size", sz);
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
  "/** Auto-generated from CSV Propfirm Rules/Funded Next Futures Rules.csv (Rapid funded) — run: `npm run gen:funded-next-rapid` */\n\n";
out += 'export type FundedNextRapidCsvSize = "25k" | "50k" | "100k";\n\n';
out += "export type FundedNextRapidFundedCsvRow = {\n";
out += "  overnight: string;\n";
out += "  tradingNews: string;\n";
out += "  sizing: string;\n";
out += "  maxDrawdownUsd: number;\n";
out += "  dllUsd: number | null;\n";
out += "  bufferUsd: number | null;\n";
out += "  /** Funded consistency ratio (ex. 40 % → 0.4). */\n";
out += "  consistencyRatio: number;\n";
out += "  /** CSV min trading days — rules display only; not used for payout eligibility. */\n";
out += "  minTradingDays: number | null;\n";
out += "  /** Min profit per day column when numeric; else null (Rapid CSV « - »). */\n";
out += "  cycleProfitMinUsd: number | null;\n";
out += "  payoutMiniUsd: number;\n";
out += "  payoutMaxStandardUsd: number;\n";
out += "  payoutMaxTierLabel: string;\n";
out += "  capUnlimited: boolean;\n";
out += "  /** Withdrawals completed before cap tier « No limit » applies (inferred from 4st / 5th columns). */\n";
out += "  capRemovalWithdrawalCount: number;\n";
out += "  profitSplitLabel: string;\n";
out += "  notes: string;\n";
out += "};\n\n";
out +=
  "export const FUNDED_NEXT_RAPID_FUNDED_FROM_CSV: Record<FundedNextRapidCsvSize, FundedNextRapidFundedCsvRow> = {\n";

for (const sz of order) {
  const r = bySize[sz];
  out += `  "${sz}": {\n`;
  out += `    overnight: "${esc(r.overnight)}",\n`;
  out += `    tradingNews: "${esc(r.tradingNews)}",\n`;
  out += `    sizing: "${esc(r.sizing)}",\n`;
  out += `    maxDrawdownUsd: ${r.maxDrawdownUsd},\n`;
  out += `    dllUsd: ${r.dllUsd == null ? "null" : r.dllUsd},\n`;
  out += `    bufferUsd: ${r.bufferUsd == null ? "null" : r.bufferUsd},\n`;
  out += `    consistencyRatio: ${r.consistencyRatio},\n`;
  out += `    minTradingDays: ${r.minTradingDays == null ? "null" : r.minTradingDays},\n`;
  out += `    cycleProfitMinUsd: ${r.cycleProfitMinUsd == null ? "null" : r.cycleProfitMinUsd},\n`;
  out += `    payoutMiniUsd: ${r.payoutMiniUsd},\n`;
  out += `    payoutMaxStandardUsd: ${r.payoutMaxStandardUsd},\n`;
  out += `    payoutMaxTierLabel: "${esc(r.payoutMaxTierLabel)}",\n`;
  out += `    capUnlimited: ${r.capUnlimited},\n`;
  out += `    capRemovalWithdrawalCount: ${r.capRemovalWithdrawalCount},\n`;
  out += `    profitSplitLabel: "${esc(r.profitSplitLabel)}",\n`;
  out += `    notes: "${esc(r.notes)}",\n`;
  out += `  },\n`;
}
out += "};\n";

fs.writeFileSync(outPath, out);
console.log("Wrote", path.relative(root, outPath));
