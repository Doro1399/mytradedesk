import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const csvPath = path.join(root, "CSV Propfirm Rules", "My Funded Futures Rules.csv");
const outPath = path.join(root, "lib", "journal", "mffu-rapid-sim-funded-csv.generated.ts");

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
  if (!/^\d+,My Funded Futures,/.test(trimmed)) continue;
  const fields = parseCsvLine(trimmed);
  const program = (fields[4] ?? "").trim();
  if (program !== "My Funded Futures Rapid") continue;
  rows.push(trimmed);
}

if (rows.length === 0) {
  console.error("No My Funded Futures Rapid rows found in", csvPath);
  process.exit(1);
}

/** Funded block indices aligned with My Funded Futures Rules.csv (Rapid rows). */
function rowRapid(line) {
  const f = parseCsvLine(line);
  const sizeRaw = (f[5] ?? "").trim().toLowerCase().replace(/\s+/g, "");
  const bufferUsd = parseMoneyUsd(f[27]);
  const payoutMiniUsd = parseMoneyUsd(f[31]);
  const payoutMaxUsd = parseMoneyUsd(f[32]);
  const profitSplitLabel = (f[33] ?? "").trim();

  if (
    !/^\d+k$/.test(sizeRaw) ||
    !Number.isFinite(bufferUsd) ||
    !Number.isFinite(payoutMiniUsd) ||
    !Number.isFinite(payoutMaxUsd) ||
    !profitSplitLabel
  ) {
    console.error("Bad Rapid funded parse", sizeRaw, f);
    process.exit(1);
  }

  return {
    size: sizeRaw,
    bufferUsd,
    payoutMiniUsd,
    payoutMaxUsd,
    profitSplitLabel,
  };
}

const bySize = {};
for (const line of rows) {
  const r = rowRapid(line);
  bySize[r.size] = r;
}

const order = ["25k", "50k", "100k", "150k"];
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
  "/** Auto-generated from CSV Propfirm Rules/My Funded Futures Rules.csv (Rapid funded) — run: `npm run gen:mffu-rapid` */\n\n";
out += 'export type MffuRapidSimFundedCsvSize = "25k" | "50k" | "100k" | "150k";\n\n';
out += "export type MffuRapidSimFundedCsvRow = {\n";
out += "  bufferUsd: number;\n";
out += "  payoutMiniUsd: number;\n";
out += "  payoutMaxUsd: number;\n";
out += "  profitSplitLabel: string;\n";
out += "};\n\n";
out += "export const MFFU_RAPID_SIM_FUNDED_FROM_CSV: Record<MffuRapidSimFundedCsvSize, MffuRapidSimFundedCsvRow> = {\n";

for (const sz of order) {
  const r = bySize[sz];
  out += `  "${sz}": {\n`;
  out += `    bufferUsd: ${r.bufferUsd},\n`;
  out += `    payoutMiniUsd: ${r.payoutMiniUsd},\n`;
  out += `    payoutMaxUsd: ${r.payoutMaxUsd},\n`;
  out += `    profitSplitLabel: "${esc(r.profitSplitLabel)}",\n`;
  out += "  },\n";
}

out += "};\n";
fs.writeFileSync(outPath, out, "utf8");
console.log("Wrote", outPath);
