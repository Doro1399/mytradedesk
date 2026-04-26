#!/usr/bin/env python3
"""
Parse per-firm CSVs in CSV Propfirm Rules/, compare to lib/prop-firms.ts compare rows.
- Promo must match (case-insensitive; "-" / empty == no code).
- If match and price differs: emit JSON patch lines for apply step.
"""
from __future__ import annotations

import csv
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV_DIR = ROOT / "CSV Propfirm Rules"
PROP_FIRMS = ROOT / "lib" / "prop-firms.ts"


def norm_promo(s: str) -> str:
    t = (s or "").strip()
    if t in ("-", "—", "–", "N/A", "n/a"):
        return ""
    return t.lower()


def parse_money(val: str) -> float | None:
    if val is None:
        return None
    t = str(val).strip()
    if not t or t in ("-", "—", "–"):
        return None
    t = t.replace("\u202f", " ").replace("\xa0", " ")
    t = re.sub(r"[$€£]", "", t)
    t = t.strip().strip('"').strip("'")
    # French: 1 234,56 -> 1234.56
    if re.search(r",\d{1,2}\s*$", t):
        t = t.replace(" ", "").replace(".", "").replace(",", ".")
    else:
        t = t.replace(" ", "").replace(",", "")
    try:
        return float(t)
    except ValueError:
        return None


def find_col(header: list[str], *needles: str) -> int | None:
    flat = [(i, (c or "").strip().lower()) for i, c in enumerate(header)]
    for needle in needles:
        n = needle.lower()
        for i, c in flat:
            if n in c:
                return i
    return None


def extract_csv_rows(path: Path) -> list[dict]:
    """Return data rows from possibly multi-section CSV (re-scan headers after PROPFIRM)."""
    text = path.read_text(encoding="utf-8-sig", errors="replace")
    rows = list(csv.reader(text.splitlines()))
    out: list[dict] = []
    idx_nom = idx_size = idx_reg = idx_disc = idx_promo = idx_firm = None

    for row in rows:
        if not row or all(not (c or "").strip() for c in row):
            continue
        first = (row[0] or "").strip()
        if first.upper().startswith("PROPFIRM"):
            continue
        joined = " ".join((c or "") for c in row)
        if "nom du compte" in joined.lower():
            idx_hash = find_col(row, "#")
            idx_firm = find_col(row, "prop firm")
            idx_nom = find_col(row, "nom du compte")
            idx_size = find_col(row, "taille")
            idx_reg = find_col(row, "regular price")
            idx_disc = find_col(row, "discount price")
            idx_promo = find_col(row, "code promo")
            if None in (idx_nom, idx_size, idx_reg, idx_disc, idx_promo):
                idx_nom = idx_nom or 4
                idx_size = idx_size or 5
                idx_reg = idx_reg or 8
                idx_disc = idx_disc or 9
                idx_promo = idx_promo or 10
                idx_firm = idx_firm or 1
            continue
        if not first.isdigit():
            continue
        if idx_nom is None:
            continue

        def cell(i: int | None) -> str:
            if i is None or i >= len(row):
                return ""
            return row[i] if row[i] is not None else ""

        firm = cell(idx_firm).strip()
        account = cell(idx_nom).strip()
        size = cell(idx_size).strip()
        reg = parse_money(cell(idx_reg))
        disc = parse_money(cell(idx_disc))
        promo = cell(idx_promo).strip()
        if not account or not size or reg is None:
            continue
        out.append(
            {
                "firm": firm,
                "accountName": account,
                "size": size,
                "regularPrice": reg,
                "discountedPrice": disc,
                "promo": promo,
                "source": path.name,
            }
        )
    return out


def norm_firm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


def canonical_account_name_for_compare(firm: str, account_name: str) -> str:
    """Map CSV naming variants to compare naming (challenge rows)."""
    firm_key = norm_firm(firm)
    name = (account_name or "").strip()
    # Compare table has a single Tradeify Select challenge row.
    if firm_key == "tradeify" and name in ("Tradeify Select Daily", "Tradeify Select Flex"):
        return "Tradeify Select"
    return name


def load_compare_rows() -> list[dict]:
    cmd = [
        "npx",
        "--yes",
        "tsx",
        "-e",
        """
import { propFirms } from './lib/prop-firms.ts';
console.log(JSON.stringify(propFirms.map((r) => ({
  id: r.id,
  name: r.name,
  accountName: r.accountName,
  size: r.size,
  promo: r.promo,
  regularPrice: r.regularPrice,
  discountedPrice: r.discountedPrice,
})), null, 0));
""",
    ]
    p = subprocess.run(cmd, cwd=str(ROOT), capture_output=True, text=True, timeout=120000)
    if p.returncode != 0:
        print(p.stderr, file=sys.stderr)
        raise SystemExit(p.returncode)
    # last JSON line (tsx may print npm noise)
    for line in reversed(p.stdout.strip().splitlines()):
        line = line.strip()
        if line.startswith("["):
            return json.loads(line)
    raise SystemExit("no JSON from tsx")


