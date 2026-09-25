import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSurvey } from "../src/research/import-survey.ts";
import {
  approvedSurveySchema,
  loadApprovedSurvey,
} from "../src/research/survey-context.ts";
import { runRecommendation } from "../src/recommendation/engine.ts";
import { loadPersona } from "../src/comparison.ts";

// Tiny artificial table for parser unit tests, not participant data or findings.
const table = [
  "Q7 同意?[单选题]",
  "选项\t小计\t比例",
  "是\t2\t66.67%",
  "否\t1\t33.33%",
  "本题有效填写人次\t3",
  "Q11 频率[单选题]",
  "几乎从不\t1\t33.33%",
  "每周几次\t2\t66.67%",
  "本题有效填写人次\t3",
  "Q14 资源[多选题]",
  "资源A\t2\t66.67%",
  "资源B\t2\t66.67%",
  "本题有效填写人次\t3",
  "Q25 仅非从不者回答[矩阵单选题]",
  "题目\\选项\t1\t2\t3",
  "时间\t1(33.33%)\t1(33.33%)\t1(33.33%)",
  "Q30 开放题[填空题]",
  "详细作答情况",
].join("\n");

test("imports counts and matrix cells without turning multiple choice into a distribution", () => {
  const result = parseSurvey(table);
  assert.equal(result.questions.length, 5);
  assert.equal(result.questions.find((q) => q.id === "Q25")!.rows.length, 1);
  assert.equal(
    result.questions
      .find((q) => q.id === "Q14")!
      .options.reduce((n, o) => n + o.count, 0),
    4,
  );
  assert.equal(result.questions.find((q) => q.id === "Q30")!.options.length, 0);
  assert.equal(result.approvedForRecommendation, false);
  assert.equal(result.approvedForPublication, false);
  assert.ok(
    !result.issues.some(
      (i) => i.code === "count_mismatch" && i.questionIds.includes("Q14"),
    ),
  );
  assert.ok(result.issues.some((i) => i.code === "consent_scope_unconfirmed"));
  assert.ok(result.issues.some((i) => i.code === "skip_logic_mismatch"));
});
test("rounding is tolerated but inconsistent percentages and empty import are blocked", () => {
  assert.ok(
    !parseSurvey(table).issues.some((i) => i.code === "percentage_mismatch"),
  );
  assert.ok(
    parseSurvey(table.replace("是\t2\t66.67%", "是\t2\t99%")).issues.some(
      (i) => i.code === "percentage_mismatch",
    ),
  );
  assert.throws(() => parseSurvey("not a questionnaire"));
});
test("quarantined import cannot satisfy the approved context schema", () => {
  assert.equal(
    approvedSurveySchema.safeParse(parseSurvey(table)).success,
    false,
  );
});
test("unknown or traversal dataset cannot load; pending revision never invokes model", async () => {
  await assert.rejects(() => loadApprovedSurvey("../quarantine"));
  await assert.rejects(() => loadApprovedSurvey("missing-fixture"), /尚未完成/);
  const { profile } = await loadPersona("persona-01");
  let calls = 0;
  await assert.rejects(
    () =>
      runRecommendation(profile, "v3.1", {
        market: {
          snapshotId: "initial",
          status: "unavailable",
          signals: [],
          limitations: [],
        },
        generator: async () => {
          calls++;
          return {};
        },
      }),
    /问卷尚未完成/,
  );
  assert.equal(calls, 0);
});
test("old versions do not read or receive the newly imported questionnaire", async () => {
  const { profile } = await loadPersona("persona-01");
  await assert.rejects(
    () =>
      runRecommendation(profile, "v3", {
        market: {
          snapshotId: "initial",
          status: "unavailable",
          signals: [],
          limitations: [],
        },
        generator: async (_prompt, request) => {
          const value = request as {
            researchRecords: { id: string }[];
            surveyContext?: unknown;
          };
          assert.equal(value.surveyContext, undefined);
          assert.equal(
            value.researchRecords.some((r) => r.id.startsWith("SURVEY-")),
            false,
          );
          throw new Error("intentional mock stop");
        },
      }),
    /intentional mock stop/,
  );
});
