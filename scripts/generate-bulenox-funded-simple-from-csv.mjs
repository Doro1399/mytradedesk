import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const csvPath = path.join(root, "CSV Propfirm Rules", "Bulenox Rules.csv");
const outPath = path.join(root, "lib", "journal", "bulenox-funded-simple-csv.generated.ts");

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
  if (/^,,,,/.test(trimmed)) continue;
  if (!/^\d+,Bulenox,/.test(trimmed)) continue;
  rows.push(trimmed);
}

if (rows.length === 0) {
  console.error("No Bulenox data rows found in", csvPath);
  process.exit(1);
}

/** Funded payout columns — indices alignés sur « Bulenox Rules.csv » (ligne données). */
function rowFundedPayout(line) {
  const f = parseCsvLine(line);
  const program = (f[4] ?? "").trim();
  const sizeRaw = (f[5] ?? "").trim().toLowerCase().replace(/\s+/g, "");
  const bufferUsd = parseMoneyUsd(f[26]);
  const payoutMiniUsd = parseMoneyUsd(f[29]);
  const payoutMax1stUsd = parseMoneyUsd(f[30]);
  const payoutMax2ndPlusUsd = parseMoneyUsd(f[31]);
  const payoutMax3rdUsd = parseMoneyUsd(f[32]);

  if (
    !program ||
    !/^\d+k$/.test(sizeRaw) ||
    !Number.isFinite(bufferUsd) ||
    !Number.isFinite(payoutMiniUsd) ||
    !Number.isFinite(payoutMax1stUsd) ||
    !Number.isFinite(payoutMax2ndPlusUsd) ||
    !Number.isFinite(payoutMax3rdUsd)
  ) {
    console.error("Bad Bulenox funded parse", program, sizeRaw, f);
    process.exit(1);
  }

  const key = `${program}|${sizeRaw}`;
  return {
    key,
    bufferUsd,
    payoutMiniUsd,
    payoutMax1stUsd,
    payoutMax2ndPlusUsd,
    payoutMax3rdUsd,
  };
}

const byKey = {};
for (const line of rows) {
  const r = rowFundedPayout(line);
  if (byKey[r.key]) {
    console.error("Duplicate Bulenox funded key", r.key);
    process.exit(1);
  }
  byKey[r.key] = r;
}

function esc(s) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "")
    .replace(/\n/g, "\\n");
}

const keys = Object.keys(byKey).sort();

let out =
  "/** Auto-generated from CSV Propfirm Rules/Bulenox Rules.csv (funded buffer + payout caps) — run: `npm run gen:bulenox-funded` */\n\n";
out += "export type BulenoxFundedSimpleCsvRow = {\n";
out += "  bufferUsd: number;\n";
out += "  payoutMiniUsd: number;\n";
out += "  payoutMax1stUsd: number;\n";
out += "  payoutMax2ndPlusUsd: number;\n";
out += "  payoutMax3rdUsd: number;\n";
out += "};\n\n";
out += "export const BULENOX_FUNDED_SIMPLE_FROM_CSV: Record<string, BulenoxFundedSimpleCsvRow> = {\n";

for (const k of keys) {
  const r = byKey[k];
  out += `  "${esc(k)}": {\n`;
  out += `    bufferUsd: ${r.bufferUsd},\n`;
  out += `    payoutMiniUsd: ${r.payoutMiniUsd},\n`;
  out += `    payoutMax1stUsd: ${r.payoutMax1stUsd},\n`;
  out += `    payoutMax2ndPlusUsd: ${r.payoutMax2ndPlusUsd},\n`;
  out += `    payoutMax3rdUsd: ${r.payoutMax3rdUsd},\n`;
  out += "  },\n";
}

out += "};\n";
fs.writeFileSync(outPath, out, "utf8");
console.log("Wrote", keys.length, "keys to", path.relative(root, outPath));
