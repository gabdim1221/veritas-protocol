#!/usr/bin/env node
/**
 * Validate every Tessera object in test-vectors/ against a given JSON Schema.
 *
 * Usage:
 *   node scripts/validate-vectors.mjs schemas/tessera-v0.1.json
 *   node scripts/validate-vectors.mjs schemas/tessera-v0.2.json
 *
 * Bundles (files with top-level `tessera` + `delegation`) are split and each
 * inner Tessera is validated. Bare files (single Tessera at top level) are
 * validated as-is. Exits non-zero if any validation fails.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, relative } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const schemaPath = resolve(process.argv[2] ?? "schemas/tessera-v0.2.json");
const root = resolve("test-vectors");

const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats.default(ajv);
const validate = ajv.compile(schema);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === "fixtures") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".json")) out.push(p);
  }
  return out;
}

const files = walk(root).sort();
let failures = 0;
let validated = 0;

for (const f of files) {
  const data = JSON.parse(readFileSync(f, "utf8"));
  const objects =
    data && typeof data === "object" && "tessera" in data && "delegation" in data
      ? [
          { label: `${relative(".", f)} :: tessera`, obj: data.tessera },
          { label: `${relative(".", f)} :: delegation`, obj: data.delegation },
        ]
      : [{ label: relative(".", f), obj: data }];
  for (const { label, obj } of objects) {
    const ok = validate(obj);
    validated++;
    if (!ok) {
      failures++;
      console.error(`FAIL ${label}`);
      for (const err of validate.errors ?? []) {
        console.error(`  ${err.instancePath || "/"} ${err.message} ${JSON.stringify(err.params)}`);
      }
    }
  }
}

console.log(`\nValidated ${validated} Tessera objects against ${relative(".", schemaPath)}: ${failures === 0 ? "ALL PASS" : `${failures} FAIL`}`);
process.exit(failures === 0 ? 0 : 1);
