import fs from "fs";
const p = "c:/dev/mytradedesk/lib/prop-firms.ts";
let s = fs.readFileSync(p, "utf8");
const inner = "    ...tradeifyBase,\r\n    id: 158,";
const innerIdx = s.indexOf(inner);
if (innerIdx < 0) throw new Error("dup start not found");
let blockStart = s.lastIndexOf("\r\n  {", innerIdx);
if (blockStart < 0) {
  blockStart = s.lastIndexOf("\n  {", innerIdx);
}
if (blockStart < 0) throw new Error("dup brace not found");
const end =
  s.indexOf("\r\n];\r\n\r\nexport function effectivePrice", innerIdx) >= 0
    ? s.indexOf("\r\n];\r\n\r\nexport function effectivePrice", innerIdx)
    : s.indexOf("\n];\n\nexport function effectivePrice", innerIdx);
if (end < 0) throw new Error("dup end not found");
s = s.slice(0, blockStart) + s.slice(end);
s = s.replace(/\bid: (\d+),/g, (_, n) => {
  const v = Number(n);
  if (v >= 40) return `id: ${v + 2},`;
  return `id: ${v},`;
});
fs.writeFileSync(p, s);
console.log("OK");