def main() -> None:
    compare = load_compare_rows()
    key_to_code: dict[tuple[str, str, str], dict] = {}
    for r in compare:
        k = (
            norm_firm(r["name"]),
            canonical_account_name_for_compare(r["name"], r["accountName"]),
            r["size"].strip(),
        )
        key_to_code[k] = r

    csv_by_key: dict[tuple[str, str, str], dict] = {}
    for path in sorted(CSV_DIR.glob("*.csv")):
        for row in extract_csv_rows(path):
            k = (
                norm_firm(row["firm"]),
                canonical_account_name_for_compare(row["firm"], row["accountName"]),
                row["size"],
            )
            csv_by_key[k] = row

    promo_mismatch: list[str] = []
    missing_in_csv: list[str] = []
    missing_in_code: list[str] = []
    price_updates: list[tuple[int, float, float | None, float, float | None]] = []

    for k, cr in sorted(csv_by_key.items()):
        if k not in key_to_code:
            missing_in_code.append(f'{cr["source"]}: {cr["firm"]} / {cr["accountName"]} / {cr["size"]}')
            continue
        code = key_to_code[k]
        pc = norm_promo(code.get("promo") or "")
        pcsv = norm_promo(cr["promo"])
        if pc != pcsv:
            promo_mismatch.append(
                f'id {code["id"]} {code["name"]} {code["accountName"]} {code["size"]}: '
                f'code promo={code.get("promo")!r} vs CSV={cr["promo"]!r} ({cr["source"]})'
            )
            continue
        reg_c = float(code["regularPrice"])
        disc_c = code["discountedPrice"]
        disc_c_f = float(disc_c) if disc_c is not None else None
        reg_csv = cr["regularPrice"]
        disc_csv = cr["discountedPrice"]
        # CSV typo: "discount" higher than regular — skip (fix sheet, then re-sync).
        if disc_csv is not None and disc_csv > reg_csv:
            continue
        # Full price quoted as "discount" — treat as no discount tier.
        if disc_csv is not None and abs(disc_csv - reg_csv) < 1e-6:
            disc_csv = None
        if reg_c != reg_csv or disc_c_f != disc_csv:
            price_updates.append((code["id"], reg_c, disc_c_f, reg_csv, disc_csv))

    for k, code in key_to_code.items():
        if k in csv_by_key:
            continue
        # Skip journal-only rows if any (optional) — list firms that have CSV dir
        missing_in_csv.append(f'{code["name"]} / {code["accountName"]} / {code["size"]} (id {code["id"]})')

    print("=== PROMO DIVERGENCES (no price change) ===")
    for line in promo_mismatch:
        print(line)
    print(f"\nTotal promo mismatches: {len(promo_mismatch)}")

    print("\n=== PRICE UPDATES (promo OK) ===")
    for tid, old_r, old_d, new_r, new_d in sorted(price_updates, key=lambda x: x[0]):
        print(f"id {tid}: regular {old_r} -> {new_r}, discounted {old_d} -> {new_d}")

    print(f"\nTotal price updates: {len(price_updates)}")

    print("\n=== CSV ROWS NOT FOUND IN CODE (sample) ===")
    for line in missing_in_code[:40]:
        print(line)
    if len(missing_in_code) > 40:
        print(f"... +{len(missing_in_code) - 40} more")

    print("\n=== CODE ROWS NOT IN CSV (by firm with any CSV) ===")
    csv_firms = {norm_firm(r["firm"]) for r in csv_by_key.values()}
    extra = [m for m in missing_in_csv if norm_firm(m.split(" / ")[0]) in csv_firms]
    for line in extra[:50]:
        print(line)
    if len(extra) > 50:
        print(f"... +{len(extra) - 50} more")
    print(f"\nCode rows for firms in CSV but no matching CSV row: {len(extra)}")

    if price_updates and "--write-patch" in sys.argv:
        patch_path = ROOT / "scripts" / "compare-price-patch.json"
        patch_path.write_text(
            json.dumps(
                [{"id": u[0], "regularPrice": u[3], "discountedPrice": u[4]} for u in price_updates],
                indent=2,
            ),
            encoding="utf-8",
        )
        print(f"\nWrote {patch_path}")


if __name__ == "__main__":
    main()
