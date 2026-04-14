import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const csvPath = path.join(root, "CSV Propfirm Rules", "Day Traders Rules.csv");
const outPath = path.join(root, "lib", "journal", "daytraders-funded-csv.generated.ts");

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
  const head = s.split("/")[0].trim();
  if (/no\s*limit/i.test(head)) return NaN;
  if (head.includes(",") && !head.includes(".")) {
    const tryN = head.replace(",", ".");
    const n = Number(tryN);
    if (Number.isFinite(n)) return n;
  }
  const cleaned = head.replace(/,/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

function parseBufferUsd(raw) {
  const n = parseMoneyUsd(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parsePayoutMiniUsd(raw) {
  const n = parseMoneyUsd(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** null = pas de plafond (ex. « No limit »). */
function parsePayoutMaxUsd(raw) {
  if (raw == null) return null;
  const t = String(raw).trim();
  if (!t || t === "-" || t === "—") return null;
  if (/no\s*limit/i.test(t)) return null;
  const n = parseMoneyUsd(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseProfitSplitFraction(raw) {
  const t = String(raw ?? "").trim();
  const m = t.match(/(\d+(?:\.\d+)?)\s*%/);
  if (!m) return 1;
  const p = Number(m[1]);
  if (!Number.isFinite(p) || p <= 0) return 1;
  return Math.min(1, p / 100);
}

function profitSplitLabelFromRaw(raw) {
  const t = String(raw ?? "").trim();
  return t || "100%";
}

function esc(s) {
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "")
    .replace(/\n/g, "\\n");
}

const t = fs.readFileSync(csvPath, "utf8");
const records = mergeCsvRecords(t);
const rows = [];
for (const rec of records) {
  const trimmed = rec.trim();
  if (!trimmed) continue;
  if (/^#,/.test(trimmed)) continue;
  if (!/^\d+,DayTraders,/.test(trimmed)) continue;
  rows.push(trimmed);
}

if (rows.length === 0) {
  console.error("No DayTraders rows in", csvPath);
  process.exit(1);
}

/** Lignes OTP funded : 35 champs, mini/max/split en fin de section funded. Lignes S2F : même longueur, indices payout différents. */
function rowToEntry(line) {
  const f = parseCsvLine(line);
  if (f.length < 26) return null;
  const program = (f[4] ?? "").trim();
  const sizeRaw = (f[5] ?? "").trim().toLowerCase().replace(/\s+/g, "");
  if (!program || !/^\d+k$/.test(sizeRaw)) return null;

  const isS2f = program.includes("S2F");

  let overnight;
  let tradingNews;
  let sizingFunded;
  let drawdownTypeFunded;
  let maxDrawdownFundedUsd;
  let dllFunded;
  let bufferUsd;
  let consistencyLabel;
  let minTradingDays;
  let minProfitPerDay;
  let payoutMiniUsd;
  let payoutMaxUsd;
  let profitSplitRaw;

  if (isS2f) {
    overnight = (f[11] ?? "").trim();
    tradingNews = (f[12] ?? "").trim();
    sizingFunded = (f[13] ?? "").trim();
    drawdownTypeFunded = (f[14] ?? "").trim();
    maxDrawdownFundedUsd = parseMoneyUsd(f[15]);
    dllFunded = (f[16] ?? "").trim() || "—";
    bufferUsd = null;
    consistencyLabel = (f[20] ?? "").trim();
    minTradingDays = (f[21] ?? "").trim();
    minProfitPerDay = (f[22] ?? "").trim();
    payoutMiniUsd = parsePayoutMiniUsd(f[23]);
    payoutMaxUsd = parsePayoutMaxUsd(f[24]);
    profitSplitRaw = (f[25] ?? "").trim();
  } else {
    overnight = (f[21] ?? "").trim();
    tradingNews = (f[22] ?? "").trim();
    sizingFunded = (f[23] ?? "").trim();
    drawdownTypeFunded = (f[24] ?? "").trim();
    maxDrawdownFundedUsd = parseMoneyUsd(f[25]);
    dllFunded = (f[26] ?? "").trim() || "—";
    bufferUsd = parseBufferUsd(f[27]);
    consistencyLabel = (f[28] ?? "").trim();
    minTradingDays = (f[29] ?? "").trim();
    minProfitPerDay = (f[30] ?? "").trim();
    payoutMiniUsd = parsePayoutMiniUsd(f[31]);
    payoutMaxUsd = parsePayoutMaxUsd(f[32]);
    profitSplitRaw = (f[33] ?? "").trim();
  }

  if (!Number.isFinite(maxDrawdownFundedUsd) || maxDrawdownFundedUsd < 0) {
    console.error("Bad funded drawdown", program, sizeRaw, line.slice(0, 120));
    process.exit(1);
  }

  const profitSplitFraction = parseProfitSplitFraction(profitSplitRaw);
  const profitSplitLabel = profitSplitLabelFromRaw(profitSplitRaw);
  const parts = [consistencyLabel, minTradingDays, minProfitPerDay].filter(
    (x) => x && x !== "-" && x !== "—"
  );
  const payoutRulesBrief = parts.length ? parts.join(" · ") : "—";

  const drawdownDisplay =
    /^trail$/i.test(drawdownTypeFunded) ? "Trailing" : drawdownTypeFunded;

  return {
    program,
    size: sizeRaw,
    overnight,
    tradingNews,
    sizingFunded,
    drawdownTypeFunded: drawdownDisplay,
    maxDrawdownFundedUsd,
    dllFunded,
    bufferUsd,
    consistencyLabel,
    minTradingDays,
    minProfitPerDay,
    payoutMiniUsd,
    payoutMaxUsd,
    profitSplitFraction,
    profitSplitLabel,
    payoutRulesBrief,
  };
}

const byKey = {};
for (const line of rows) {
  const r = rowToEntry(line);
  if (!r) continue;
  const key = `${r.program}|${r.size}`;
  if (byKey[key]) {
    console.error("Duplicate DayTraders funded key", key);
    process.exit(1);
  }
  byKey[key] = r;
}

const keys = Object.keys(byKey).sort();

let out =
  "/** Auto-generated from CSV Propfirm Rules/Day Traders Rules.csv — run: `npm run gen:daytraders-funded` */\n\n";
out += "export type DaytradersFundedCsvRow = {\n";
out += "  program: string;\n";
out += "  size: string;\n";
out += "  overnight: string;\n";
out += "  tradingNews: string;\n";
out += "  sizingFunded: string;\n";
out += "  drawdownTypeFunded: string;\n";
out += "  maxDrawdownFundedUsd: number;\n";
out += "  dllFunded: string;\n";
out += "  /** null = pas de phase buffer (CSV vide / tiret). */\n";
out += "  bufferUsd: number | null;\n";
out += "  consistencyLabel: string;\n";
out += "  minTradingDays: string;\n";
out += "  minProfitPerDay: string;\n";
out += "  payoutMiniUsd: number;\n";
out += "  /** null = pas de plafond explicite (ex. No limit). */\n";
out += "  payoutMaxUsd: number | null;\n";
out += "  /** Part du profit/surplus prise en compte pour le montant indicatif (ex. 0.8 pour 80 % CSV). */\n";
out += "  profitSplitFraction: number;\n";
out += "  profitSplitLabel: string;\n";
out += "  payoutRulesBrief: string;\n";
out += "};\n\n";
out += "export const DAYTRADERS_FUNDED_FROM_CSV: Record<string, DaytradersFundedCsvRow> = {\n";

for (const k of keys) {
  const r = byKey[k];
  out += `  "${esc(k)}": {\n`;
  out += `    program: "${esc(r.program)}",\n`;
  out += `    size: "${esc(r.size)}",\n`;
  out += `    overnight: "${esc(r.overnight)}",\n`;
  out += `    tradingNews: "${esc(r.tradingNews)}",\n`;
  out += `    sizingFunded: "${esc(r.sizingFunded)}",\n`;
  out += `    drawdownTypeFunded: "${esc(r.drawdownTypeFunded)}",\n`;
  out += `    maxDrawdownFundedUsd: ${r.maxDrawdownFundedUsd},\n`;
  out += `    dllFunded: "${esc(r.dllFunded)}",\n`;
  out += `    bufferUsd: ${r.bufferUsd == null ? "null" : r.bufferUsd},\n`;
  out += `    consistencyLabel: "${esc(r.consistencyLabel)}",\n`;
  out += `    minTradingDays: "${esc(r.minTradingDays)}",\n`;
  out += `    minProfitPerDay: "${esc(r.minProfitPerDay)}",\n`;
  out += `    payoutMiniUsd: ${r.payoutMiniUsd},\n`;
  out += `    payoutMaxUsd: ${r.payoutMaxUsd == null ? "null" : r.payoutMaxUsd},\n`;
  out += `    profitSplitFraction: ${r.profitSplitFraction},\n`;
  out += `    profitSplitLabel: "${esc(r.profitSplitLabel)}",\n`;
  out += `    payoutRulesBrief: "${esc(r.payoutRulesBrief)}",\n`;
  out += `  },\n`;
}
out += "};\n";

fs.writeFileSync(outPath, out);
console.log("Wrote", keys.length, "rows to", path.relative(root, outPath));
