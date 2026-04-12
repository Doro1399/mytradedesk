import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const csvPath = path.join(root, "CSV Propfirm Rules", "Take Profit Trader Rules.csv");
const outPath = path.join(root, "lib", "journal", "tpt-funded-csv.generated.ts");

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

const t = fs.readFileSync(csvPath, "utf8");
const lines = t.split(/\r?\n/);

const rows = [];
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  if (/^#/.test(trimmed) && !/^\d,/.test(trimmed)) continue;
  if (!/^\d+,Take Profit Trader,/.test(trimmed)) continue;
  rows.push(trimmed);
}

if (rows.length === 0) {
  console.error("No Take Profit Trader data rows found in", csvPath);
  process.exit(1);
}

/** After split: index 5 = Taille, 24 = Buffer, 25 = Payout mini w/out fees, last = Notes */
const bySize = {};

for (const line of rows) {
  const fields = parseCsvLine(line);
  const sizeRaw = (fields[5] ?? "").trim().toLowerCase().replace(/\s+/g, "");
  if (!/^\d+k$/.test(sizeRaw)) continue;

  const bufferUsd = parseMoneyUsd(fields[24]);
  const payoutMiniUsd = parseMoneyUsd(fields[25]);
  const notes = (fields[fields.length - 1] ?? "").trim();

  if (!Number.isFinite(bufferUsd) || !Number.isFinite(payoutMiniUsd)) {
    console.error("Bad numeric parse for row", sizeRaw, fields[24], fields[25]);
    process.exit(1);
  }

  bySize[sizeRaw] = { fundedBufferUsd: bufferUsd, payoutMiniWithoutFeesUsd: payoutMiniUsd, notesRow: notes };
}

const order = ["25k", "50k", "75k", "100k", "150k"];
for (const sz of order) {
  if (!bySize[sz]) {
    console.error("Missing size", sz, "in parsed CSV");
    process.exit(1);
  }
}

function esc(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "").replace(/\n/g, "\\n");
}

let out =
  "/** Auto-generated from CSV Propfirm Rules/Take Profit Trader Rules.csv — run: `npm run gen:tpt` */\n\n";
out += "export type TptCsvFundedSize = \"25k\" | \"50k\" | \"75k\" | \"100k\" | \"150k\";\n\n";
out += "export type TptFundedCsvRow = {\n";
out += "  fundedBufferUsd: number;\n";
out += "  payoutMiniWithoutFeesUsd: number;\n";
out += "  /** Dernière colonne « Notes » du CSV (ligne data). */\n";
out += "  notesRow: string;\n";
out += "};\n\n";
out += "export const TPT_FUNDED_FROM_CSV: Record<TptCsvFundedSize, TptFundedCsvRow> = {\n";

for (const sz of order) {
  const r = bySize[sz];
  out += `  "${sz}": {\n`;
  out += `    fundedBufferUsd: ${r.fundedBufferUsd},\n`;
  out += `    payoutMiniWithoutFeesUsd: ${r.payoutMiniWithoutFeesUsd},\n`;
  out += `    notesRow: "${esc(r.notesRow)}",\n`;
  out += `  },\n`;
}
out += "};\n";

fs.writeFileSync(outPath, out);
console.log("Wrote", path.relative(root, outPath));
