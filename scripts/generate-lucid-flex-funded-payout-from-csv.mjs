/**
 * Source : CSV Propfirm Rules / Lucid Trading Rules.csv (lignes LucidFlex).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const csvPath = path.join(root, "CSV Propfirm Rules", "Lucid Trading Rules.csv");
const outPath = path.join(root, "lib", "journal", "lucid-flex-funded-payout-csv.generated.ts");

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

const lines = fs.readFileSync(csvPath, "utf8").split(/\r?\n/);
const bySize = new Map();

for (const line of lines) {
  if (!/^(\d+),Lucid Trading,US,2025,LucidFlex,/i.test(line)) continue;
  const c = parseLine(line);
  const n = c.length;
  if (n < 20) continue;
  const size = c[5].trim().toLowerCase();
  if (!/^(25k|50k|100k|150k)$/.test(size)) continue;

  const minTradingDays = Number.parseInt(c[n - 7], 10) || 0;
  const minProfitPerDayUsd = parseMoney(c[n - 6]);
  const payoutMiniUsd = parseMoney(c[n - 5]);
  const payoutMaxUsd = parseMoney(c[n - 4]);

  bySize.set(size, {
    minTradingDays,
    minProfitPerDayUsd,
    payoutMiniUsd,
    payoutMaxUsd,
  });
}

function esc(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

let out =
  "/** Auto-generated from `CSV Propfirm Rules/Lucid Trading Rules.csv` (LucidFlex) — run `npm run gen:lucid-flex-funded`. */\n\n";
out += `export type LucidFlexFundedPayoutCsvRow = {
  minTradingDays: number;
  minProfitPerDayUsd: number;
  payoutMiniUsd: number;
  payoutMaxUsd: number;
};

export const LUCID_FLEX_FUNDED_PAYOUT_BY_SIZE: Record<
  "25k" | "50k" | "100k" | "150k",
  LucidFlexFundedPayoutCsvRow
> = {
`;

for (const sz of ["25k", "50k", "100k", "150k"]) {
  const r = bySize.get(sz);
  if (!r) {
    console.error("Missing LucidFlex", sz);
    process.exit(1);
  }
  out += `  "${esc(sz)}": {\n`;
  out += `    minTradingDays: ${r.minTradingDays},\n`;
  out += `    minProfitPerDayUsd: ${r.minProfitPerDayUsd},\n`;
  out += `    payoutMiniUsd: ${r.payoutMiniUsd},\n`;
  out += `    payoutMaxUsd: ${r.payoutMaxUsd},\n`;
  out += `  },\n`;
}
out += "};\n";

fs.writeFileSync(outPath, out);
console.log("Wrote", outPath);
