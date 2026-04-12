import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const csvPath = path.join(root, "CSV Propfirm Rules", "Tradeify Rules.csv");
const outPath = path.join(root, "lib", "journal", "tradeify-growth-funded-csv.generated.ts");

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

function parseMoneyUsd(raw) {
  if (raw == null) return NaN;
  let s = String(raw)
    .trim()
    .replace(/\$/g, "")
    .replace(/\u202f/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s/g, "");
  if (s.includes(",") && !s.includes(".")) s = s.replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function parsePercent(raw) {
  const t = String(raw ?? "")
    .trim()
    .replace(/\s/g, "");
  const m = t.match(/^([\d.,]+)\s*%$/);
  if (!m) return NaN;
  let s = m[1].replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n / 100 : NaN;
}

const t = fs.readFileSync(csvPath, "utf8");
const lines = t.split(/\r?\n/);

const rows = [];
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  if (/^#,/.test(trimmed)) continue;
  if (!/^\d+,Tradeify,/.test(trimmed)) continue;
  const fields = parseCsvLine(trimmed);
  const program = (fields[4] ?? "").trim();
  if (program !== "Tradeify Growth") continue;
  rows.push(trimmed);
}

if (rows.length === 0) {
  console.error("No Tradeify Growth rows found in", csvPath);
  process.exit(1);
}

/** Indices alignés sur Tradeify Rules.csv ligne data (éval + funded). */
function rowToFunded(line) {
  const f = parseCsvLine(line);
  const sizeRaw = (f[5] ?? "").trim().toLowerCase().replace(/\s+/g, "");
  const bufferUsd = parseMoneyUsd(f[26]);
  const consistencyRatio = parsePercent(f[27]);
  const minDays = Number.parseInt(String(f[28] ?? "").replace(/\s/g, ""), 10);
  const minProfitPerDayUsd = parseMoneyUsd(f[29]);
  const payoutMiniUsd = parseMoneyUsd(f[30]);
  const payout1st = parseMoneyUsd(f[31]);
  const payout2nd = parseMoneyUsd(f[32]);
  const payout3rd = parseMoneyUsd(f[33]);
  const payout4th = parseMoneyUsd(f[34]);
  const profitSplit = (f[35] ?? "").trim();

  if (
    !/^\d+k$/.test(sizeRaw) ||
    !Number.isFinite(bufferUsd) ||
    !Number.isFinite(consistencyRatio) ||
    !Number.isFinite(minDays) ||
    !Number.isFinite(minProfitPerDayUsd) ||
    !Number.isFinite(payoutMiniUsd) ||
    !Number.isFinite(payout1st) ||
    !Number.isFinite(payout2nd) ||
    !Number.isFinite(payout3rd) ||
    !Number.isFinite(payout4th)
  ) {
    console.error("Bad parse", sizeRaw, f);
    process.exit(1);
  }

  return {
    size: sizeRaw,
    bufferUsd,
    payoutConsistencyRatio: consistencyRatio,
    minTradingDays: minDays,
    minProfitPerDayUsd,
    payoutMiniUsd,
    payout1stUsd: payout1st,
    payout2ndUsd: payout2nd,
    payout3rdUsd: payout3rd,
    payout4thPlusUsd: payout4th,
    profitSplitLabel: profitSplit,
  };
}

const bySize = {};
for (const line of rows) {
  const r = rowToFunded(line);
  bySize[r.size] = r;
}

const order = ["25k", "50k", "100k", "150k"];
for (const sz of order) {
  if (!bySize[sz]) {
    console.error("Missing size", sz);
    process.exit(1);
  }
}

function esc(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "").replace(/\n/g, "\\n");
}

let out =
  "/** Auto-generated from CSV Propfirm Rules/Tradeify Rules.csv (Tradeify Growth funded) — run: `npm run gen:tradeify-growth` */\n\n";
out += "export type TradeifyGrowthCsvSize = \"25k\" | \"50k\" | \"100k\" | \"150k\";\n\n";
out += "export type TradeifyGrowthFundedCsvRow = {\n";
out += "  bufferUsd: number;\n";
out += "  /** Ex. 0.35 pour 35 % */\n";
out += "  payoutConsistencyRatio: number;\n";
out += "  minTradingDays: number;\n";
out += "  minProfitPerDayUsd: number;\n";
out += "  payoutMiniUsd: number;\n";
out += "  payout1stUsd: number;\n";
out += "  payout2ndUsd: number;\n";
out += "  payout3rdUsd: number;\n";
out += "  payout4thPlusUsd: number;\n";
out += "  profitSplitLabel: string;\n";
out += "};\n\n";
out += "export const TRADEIFY_GROWTH_FUNDED_FROM_CSV: Record<TradeifyGrowthCsvSize, TradeifyGrowthFundedCsvRow> = {\n";

for (const sz of order) {
  const r = bySize[sz];
  out += `  "${sz}": {\n`;
  out += `    bufferUsd: ${r.bufferUsd},\n`;
  out += `    payoutConsistencyRatio: ${r.payoutConsistencyRatio},\n`;
  out += `    minTradingDays: ${r.minTradingDays},\n`;
  out += `    minProfitPerDayUsd: ${r.minProfitPerDayUsd},\n`;
  out += `    payoutMiniUsd: ${r.payoutMiniUsd},\n`;
  out += `    payout1stUsd: ${r.payout1stUsd},\n`;
  out += `    payout2ndUsd: ${r.payout2ndUsd},\n`;
  out += `    payout3rdUsd: ${r.payout3rdUsd},\n`;
  out += `    payout4thPlusUsd: ${r.payout4thPlusUsd},\n`;
  out += `    profitSplitLabel: "${esc(r.profitSplitLabel)}",\n`;
  out += `  },\n`;
}
out += "};\n";

fs.writeFileSync(outPath, out);
console.log("Wrote", path.relative(root, outPath));
