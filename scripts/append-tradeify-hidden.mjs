import fs from "fs";
const p = "c:/dev/mytradedesk/lib/prop-firms.ts";
const ins = fs.readFileSync("c:/dev/mytradedesk/scripts/tradeify-hidden.txt", "utf8").trimEnd();
let s = fs.readFileSync(p, "utf8");
const marker = "\n];\r\n\r\nexport function effectivePrice";
let idx = s.indexOf(marker);
if (idx < 0) idx = s.indexOf("\n];\n\nexport function effectivePrice");
if (idx < 0) throw new Error("export marker");
if (s.slice(0, idx).trimEnd().endsWith(",")) {
  s = s.slice(0, idx) + "\n" + ins + "\n" + s.slice(idx);
} else {
  s = s.slice(0, idx) + ",\n" + ins + "\n" + s.slice(idx);
}
fs.writeFileSync(p, s);
console.log("appended hidden tradeify");
