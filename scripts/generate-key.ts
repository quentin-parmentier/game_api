import { createApiKey } from "../src/db.ts";

const name = process.argv[2] ?? "default";
const key = createApiKey(name);
console.log(`✅ API key created for "${name}":`);
console.log(key);
