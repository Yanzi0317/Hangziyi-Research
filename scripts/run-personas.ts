import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { loadPersona, personaIds } from "../src/comparison.ts";
import { runRecommendation } from "../src/recommendation/engine.ts";
import { getVersion } from "../src/recommendation/registry.ts";
import { marketSource } from "../src/market-data/service.ts";
const args = process.argv.slice(2);
const pos = args.indexOf("--version");
const version = getVersion(pos >= 0 ? args[pos + 1] : "v3").version;
if (args.includes("--dry-run"))
  console.log(
    JSON.stringify({
      version,
      personas: personaIds,
      calls: 10,
      maxCallsWithRepair: 20,
      synthetic: true,
      model: process.env.LLM_MODEL ?? "not configured",
    }),
  );
else {
  if (!process.env.LLM_API_KEY)
    throw new Error("LLM_API_KEY 未配置，不会生成模拟输出");
  const folder = path.join("tests", "outputs", version);
  await mkdir(folder, { recursive: true });
  const market = await marketSource.load("initial");
  const statuses: Record<string, string> = {};
  for (const id of personaIds) {
    const file = path.join(folder, `${id}.json`);
    try {
      await access(file);
      statuses[id] = "exists_not_overwritten";
      continue;
    } catch {}
    try {
      const p = await loadPersona(id);
      const result = await runRecommendation(p.profile, version, { market });
      await writeFile(
        file,
        JSON.stringify({ personaId: id, synthetic: true, ...result }, null, 2),
        { flag: "wx" },
      );
      statuses[id] = "success";
    } catch {
      statuses[id] = "failed";
      process.exitCode = 1;
    }
  }
  await writeFile(
    path.join(folder, `manifest-${Date.now()}.json`),
    JSON.stringify(
      { version, synthetic: true, marketSnapshot: market.snapshotId, statuses },
      null,
      2,
    ),
    { flag: "wx" },
  );
  console.log(statuses);
}
