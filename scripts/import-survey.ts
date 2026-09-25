import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseSurvey } from "../src/research/import-survey.ts";

const input = process.argv[2];
if (!input)
  throw new Error(
    "用法：pnpm import:survey <汇总文本路径>。只导入本地隔离区，不发布或启用。",
  );
const parsed = parseSurvey(await readFile(input, "utf8"));
const folder = path.join(
  process.cwd(),
  "work",
  "research",
  `${parsed.datasetId}-${parsed.sourceHash.slice(0, 12)}`,
);
await mkdir(folder, { recursive: true });
const json = JSON.stringify(parsed, null, 2) + "\n";
const output = path.join(folder, "aggregate.json");
try {
  await writeFile(output, json, { flag: "wx" });
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  if ((await readFile(output, "utf8")) !== json)
    throw new Error("既有导入被修改，不覆盖。");
}
const report = [
  "# 问卷导入核对（本地隔离，尚未用于推荐）",
  "",
  `识别 ${parsed.questions.length} 道题；问卷报告 ${parsed.reportedN} 人次。`,
  `Q7：同意 ${parsed.consent.yes}，不同意 ${parsed.consent.no}。`,
  "原始计数与报告百分比分开保存。导入日期不替代调查日期。",
  "",
  ...parsed.issues.map(
    (i) =>
      `- ${i.severity === "blocker" ? "阻止启用" : "使用限制"} / ${i.questionIds.join(", ") || "整体"} / ${i.message}`,
  ),
  "",
  "需要仅含同意参与者的重新汇总或可核实的统计口径；不能从各题总数中机械减去拒绝者。Q25需单独核对跳题规则。",
  "没有开放题内容，无任何新增人物、访谈引文或 Beta 反馈。",
  "",
].join("\n");
try {
  await writeFile(path.join(folder, "audit.md"), report, { flag: "wx" });
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
}
console.log(
  JSON.stringify(
    {
      output,
      questionCount: parsed.questions.length,
      matrixRows: parsed.questions.reduce((n, q) => n + q.rows.length, 0),
      consent: parsed.consent,
      blockers: parsed.issues.filter((i) => i.severity === "blocker"),
      status: parsed.reviewStatus,
    },
    null,
    2,
  ),
);
