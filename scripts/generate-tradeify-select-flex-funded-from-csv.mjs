import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const csvPath = path.join(root, "CSV Propfirm Rules", "Tradeify Rules.csv");
const outPath = path.join(root, "lib", "journal", "tradeify-select-flex-funded-csv.generated.ts");

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
  if (!/^\d+,Tradeify,/.test(trimmed)) continue;
  const fields = parseCsvLine(trimmed);
  const program = (fields[4] ?? "").trim();
  if (program !== "Tradeify Select Flex") continue;
  rows.push(trimmed);
}

if (rows.length === 0) {
  console.error("No Tradeify Select Flex rows found in", csvPath);
  process.exit(1);
}

/** Indices funded : alignés sur `generate-tradeify-growth-funded-from-csv.mjs` (table 1). */
function rowToSelectFlex(line) {
  const f = parseCsvLine(line);
  const sizeRaw = (f[5] ?? "").trim().toLowerCase().replace(/\s+/g, "");
  const overnight = (f[20] ?? "").trim();
  const tradingNews = (f[21] ?? "").trim();
  const sizing = (f[22] ?? "").trim();
  const maxDrawdownUsd = parseMoneyUsd(f[24]);
  const minTradingDays = Number.parseInt(String(f[28] ?? "").replace(/\s/g, ""), 10);
  const minProfitPerDayUsd = parseMoneyUsd(f[29]);
  const payoutTierOrDashRaw = (f[30] ?? "").trim();
  const payoutMaxUsd = parseMoneyUsd(f[31]);
  const profitSplitLabel = (f[35] ?? "").trim();
  const notes = (f[36] ?? "").trim().replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const tierParsed = parseMoneyUsd(payoutTierOrDashRaw);

  if (
    !/^\d+k$/.test(sizeRaw) ||
    !Number.isFinite(minTradingDays) ||
    !Number.isFinite(minProfitPerDayUsd) ||
    !Number.isFinite(payoutMaxUsd) ||
    !Number.isFinite(maxDrawdownUsd)
  ) {
    console.error("Bad Select Flex parse", sizeRaw, f);
    process.exit(1);
  }

  if (Number.isFinite(tierParsed)) {
    console.error(
      "Unexpected numeric in funded payout tier column (expected dash for Select Flex)",
      sizeRaw,
      payoutTierOrDashRaw
    );
    process.exit(1);
  }

  return {
    size: sizeRaw,
    overnight,
    tradingNews,
    sizing,
    maxDrawdownUsd,
    minTradingDays,
    minProfitPerDayUsd,
    payoutMaxUsd,
    profitSplitLabel,
    notes,
  };
}

const bySize = {};
for (const line of rows) {
  const r = rowToSelectFlex(line);
  bySize[r.size] = r;
}

const order = ["25k", "50k", "100k", "150k"];
for (const sz of order) {
  if (!bySize[sz]) {
    console.error("Missing Select Flex size", sz);
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
  "/** Auto-generated from CSV Propfirm Rules/Tradeify Rules.csv (Tradeify Select Flex funded) — run: `npm run gen:tradeify-select-flex` */\n\n";
out += 'export type TradeifySelectFlexCsvSize = "25k" | "50k" | "100k" | "150k";\n\n';
out += "export type TradeifySelectFlexFundedCsvRow = {\n";
out += "  overnight: string;\n";
out += "  tradingNews: string;\n";
out += "  sizing: string;\n";
out += "  maxDrawdownUsd: number;\n";
out += "  minTradingDays: number;\n";
out += "  minProfitPerDayUsd: number;\n";
out += "  payoutMaxUsd: number;\n";
out += "  profitSplitLabel: string;\n";
out += "  notes: string;\n";
out += "};\n\n";
out +=
  "export const TRADEIFY_SELECT_FLEX_FUNDED_FROM_CSV: Record<TradeifySelectFlexCsvSize, TradeifySelectFlexFundedCsvRow> = {\n";

for (const sz of order) {
  const r = bySize[sz];
  out += `  "${sz}": {\n`;
  out += `    overnight: "${esc(r.overnight)}",\n`;
  out += `    tradingNews: "${esc(r.tradingNews)}",\n`;
  out += `    sizing: "${esc(r.sizing)}",\n`;
  out += `    maxDrawdownUsd: ${r.maxDrawdownUsd},\n`;
  out += `    minTradingDays: ${r.minTradingDays},\n`;
  out += `    minProfitPerDayUsd: ${r.minProfitPerDayUsd},\n`;
  out += `    payoutMaxUsd: ${r.payoutMaxUsd},\n`;
  out += `    profitSplitLabel: "${esc(r.profitSplitLabel)}",\n`;
  out += `    notes: "${esc(r.notes)}",\n`;
  out += `  },\n`;
}
out += "};\n";

fs.writeFileSync(outPath, out);
console.log("Wrote", path.relative(root, outPath));
