import { createHash } from "node:crypto";

export type Cell = { label: string; count: number; reportedPercent: number };
export type Question = {
  id: string;
  title: string;
  kind: "single" | "multiple" | "matrix" | "scale" | "open";
  statedN: number | null;
  options: Cell[];
  rows: { label: string; cells: Cell[] }[];
  reportedMean: number | null;
  reportedNps: number | null;
};
export type AuditIssue = {
  code: string;
  questionIds: string[];
  severity: "blocker" | "limitation";
  message: string;
};
const clean = (s: string) =>
  s
    .replace(/^○\s*/, "")
    .replace(/[\uE000-\uF8FF]/g, "")
    .trim();
export function parseSurvey(source: string) {
  const questions: Question[] = [];
  const blocks = source
    .replace(/\r\n/g, "\n")
    .split(/(?=^Q\d+\s)/m)
    .filter((b) => /^Q\d+\s/.test(b));
  for (const block of blocks) {
    const lines = block.trim().split("\n");
    const header = lines[0];
    const id = header.match(/^Q\d+/)![0];
    const kind: Question["kind"] = header.includes("矩阵")
      ? "matrix"
      : header.includes("多选题")
        ? "multiple"
        : header.includes("量表题")
          ? "scale"
          : header.includes("填空题")
            ? "open"
            : "single";
    const question: Question = {
      id,
      title: header.replace(/^Q\d+\s*/, ""),
      kind,
      statedN: null,
      options: [],
      rows: [],
      reportedMean: null,
      reportedNps: null,
    };
    let columns: string[] = [];
    for (const line of lines.slice(1)) {
      const cells = line.split("\t").map(clean);
      if (line.startsWith("本题有效填写人次")) {
        question.statedN = Number(cells[1]);
        continue;
      }
      if (line.startsWith("本题平均分")) {
        question.reportedMean = Number(
          line.match(/平均分[：:]\s*([\d.]+)/)?.[1],
        );
        question.reportedNps = Number(
          line.match(/NPS值[：:]\s*(-?[\d.]+)/)?.[1],
        );
        continue;
      }
      if (line.startsWith("题目\\选项")) {
        columns = cells.slice(1);
        continue;
      }
      if (
        kind === "matrix" &&
        columns.length &&
        cells.length === columns.length + 1
      ) {
        const matches = cells
          .slice(1)
          .map((c) => c.match(/^(\d+)\(([\d.]+)%\)$/));
        if (matches.every(Boolean)) {
          question.rows.push({
            label: cells[0],
            cells: matches.map((m, i) => ({
              label: columns[i],
              count: Number(m![1]),
              reportedPercent: Number(m![2]),
            })),
          });
          continue;
        }
      }
      if (
        kind !== "matrix" &&
        cells.length >= 3 &&
        /^\d+$/.test(cells[1]) &&
        /^\d+(\.\d+)?%$/.test(cells[2])
      )
        question.options.push({
          label: cells[0],
          count: Number(cells[1]),
          reportedPercent: parseFloat(cells[2]),
        });
    }
    questions.push(question);
  }
  if (!questions.length) throw new Error("没有识别到问卷题目；未写入数据。");
  const issues: AuditIssue[] = [];
  const add = (
    code: string,
    questionIds: string[],
    severity: AuditIssue["severity"],
    message: string,
  ) => issues.push({ code, questionIds, severity, message });
  if (new Set(questions.map((q) => q.id)).size !== questions.length)
    add("duplicate_questions", [], "blocker", "题目 ID 重复。");
  for (const q of questions) {
    if (q.kind !== "open" && !q.options.length && !q.rows.length)
      add(
        "unparsed_question",
        [q.id],
        "blocker",
        "未识别到完整选项，需人工检查。",
      );
    const groups =
      q.kind === "matrix" ? q.rows.map((r) => r.cells) : [q.options];
    for (const options of groups) {
      if (!options.length) continue;
      const sum = options.reduce((n, o) => n + o.count, 0);
      const n = q.statedN ?? (q.kind === "matrix" ? sum : null);
      if (n !== null) {
        if (q.kind !== "multiple" && sum !== n)
          add(
            "count_mismatch",
            [q.id],
            "blocker",
            "单选或矩阵行计数与分母不一致。",
          );
        if (
          options.some(
            (o) =>
              o.count > n ||
              Math.abs((o.count / n) * 100 - o.reportedPercent) > 0.011,
          )
        )
          add(
            "percentage_mismatch",
            [q.id],
            "blocker",
            "计数与报告百分比不一致。",
          );
      }
    }
    if (
      q.kind === "scale" &&
      q.options.length === 11 &&
      q.statedN &&
      q.reportedMean !== null
    ) {
      const mean =
        q.options.reduce((n, o, i) => n + i * o.count, 0) / q.statedN;
      if (Math.abs(mean - q.reportedMean) > 0.011)
        add("mean_mismatch", [q.id], "blocker", "报告均值与选项计数不一致。");
    }
  }
  const consent = questions.find((q) => q.id === "Q7");
  const yes = consent?.options.find((o) => o.label === "是")?.count ?? null;
  const no = consent?.options.find((o) => o.label === "否")?.count ?? null;
  if (no === null || no > 0)
    add(
      "consent_scope_unconfirmed",
      ["Q7"],
      "blocker",
      "汇总包含拒绝参与选项，其他题目是否排除了未同意者尚未确认。不得从边际分布自行扣除人数。",
    );
  const frequency = questions.find((q) => q.id === "Q11");
  const never = frequency?.options.find((o) =>
    o.label.includes("几乎从不"),
  )?.count;
  const eligible =
    frequency?.statedN !== null &&
    frequency?.statedN !== undefined &&
    never !== undefined
      ? frequency.statedN - never
      : null;
  const changes = questions.find((q) => q.id === "Q25");
  if (
    changes &&
    eligible !== null &&
    changes.rows.some(
      (row) => row.cells.reduce((n, c) => n + c.count, 0) !== eligible,
    )
  )
    add(
      "skip_logic_mismatch",
      ["Q11", "Q25"],
      "blocker",
      `Q25 声明仅非“几乎从不”者回答，按 Q11 应为 ${eligible} 人，但矩阵行合计不一致。`,
    );
  add(
    "marginals_only",
    [],
    "limitation",
    "仅有边际汇总，无交叉表或个体链接；不能判断学历、城市、行业或公司规模与AI使用、资源和职业预期的关联。",
  );
  add(
    "unknown_sampling",
    [],
    "limitation",
    "调查日期、招募方法、抽样框与覆盖范围未提供；不能代表全国劳动力市场或用作个人预测模型。",
  );
  add(
    "multiple_choice",
    ["Q14", "Q18", "Q23"],
    "limitation",
    "多选题比例是按人次计算，可超过100%；无法从汇总核验“以上都没有”与其他选项是否互斥。",
  );
  add(
    "different_buckets",
    ["Q12", "Q24"],
    "limitation",
    "两道任务占比题区间不同，不合并、不视作重复独立证据。",
  );
  add(
    "eligibility_unknown",
    ["Q11", "Q23"],
    "limitation",
    "AI任务多选的答题资格与频率题关系不明，不能据此反推使用者数量。",
  );
  add(
    "perception_not_probability",
    ["Q19", "Q20"],
    "limitation",
    "0–10分是受访者主观预期，不是校准概率；平台自动NPS不适用于职业风险推断。",
  );
  add(
    "self_report_not_skill_test",
    ["Q26", "Q27", "Q28", "Q29"],
    "limitation",
    "重要性变化、自我能力与态度量表是不同构念，不得合并为能力分数或因果结论。",
  );
  const open = questions.find((q) => q.id === "Q30");
  if (open && !open.options.length)
    add(
      "open_answers_absent",
      ["Q30"],
      "limitation",
      "未提供开放题作答，不生成引文或主题。",
    );
  return {
    schemaVersion: "1.0",
    datasetId: "survey-49-v1",
    sourceType: "user_supplied_aggregate_questionnaire",
    sourceHash: createHash("sha256").update(source).digest("hex"),
    surveyDate: null,
    region: "中国境内（问卷筛选描述，抽样覆盖未知）",
    samplingMethod: null,
    reportedN: consent?.statedN ?? null,
    consent: { yes, no, status: "unconfirmed" },
    reviewStatus: "quarantined",
    approvedForRecommendation: false,
    approvedForPublication: false,
    questions,
    issues,
  };
}
