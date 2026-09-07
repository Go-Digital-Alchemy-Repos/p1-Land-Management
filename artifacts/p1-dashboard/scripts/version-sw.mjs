import {readFile,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
const html=await readFile(new URL("../dist/index.html",import.meta.url));
const version=createHash("sha256").update(html).digest("hex").slice(0,16);
const file=new URL("../dist/sw.js",import.meta.url);
await writeFile(file,(await readFile(file,"utf8")).replace('p1-shell-v1','p1-shell-'+version));
