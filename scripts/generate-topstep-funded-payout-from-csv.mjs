/**
 * Source : CSV Propfirm Rules / TopStep Rules.csv — lignes funded **TopStep Standard** et **TopStep**
 * (colonne « Nom du compte », index 4).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const csvPath = path.join(root, "CSV Propfirm Rules", "TopStep Rules.csv");
const outPath = path.join(root, "lib", "journal", "topstep-funded-payout-csv.generated.ts");

function parseLine(line) {
  const cells = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      q = !q;
      continue;
    }
    if (!q && c === ",") {
      cells.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  cells.push(cur.trim());
  return cells;
}

function parseMoney(raw) {
  if (!raw || raw === "-" || raw === "—") return 0;
  let s = String(raw).replace(/\$/g, "").replace(/%/g, "").trim();
  s = s.replace(/\u202f/g, "").replace(/\u00a0/g, "").replace(/\s/g, "");
  if (/^\d+,\d{1,2}$/.test(s)) return Number(s.replace(",", "."));
  s = s.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

const PROGRAMS = ["TopStep Standard", "TopStep"];
const t = fs.readFileSync(csvPath, "utf8");
const lines = t.split(/\r?\n/);
/** @type {Map<string, { payoutMiniUsd: number; payoutMaxStandardUsd: number }>} */
const byProgramSize = new Map();

for (const line of lines) {
  if (!/^\d+,TopStep,US,2012,/.test(line)) continue;
  const c = parseLine(line);
  if (c.length < 28) continue;
  const program = c[4].trim();
  if (!PROGRAMS.includes(program)) continue;
  const size = c[5].trim().toLowerCase();
  if (!/^(50k|100k|150k)$/.test(size)) continue;
  const payoutMiniUsd = parseMoney(c[26]);
  const payoutMaxStandardUsd = parseMoney(c[27]);
  byProgramSize.set(`${program}|${size}`, { payoutMiniUsd, payoutMaxStandardUsd });
}

function esc(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

const order = ["50k", "100k", "150k"];
for (const prog of PROGRAMS) {
  for (const sz of order) {
    if (!byProgramSize.get(`${prog}|${sz}`)) {
      console.error("Missing TopStep funded row for", prog, sz);
      process.exit(1);
    }
  }
}

let out =
  "/** Auto-generated from `CSV Propfirm Rules/TopStep Rules.csv` — run `npm run gen:topstep-funded`. */\n\n";
out += `export type TopStepFundedPayoutCsvRow = {
  payoutMiniUsd: number;
  payoutMaxStandardUsd: number;
};

export const TOPSTEP_FUNDED_PAYOUT_BY_PROGRAM_SIZE: Record<
  "TopStep Standard" | "TopStep",
  Record<"50k" | "100k" | "150k", TopStepFundedPayoutCsvRow>
> = {
`;

for (const prog of PROGRAMS) {
  out += `  "${esc(prog)}": {\n`;
  for (const sz of order) {
    const r = byProgramSize.get(`${prog}|${sz}`);
    out += `    "${esc(sz)}": {\n`;
    out += `      payoutMiniUsd: ${r.payoutMiniUsd},\n`;
    out += `      payoutMaxStandardUsd: ${r.payoutMaxStandardUsd},\n`;
    out += `    },\n`;
  }
  out += `  },\n`;
}
out += "};\n";

fs.writeFileSync(outPath, out);
console.log("Wrote", outPath);
