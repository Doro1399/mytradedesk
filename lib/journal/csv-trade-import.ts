import { nowIso } from "@/lib/journal/reducer";
import type { StoredTrade } from "@/lib/journal/trades-storage";
import type { ISODate, JournalDataV1, JournalId, JournalPnlEntry } from "@/lib/journal/types";

/**
 * Notes **NinjaTrader Grid** (export CSV depuis Trade performance) — à respecter si tu touches à l’import :
 * - Montants : `$10.50` et surtout `-$5.50` : enlever **tous** les `$` (`/\$/g`) avant `+`/`-`, sinon `parseFloat` échoue et les pertes disparaissent du total.
 * - P/L par ligne : colonne **Profit** / **Profit currency**, pas **Cum. net profit** (running total).
 * - Plusieurs lignes peuvent partager la même sortie / le même Profit (legs partiels) : le dédup stockage
 *   doit inclure le **numéro de ligne** (`sourceFileLine` → `storedTradeDedupeKey`), sinon le total importé
 *   ne correspond plus au fichier ni à la modale.
 * - Avec colonnes **Loss** / **Loss currency** : combiner profit − |loss| (pertes souvent seulement dans Loss).
 * - Dates : `YYYY-MM-DD` ; slashes `M/D` vs `D/M` ambigus résolus par échantillon colonne (ex. jour > 12)
 *   puis locale navigateur (`en-US` → mois d’abord, sinon jour d’abord pour Rithmic EU). Heure + AM/PM incluses.
 */

export type CsvTradeParseRow = {
  date: ISODate;
  pnlCents: number;
  symbol?: string;
  rawLineIndex: number;
  /** Raw exit / trade time cell (for display) */
  exitRaw: string;
  side?: string;
  qty?: number;
  entryPrice?: string;
  exitPrice?: string;
  durationSec?: number;
  /** Gross P/L cell when present (optional). */
  grossPnlCents?: number | null;
  feesCents?: number | null;
  /** True when Net equals fees (fee-only row), not a position. */
  commissionOnly?: boolean;
  /**
   * Gross P/L cell empty (open leg / fees) — Net P/L still counts toward totals but not toward W/L stats
   * until merged with its closing leg.
   */
  excludeFromWinLossStats?: boolean;
};

export type CsvTradeParseSuccess = {
  ok: true;
  rows: CsvTradeParseRow[];
  warnings: string[];
  detected: {
    dateColumn: string;
    pnlColumn: string;
    symbolColumn?: string;
    sideColumn?: string;
    qtyColumn?: string;
    entryPriceColumn?: string;
    exitPriceColumn?: string;
    entryTimeColumn?: string;
    durationColumn?: string;
    grossPnlColumn?: string;
    feesColumn?: string;
  };
};

export type CsvTradeParseResult =
  | CsvTradeParseSuccess
  | { ok: false; error: string };

export type ParseBrokerTradeCsvOptions = {
  /** Force l’ordre jour/mois pour dates `10/03/2026` ambiguës (sinon fichier + locale). */
  ambiguousSlashDateOrder?: CsvAmbiguousSlashDateOrder;
};

function stripBom(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) return text.slice(1);
  return text;
}

/** Split a single CSV line into fields; supports quoted segments with doubled quotes. */
export function parseCsvLine(line: string, delimiter: "," | ";" | "\t" = ","): string[] {
  const out: string[] = [];
  let cur = "";
  let i = 0;
  let inQuotes = false;
  const d = delimiter;
  while (i < line.length) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cur += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === d) {
      out.push(cur);
      cur = "";
      i += 1;
      continue;
    }
    cur += c;
    i += 1;
  }
  out.push(cur);
  return out;
}

/** NinjaTrader grid export may be tab-separated; EU often `;`; Rithmic-style tends to `,`. */
function detectCsvDelimiter(headerLine: string): "," | ";" | "\t" {
  const tabs = (headerLine.match(/\t/g) ?? []).length;
  if (tabs >= 2) return "\t";
  const semi = (headerLine.match(/;/g) ?? []).length;
  const comma = (headerLine.match(/,/g) ?? []).length;
  if (semi > comma) return ";";
  return ",";
}

