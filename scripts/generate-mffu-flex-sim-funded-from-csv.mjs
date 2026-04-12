import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const csvPath = path.join(root, "CSV Propfirm Rules", "My Funded Futures Rules.csv");
const outPath = path.join(root, "lib", "journal", "mffu-flex-sim-funded-csv.generated.ts");

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
    .replace(/£/g, "")
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
  if (!/^\d+,My Funded Futures,/.test(trimmed)) continue;
  const fields = parseCsvLine(trimmed);
  const program = (fields[4] ?? "").trim();
  if (program !== "My Funded Futures Flex") continue;
  rows.push(trimmed);
}

if (rows.length === 0) {
  console.error("No My Funded Futures Flex rows found in", csvPath);
  process.exit(1);
}

/** Funded block indices aligned with My Funded Futures Rules.csv (Flex rows). */
function rowFlex(line) {
  const f = parseCsvLine(line);
  const sizeRaw = (f[5] ?? "").trim().toLowerCase().replace(/\s+/g, "");
  const fundedMinTradingDays = Number.parseInt(String(f[29] ?? "").replace(/\s/g, ""), 10);
  const winningDayThresholdUsd = parseMoneyUsd(f[30]);
  const payoutMiniUsd = parseMoneyUsd(f[31]);
  const payoutMaxUsd = parseMoneyUsd(f[32]);
  const profitSplitLabel = (f[33] ?? "").trim();
  const notes = (f[34] ?? "").trim().replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  if (
    (sizeRaw !== "25k" && sizeRaw !== "50k") ||
    !Number.isFinite(fundedMinTradingDays) ||
    fundedMinTradingDays <= 0 ||
    !Number.isFinite(winningDayThresholdUsd) ||
    winningDayThresholdUsd <= 0 ||
    !Number.isFinite(payoutMiniUsd) ||
    !Number.isFinite(payoutMaxUsd) ||
    !profitSplitLabel
  ) {
    console.error("Bad Flex funded parse", sizeRaw, f);
    process.exit(1);
  }

  const requiredCycleProfitUsd = fundedMinTradingDays * winningDayThresholdUsd;

  return {
    size: sizeRaw,
    fundedMinTradingDays,
    winningDayThresholdUsd,
    requiredCycleProfitUsd,
    payoutMiniUsd,
    payoutMaxUsd,
    profitSplitLabel,
    notes,
  };
}

const bySize = {};
for (const line of rows) {
  const r = rowFlex(line);
  bySize[r.size] = r;
}

const order = ["25k", "50k"];
for (const sz of order) {
  if (!bySize[sz]) {
    console.error("Missing Flex size", sz);
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
  "/** Auto-generated from CSV Propfirm Rules/My Funded Futures Rules.csv (Flex funded) — run: `npm run gen:mffu-flex` */\n\n";
out += 'export type MffuFlexSimFundedCsvSize = "25k" | "50k";\n\n';
out += "export type MffuFlexSimFundedCsvRow = {\n";
out += "  /** Funded « Min trading days » — winning days required per cycle. */\n";
out += "  fundedMinTradingDays: number;\n";
out += "  /** Funded « Min Profit per day » (USD) — net day threshold for a winning day. */\n";
out += "  winningDayThresholdUsd: number;\n";
out += "  /** Implied minimum cycle net P/L: `fundedMinTradingDays × winningDayThresholdUsd` (no separate CSV cell). */\n";
out += "  requiredCycleProfitUsd: number;\n";
out += "  payoutMiniUsd: number;\n";
out += "  payoutMaxUsd: number;\n";
out += "  profitSplitLabel: string;\n";
out += "  notes: string;\n";
out += "};\n\n";
out += "export const MFFU_FLEX_SIM_FUNDED_FROM_CSV: Record<MffuFlexSimFundedCsvSize, MffuFlexSimFundedCsvRow> = {\n";

for (const sz of order) {
  const r = bySize[sz];
  out += `  "${sz}": {\n`;
  out += `    fundedMinTradingDays: ${r.fundedMinTradingDays},\n`;
  out += `    winningDayThresholdUsd: ${r.winningDayThresholdUsd},\n`;
  out += `    requiredCycleProfitUsd: ${r.requiredCycleProfitUsd},\n`;
  out += `    payoutMiniUsd: ${r.payoutMiniUsd},\n`;
  out += `    payoutMaxUsd: ${r.payoutMaxUsd},\n`;
  out += `    profitSplitLabel: "${esc(r.profitSplitLabel)}",\n`;
  out += `    notes: "${esc(r.notes)}",\n`;
  out += "  },\n";
}

out += "};\n";
fs.writeFileSync(outPath, out, "utf8");
console.log("Wrote", outPath);
