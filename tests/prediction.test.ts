import { test } from "node:test";
import assert from "node:assert/strict";
import { loadPersona } from "../src/comparison.ts";
import {
  predictScenarios,
  scenarioInputSchema,
} from "../src/prediction/scenario.ts";
import { reviewedSurvey } from "../src/research/reviewed-survey.ts";
import { loadApprovedSurvey } from "../src/research/survey-context.ts";
import { runRecommendation } from "../src/recommendation/engine.ts";
import { prohibited } from "../src/postprocess/policy.ts";
import type { Recommendation } from "../src/contracts.ts";

test("approved aggregate retains 49 without scaling; Q25 and expectations excluded", async () => {
  const s = await loadApprovedSurvey(reviewedSurvey.datasetId);
  assert.equal(s.sampleSize, 49);
  assert.equal(s.consentScope, "consented_responses_only");
  assert.ok(s.reviewNote.includes("记录有误"));
  assert.ok(s.findings.every((f) => f.denominator === 49));
  assert.ok(
    s.findings.every(
      (f) => !f.questionIds.some((q) => ["Q25", "Q19", "Q20"].includes(q)),
    ),
  );
  assert.ok(
    s.findings
      .find((f) => f.id === "SURVEY-CONFIDENCE")!
      .statement.includes("21人（42.86%）"),
  );
});
test("unknown conditions remain unknown and rules are deterministic", async () => {
  const { profile } = await loadPersona("persona-01");
  const f = predictScenarios(profile);
  assert.deepEqual(f, predictScenarios(profile));
  assert.equal(f.missingInformation.length, 3);
  assert.ok(
    !f.scenarios.some((s) => s.id === "SC-TASK" || s.id === "SC-LEARNING"),
  );
  assert.throws(() => scenarioInputSchema.parse({ task: "guessed" }));
  assert.throws(() => scenarioInputSchema.parse({ gender: "male" }));
});
test("task/resource/learning selections change predictions without demographic shortcuts", async () => {
  const { profile } = await loadPersona("persona-01");
  const context = {
    task: "creative",
    resources: "limited",
    learningPath: "building",
  };
  const f = predictScenarios(profile, context);
  assert.ok(f.scenarios.some((s) => s.id === "SC-VALUE"));
  assert.ok(f.scenarios.some((s) => s.id === "SC-LEARNING"));
  const changed = predictScenarios(
    {
      ...profile,
      ageRange: "50+",
      education: "doctorate",
      locationPreference: ["未指定"],
      experienceYears: 20,
    },
    context,
  );
  assert.deepEqual(f, changed);
  assert.notDeepEqual(
    f,
    predictScenarios(profile, { ...context, resources: "available" }),
  );
});
test("all prediction text has traceable references, alternatives, no scores", async () => {
  const { profile } = await loadPersona("persona-01");
  const f = predictScenarios(
    { ...profile, aiUseExperience: "build_tools" },
    { task: "creative", learningPath: "building", resources: "limited" },
  );
  const ids = new Set(
    [...f.evidence.findings, ...f.survey.findings].map((s) => s.id),
  );
  for (const s of f.scenarios) {
    assert.ok(s.evidenceIds.every((id) => ids.has(id)));
    assert.ok(s.condition && s.alternative && s.verification && s.limitation);
    assert.equal(prohibited(s.prediction), false);
    assert.equal(/\d+%|\d+\/10/.test(s.prediction), false);
  }
  assert.ok(f.scenarios.some((s) => s.id === "SC-WORKLOAD"));
  assert.equal(f.evidence.sampleSize, 6);
  assert.equal(f.survey.sampleSize, 49); // Not 55 independent survey respondents.
});
function output(): Recommendation {
  const rationale = {
    why: "访谈指出核验责任，问卷自评仅用于提示实际验证，不证明个人缺少能力。",
    profileFields: ["aiUseExperience"],
    marketSignalIds: [],
    researchFindingIds: ["DOCINT-03", "SURVEY-CONFIDENCE"],
    marketTrend: null,
    userInference: "若使用AI处理工作，可先验证核验能力。",
    assumptions: ["任务允许使用工具"],
    limitations: ["没有个人能力测验或市场预测。"],
  };
  return {
    industries: ["合同测试甲", "合同测试乙", "合同测试丙"].map((name) => ({
      name,
      rationale,
      jobFunctions: [
        {
          name: "测试职能",
          rationale,
          examplePositions: ["测试岗位"],
          exampleCompanies: [],
          skills: [],
          taskChanges: [],
          workloadQuestions: [],
        },
      ],
    })),
    overallLimitations: ["仅为测试桩，不是真实模型输出或研究结论。"],
  };
}
test("v3.2 injects actual reviewed evidence and stores reproducible scenario metadata", async () => {
  const { profile } = await loadPersona("persona-01");
  const run = await runRecommendation(profile, "v3.2", {
    scenario: scenarioInputSchema.parse({ task: "information" }),
    market: {
      snapshotId: "initial",
      status: "unavailable",
      signals: [],
      limitations: [],
    },
    generator: async (_system, request) => {
      const r = request as {
        researchRecords: { id: string; statement: string }[];
      };
      assert.ok(
        r.researchRecords
          .find((f) => f.id === "SURVEY-CONFIDENCE")
          ?.statement.includes("21人"),
      );
      assert.ok(r.researchRecords.find((f) => f.id === "DOCINT-03")?.statement);
      return output();
    },
  });
  assert.equal(run.scenarioForecast?.context.task, "information");
  assert.equal(run.meta.survey?.sampleSize, 49);
  assert.ok(run.meta.scenarioHash);
  assert.equal(run.meta.runtimeMode, "mock_test");
});
test("new version rejects decorative forecasts without research-linked advice", async () => {
  const { profile } = await loadPersona("persona-01");
  let calls = 0;
  await assert.rejects(() =>
    runRecommendation(profile, "v3.2", {
      generator: async () => {
        calls++;
        const o = output();
        for (const i of o.industries) {
          i.rationale.researchFindingIds = [];
          i.jobFunctions[0].rationale.researchFindingIds = [];
        }
        return o;
      },
    }),
  );
  assert.equal(calls, 2);
});
