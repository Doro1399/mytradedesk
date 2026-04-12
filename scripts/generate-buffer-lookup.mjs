import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const csvPath = path.join(root, "data", "buffers.csv");
const outPath = path.join(root, "lib", "journal", "buffer-lookup.generated.ts");

const t = fs.readFileSync(csvPath, "utf8");
const lines = t.split(/\r?\n/);
const entries = [];

/** Row 0 = blank, row 1 = CSV header — data starts at index 2. */
for (let i = 2; i < lines.length; i++) {
  const line = lines[i]
    .trim()
    .replace(/\u201c/g, '"')
    .replace(/\u201d/g, '"');
  if (!line || line.startsWith("#")) continue;

  /** Buffer value is quoted and may contain `,` as decimal separator (e.g. `"$4 100,00"`). */
  const quoted = line.match(/^(\d+),([^,]+),([^,]+),([^,]+),"([^"]*)"\s*$/);
  const dashed = line.match(/^(\d+),([^,]+),([^,]+),([^,]+),-\s*$/);
  let firm;
  let program;
  let size;
  let bufferRaw;
  if (quoted) {
    [, , firm, program, size, bufferRaw] = quoted;
  } else if (dashed) {
    [, , firm, program, size] = dashed;
    bufferRaw = "-";
  } else {
    continue;
  }
  firm = firm.trim();
  program = program.trim();
  size = size.trim().toLowerCase();

  let cents = null;
  const b = bufferRaw.trim();
  if (b && b !== "-") {
    let s = b
      .replace(/\$/g, "")
      .replace(/\u202f/g, "")
      .replace(/\s/g, "")
      .replace(/\u00a0/g, "");
    if (s.includes(",") && !s.includes(".")) s = s.replace(",", ".");
    else s = s.replace(/,/g, "");
    const n = Number(s);
    if (Number.isFinite(n)) cents = Math.round(n * 100);
  }

  const key = `${firm}|${program}|${size}`;
  entries.push([key, cents]);
}

const uniq = new Map(entries);

function esc(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

let out =
  "/** Auto-generated from data/buffers.csv — run: node scripts/generate-buffer-lookup.mjs */\n\n";
out += "export const JOURNAL_BUFFER_CENTS_BY_KEY: Record<string, number | null> = {\n";

const keys = [...uniq.keys()].sort();
for (const k of keys) {
  const c = uniq.get(k);
  out += `  "${esc(k)}": ${c === null ? "null" : String(c)},\n`;
}
out += "};\n";

fs.writeFileSync(outPath, out);
console.log("Wrote", keys.length, "keys to", path.relative(root, outPath));