function normHeader(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[’']/g, "'");
}

/**
 * Turn broker-local amount strings into a JS-parseable decimal (always `.` as decimal point).
 * Supports:
 * - US: 1,013.50 / (17.25)
 * - EU decimal comma: 0,5 / 360,5 / 1013,50 / 1.234,56
 */
function normalizeMoneyDecimalString(t: string): string {
  const hasComma = t.includes(",");
  const hasDot = t.includes(".");

  if (hasComma && hasDot) {
    const lastComma = t.lastIndexOf(",");
    const lastDot = t.lastIndexOf(".");
    if (lastComma > lastDot) {
      return t.replace(/\./g, "").replace(",", ".");
    }
    return t.replace(/,/g, "");
  }

  if (hasComma && !hasDot) {
    const parts = t.split(",");
    if (parts.length === 2) {
      const [a, b] = parts;
      if (a && b && /^\d+$/.test(a) && /^\d{1,2}$/.test(b)) {
        return `${a}.${b}`;
      }
      if (a && b && b.length === 3 && /^\d{1,3}$/.test(a)) {
        return a + b;
      }
    } else if (parts.length > 2) {
      const last = parts[parts.length - 1]!;
      if (/^\d{1,2}$/.test(last)) {
        return `${parts.slice(0, -1).join("")}.${last}`;
      }
    }
    return t.replace(/,/g, "");
  }

  return t.replace(/,/g, "");
}

function parseMoneyToCents(raw: string): number | null {
  let t = raw.trim();
  if (!t || t === "-" || t === "—") return null;
  t = t.replace(/\u00a0/g, "");
  /** NinjaTrader / Excel sometimes use Unicode minus (U+2212) instead of ASCII hyphen. */
  t = t.replace(/\u2212/g, "-");
  t = t.replace(/^["']|["']$/g, "");
  /**
   * NinjaTrader grille : `-$5.50` et `$10.50`. Un seul `^\$` ne suffit pas : après le `-`, il restait
   * `$5.50` → parseFloat échoue → pertes ignorées et total faux.
   */
  t = t.replace(/\$/g, "").trim();

  let neg = false;
  if (/^\(.*\)$/.test(t)) {
    neg = true;
    t = t.slice(1, -1).trim();
    t = t.replace(/\$/g, "").trim();
  }
  if (t.startsWith("-")) {
    neg = !neg;
    t = t.slice(1).trim();
  } else if (t.startsWith("+")) {
    t = t.slice(1).trim();
  }

  const normalized = normalizeMoneyDecimalString(t);
  const n = Number.parseFloat(normalized);
  if (!Number.isFinite(n)) return null;
  const cents = Math.round(n * 100);
  return neg ? -cents : cents;
}

function toISODateLocal(d: Date): ISODate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Ordre des deux premiers nombres pour `10/03/2026` ambigu (EU 10 mars vs US 3 oct.). */
export type CsvAmbiguousSlashDateOrder = "mdy" | "dmy";

function inferAmbiguousSlashOrderFromDateSamples(
  samples: readonly string[]
): CsvAmbiguousSlashDateOrder | null {
  let sawDmy = false;
  let sawMdy = false;
  for (const raw of samples) {
    const t = raw.trim();
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\b/.exec(t);
    if (!m) continue;
    const a = Number.parseInt(m[1]!, 10);
    const b = Number.parseInt(m[2]!, 10);
    if (a > 12) sawDmy = true;
    if (b > 12) sawMdy = true;
  }
  if (sawDmy && !sawMdy) return "dmy";
  if (sawMdy && !sawDmy) return "mdy";
  return null;
}

function browserDefaultAmbiguousSlashOrder(): CsvAmbiguousSlashDateOrder {
  if (typeof navigator !== "undefined" && navigator.language) {
    const lang = navigator.language.toLowerCase();
    if (lang === "en-us" || lang.startsWith("en-us-")) return "mdy";
  }
  return "dmy";
}

/**
 * `M/D/YYYY` ou `D/M/YYYY` + heure optionnelle (`H:MM`, `H:MM:SS`, AM/PM).
 * Si le 1er segment > 12 → jour EU ; si le 2e > 12 → mois US ; sinon `ambiguousSlashOrder`.
 */
function parseSlashDateWithOptionalTimeToIso(
  raw: string,
  ambiguousSlashOrder: CsvAmbiguousSlashDateOrder
): ISODate | null {
  const t = raw.trim();
  const m =
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\s*([AaPp][Mm]))?)?\s*$/.exec(t);
  if (!m) return null;
  const a = Number.parseInt(m[1]!, 10);
  const b = Number.parseInt(m[2]!, 10);
  const year = Number.parseInt(m[3]!, 10);
  let hh = 12;
  let mm = 0;
  let ss = 0;
  if (m[4] != null) {
    hh = Number.parseInt(m[4]!, 10);
    mm = Number.parseInt(m[5]!, 10);
    ss = m[6] != null ? Number.parseInt(m[6]!, 10) : 0;
    const ap = m[7]?.toUpperCase();
    if (ap === "PM" && hh < 12) hh += 12;
    if (ap === "AM" && hh === 12) hh = 0;
  }
  let month: number;
  let day: number;
  if (a > 12) {
    day = a;
    month = b;
  } else if (b > 12) {
    month = a;
    day = b;
  } else if (ambiguousSlashOrder === "dmy") {
    day = a;
    month = b;
  } else {
    month = a;
    day = b;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) return null;
  const dt = new Date(year, month - 1, day, hh, mm, ss);
  if (Number.isNaN(dt.getTime()) || dt.getMonth() !== month - 1 || dt.getDate() !== day) return null;
  return toISODateLocal(dt);
}

export function parseDateCell(
  raw: string,
  ambiguousSlashOrder: CsvAmbiguousSlashDateOrder = "mdy"
): ISODate | null {
  const t = raw.trim();
  if (!t) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const slash = parseSlashDateWithOptionalTimeToIso(t, ambiguousSlashOrder);
  if (slash) return slash;

  const d = new Date(t);
  if (!Number.isNaN(d.getTime())) return toISODateLocal(d);

  // MM/DD/YYYY date-only (no time) — US (2-digit year supported)
  const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s*$/.exec(t);
  if (mdy) {
    let month = Number.parseInt(mdy[1], 10);
    let day = Number.parseInt(mdy[2], 10);
    let year = Number.parseInt(mdy[3], 10);
    if (year < 100) year += 2000;
    const dt = new Date(year, month - 1, day);
    if (!Number.isNaN(dt.getTime())) return toISODateLocal(dt);
  }

  const dmy = /^(\d{1,2})-(\d{1,2})-(\d{4})\s*$/.exec(t);
  if (dmy) {
    const day = Number.parseInt(dmy[1], 10);
    const month = Number.parseInt(dmy[2], 10);
    const year = Number.parseInt(dmy[3], 10);
    const dt = new Date(year, month - 1, day);
    if (!Number.isNaN(dt.getTime())) return toISODateLocal(dt);
  }

  return null;
}

const PNL_HEADER_PRIORITY: { pattern: RegExp; label: string }[] = [
  /**
   * NinjaTrader Grid / Trade Performance: la colonne **Profit** porte le P/L réalisé par trade
   * (signé) ; « Net profit » sur la même grille est souvent un cumul — ne pas la préférer.
   * Export NT inclut souvent « Profit currency » / « Loss currency ».
   */
  { pattern: /^profit(\s+currency)?$/i, label: "Profit" },
  { pattern: /^netprofit$/i, label: "NetProfit" },
  { pattern: /^net profit\b/i, label: "Net profit" },
  { pattern: /^net p\/l$|^net p&l$|^net pnl$/i, label: "Net P/L" },
  { pattern: /^net pnl\b/i, label: "Net PnL" },
  { pattern: /^cum\.?\s*net profit\b/i, label: "Cum. net profit" },
  { pattern: /^total net profit\b/i, label: "Total net profit" },
  { pattern: /^realized p\/l$|^realized pnl$/i, label: "Realized P/L" },
  { pattern: /^gain\/loss$|^gain loss$/i, label: "Gain/Loss" },
  { pattern: /^p\/l$|^pnl$/i, label: "P/L" },
  /** Intentionally omit « Total P/L » here — sur grilles Ninja c’est souvent un cumul compte, pas par ligne. */
  { pattern: /^profit.*loss$/i, label: "Profit/Loss" },
];

const DATE_HEADER_PRIORITY: { pattern: RegExp; label: string }[] = [
  { pattern: /^timestamp$/i, label: "Timestamp" },
  { pattern: /^date\/time$/i, label: "Date/Time" },
  { pattern: /^exit (time|date)$/i, label: "Exit time/date" },
  { pattern: /^close (time|date)$/i, label: "Close time/date" },
  { pattern: /^trade date$/i, label: "Trade date" },
  { pattern: /^date$/i, label: "Date" },
  { pattern: /^exit$/i, label: "Exit" },
  { pattern: /^time$/i, label: "Time" },
  { pattern: /^entry (time|date)$/i, label: "Entry time/date" },
  { pattern: /^fill (time|date)$/i, label: "Fill time/date" },
];

const SYMBOL_HEADER_PRIORITY: { pattern: RegExp; label: string }[] = [
  { pattern: /^instrument$/i, label: "Instrument" },
  { pattern: /^symbol$/i, label: "Symbol" },
  { pattern: /^market$/i, label: "Market" },
];

function pickColumn(
  headers: string[],
  priority: { pattern: RegExp; label: string }[]
): { index: number; label: string } | null {
  const normalized = headers.map((h) => normHeader(h));
  for (const { pattern, label } of priority) {
    const idx = normalized.findIndex((h) => pattern.test(h));
    if (idx >= 0) return { index: idx, label };
  }
  return null;
}

/**
 * Colonnes à ne jamais utiliser comme P&amp;L **par trade** (cumul, solde, etc.) — typique NinjaTrader Grid.
 */
function isPnlColumnHeaderBlacklisted(rawHeader: string): boolean {
  const h = normHeader(rawHeader);
  if (!h) return true;
  if (/\bcumulative\b|\baccumulated\b|\brunning\b|\baccount\s+balance\b|\bnet\s+liquidat/i.test(h)) return true;
  if (/^\s*balance\s*$|^\s*equity\s*$|^\s*cash\s*value\s*$/i.test(h)) return true;
  if (/\bunrealized\b|\bmark\s*to\s*market\b|\bmtm\b|\bopen\s+p\/?l\b/i.test(h)) return true;
  if (/^total\s+p\/?l$/i.test(h) || /^total\s+pnl$/i.test(h)) return true;
  if (/^total\s+profit$/i.test(h)) return true;
  return false;
}

export type PnlColumnSpec =
  | { kind: "single"; index: number; label: string }
  | { kind: "profitMinusLoss"; profitIndex: number; lossIndex: number; label: string };

function findProfitLossColumnPair(headers: string[], normalized: string[]): { profit: number; loss: number } | null {
  const profitIdx = normalized.findIndex((h) => /^profit(\s+currency)?$/i.test(h));
  const lossIdx = normalized.findIndex((h) => /^loss(\s+currency)?$/i.test(h));
  if (profitIdx < 0 || lossIdx < 0 || profitIdx === lossIdx) return null;
  if (isPnlColumnHeaderBlacklisted(headers[profitIdx]!) || isPnlColumnHeaderBlacklisted(headers[lossIdx]!)) {
    return null;
  }
  return { profit: profitIdx, loss: lossIdx };
}

/** Choisit la colonne P/L (souvent **Profit** sur Ninja Grid), ou paire Profit+Loss si pas d’en-tête dédié. */
function pickPnlColumnSpec(headers: string[]): PnlColumnSpec | null {
  const normalized = headers.map((h) => normHeader(h));

  for (const { pattern, label } of PNL_HEADER_PRIORITY) {
    const idx = normalized.findIndex((h) => pattern.test(h));
    if (idx < 0) continue;
    if (isPnlColumnHeaderBlacklisted(headers[idx]!)) continue;
    /** Colonne exacte « Profit » : toujours une seule colonne (signée par trade sur NT), pas Profit−|Loss|. */
    return { kind: "single", index: idx, label };
  }

  for (let i = 0; i < normalized.length; i++) {
    const h = normalized[i]!;
    if (isPnlColumnHeaderBlacklisted(headers[i]!)) continue;
    if (/\bgross\b/i.test(h)) continue;
    if (/\bnet\b/i.test(h) && /\b(pnl|profit|p\/l|p\s*&\s*l)\b/i.test(h)) {
      return { kind: "single", index: i, label: headers[i]!.trim() };
    }
  }
  for (let i = 0; i < normalized.length; i++) {
    const h = normalized[i]!;
    if (isPnlColumnHeaderBlacklisted(headers[i]!)) continue;
    if (/\bpnl\b|\bp\/l\b|profit|loss|gain/i.test(h) && !/qty|quantity|price|size|volume|commission|fee/i.test(h)) {
      if (/\bgross\b/i.test(h)) continue;
      return { kind: "single", index: i, label: headers[i]!.trim() };
    }
  }

  const pair = findProfitLossColumnPair(headers, normalized);
  if (pair) {
    return {
      kind: "profitMinusLoss",
      profitIndex: pair.profit,
      lossIndex: pair.loss,
      label: "Profit − Loss",
    };
  }
  return null;
}

function pickDateColumn(headers: string[]): { index: number; label: string } | null {
  const byPriority = pickColumn(headers, DATE_HEADER_PRIORITY);
  if (byPriority) return byPriority;
  const normalized = headers.map((h) => normHeader(h));
  for (let i = 0; i < normalized.length; i++) {
    const h = normalized[i];
    if (/\bdate\b|\btime\b/i.test(h)) return { index: i, label: headers[i].trim() };
  }
  return null;
}

/** Si la colonne date choisie est vide ou illisible, essaie d’autres colonnes date/heure du fichier (grille NT). */
function pickFallbackDateFromRow(
  cells: string[],
  headers: string[],
  primaryDateIdx: number,
  ambiguousSlashOrder: CsvAmbiguousSlashDateOrder
): { date: ISODate; raw: string } | null {
  const normalized = headers.map((h) => normHeader(h));
  const patterns = [
    /^timestamp$/i,
    /^exit (time|date)$/i,
    /^close (time|date)$/i,
    /^date\/time$/i,
    /^trade date$/i,
    /^entry (time|date)$/i,
    /^fill (time|date)$/i,
    /^time$/i,
    /^date$/i,
  ];
  for (const pat of patterns) {
    for (let i = 0; i < normalized.length; i++) {
      if (i === primaryDateIdx) continue;
      if (!pat.test(normalized[i]!)) continue;
      const raw = (cells[i] ?? "").trim();
      const d = parseDateCell(raw, ambiguousSlashOrder);
      if (d) return { date: d, raw };
    }
  }
  return null;
}

function isNtGridProfitSingle(headers: string[], pnlSpec: PnlColumnSpec): boolean {
  if (pnlSpec.kind !== "single") return false;
  const n = normHeader(headers[pnlSpec.index] ?? "");
  if (!/^profit(\s+currency)?$/i.test(n)) return false;
  return !isPnlColumnHeaderBlacklisted(headers[pnlSpec.index] ?? "");
}

function findNtLossColumnIndex(headers: string[], normalized: string[]): number {
  for (let i = 0; i < normalized.length; i++) {
    if (!/^loss(\s+currency)?$/i.test(normalized[i]!)) continue;
    if (isPnlColumnHeaderBlacklisted(headers[i] ?? "")) continue;
    return i;
  }
  return -1;
}

/** Première ligne qui ressemble à un en-tête (PnL + date détectables) — ignore titres / lignes vides en tête de fichier. */
function resolveCsvHeaderRow(
  lines: string[]
): { headerIndex: number; delimiter: "," | ";" | "\t"; headers: string[] } | null {
  const max = Math.min(40, lines.length);
  for (let i = 0; i < max; i++) {
    const line = lines[i]!;
    const delimiter = detectCsvDelimiter(line);
    const headers = parseCsvLine(line, delimiter).map((h) => h.trim());
    if (headers.filter(Boolean).length < 4) continue;
    if (!pickPnlColumnSpec(headers)) continue;
    if (!pickDateColumn(headers)) continue;
    return { headerIndex: i, delimiter, headers };
  }
  return null;
}

function pickSymbolColumn(headers: string[]): { index: number; label: string } | null {
  return pickColumn(headers, SYMBOL_HEADER_PRIORITY);
}

const SIDE_HEADER_PRIORITY: { pattern: RegExp; label: string }[] = [
  { pattern: /^side$/i, label: "Side" },
  { pattern: /^b\/s$|^b s$/i, label: "B/S" },
  { pattern: /^long\/short$/i, label: "Long/Short" },
  { pattern: /^direction$/i, label: "Direction" },
];

const QTY_HEADER_PRIORITY: { pattern: RegExp; label: string }[] = [
  { pattern: /^qty$|^quantity$/i, label: "Qty" },
  { pattern: /^size$/i, label: "Size" },
  { pattern: /^filled$/i, label: "Filled" },
];

const ENTRY_PRICE_PRIORITY: { pattern: RegExp; label: string }[] = [
  { pattern: /^entry price$|^avg entry$|^entry px$/i, label: "Entry price" },
  { pattern: /^entry$/i, label: "Entry" },
];

const EXIT_PRICE_PRIORITY: { pattern: RegExp; label: string }[] = [
  { pattern: /^exit price$|^avg exit$|^exit px$/i, label: "Exit price" },
];

const ENTRY_TIME_PRIORITY: { pattern: RegExp; label: string }[] = [
  { pattern: /^entry (time|date)$/i, label: "Entry time" },
  { pattern: /^open (time|date)$/i, label: "Open time" },
];

const DURATION_PRIORITY: { pattern: RegExp; label: string }[] = [
  { pattern: /^duration$/i, label: "Duration" },
  { pattern: /^time in (trade|market)$/i, label: "Time in trade" },
  { pattern: /^hold/i, label: "Hold" },
];

function pickSideColumn(headers: string[]): { index: number; label: string } | null {
  return pickColumn(headers, SIDE_HEADER_PRIORITY);
}

function pickQtyColumn(headers: string[]): { index: number; label: string } | null {
  return pickColumn(headers, QTY_HEADER_PRIORITY);
}

function pickEntryPriceColumn(headers: string[]): { index: number; label: string } | null {
  return pickColumn(headers, ENTRY_PRICE_PRIORITY);
}

function pickExitPriceColumn(headers: string[]): { index: number; label: string } | null {
  return pickColumn(headers, EXIT_PRICE_PRIORITY);
}

function pickEntryTimeColumn(headers: string[]): { index: number; label: string } | null {
  return pickColumn(headers, ENTRY_TIME_PRIORITY);
}

function pickDurationColumn(headers: string[]): { index: number; label: string } | null {
  return pickColumn(headers, DURATION_PRIORITY);
}

const GROSS_PNL_HEADER_PRIORITY: { pattern: RegExp; label: string }[] = [
  { pattern: /^gross p\/l$|^gross p&l$|^gross pnl$/i, label: "Gross P/L" },
  { pattern: /^gross profit$/i, label: "Gross profit" },
  { pattern: /^gross$/i, label: "Gross" },
];

const FEES_HEADER_PRIORITY: { pattern: RegExp; label: string }[] = [
  { pattern: /^fees?$/i, label: "Fees" },
  { pattern: /^commissions?$/i, label: "Commission(s)" },
  { pattern: /^commission$/i, label: "Commission" },
  { pattern: /^brokerage$/i, label: "Brokerage" },
];

function pickGrossPnlColumn(headers: string[]): { index: number; label: string } | null {
  return pickColumn(headers, GROSS_PNL_HEADER_PRIORITY);
}

function pickFeesColumn(headers: string[]): { index: number; label: string } | null {
  return pickColumn(headers, FEES_HEADER_PRIORITY);
}

function dedupeColumn(
  col: { index: number; label: string } | null,
  forbidden: Set<number>
): { index: number; label: string } | null {
  if (!col || forbidden.has(col.index)) return null;
  return col;
}

/** Lignes de pied (Total, Somme, cumul, etc.) — à ignorer pour ne pas additionner le PnL deux fois. */
const CSV_AGGREGATE_LABEL =
  /^(total|subtotal|grand\s*total|somme|sum|summary|totals?|balance\s*du\s*jour|cumulative)\b/i;

function isLikelyCsvAggregateRow(cells: string[], symCol: { index: number } | null): boolean {
  for (let i = 0; i < Math.min(4, cells.length); i++) {
    const t = (cells[i] ?? "").trim();
    if (t && CSV_AGGREGATE_LABEL.test(t)) return true;
  }
  if (symCol) {
    const sym = (cells[symCol.index] ?? "").trim();
    if (sym && CSV_AGGREGATE_LABEL.test(sym)) return true;
  }
  return false;
}

/**
 * Quand true : regroupe les exécutions par symbole (FIFO). Peut diverger de la somme « Net » du fichier
 * si le broker mélange formats / lignes spéciales — désactivé par défaut pour coller au total du CSV.
 */
const RECONSTRUCT_TRADES_WITH_FIFO = false;

/** Parse various datetime strings to epoch ms. */
export function parseFlexibleDateTime(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  let s = t;
  if (/^\d{4}-\d{2}-\d{2} [0-9]/.test(t)) {
    s = `${t.slice(0, 10)}T${t.slice(11).trim()}`;
  }
  let ms = Date.parse(s);
  if (!Number.isNaN(ms)) return ms;
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(t);
  if (iso) {
    ms = Date.parse(`${iso[1]}T12:00:00`);
    if (!Number.isNaN(ms)) return ms;
  }
  return null;
}

function parseDurationSec(raw: string): number | null {
  const t = raw.trim().toLowerCase();
  if (!t) return null;
  const sec = /^(\d+)\s*s(ec(onds?)?)?$/i.exec(t);
  if (sec) return Number.parseInt(sec[1], 10);
  const hms = /^(\d+):(\d{1,2}):(\d{1,2})$/.exec(t.trim());
  if (hms) {
    const h = Number.parseInt(hms[1], 10);
    const m = Number.parseInt(hms[2], 10);
    const s0 = Number.parseInt(hms[3], 10);
    return h * 3600 + m * 60 + s0;
  }
  const n = Number.parseFloat(t);
  if (Number.isFinite(n) && n >= 0) return Math.round(n);
  return null;
}

function normalizeSide(raw: string): string {
  const u = raw.trim().toUpperCase();
  if (!u) return "—";
  if (/SHORT|SELL|^S$/.test(u)) return "SHORT";
  if (/LONG|BUY|^L$/.test(u)) return "LONG";
  return u.length > 12 ? `${u.slice(0, 12)}…` : u;
}

function formatExitDisplay(raw: string): string {
  const ms = parseFlexibleDateTime(raw);
  if (ms != null) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(ms));
  }
  const d = raw.trim();
  return d || "—";
}

