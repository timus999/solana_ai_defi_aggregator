
import bs58 from "bs58";
import fs from "fs";

const base58Key = "XBtgiDVeAkdKjXNETPDLZXHR23A35Jnenev86c4zXCp3LXTY9pqMxek2RHD5PVXEQsTiE3pydQa4UEQovyNTHZe";

const secretKey = bs58.decode(base58Key);
fs.writeFileSync(
  "phantom.json",
  JSON.stringify(Array.from(secretKey))
);

console.log("Saved phantom.json");
