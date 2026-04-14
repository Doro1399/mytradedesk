/**
 * Source : CSV Propfirm Rules / Lucid Trading Rules.csv (section Direct Funded, lignes LucidDirect).
 * Pas de fichier `LUCIDTrading.csv` dans le dépôt — même source que les autres générateurs Lucid.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const csvPath = path.join(root, "CSV Propfirm Rules", "Lucid Trading Rules.csv");
const outPath = path.join(root, "lib", "journal", "lucid-direct-funded-payout-csv.generated.ts");

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
  if (!/^(\d+),Lucid Trading,US,2025,LucidDirect,/i.test(line)) continue;
  const c = parseLine(line);
  if (c.length < 27) continue;
  const size = c[5].trim().toLowerCase();
  if (!/^(25k|50k|100k|150k)$/.test(size)) continue;

  const profitGoal1stUsd = parseMoney(c[16]);
  const profitGoalAfter1stUsd = parseMoney(c[17]);
  const payoutMiniUsd = parseMoney(c[19]);
  const payouts1stTo6thUsd = [
    parseMoney(c[20]),
    parseMoney(c[21]),
    parseMoney(c[22]),
    parseMoney(c[24]),
    parseMoney(c[25]),
    parseMoney(c[26]),
  ];

  bySize.set(size, {
    profitGoal1stUsd,
    profitGoalAfter1stUsd,
    payoutMiniUsd,
    payouts1stTo6thUsd,
  });
}

function esc(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

let out =
  "/** Auto-generated from `CSV Propfirm Rules/Lucid Trading Rules.csv` (LucidDirect) — run `npm run gen:lucid-direct-funded`. */\n\n";
out += `export type LucidDirectFundedPayoutCsvRow = {
  profitGoal1stUsd: number;
  profitGoalAfter1stUsd: number;
  payoutMiniUsd: number;
  payouts1stTo6thUsd: readonly [number, number, number, number, number, number];
};

export const LUCID_DIRECT_FUNDED_PAYOUT_BY_SIZE: Record<
  "25k" | "50k" | "100k" | "150k",
  LucidDirectFundedPayoutCsvRow
> = {
`;

const order = ["25k", "50k", "100k", "150k"];
for (const sz of order) {
  const r = bySize.get(sz);
  if (!r) {
    console.error("Missing LucidDirect row for", sz);
    process.exit(1);
  }
  const arr = r.payouts1stTo6thUsd;
  out += `  "${esc(sz)}": {\n`;
  out += `    profitGoal1stUsd: ${r.profitGoal1stUsd},\n`;
  out += `    profitGoalAfter1stUsd: ${r.profitGoalAfter1stUsd},\n`;
  out += `    payoutMiniUsd: ${r.payoutMiniUsd},\n`;
  out += `    payouts1stTo6thUsd: [${arr.map((x) => x).join(", ")}],\n`;
  out += `  },\n`;
}
out += "};\n";

fs.writeFileSync(outPath, out);
console.log("Wrote", outPath);
