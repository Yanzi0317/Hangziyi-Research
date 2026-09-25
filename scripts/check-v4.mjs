import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  listVersions,
  getVersion,
  requireRunnableVersion,
  defaultVersion,
} from "../src/recommendation/registry.ts";

// Configuration checks only: no personas, model calls, or generated recommendations.
assert.deepEqual(
  listVersions().map((v) => v.version),
  ["v1", "v2", "v3", "v4", "v3.1"],
);
assert.equal(defaultVersion, "v3");
assert.equal(getVersion("v4").status, "draft");
assert.throws(() => getVersion("missing"), /Unknown recommendation version/);
assert.throws(() => getVersion("__proto__"), /Unknown recommendation version/);
for (const version of ["v1", "v2", "v3", "v4"]) {
  assert.equal(requireRunnableVersion(version).runnable, true);
}
const prompt = await readFile(
  new URL("../src/recommendation/v4/system-prompt.md", import.meta.url),
  "utf8",
);
for (const finding of ["INT-01", "INT-02", "INT-03", "INT-04", "INT-05"]) {
  assert.ok(prompt.includes(finding));
}
assert.ok(prompt.includes("软件回归可以使用明确标注的合成画像"));
console.log(
  "v4 configuration checks passed. No personas or LLM calls were used.",
);
