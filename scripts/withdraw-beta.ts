import { readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { defaultStorageDir } from "../src/beta/store.ts";

// Usage: pnpm withdraw:beta <participant code or full id> [--dir data/beta-records]
// Removes every run and feedback record of that participant. A participant
// only needs the first 8 characters of their code. Original files are kept
// as *.bak-<timestamp> so the removal can be audited, then should be deleted.
const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith("--"));
if (!target || !/^[0-9a-f-]{8,36}$/i.test(target))
  throw new Error("请提供参与者编号（至少前 8 位）。");
const dir = path.resolve(
  args.includes("--dir")
    ? args[args.indexOf("--dir") + 1]
    : defaultStorageDir(),
);
let removed = 0;
for (const kind of ["run", "feedback"]) {
  const file = path.join(dir, `${kind}.jsonl`);
  let raw: string;
  try {
    raw = await readFile(file, "utf8");
  } catch {
    continue;
  }
  const kept: string[] = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    const r = JSON.parse(line) as { participantId: string };
    if (r.participantId.toLowerCase().startsWith(target.toLowerCase()))
      removed++;
    else kept.push(line);
  }
  await rename(file, `${file}.bak-${Date.now()}`);
  await writeFile(file, kept.length ? kept.join("\n") + "\n" : "", {
    mode: 0o600,
  });
}
console.log(`已移除 ${removed} 条记录；备份文件核对后请删除。`);
