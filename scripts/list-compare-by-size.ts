import { propFirms } from "../lib/prop-firms";

const bySize = new Map<string, typeof propFirms>();
for (const f of propFirms) {
  const k = f.size;
  if (!bySize.has(k)) bySize.set(k, []);
  bySize.get(k)!.push(f);
}

const sizes = [...bySize.keys()].sort((a, b) => {
  const na = parseInt(a, 10) || 0;
  const nb = parseInt(b, 10) || 0;
  return na - nb;
});

console.log("TOTAL_ROWS", propFirms.length);
console.log("");

for (const sz of sizes) {
  const rows = [...bySize.get(sz)!].sort(
    (a, b) =>
      a.name.localeCompare(b.name) ||
      a.accountName.localeCompare(b.accountName) ||
      a.id - b.id
  );
  console.log(`=== ${sz} (${rows.length}) ===`);
  for (const r of rows) {
    console.log(
      [r.id, r.name, r.accountName, r.accountType, r.drawdown].join("\t")
    );
  }
  console.log("");
}
