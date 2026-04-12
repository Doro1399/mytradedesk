import { propFirms } from "../lib/prop-firms";

let i = 1;
for (const f of propFirms) {
  console.log(`${i}\t${f.name}\t${f.accountName}\t${f.size}`);
  i++;
}
