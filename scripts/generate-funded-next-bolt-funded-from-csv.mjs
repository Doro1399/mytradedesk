import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const csvPath = path.join(root, "CSV Propfirm Rules", "Funded Next Futures Rules.csv");
const outPath = path.join(root, "lib", "journal", "funded-next-bolt-funded-csv.generated.ts");

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

/** Primary Bolt row + optional continuation row (payout max 4st / 5th on next line). */
let primaryLine = null;
let continuationLine = null;

for (let i = 0; i < records.length; i++) {
  const trimmed = records[i].trim();
  if (!trimmed) continue;
  if (/^#,/.test(trimmed)) continue;
  if (!/^\d+,Funded Next Futures,/.test(trimmed)) continue;
  const fields = parseCsvLine(trimmed);
  const program = (fields[4] ?? "").trim();
  if (program !== "Funded Next Futures Bolt") continue;
  primaryLine = trimmed;
  const next = records[i + 1]?.trim() ?? "";
  if (next && !/^\d+,Funded Next Futures,/.test(next)) {
    continuationLine = next;
  }
  break;
}

if (!primaryLine) {
  console.error("No Funded Next Futures Bolt row found in", csvPath);
  process.exit(1);
}

function rowBoltPrimary(line) {
  const f = parseCsvLine(line);
  const sizeRaw = (f[5] ?? "").trim().toLowerCase().replace(/\s+/g, "");
  const overnight = (f[20] ?? "").trim();
  const tradingNews = (f[21] ?? "").trim();
  const sizing = (f[22] ?? "").trim();
  const maxDrawdownUsd = parseMoneyUsd(f[24]);
  const dllParsed = parseMoneyUsd(f[25]);
  const bufferUsd = parseMoneyUsd(f[26]);
  const payoutMiniUsd = parseMoneyUsd(f[30]);
  const profitSplitLabel = (f[33] ?? "").trim();
  const cycleProfitMinUsd = parseMoneyUsd(f[29]);
  const requiredEodBalanceUsd = NaN;

  if (
    !/^\d+k$/.test(sizeRaw) ||
    !Number.isFinite(bufferUsd) ||
    !Number.isFinite(payoutMiniUsd) ||
    !Number.isFinite(maxDrawdownUsd) ||
    !profitSplitLabel
  ) {
    console.error("Bad Bolt primary parse", sizeRaw, f);
    process.exit(1);
  }

  return {
    size: sizeRaw,
    overnight,
    tradingNews,
    sizing,
    maxDrawdownUsd,
    dllUsd: Number.isFinite(dllParsed) ? dllParsed : null,
    bufferUsd,
    payoutMiniUsd,
    profitSplitLabel,
    cycleProfitMinUsd: Number.isFinite(cycleProfitMinUsd) ? cycleProfitMinUsd : null,
    requiredEodBalanceUsd: Number.isFinite(requiredEodBalanceUsd) ? requiredEodBalanceUsd : null,
  };
}

function rowBoltContinuation(line) {
  if (!line) return { payoutMaxStandardUsd: NaN, payoutMaxFinalUsd: NaN };
  const f = parseCsvLine(line);
  const a = parseMoneyUsd(f[31]);
  const b = parseMoneyUsd(f[32]);
  return { payoutMaxStandardUsd: a, payoutMaxFinalUsd: b };
}

const primary = rowBoltPrimary(primaryLine);
const cont = rowBoltContinuation(continuationLine);

if (!Number.isFinite(cont.payoutMaxStandardUsd) || !Number.isFinite(cont.payoutMaxFinalUsd)) {
  console.error("Bolt continuation row missing payout max columns", continuationLine, cont);
  process.exit(1);
}

function esc(s) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "")
    .replace(/\n/g, "\\n");
}

const sz = primary.size;
let out =
  "/** Auto-generated from CSV Propfirm Rules/Funded Next Futures Rules.csv (Bolt funded) — run: `npm run gen:funded-next-bolt` */\n\n";
out += `export type FundedNextBoltCsvSize = "${sz}";\n\n`;
out += "export type FundedNextBoltFundedCsvRow = {\n";
out += "  overnight: string;\n";
out += "  tradingNews: string;\n";
out += "  sizing: string;\n";
out += "  maxDrawdownUsd: number;\n";
out += "  dllUsd: number | null;\n";
out += "  bufferUsd: number;\n";
out += "  /** Min profit per day column when numeric; else null (Bolt CSV uses « - »). */\n";
out += "  cycleProfitMinUsd: number | null;\n";
out += "  /** Reserved when CSV adds explicit EOD floor; null = derive nominal + buffer in app. */\n";
out += "  requiredEodBalanceUsd: number | null;\n";
out += "  payoutMiniUsd: number;\n";
out += "  /** Withdrawals 1–4 cap (CSV continuation « 4st » column). */\n";
out += "  payoutMaxStandardUsd: number;\n";
out += "  /** 5th final withdrawal cap (CSV continuation « 5th » column). */\n";
out += "  payoutMaxFinalUsd: number;\n";
out += "  profitSplitLabel: string;\n";
out += "  /** Max withdrawals (Bolt: 5th is final; inferred from CSV « 5st » row). */\n";
out += "  maxWithdrawals: number;\n";
out += "};\n\n";
out += `export const FUNDED_NEXT_BOLT_FUNDED_FROM_CSV: Record<FundedNextBoltCsvSize, FundedNextBoltFundedCsvRow> = {\n`;
out += `  "${sz}": {\n`;
out += `    overnight: "${esc(primary.overnight)}",\n`;
out += `    tradingNews: "${esc(primary.tradingNews)}",\n`;
out += `    sizing: "${esc(primary.sizing)}",\n`;
out += `    maxDrawdownUsd: ${primary.maxDrawdownUsd},\n`;
out += `    dllUsd: ${primary.dllUsd == null ? "null" : primary.dllUsd},\n`;
out += `    bufferUsd: ${primary.bufferUsd},\n`;
out += `    cycleProfitMinUsd: ${primary.cycleProfitMinUsd == null ? "null" : primary.cycleProfitMinUsd},\n`;
out += `    requiredEodBalanceUsd: null,\n`;
out += `    payoutMiniUsd: ${primary.payoutMiniUsd},\n`;
out += `    payoutMaxStandardUsd: ${cont.payoutMaxStandardUsd},\n`;
out += `    payoutMaxFinalUsd: ${cont.payoutMaxFinalUsd},\n`;
out += `    profitSplitLabel: "${esc(primary.profitSplitLabel)}",\n`;
out += `    maxWithdrawals: 5,\n`;
out += `  },\n`;
out += "};\n";

fs.writeFileSync(outPath, out);
console.log("Wrote", path.relative(root, outPath));
