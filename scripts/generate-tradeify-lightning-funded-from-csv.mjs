import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const csvPath = path.join(root, "CSV Propfirm Rules", "Tradeify Rules.csv");
const outPath = path.join(root, "lib", "journal", "tradeify-lightning-funded-csv.generated.ts");

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
  if (s === "-" || s === "—" || s === "") return NaN;
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
  const f = parseCsvLine(trimmed);
  const program = (f[14] ?? "").trim();
  if (program !== "Tradeify Ligthning") continue;
  rows.push(trimmed);
}

if (rows.length === 0) {
  console.error("No Tradeify Ligthning rows found in", csvPath);
  process.exit(1);
}

/** Indices : ligne 29+ du CSV Direct funded (Tradeify Rules.csv). */
function rowToLightning(line) {
  const f = parseCsvLine(line);
  const sizeRaw = (f[15] ?? "").trim().toLowerCase().replace(/\s+/g, "");
  const dllRaw = (f[25] ?? "").trim();
  const dllParsed = parseMoneyUsd(f[25]);
  const dllUsd = Number.isFinite(dllParsed) ? dllParsed : null;

  const row = {
    csvRowNumber: Number.parseInt(String(f[10] ?? "").replace(/\s/g, ""), 10),
    propFirm: (f[11] ?? "").trim(),
    headquarters: (f[12] ?? "").trim(),
    since: (f[13] ?? "").trim(),
    accountName: (f[14] ?? "").trim(),
    size: sizeRaw,
    billing: (f[16] ?? "").trim(),
    regularPriceUsd: parseMoneyUsd(f[17]),
    discountPriceUsd: parseMoneyUsd(f[18]),
    promoCode: (f[19] ?? "").trim(),
    overnight: (f[20] ?? "").trim(),
    tradingNews: (f[21] ?? "").trim(),
    sizing: (f[22] ?? "").trim(),
    drawdownType: (f[23] ?? "").trim(),
    drawdownUsd: parseMoneyUsd(f[24]),
    dllRaw,
    dllUsd,
    profitGoal1stCycleUsd: parseMoneyUsd(f[26]),
    profitGoal2PlusCycleUsd: parseMoneyUsd(f[27]),
    payoutConsistencyDisplay: (f[28] ?? "").trim(),
    payoutConsistencyRatio: parsePercent(f[28]),
    minTradingDaysFromCsv: Number.parseInt(String(f[29] ?? "").replace(/\s/g, ""), 10),
    payoutMiniUsd: parseMoneyUsd(f[30]),
    payoutMax1stUsd: parseMoneyUsd(f[31]),
    payoutMax2ndUsd: parseMoneyUsd(f[32]),
    payoutMax3rdUsd: parseMoneyUsd(f[33]),
    payoutMax4thPlusUsd: parseMoneyUsd(f[34]),
    profitSplitLabel: (f[35] ?? "").trim(),
  };

  if (
    !/^\d+k$/.test(row.size) ||
    !Number.isFinite(row.csvRowNumber) ||
    !Number.isFinite(row.regularPriceUsd) ||
    !Number.isFinite(row.discountPriceUsd) ||
    !Number.isFinite(row.drawdownUsd) ||
    !Number.isFinite(row.profitGoal1stCycleUsd) ||
    !Number.isFinite(row.profitGoal2PlusCycleUsd) ||
    !Number.isFinite(row.payoutConsistencyRatio) ||
    !Number.isFinite(row.minTradingDaysFromCsv) ||
    !Number.isFinite(row.payoutMiniUsd) ||
    !Number.isFinite(row.payoutMax1stUsd) ||
    !Number.isFinite(row.payoutMax2ndUsd) ||
    !Number.isFinite(row.payoutMax3rdUsd) ||
    !Number.isFinite(row.payoutMax4thPlusUsd)
  ) {
    console.error("Bad Lightning parse", row.size, f);
    process.exit(1);
  }

  return row;
}

const bySize = {};
for (const line of rows) {
  const r = rowToLightning(line);
  bySize[r.size] = r;
}

