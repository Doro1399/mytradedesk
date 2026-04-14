/**
 * Source : CSV Propfirm Rules / Lucid Trading Rules.csv
 * (le dépôt n’a pas de fichier nommé LUCIDTrading.csv — même contenu « Lucid Trading ».)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const csvPath = path.join(root, "CSV Propfirm Rules", "Lucid Trading Rules.csv");
const outPath = path.join(root, "lib", "journal", "lucid-pro-funded-payout-csv.generated.ts");

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

const t = fs.readFileSync(csvPath, "utf8");
const lines = t.split(/\r?\n/);
const bySize = new Map();

for (const line of lines) {
  if (!/^(\d+),Lucid Trading,US,2025,LucidPro,/i.test(line)) continue;
  const c = parseLine(line);
  const n = c.length;
  if (n < 20) continue;
  const size = c[5].trim().toLowerCase();
  if (!/^(25k|50k|100k|150k)$/.test(size)) continue;

  const bufferUsd = parseMoney(c[n - 9]);
  const payoutMiniUsd = parseMoney(c[n - 5]);
  const payoutMax1stUsd = parseMoney(c[n - 4]);
  const payoutMaxSubsequentUsd = parseMoney(c[n - 3]);

  bySize.set(size, {
    bufferUsd,
    payoutMiniUsd,
    payoutMax1stUsd,
    payoutMaxSubsequentUsd,
  });
}

function esc(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

let out =
  "/** Auto-generated from `CSV Propfirm Rules/Lucid Trading Rules.csv` (rows LucidPro) — run `npm run gen:lucid-pro-funded`. */\n\n";
out += `export type LucidProFundedPayoutCsvRow = {
  bufferUsd: number;
  payoutMiniUsd: number;
  payoutMax1stUsd: number;
  payoutMaxSubsequentUsd: number;
};

export const LUCID_PRO_FUNDED_PAYOUT_BY_SIZE: Record<
  "25k" | "50k" | "100k" | "150k",
  LucidProFundedPayoutCsvRow
> = {
`;

const order = ["25k", "50k", "100k", "150k"];
for (const sz of order) {
  const r = bySize.get(sz);
  if (!r) {
    console.error("Missing LucidPro row for", sz);
    process.exit(1);
  }
  out += `  "${esc(sz)}": {\n`;
  out += `    bufferUsd: ${r.bufferUsd},\n`;
  out += `    payoutMiniUsd: ${r.payoutMiniUsd},\n`;
  out += `    payoutMax1stUsd: ${r.payoutMax1stUsd},\n`;
  out += `    payoutMaxSubsequentUsd: ${r.payoutMaxSubsequentUsd},\n`;
  out += `  },\n`;
}
out += "};\n";

fs.writeFileSync(outPath, out);
console.log("Wrote", outPath);
