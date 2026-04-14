import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const csvPath = path.join(root, "CSV Propfirm Rules", "Blusky Rules.csv");
const outPath = path.join(root, "lib", "journal", "blusky-funded-csv.generated.ts");

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
  /** e.g. "$3 000 / Week" → first number */
  const slash = s.split("/")[0];
  const head = slash.trim();
  if (head.includes(",") && !head.includes(".")) {
    const tryN = head.replace(",", ".");
    const n = Number(tryN);
    if (Number.isFinite(n)) return n;
  }
  const cleaned = head.replace(/,/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
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

const t = fs.readFileSync(csvPath, "utf8");
const records = mergeCsvRecords(t);

const rows = [];
for (const rec of records) {
  const trimmed = rec.trim();
  if (!trimmed) continue;
  if (/^#,/.test(trimmed)) continue;
  if (!/^\d+,Blusky,/.test(trimmed)) continue;
  rows.push(trimmed);
}

if (rows.length === 0) {
  console.error("No Blusky rows found in", csvPath);
  process.exit(1);
}

/** Évaluation + funded : payout mini [29], max [30]. Direct funded court : mini [19], max [20]. */
function rowToFunded(line) {
  const f = parseCsvLine(line);
  const program = (f[4] ?? "").trim();
  const sizeRaw = (f[5] ?? "").trim().toLowerCase().replace(/\s+/g, "");
  if (!program || !/^\d+k$/.test(sizeRaw)) {
    return null;
  }
  /** Ligne « Direct funded » (OTP) : moins de colonnes ; mini/max après le goal. */
  const isDirectOtp = (f[7] ?? "").trim() === "OTP";
  let payoutMiniUsd;
  let payoutMaxUsd;
  if (isDirectOtp) {
    payoutMiniUsd = parseMoneyUsd(f[19]);
    payoutMaxUsd = parseMoneyUsd(f[20]);
  } else {
    payoutMiniUsd = parseMoneyUsd(f[29]);
    payoutMaxUsd = parseMoneyUsd(f[30]);
  }
  if (!Number.isFinite(payoutMiniUsd) || payoutMiniUsd < 0) {
    console.error("Bad payout mini", program, sizeRaw, f);
    process.exit(1);
  }
  if (!Number.isFinite(payoutMaxUsd) || payoutMaxUsd < 0) {
    console.error("Bad payout max", program, sizeRaw, f);
    process.exit(1);
  }
  return {
    program,
    size: sizeRaw,
    payoutMiniUsd,
    payoutMaxUsd,
  };
}

const byKey = {};
for (const line of rows) {
  const r = rowToFunded(line);
  if (!r) continue;
  const key = `${r.program}|${r.size}`;
  if (byKey[key]) {
    console.error("Duplicate Blusky funded key", key);
    process.exit(1);
  }
  byKey[key] = r;
}

const keys = Object.keys(byKey).sort();

function esc(s) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "")
    .replace(/\n/g, "\\n");
}

let out =
  "/** Auto-generated from CSV Propfirm Rules/Blusky Rules.csv — run: `npm run gen:blusky-funded` */\n\n";
out += "export type BluskyFundedCsvRow = {\n";
out += "  payoutMiniUsd: number;\n";
out += "  payoutMaxUsd: number;\n";
out += "};\n\n";
out += "export const BLUSKY_FUNDED_FROM_CSV: Record<string, BluskyFundedCsvRow> = {\n";

for (const k of keys) {
  const r = byKey[k];
  out += `  "${esc(k)}": {\n`;
  out += `    payoutMiniUsd: ${r.payoutMiniUsd},\n`;
  out += `    payoutMaxUsd: ${r.payoutMaxUsd},\n`;
  out += `  },\n`;
}
out += "};\n";

fs.writeFileSync(outPath, out);
console.log("Wrote", keys.length, "rows to", path.relative(root, outPath));