const order = ["25k", "50k", "100k", "150k"];
for (const sz of order) {
  if (!bySize[sz]) {
    console.error("Missing Lightning size", sz);
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
  "/** Auto-generated from CSV Propfirm Rules/Tradeify Rules.csv (Tradeify Ligthning Direct funded) — run: `npm run gen:tradeify-lightning` */\n\n";
out += 'export type TradeifyLightningSize = "25k" | "50k" | "100k" | "150k";\n\n';
out += "export type TradeifyLightningFundedCsvRow = {\n";
out += "  csvRowNumber: number;\n";
out += "  propFirm: string;\n";
out += "  headquarters: string;\n";
out += "  since: string;\n";
out += "  accountName: string;\n";
out += "  size: TradeifyLightningSize;\n";
out += "  billing: string;\n";
out += "  regularPriceUsd: number;\n";
out += "  discountPriceUsd: number;\n";
out += "  promoCode: string;\n";
out += "  overnight: string;\n";
out += "  tradingNews: string;\n";
out += "  sizing: string;\n";
out += "  drawdownType: string;\n";
out += "  drawdownUsd: number;\n";
out += "  dllRaw: string;\n";
out += "  dllUsd: number | null;\n";
out += "  profitGoal1stCycleUsd: number;\n";
out += "  profitGoal2PlusCycleUsd: number;\n";
out += "  payoutConsistencyDisplay: string;\n";
out += "  /** Ex. 0.2 pour 20 % */\n";
out += "  payoutConsistencyRatio: number;\n";
out += "  minTradingDaysFromCsv: number;\n";
out += "  payoutMiniUsd: number;\n";
out += "  payoutMax1stUsd: number;\n";
out += "  payoutMax2ndUsd: number;\n";
out += "  payoutMax3rdUsd: number;\n";
out += "  payoutMax4thPlusUsd: number;\n";
out += "  profitSplitLabel: string;\n";
out += "};\n\n";
out += "export const TRADEIFY_LIGHTNING_FUNDED_FROM_CSV: Record<TradeifyLightningSize, TradeifyLightningFundedCsvRow> = {\n";

for (const sz of order) {
  const r = bySize[sz];
  const dllJs = r.dllUsd == null ? "null" : r.dllUsd;
  out += `  "${sz}": {\n`;
  out += `    csvRowNumber: ${r.csvRowNumber},\n`;
  out += `    propFirm: "${esc(r.propFirm)}",\n`;
  out += `    headquarters: "${esc(r.headquarters)}",\n`;
  out += `    since: "${esc(r.since)}",\n`;
  out += `    accountName: "${esc(r.accountName)}",\n`;
  out += `    size: "${r.size}",\n`;
  out += `    billing: "${esc(r.billing)}",\n`;
  out += `    regularPriceUsd: ${r.regularPriceUsd},\n`;
  out += `    discountPriceUsd: ${r.discountPriceUsd},\n`;
  out += `    promoCode: "${esc(r.promoCode)}",\n`;
  out += `    overnight: "${esc(r.overnight)}",\n`;
  out += `    tradingNews: "${esc(r.tradingNews)}",\n`;
  out += `    sizing: "${esc(r.sizing)}",\n`;
  out += `    drawdownType: "${esc(r.drawdownType)}",\n`;
  out += `    drawdownUsd: ${r.drawdownUsd},\n`;
  out += `    dllRaw: "${esc(r.dllRaw)}",\n`;
  out += `    dllUsd: ${dllJs},\n`;
  out += `    profitGoal1stCycleUsd: ${r.profitGoal1stCycleUsd},\n`;
  out += `    profitGoal2PlusCycleUsd: ${r.profitGoal2PlusCycleUsd},\n`;
  out += `    payoutConsistencyDisplay: "${esc(r.payoutConsistencyDisplay)}",\n`;
  out += `    payoutConsistencyRatio: ${r.payoutConsistencyRatio},\n`;
  out += `    minTradingDaysFromCsv: ${r.minTradingDaysFromCsv},\n`;
  out += `    payoutMiniUsd: ${r.payoutMiniUsd},\n`;
  out += `    payoutMax1stUsd: ${r.payoutMax1stUsd},\n`;
  out += `    payoutMax2ndUsd: ${r.payoutMax2ndUsd},\n`;
  out += `    payoutMax3rdUsd: ${r.payoutMax3rdUsd},\n`;
  out += `    payoutMax4thPlusUsd: ${r.payoutMax4thPlusUsd},\n`;
  out += `    profitSplitLabel: "${esc(r.profitSplitLabel)}",\n`;
  out += `  },\n`;
}
out += "};\n";

fs.writeFileSync(outPath, out);
console.log("Wrote", path.relative(root, outPath));
