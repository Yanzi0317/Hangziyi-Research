import { mkdir, writeFile } from "node:fs/promises";
import { comparePersona, personaIds } from "../src/comparison.ts";
const args = process.argv.slice(2);
const arg = (name: string, fallback: string) =>
  args[args.indexOf(name) + 1] ?? fallback;
const left = args.includes("--left") ? arg("--left", "v1") : "v1",
  right = args.includes("--right") ? arg("--right", "v3") : "v3";
const ids = args.includes("--all")
  ? personaIds
  : [
      args.includes("--persona")
        ? arg("--persona", "persona-01")
        : "persona-01",
    ];
if (args.includes("--dry-run")) {
  console.log(
    JSON.stringify({
      ids,
      left,
      right,
      model: process.env.LLM_MODEL ?? "not configured",
      calls: ids.length * 2,
      synthetic: true,
      marketSnapshot: "initial",
    }),
  );
} else {
  if (!process.env.LLM_API_KEY)
    throw new Error("LLM_API_KEY 未配置，不会生成模拟输出");
  const folder = `work/comparisons/${Date.now()}`;
  await mkdir(folder, { recursive: true });
  for (const id of ids) {
    const r = await comparePersona(id, left, right);
    await writeFile(`${folder}/${id}.json`, JSON.stringify(r, null, 2), {
      flag: "wx",
    });
    if (!r.diff) process.exitCode = 1;
  }
  console.log(`对比保存至 ${folder}`);
}
