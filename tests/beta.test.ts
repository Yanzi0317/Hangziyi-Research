import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { scrubText, scrub, scrubOrReject } from "../src/beta/anonymize.ts";
import { FileStore, MultiStore } from "../src/beta/store.ts";
import { recordRun, recordFeedback } from "../src/beta/record.ts";
import {
  betaContextSchema,
  consentVersion,
  feedbackRequestSchema,
} from "../src/beta/contracts.ts";
import { loadPersona } from "../src/comparison.ts";
import { runRecommendation } from "../src/recommendation/engine.ts";
import type { Recommendation } from "../src/contracts.ts";

const market = {
  snapshotId: "initial",
  status: "unavailable" as const,
  signals: [],
  limitations: [],
};
function output(): Recommendation {
  const r = {
    why: "我在腾讯科技有限公司做过实习，微信 abc_12345。",
    profileFields: ["skills"],
    marketSignalIds: [],
    researchFindingIds: [],
    marketTrend: null,
    userInference: "推断",
    assumptions: [],
    limitations: ["无"],
  };
  return {
    industries: ["甲", "乙", "丙"].map((name) => ({
      name,
      rationale: structuredClone(r),
      jobFunctions: [
        {
          name: "职能",
          rationale: structuredClone(r),
          examplePositions: ["岗位"],
          exampleCompanies: [],
          skills: [],
          taskChanges: [],
          workloadQuestions: [],
        },
      ],
    })),
    overallLimitations: ["测试"],
  };
}
const beta = () =>
  betaContextSchema.parse({
    participantId: "0f4c1d2e-1111-4222-8333-444455556666",
    consentVersion,
    consentedAt: new Date().toISOString(),
    language: "zh",
    cohort: "A",
  });

test("scrubbing removes contact details, links, names and organisations", () => {
  assert.equal(scrubText("邮箱 a.b+c@mail.example.com"), "邮箱 [已删除邮箱]");
  assert.equal(scrubText("电话13812345678。"), "电话[已删除电话]。");
  assert.equal(scrubText("身份证11010119900101123X"), "身份证[已删除证件号]");
  assert.equal(scrubText("微信：abc_12345 联系"), "[已删除联系方式] 联系");
  assert.equal(
    scrubText("我叫王小明，在北京字节跳动科技有限公司实习"),
    "[已删除姓名]，在[某机构]实习",
  );
  assert.equal(
    scrubText("毕业于清华大学，做过 Alibaba Group 的项目"),
    "毕业于[某机构]，做过 [organisation removed] 的项目",
  );
  assert.equal(
    scrubText("没考虑我在宝洁公司做活动的经验"),
    "没考虑我在[某机构]做活动的经验",
  );
  assert.equal(
    scrubText("在中国银行和某互联网公司实习过"),
    "在[某机构]和[某机构]实习过",
  );
  assert.equal(scrubText("我在华为技术有限公司工作"), "我在[某机构]工作");
  // A bare generic word without a name in front of it stays as it is.
  assert.equal(scrubText("我们公司不允许用 AI"), "我们公司不允许用 AI");
  assert.equal(scrubText("曾在一家有限公司"), "曾在[某机构]");
  assert.equal(
    scrubText("见 https://example.com/x 页面"),
    "见 [已删除链接] 页面",
  );
  // Ordinary text is untouched.
  assert.equal(
    scrubText("做过半年数据分析实习，熟悉 SQL"),
    "做过半年数据分析实习，熟悉 SQL",
  );
  assert.deepEqual(scrub({ a: ["x@y.io"], b: 1 }), {
    a: ["[已删除邮箱]"],
    b: 1,
  });
  assert.equal(scrubOrReject("普通").length, 2);
});

test("run and feedback records are stored scrubbed and joined by recordId", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "beta-"));
  const store = new FileStore(dir);
  const { profile } = await loadPersona("persona-02");
  const run = await runRecommendation(
    {
      ...profile,
      experience: "在阿里巴巴集团实习，导师是 Zhang Wei Ltd 的顾问",
    },
    "v1",
    { market, generator: async () => output() },
  );
  const status = await recordRun(
    run,
    {
      ...profile,
      experience: "在阿里巴巴集团实习，导师是 Zhang Wei Ltd 的顾问",
    },
    beta(),
    undefined,
    store,
  );
  assert.equal(status.stored, true);
  const raw = await readFile(path.join(dir, "run.jsonl"), "utf8");
  assert.ok(!raw.includes("阿里巴巴"));
  assert.ok(!raw.includes("Zhang Wei"));
  assert.ok(!raw.includes("abc_12345"));
  assert.ok(!raw.includes("腾讯"));
  assert.ok(raw.includes('"cohort":"A"'));
  assert.ok(raw.includes('"version":"v1"'));
  const fb = await recordFeedback(
    {
      recordId: status.recordId,
      participantId: beta().participantId,
      answers: {
        mostUseful: "第二个方向",
        leastReasonable: "第三个",
        ignoredBackground: "没有考虑我在华为技术有限公司的经历",
        trust: "partly",
        trustReason: "缺少市场数据",
        oneChange: "加入薪资范围",
      },
    },
    store,
  );
  assert.equal(fb.stored, true);
  const all = await store.readAll();
  assert.equal(all.length, 2);
  const f = all.find((r) => r.kind === "feedback")!;
  assert.equal(f.kind, "feedback");
  assert.ok(!JSON.stringify(f).includes("华为"));
  // Feedback for an unknown run or a different participant is refused.
  await assert.rejects(
    () =>
      recordFeedback(
        {
          recordId: "0f4c1d2e-9999-4222-8333-444455556666",
          participantId: beta().participantId,
          answers: f.answers,
        },
        store,
      ),
    /找不到/,
  );
  await assert.rejects(
    () =>
      recordFeedback(
        {
          recordId: status.recordId,
          participantId: "0f4c1d2e-1111-4222-8333-000000000000",
          answers: f.answers,
        },
        store,
      ),
    /不一致/,
  );
  // MultiStore reads from its file member.
  assert.equal((await new MultiStore([store]).readAll()).length, 2);
});

test("records are refused when collection is off or consent is malformed", async () => {
  const { profile } = await loadPersona("persona-03");
  const run = await runRecommendation(profile, "v1", {
    market,
    generator: async () => output(),
  });
  const off = await recordRun(run, profile, beta(), undefined, null);
  assert.equal(off.stored, false);
  assert.equal(
    betaContextSchema.safeParse({ ...beta(), consentVersion: "old" }).success,
    false,
  );
  assert.equal(
    betaContextSchema.safeParse({ ...beta(), participantId: "abc" }).success,
    false,
  );
  assert.equal(
    feedbackRequestSchema.safeParse({
      recordId: beta().participantId,
      participantId: beta().participantId,
      answers: { mostUseful: "x" },
    }).success,
    false,
  );
  await assert.rejects(() => recordFeedback({}, null), /关闭/);
});
