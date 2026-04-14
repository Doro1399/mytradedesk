import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const csvPath = path.join(root, "CSV Propfirm Rules", "Apex Trader Funding Rules.csv");
const outPath = path.join(root, "lib", "journal", "apex-funded-payout-csv.generated.ts");

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

/** Montants CSV ($1 100, $500,00, etc.) → nombre USD. */
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
const rows = [];

for (const line of lines) {
  if (!/^(\d+),Apex Trader Funding,US,2022,/.test(line)) continue;
  const c = parseLine(line);
  if (c.length < 37) {
    console.warn("skip short row", c.length, line.slice(0, 80));
    continue;
  }
  const n = c.length;
  const program = c[4].trim();
  const size = c[5].trim().toLowerCase();
  /** Fin de ligne : … buffer, mini, 1st…6th, consistency, min days, min $/day, split. */
  const bufferUsd = parseMoney(c[n - 12]);
  const payoutMiniUsd = parseMoney(c[n - 11]);
  const payouts1stTo6thUsd = [
    parseMoney(c[n - 10]),
    parseMoney(c[n - 9]),
    parseMoney(c[n - 8]),
    parseMoney(c[n - 7]),
    parseMoney(c[n - 6]),
    parseMoney(c[n - 5]),
  ];
  const payoutMaxiUsd = payouts1stTo6thUsd[0];
  const consistencyCell = c[n - 4];
  const minTradingDays = Number.parseInt(c[n - 3], 10) || 0;
  const minProfitPerDayUsd = parseMoney(c[n - 2]);

  rows.push({
    key: `${program}|${size}`,
    bufferUsd,
    payoutMiniUsd,
    payoutMaxiUsd,
    payouts1stTo6thUsd,
    consistency: String(consistencyCell),
    minTradingDays,
    minProfitPerDayUsd,
  });
}

function esc(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

let out =
  "/** Auto-generated from `CSV Propfirm Rules/Apex Trader Funding Rules.csv` — run `npm run gen:apex-funded`. */\n\n";
out += `export type ApexFundedPayoutCsvRow = {
  bufferUsd: number;
  payoutMiniUsd: number;
  payoutMaxiUsd: number;
  payouts1stTo6thUsd: readonly [number, number, number, number, number, number];
  consistency: string;
  minTradingDays: number;
  minProfitPerDayUsd: number;
};

export const APEX_FUNDED_PAYOUT_BY_PROGRAM_SIZE: Record<string, ApexFundedPayoutCsvRow> = {
`;

for (const r of rows) {
  const [a, b, c0, d, e, f] = r.payouts1stTo6thUsd;
  out += `  "${esc(r.key)}": {\n`;
  out += `    bufferUsd: ${r.bufferUsd},\n`;
  out += `    payoutMiniUsd: ${r.payoutMiniUsd},\n`;
  out += `    payoutMaxiUsd: ${r.payoutMaxiUsd},\n`;
  out += `    payouts1stTo6thUsd: [${a}, ${b}, ${c0}, ${d}, ${e}, ${f}] as const,\n`;
  out += `    consistency: "${esc(r.consistency)}",\n`;
  out += `    minTradingDays: ${r.minTradingDays},\n`;
  out += `    minProfitPerDayUsd: ${r.minProfitPerDayUsd},\n`;
  out += `  },\n`;
}

out += "};\n";

fs.writeFileSync(outPath, out);
console.log("Wrote", rows.length, "rows to", path.relative(root, outPath));