function parseQty(raw: string): number | null {
  const t = raw.trim().replace(/,/g, "");
  if (!t) return null;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Unquoted US amounts like 1,013.50 are split into two CSV fields ("1" and "013.50").
 * We merge only at known money-column starts (P/L, entry/exit price) so we never join
 * arbitrary adjacent cells (e.g. quantity + price).
 *
 * - If the row has more fields than the header (typical split), we allow merging any
 *   valid thousands pattern at those columns.
 * - Otherwise we only merge when the second fragment looks like 013.50 (leading zero),
 *   which avoids merging e.g. 12 + 345.67 when columns are already aligned.
 */
function mergeThousandsSplitsInMoneyColumns(
  cells: string[],
  moneyColumnStarts: number[],
  headerCount: number
): string[] {
  const idxs = [...new Set(moneyColumnStarts.filter((i) => typeof i === "number" && i >= 0))].sort(
    (a, b) => b - a
  );
  let c = [...cells];
  const over = c.length > headerCount;
  for (const idx of idxs) {
    if (idx >= c.length - 1) continue;
    const a = c[idx]?.trim() ?? "";
    const b = c[idx + 1]?.trim() ?? "";
    if (!a || !b) continue;
    const trial = `${a},${b}`;
    if (parseMoneyToCents(trial) === null) continue;
    if (!/^-?\d{1,3}$/.test(a)) continue;
    if (!/^\d{3}(\.\d+)?$/.test(b)) continue;
    const strictSecond = /^0\d{2}(\.\d+)?$/.test(b);
    if (!strictSecond && !over) continue;
    c.splice(idx, 2, trial);
  }
  return c;
}

function normCsvSymbol(s: string | undefined): string {
  return (s ?? "").trim();
}

type FifoUnit = {
  timeMs: number;
  rawLineIndex: number;
  unitIndex: number;
  side: "LONG" | "SHORT";
  /** Prix colonne entrée (ligne broker), « — » si vide. */
  entryCol: string;
  /** Prix colonne sortie (ligne broker), « — » si vide. */
  exitCol: string;
  pnlCents: number;
  feesCents: number;
  grossPnlCents: number | null;
  exitRaw: string;
  date: ISODate;
  symbol: string;
  excludeFromWinLossStats?: boolean;
};

function parseFifoSide(side: string | undefined): "LONG" | "SHORT" | null {
  if (!side) return null;
  const u = side.trim().toUpperCase();
  if (/SHORT|SELL|^S$/.test(u)) return "SHORT";
  if (/LONG|BUY|^L$/.test(u)) return "LONG";
  return null;
}

function normPriceCell(s: string | undefined): string {
  const t = s?.trim() ?? "";
  if (!t || t === "—" || t === "-") return "—";
  return t;
}

/** Prix d’ouverture de position : colonne entrée en priorité, sinon sortie (certaines lignes n’ont qu’un prix). */
function positionEntryFromLeg(u: FifoUnit): string | undefined {
  if (u.entryCol !== "—") return u.entryCol;
  if (u.exitCol !== "—") return u.exitCol;
  return undefined;
}

/** Prix de clôture : colonne sortie en priorité, sinon entrée. */
function positionExitFromLeg(u: FifoUnit): string | undefined {
  if (u.exitCol !== "—") return u.exitCol;
  if (u.entryCol !== "—") return u.entryCol;
  return undefined;
}

/** Split integer cents across `q` parts so the parts sum exactly to `total`. */
function splitCentsProportional(total: number, q: number): number[] {
  if (q <= 0) return [];
  const sign = total < 0 ? -1 : 1;
  const abs = Math.abs(total);
  const base = Math.floor(abs / q);
  const rem = abs - base * q;
  const out: number[] = [];
  for (let i = 0; i < q; i++) {
    const part = base + (i < rem ? 1 : 0);
    out.push(sign * part);
  }
  return out;
}

function expandRowToFifoUnits(r: CsvTradeParseRow): FifoUnit[] | "passthrough" {
  if (r.commissionOnly) return "passthrough";
  const side = parseFifoSide(r.side);
  if (!side) return "passthrough";
  const timeMs = parseFlexibleDateTime(r.exitRaw);
  if (timeMs == null) return "passthrough";

  let q = Math.round(Math.abs(r.qty ?? 1));
  if (!Number.isFinite(q) || q < 1) q = 1;

  const pnlParts = splitCentsProportional(r.pnlCents, q);
  const feeParts = splitCentsProportional(r.feesCents ?? 0, q);
  const g = r.grossPnlCents;
  const grossParts =
    g != null && Number.isFinite(g) ? splitCentsProportional(g, q) : null;

  const entryCol = normPriceCell(r.entryPrice);
  const exitCol = normPriceCell(r.exitPrice);
  const units: FifoUnit[] = [];
  for (let i = 0; i < q; i++) {
    units.push({
      timeMs,
      rawLineIndex: r.rawLineIndex,
      unitIndex: i,
      side,
      entryCol,
      exitCol,
      pnlCents: pnlParts[i]!,
      feesCents: feeParts[i]!,
      grossPnlCents: grossParts ? grossParts[i]! : null,
      exitRaw: r.exitRaw,
      date: r.date,
      symbol: normCsvSymbol(r.symbol),
      excludeFromWinLossStats: r.excludeFromWinLossStats,
    });
  }
  return units;
}

function compareFifoUnits(a: FifoUnit, b: FifoUnit): number {
  if (a.timeMs !== b.timeMs) return a.timeMs - b.timeMs;
  if (a.rawLineIndex !== b.rawLineIndex) return a.rawLineIndex - b.rawLineIndex;
  return a.unitIndex - b.unitIndex;
}

function buildClosedRoundTrip(
  open: FifoUnit,
  close: FifoUnit,
  displaySide: "LONG" | "SHORT"
): CsvTradeParseRow {
  const pnlCents = open.pnlCents + close.pnlCents;

  let grossPnlCents: number | null | undefined;
  if (open.grossPnlCents != null && close.grossPnlCents != null) {
    grossPnlCents = open.grossPnlCents + close.grossPnlCents;
  } else if (open.grossPnlCents != null) {
    grossPnlCents = open.grossPnlCents;
  } else if (close.grossPnlCents != null) {
    grossPnlCents = close.grossPnlCents;
  }

  let feesCents: number | undefined;
  if (open.feesCents !== 0 || close.feesCents !== 0) {
    feesCents = open.feesCents + close.feesCents;
  }

  const t0 = open.timeMs;
  const t1 = close.timeMs;
  let durationSec: number | undefined;
  if (t1 >= t0) durationSec = Math.round((t1 - t0) / 1000);

  const entryStr = positionEntryFromLeg(open);
  const exitStr = positionExitFromLeg(close);

  return {
    date: open.date,
    pnlCents,
    symbol: open.symbol || close.symbol || undefined,
    rawLineIndex: Math.min(open.rawLineIndex, close.rawLineIndex),
    exitRaw: close.exitRaw,
    side: displaySide,
    qty: 1,
    entryPrice: entryStr,
    exitPrice: exitStr,
    durationSec,
    grossPnlCents,
    feesCents,
    excludeFromWinLossStats: undefined,
    commissionOnly: undefined,
  };
}

function fifoUnitToOrphanRow(u: FifoUnit): CsvTradeParseRow {
  const feesCents = u.feesCents !== 0 ? u.feesCents : undefined;
  const entryStr = u.entryCol !== "—" ? u.entryCol : undefined;
  const exitStr = u.exitCol !== "—" ? u.exitCol : undefined;
  return {
    date: u.date,
    pnlCents: u.pnlCents,
    symbol: u.symbol || undefined,
    rawLineIndex: u.rawLineIndex,
    exitRaw: u.exitRaw,
    side: u.side,
    qty: 1,
    entryPrice: entryStr,
    exitPrice: exitStr,
    grossPnlCents: u.grossPnlCents,
    feesCents,
    /** Reprend le CSV : jambe « ouverte » souvent exclue ; jambe orpheline avec gross rempli reste dans le net réel. */
    excludeFromWinLossStats: u.excludeFromWinLossStats ? true : undefined,
  };
}

function fifoPairUnits(units: FifoUnit[]): { closed: CsvTradeParseRow[]; orphans: FifoUnit[] } {
  const sorted = [...units].sort(compareFifoUnits);
  const shortQ: FifoUnit[] = [];
  const longQ: FifoUnit[] = [];
  const closed: CsvTradeParseRow[] = [];

  for (const u of sorted) {
    if (u.side === "LONG") {
      if (shortQ.length > 0) {
        const s = shortQ.shift()!;
        closed.push(buildClosedRoundTrip(s, u, "SHORT"));
      } else {
        longQ.push(u);
      }
    } else {
      if (longQ.length > 0) {
        const l = longQ.shift()!;
        closed.push(buildClosedRoundTrip(l, u, "LONG"));
      } else {
        shortQ.push(u);
      }
    }
  }

  return { closed, orphans: [...shortQ, ...longQ] };
}

/**
 * Rebuild round-trips per symbol using FIFO on timestamps (and file order as tie-break).
 * Net P/L per closed trade = sum of the two matched legs (not price-derived). Preserves total P/L.
 */
function fifoReconstructCsvTrades(rows: CsvTradeParseRow[]): CsvTradeParseRow[] {
  const passthrough: CsvTradeParseRow[] = [];
  const bySym = new Map<string, FifoUnit[]>();

  for (const r of rows) {
    const ex = expandRowToFifoUnits(r);
    if (ex === "passthrough") {
      passthrough.push(r);
      continue;
    }
    const sym = ex[0]!.symbol;
    const list = bySym.get(sym) ?? [];
    list.push(...ex);
    bySym.set(sym, list);
  }

  const closed: CsvTradeParseRow[] = [];
  const orphanRows: CsvTradeParseRow[] = [];
  for (const [, units] of bySym) {
    const { closed: c, orphans } = fifoPairUnits(units);
    closed.push(...c);
    orphanRows.push(...orphans.map(fifoUnitToOrphanRow));
  }

  const combined = [...closed, ...orphanRows, ...passthrough];
  combined.sort((a, b) => {
    const ta = parseFlexibleDateTime(a.exitRaw);
    const tb = parseFlexibleDateTime(b.exitRaw);
    if (ta != null && tb != null && ta !== tb) return ta - tb;
    if (ta != null && tb == null) return -1;
    if (ta == null && tb != null) return 1;
    return a.rawLineIndex - b.rawLineIndex;
  });
  return combined;
}

function collectDateColumnRawSamples(
  lines: string[],
  headerIndex: number,
  delimiter: "," | ";" | "\t",
  headerCount: number,
  dateColIndex: number,
  maxSamples = 80
): string[] {
  const out: string[] = [];
  for (let li = headerIndex + 1; li < lines.length && out.length < maxSamples; li++) {
    const cells = parseCsvLine(lines[li]!, delimiter);
    if (cells.length !== headerCount) continue;
    const raw = (cells[dateColIndex] ?? "").trim();
    if (raw) out.push(raw);
  }
  return out;
}

/**
 * Parse un CSV broker (NinjaTrader Grid, Rithmic, Tradovate, etc.).
 * Voir le bloc « Notes NinjaTrader Grid » en tête de fichier pour les invariants NT.
 */
export function parseBrokerTradeCsv(
  text: string,
  options?: ParseBrokerTradeCsvOptions
): CsvTradeParseResult {
  const raw = stripBom(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { ok: false, error: "Le fichier CSV doit contenir une ligne d’en-tête et au moins une ligne de données." };
  }

  const resolvedHeader = resolveCsvHeaderRow(lines);
  const headerIndex = resolvedHeader?.headerIndex ?? 0;
  const delimiter = resolvedHeader?.delimiter ?? detectCsvDelimiter(lines[0]!);
  const headers = resolvedHeader?.headers ?? parseCsvLine(lines[0]!, delimiter).map((h) => h.trim());
  if (headers.every((h) => !h.trim())) {
    return { ok: false, error: "En-têtes de colonnes invalides." };
  }

  const pnlSpec = pickPnlColumnSpec(headers);
  const dateCol = pickDateColumn(headers);
  if (!pnlSpec) {
    return {
      ok: false,
      error:
        "Colonne PnL introuvable. Utilise « Profit » (grille NinjaTrader), « Net profit », « Net P/L », « Realized P/L », ou une paire « Profit » + « Loss » sans colonne « Profit » seule. Évite les colonnes « Total P/L » / cumul.",
    };
  }
  if (!dateCol) {
    return {
      ok: false,
      error:
        "Colonne date introuvable. Ajoute une colonne « Exit time », « Trade date », « Date » ou un équivalent.",
    };
  }

  const dateSamples = collectDateColumnRawSamples(
    lines,
    headerIndex,
    delimiter,
    headers.length,
    dateCol.index
  );
  const inferredOrder = inferAmbiguousSlashOrderFromDateSamples(dateSamples);
  const ambiguousSlashOrder: CsvAmbiguousSlashDateOrder =
    options?.ambiguousSlashDateOrder ?? inferredOrder ?? browserDefaultAmbiguousSlashOrder();

  const symCol = pickSymbolColumn(headers);
  const sideCol = pickSideColumn(headers);
  const qtyCol = pickQtyColumn(headers);
  const entryPriceCol = pickEntryPriceColumn(headers);
  const exitPriceCol = pickExitPriceColumn(headers);
  const entryTimeCol = pickEntryTimeColumn(headers);
  const durationCol = pickDurationColumn(headers);

  const normalizedHeaders = headers.map((h) => normHeader(h));
  /**
   * Grille NinjaTrader : souvent **Profit** = gains uniquement, **Loss** = montant positif pour les pertes,
   * la colonne Profit restant vide. Sans combiner les deux, les pertes ne sont pas additionnées au total.
   */
  const ntLossColIdx = isNtGridProfitSingle(headers, pnlSpec)
    ? findNtLossColumnIndex(headers, normalizedHeaders)
    : -1;
  const ntLossOk = ntLossColIdx >= 0;

  const pnlIdxSet = new Set<number>(
    pnlSpec.kind === "single"
      ? ntLossOk
        ? [pnlSpec.index, ntLossColIdx]
        : [pnlSpec.index]
      : [pnlSpec.profitIndex, pnlSpec.lossIndex]
  );
  const grossCol = dedupeColumn(pickGrossPnlColumn(headers), pnlIdxSet);
  const grossIdxSet = new Set(pnlIdxSet);
  if (grossCol) grossIdxSet.add(grossCol.index);
  const feesCol = dedupeColumn(pickFeesColumn(headers), grossIdxSet);

  const warnings: string[] = [];
  if (headerIndex > 0) {
    warnings.push(
      `En-tête détectée à la ligne ${headerIndex + 1} — les lignes précédentes du fichier ont été ignorées.`
    );
  }
  const rows: CsvTradeParseRow[] = [];
  const headerCount = headers.length;
  const moneyColumnStarts = [
    ...(pnlSpec.kind === "single"
      ? ntLossOk
        ? [pnlSpec.index, ntLossColIdx]
        : [pnlSpec.index]
      : [pnlSpec.profitIndex, pnlSpec.lossIndex]),
    entryPriceCol?.index,
    exitPriceCol?.index,
    grossCol?.index,
    feesCol?.index,
  ].filter((x): x is number => x != null);

  let colMismatchWarnings = 0;
  let skippedMalformedRows = 0;
  let illigibleRowWarnings = 0;
  for (let li = headerIndex + 1; li < lines.length; li++) {
    let cells = parseCsvLine(lines[li]!, delimiter);
    cells = mergeThousandsSplitsInMoneyColumns(cells, moneyColumnStarts, headerCount);
    if (cells.length !== headerCount) {
      skippedMalformedRows++;
      if (colMismatchWarnings < 8) {
        colMismatchWarnings++;
        warnings.push(
          `Ligne ${li + 1}: ${cells.length} champ(s) au lieu de ${headerCount} — ligne ignorée (souvent virgules non quotées dans un champ). Export tab ou CSV quoté recommandé.`
        );
      }
      continue;
    }
    if (isLikelyCsvAggregateRow(cells, symCol)) {
      continue;
    }
    let pnlCents: number | null;
    if (pnlSpec.kind === "single") {
      const pnlRaw = cells[pnlSpec.index] ?? "";
      if (ntLossOk) {
        const lossRaw = cells[ntLossColIdx] ?? "";
        if (!pnlRaw.trim() && !lossRaw.trim()) {
          pnlCents = null;
        } else {
          const prof = parseMoneyToCents(pnlRaw);
          const lossParsed = parseMoneyToCents(lossRaw);
          const p0 = prof ?? 0;
          const lossMag = lossParsed == null ? 0 : Math.abs(lossParsed);
          pnlCents = p0 - lossMag;
        }
      } else {
        pnlCents = parseMoneyToCents(pnlRaw);
      }
    } else {
      const prof = parseMoneyToCents(cells[pnlSpec.profitIndex] ?? "");
      const lossParsed = parseMoneyToCents(cells[pnlSpec.lossIndex] ?? "");
      const p0 = prof ?? 0;
      const lossMag = lossParsed == null ? 0 : Math.abs(lossParsed);
      pnlCents = p0 - lossMag;
    }
    const dateRaw = cells[dateCol.index] ?? "";
    let date = parseDateCell(dateRaw, ambiguousSlashOrder);
    let exitRaw = dateRaw;
    if (date === null) {
      const fb = pickFallbackDateFromRow(cells, headers, dateCol.index, ambiguousSlashOrder);
      if (fb) {
        date = fb.date;
        exitRaw = fb.raw;
      }
    }
    if (pnlCents === null || date === null) {
      const hasPnlCell =
        pnlSpec.kind === "single"
          ? ntLossOk
            ? Boolean((cells[pnlSpec.index] ?? "").trim() || (cells[ntLossColIdx] ?? "").trim())
            : Boolean((cells[pnlSpec.index] ?? "").trim())
          : Boolean(
              (cells[pnlSpec.profitIndex] ?? "").trim() || (cells[pnlSpec.lossIndex] ?? "").trim()
            );
      if (hasPnlCell || dateRaw.trim()) {
        illigibleRowWarnings++;
        if (illigibleRowWarnings <= 12) {
          warnings.push(`Ligne ${li + 1}: ignorée (PnL ou date illisible).`);
        }
      }
      continue;
    }
    let symbol: string | undefined;
    if (symCol) {
      const s = (cells[symCol.index] ?? "").trim();
      if (s) symbol = s;
    }
    let side: string | undefined;
    if (sideCol) {
      const s = (cells[sideCol.index] ?? "").trim();
      if (s) side = normalizeSide(s);
    }
    let qty: number | undefined;
    if (qtyCol) {
      const q = parseQty(cells[qtyCol.index] ?? "");
      if (q != null) qty = q;
    }
    let entryPrice: string | undefined;
    if (entryPriceCol) {
      const e = (cells[entryPriceCol.index] ?? "").trim();
      if (e) entryPrice = e;
    }
    let exitPrice: string | undefined;
    if (exitPriceCol) {
      const x = (cells[exitPriceCol.index] ?? "").trim();
      if (x) exitPrice = x;
    }

    let durationSec: number | undefined;
    if (durationCol) {
      const d0 = parseDurationSec(cells[durationCol.index] ?? "");
      if (d0 != null) durationSec = d0;
    }
    if (durationSec == null && entryTimeCol) {
      const eRaw = cells[entryTimeCol.index] ?? "";
      const eMs = parseFlexibleDateTime(eRaw);
      const xMs = parseFlexibleDateTime(exitRaw);
      if (eMs != null && xMs != null && xMs >= eMs) {
        durationSec = Math.round((xMs - eMs) / 1000);
      }
    }

    const grossRaw = grossCol ? (cells[grossCol.index] ?? "").trim() : "";
    const grossCellEmpty =
      grossCol != null &&
      (grossRaw === "" || grossRaw === "-" || grossRaw === "—" || grossRaw.toLowerCase() === "n/a");

    let grossPnlCents: number | null | undefined;
    if (grossCol && !grossCellEmpty) {
      const g = parseMoneyToCents(grossRaw);
      grossPnlCents = g;
    }

    let feesParsed: number | null | undefined;
    if (feesCol) {
      const f = parseMoneyToCents(cells[feesCol.index] ?? "");
      feesParsed = f;
    }

    const excludeFromWinLossStats = grossCol != null && grossCellEmpty;

    let commissionOnly = false;
    if (feesParsed != null && feesParsed !== 0 && pnlCents < 0) {
      const mag = Math.abs(feesParsed);
      const netIfFeeOnly = -mag;
      if (Math.abs(pnlCents - netIfFeeOnly) <= 1) {
        if (grossCol != null && grossPnlCents === 0) {
          commissionOnly = true;
        } else if (grossCol == null) {
          commissionOnly = true;
        }
      }
    }

    rows.push({
      date,
      pnlCents,
      symbol,
      rawLineIndex: li + 1,
      exitRaw,
      side,
      qty,
      entryPrice,
      exitPrice,
      durationSec,
      grossPnlCents,
      feesCents: feesParsed ?? undefined,
      commissionOnly: commissionOnly ? true : undefined,
      excludeFromWinLossStats: excludeFromWinLossStats ? true : undefined,
    });
  }

  if (illigibleRowWarnings > 12) {
    warnings.push(
      `… et ${illigibleRowWarnings - 12} autre(s) ligne(s) ignorée(s) (PnL ou date illisible) — souvent la même cause (format date ou montant).`
    );
  }

  if (skippedMalformedRows > 0) {
    warnings.unshift(
      `${skippedMalformedRows} ligne(s) ignorées : décalage du nombre de colonnes par rapport à l’en-tête (sinon le P/L est lu sur la mauvaise colonne). Préfère un export tabulation ou des champs quotés.`
    );
  }

  if (rows.length === 0) {
    return {
      ok: false,
      error: "Aucune ligne exploitable : vérifie les formats de date et de montants (ex. 123.45 ou (50.00) pour -50).",
    };
  }

  let mergedRows: CsvTradeParseRow[];
  if (RECONSTRUCT_TRADES_WITH_FIFO) {
    const sumBefore = rows.reduce((s, r) => s + r.pnlCents, 0);
    mergedRows = fifoReconstructCsvTrades(rows);
    const sumAfter = mergedRows.reduce((s, r) => s + r.pnlCents, 0);
    if (sumBefore !== sumAfter) {
      warnings.push(
        `Total Net P/L incohérent après appariement FIFO (${(sumAfter / 100).toFixed(2)} $ vs ${(sumBefore / 100).toFixed(2)} $ attendu) — lignes brutes conservées.`
      );
      mergedRows = rows;
    }
  } else {
    mergedRows = rows;
  }

  return {
    ok: true,
    rows: mergedRows,
    warnings,
    detected: {
      dateColumn: dateCol.label,
      pnlColumn: ntLossOk ? "Profit − Loss" : pnlSpec.label,
      symbolColumn: symCol?.label,
      sideColumn: sideCol?.label,
      qtyColumn: qtyCol?.label,
      entryPriceColumn: entryPriceCol?.label,
      exitPriceColumn: exitPriceCol?.label,
      entryTimeColumn: entryTimeCol?.label,
      durationColumn: durationCol?.label,
      grossPnlColumn: grossCol?.label,
      feesColumn: feesCol?.label,
    },
  };
}

/** Sum PnL by calendar day (for journal sync). */
export function aggregateDailyPnlCents(rows: CsvTradeParseRow[]): Map<ISODate, number> {
  const m = new Map<ISODate, number>();
  for (const r of rows) {
    m.set(r.date, (m.get(r.date) ?? 0) + r.pnlCents);
  }
  return m;
}

function newJournalId(): JournalId {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `pnl-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * For each day in `daily`, set a single PnL entry (import) for the account:
 * removes duplicate entries on the same day, preserves oldest id when replacing.
 */
export function buildPnlImportPlan(
  state: JournalDataV1,
  accountId: JournalId,
  daily: Map<ISODate, number>
): { deleteIds: JournalId[]; entries: JournalPnlEntry[] } {
  const deleteIds: JournalId[] = [];
  const entries: JournalPnlEntry[] = [];
  const t = nowIso();

  for (const [date, pnlCents] of daily) {
    const sameDay = Object.values(state.pnlEntries).filter(
      (e) => e.accountId === accountId && e.date === date
    );
    const keep =
      sameDay.length === 0
        ? undefined
        : [...sameDay].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
    for (const e of sameDay) {
      if (keep && e.id !== keep.id) deleteIds.push(e.id);
    }
    const id = keep?.id ?? newJournalId();
    entries.push({
      id,
      accountId,
      date,
      pnlCents,
      source: "import",
      note: "Import CSV — PnL agrégé par jour",
      createdAt: keep?.createdAt ?? t,
      updatedAt: t,
    });
  }

  return { deleteIds, entries };
}

function newTradeId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `tr-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Turn parsed CSV rows into persisted trade rows for the Trades table. */
export function buildStoredTradesFromCsv(rows: CsvTradeParseRow[], accountId: JournalId): StoredTrade[] {
  const t = nowIso();
  return rows.map((r) => ({
    id: newTradeId(),
    accountId,
    importedAt: t,
    date: r.date,
    sourceFileLine: r.rawLineIndex,
    exitRaw: r.exitRaw,
    exitDisplay: formatExitDisplay(r.exitRaw),
    symbol: r.symbol?.trim() || "—",
    side: r.side ?? "—",
    qty: r.qty ?? null,
    entry: r.entryPrice ?? "—",
    exit: r.exitPrice ?? "—",
    pnlCents: r.pnlCents,
    durationSec: r.durationSec ?? null,
    ...(r.commissionOnly ? { commissionOnly: true as const } : {}),
    ...(r.excludeFromWinLossStats ? { excludeFromWinLossStats: true as const } : {}),
  }));
}
