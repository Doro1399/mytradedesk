import type { JournalAccount } from "@/lib/journal/types";
import { JOURNAL_BUFFER_CENTS_BY_KEY } from "@/lib/journal/buffer-lookup.generated";

function normalizeSizeLabel(sizeLabel: string): string {
  return sizeLabel.trim().toLowerCase().replace(/\s+/g, "");
}

/** Buffer (USD cents) from `data/buffers.csv`. `null` = `-` or unknown row. */
export function lookupBufferCentsByKey(
  firm: string,
  program: string,
  sizeLabel: string
): number | null {
  const firmT = firm.trim();
  const programT = program.trim();
  const size = normalizeSizeLabel(sizeLabel);
  if (!firmT || !programT || !size) return null;
  const key = `${firmT}|${programT}|${size}`;
  const v = JOURNAL_BUFFER_CENTS_BY_KEY[key];
  return v === undefined ? null : v;
}

function bufferCaseInsensitiveMatch(acc: JournalAccount): number | null {
  const firm = acc.propFirm.name.trim().toLowerCase();
  const prog = (acc.compareProgramName ?? "").trim().toLowerCase();
  const size = normalizeSizeLabel(acc.sizeLabel);
  if (!prog) return null;
  for (const [k, v] of Object.entries(JOURNAL_BUFFER_CENTS_BY_KEY)) {
    if (v == null || v <= 0) continue;
    const parts = k.split("|");
    if (parts.length !== 3) continue;
    if (parts[0]!.trim().toLowerCase() !== firm) continue;
    if (parts[1]!.trim().toLowerCase() !== prog) continue;
    if (parts[2]!.trim().toLowerCase() !== size) continue;
    return v;
  }
  return null;
}

/** Exact firm string prefix + size (e.g. `Apex Trader Funding|…|50k`). */
function bufferFirmSizeFirstMatch(acc: JournalAccount): number | null {
  const firm = acc.propFirm.name.trim();
  const size = normalizeSizeLabel(acc.sizeLabel);
  const program = acc.compareProgramName?.trim();
  if (!firm || !size) return null;
  const progLower = program?.toLowerCase();
  const suffix = `|${size}`;
  const keys = Object.keys(JOURNAL_BUFFER_CENTS_BY_KEY)
    .filter((k) => k.startsWith(`${firm}|`) && k.toLowerCase().endsWith(suffix))
    .sort();
  for (const k of keys) {
    const parts = k.split("|");
    if (parts.length !== 3) continue;
    if (progLower && parts[1]!.trim().toLowerCase() !== progLower) continue;
    const v = JOURNAL_BUFFER_CENTS_BY_KEY[k];
    if (v != null && v > 0) return v;
  }
  return null;
}

/**
 * Firme libellée différemment du CSV (« Apex » vs « Apex Trader Funding ») ou programme journal incorrect :
 * on matche taille + similarité sur le nom firme du CSV.
 */
function bufferFirmSizeLooseMatch(acc: JournalAccount): number | null {
  const size = normalizeSizeLabel(acc.sizeLabel);
  const accFirm = acc.propFirm.name.trim().toLowerCase();
  const program = (acc.compareProgramName ?? "").trim().toLowerCase();
  if (!size || !accFirm) return null;

  const firstToken = accFirm.split(/[^a-z0-9]+/i).find((t) => t.length >= 2) ?? "";

  const scored: { v: number; score: number; k: string }[] = [];
  for (const [k, v] of Object.entries(JOURNAL_BUFFER_CENTS_BY_KEY)) {
    if (v == null || v <= 0) continue;
    const parts = k.split("|");
    if (parts.length !== 3) continue;
    if (program && parts[1]!.trim().toLowerCase() !== program) continue;
    const kFirm = parts[0]!.trim().toLowerCase();
    const kSize = parts[2]!.trim().toLowerCase();
    if (kSize !== size) continue;

    let score = 0;
    if (kFirm === accFirm) score = 100;
    else if (kFirm.includes(accFirm) || accFirm.includes(kFirm)) score = 85;
    else if (firstToken.length >= 3 && kFirm.includes(firstToken)) score = 70;

    if (score > 0) scored.push({ v, score, k });
  }
  if (scored.length === 0) return null;
  scored.sort((a, b) => b.score - a.score || a.k.localeCompare(b.k));
  return scored[0]!.v;
}

export function lookupJournalBufferCents(acc: JournalAccount): number | null {
  const firmT = acc.propFirm.name.trim();
  const program = acc.compareProgramName?.trim() ?? "";
  const size = normalizeSizeLabel(acc.sizeLabel);

  /**
   * Ligne présente dans `buffers.csv` (y compris `-` → null) : on respecte la valeur,
   * sans fallback vers un autre programme / même taille (ex. Lucid Flex funded = pas de buffer).
   */
  if (firmT && program && size) {
    const key = `${firmT}|${program}|${size}`;
    if (Object.prototype.hasOwnProperty.call(JOURNAL_BUFFER_CENTS_BY_KEY, key)) {
      const v = JOURNAL_BUFFER_CENTS_BY_KEY[key];
      return v != null && v > 0 ? v : null;
    }
  }

  const exact = lookupBufferCentsByKey(acc.propFirm.name, program, acc.sizeLabel);
  if (exact != null) return exact;

  const ci = bufferCaseInsensitiveMatch(acc);
  if (ci != null) return ci;

  /** Même si le programme est renseigné mais ne correspond pas au CSV (ex. libellé wizard). */
  const firmSize = bufferFirmSizeFirstMatch(acc);
  if (firmSize != null) return firmSize;

  return bufferFirmSizeLooseMatch(acc);
}
