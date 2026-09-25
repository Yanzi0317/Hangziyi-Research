import { test } from "node:test";
import assert from "node:assert/strict";
import {
  loadPersona,
  personaIds,
  setDiff,
  diffRuns,
} from "../src/comparison.ts";
import {
  profileSchema,
  resultSchema,
  type Recommendation,
} from "../src/contracts.ts";
import { getVersion, defaultVersion } from "../src/recommendation/registry.ts";
import { runRecommendation } from "../src/recommendation/engine.ts";
import { CuratedSource } from "../src/market-data/service.ts";
import {
  prohibited,
  sanitize,
  validateReferences,
} from "../src/postprocess/policy.ts";
import { containsDirectContact } from "../src/privacy.ts";
import { generate } from "../src/llm/client.ts";
import { authorize } from "../src/http.ts";
const market = {
  snapshotId: "initial",
  status: "unavailable" as const,
  signals: [],
  limitations: ["没有市场资料"],
};
// Contract fixture only. Not a saved model output or user research record.
function output(): Recommendation {
  const r = {
    why: "需要用实际成果验证方向。",
    profileFields: ["skills"],
    marketSignalIds: [],
    researchFindingIds: [],
    marketTrend: null,
    userInference: "已有自报技能可作为探索起点。",
    assumptions: [],
    limitations: ["缺少市场数据。"],
  };
  return {
    industries: ["行业甲", "行业乙", "行业丙"].map((name) => ({
      name,
      rationale: structuredClone(r),
      jobFunctions: [
        {
          name: "任务职能",
          rationale: structuredClone(r),
          examplePositions: ["岗位示例"],
          exampleCompanies: [],
          skills: [],
          taskChanges: [],
          workloadQuestions: [],
        },
      ],
    })),
    overallLimitations: ["仅用于协议测试。"],
  };
}
test("ten synthetic software fixtures validate; context stays separate", async () => {
  for (const id of personaIds) {
    const f = await loadPersona(id);
    assert.equal(f.synthetic, true);
    assert.ok(f.context.educationTier);
    assert.equal("educationTier" in f.profile, false);
    profileSchema.parse(f.profile);
  }
  await assert.rejects(() => loadPersona("../secret"));
});
test("profile numeric boundaries, normalization, contact check", async () => {
  const { profile: p } = await loadPersona("persona-01");
  assert.equal(
    profileSchema.safeParse({ ...p, experienceYears: -1 }).success,
    false,
  );
  assert.equal(
    profileSchema.safeParse({ ...p, experienceYears: 0.25 }).success,
    false,
  );
  assert.deepEqual(
    profileSchema.parse({ ...p, skills: [" SQL ", "sql"] }).skills,
    ["sql"],
  );
  assert.ok(containsDirectContact({ x: "test@example.com" }));
});
test("version selection is explicit; no beta research version claim", () => {
  assert.equal(defaultVersion, "v3.2");
  assert.equal(getVersion("v1.0").version, "v1");
  assert.equal(getVersion("v2").researchIds.length, 0);
  assert.throws(() => getVersion("__proto__"));
});
test("missing market snapshot is not substituted", async () => {
  const source = new CuratedSource();
  assert.equal((await source.load("initial")).status, "unavailable");
  await assert.rejects(() => source.load("../secret"));
  await assert.rejects(() => source.load("not-found"));
});
test("policy catches score/probability but preserves work durations", () => {
  for (const s of [
    "80% likely to be automated",
    "career score 7/10",
    "成功概率 0.8",
    "匹配度八成",
  ])
    assert.ok(prohibited(s), s);
  for (const s of ["完成10小时项目", "三年经验", "数据截至2026年"])
    assert.equal(prohibited(s), false);
  const o = output();
  o.overallLimitations = ["career score 7/10"];
  const x = sanitize(o);
  assert.equal(x.adjusted, true);
  assert.deepEqual(sanitize(x.result).result, x.result);
});
test("invalid citations and ungrounded trend rejected", async () => {
  const { profile } = await loadPersona("persona-01");
  const o = output();
  o.industries[0].rationale.marketSignalIds = ["made-up"];
  assert.throws(() => validateReferences(o, profile, market, []));
  o.industries[0].rationale.marketSignalIds = [];
  o.industries[0].rationale.marketTrend = "增长";
  assert.throws(() => validateReferences(o, profile, market, []));
});
test("engine runs all versions with mock only; one format repair maximum", async () => {
  const { profile } = await loadPersona("persona-01");
  for (const v of ["v1", "v2", "v3", "v4"]) {
    const r = await runRecommendation(profile, v, {
      market,
      generator: async () => output(),
    });
    assert.equal(r.meta.version, v);
    assert.equal(r.meta.runtimeMode, "mock_test");
    resultSchema.parse(r.result);
  }
  let n = 0;
  await assert.rejects(() =>
    runRecommendation(profile, "v1", {
      market,
      generator: async () => {
        n++;
        return {};
      },
    }),
  );
  assert.equal(n, 2);
});
test("network errors are not retried", async () => {
  const { profile } = await loadPersona("persona-01");
  let n = 0;
  await assert.rejects(() =>
    runRecommendation(profile, "v1", {
      market,
      generator: async () => {
        n++;
        throw new Error("network");
      },
    }),
  );
  assert.equal(n, 1);
});
test("diff separates order and exact wording without quality scores", async () => {
  assert.equal(setDiff(["a", "b"], ["b", "a"]).orderChanged, true);
  const { profile } = await loadPersona("persona-01");
  const a = await runRecommendation(profile, "v1", {
    market,
    generator: async () => output(),
  });
  const b = structuredClone(a);
  b.result.overallLimitations = ["不同的限制文字"];
  const d = diffRuns(a, b);
  assert.equal(d.industries.added.length, 0);
  assert.deepEqual(d.uncertaintyWording.added, ["不同的限制文字"]);
});

test("LLM wrapper uses server config, JSON mode and sanitized upstream errors", async () => {
  const previous = {
    key: process.env.LLM_API_KEY,
    base: process.env.LLM_BASE_URL,
    model: process.env.LLM_MODEL,
    fetch: globalThis.fetch,
  };
  try {
    delete process.env.LLM_API_KEY;
    await assert.rejects(() => generate("test", {}), /模型未配置/);
    process.env.LLM_API_KEY = "unit-test-only";
    process.env.LLM_BASE_URL = "https://example.invalid/v1";
    process.env.LLM_MODEL = "mock-model";
    globalThis.fetch = async (_url, init) => {
      assert.equal(
        JSON.parse(init!.body as string).response_format.type,
        "json_object",
      );
      return new Response(
        JSON.stringify({
          choices: [
            { finish_reason: "stop", message: { content: '{"ok":true}' } },
          ],
        }),
      );
    };
    assert.deepEqual(await generate("test", {}), { ok: true });
    globalThis.fetch = async () =>
      new Response("private-upstream-detail", { status: 401 });
    await assert.rejects(
      () => generate("test", {}),
      (e) =>
        e instanceof Error &&
        e.message.includes("401") &&
        !e.message.includes("private-upstream-detail"),
    );
  } finally {
    for (const [key, value] of Object.entries({
      LLM_API_KEY: previous.key,
      LLM_BASE_URL: previous.base,
      LLM_MODEL: previous.model,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    globalThis.fetch = previous.fetch;
  }
});
test("access key and cross-origin checks protect model endpoints", () => {
  const old = process.env.APP_ACCESS_KEY;
  process.env.APP_ACCESS_KEY = "test-access";
  try {
    authorize(
      new Request("http://localhost:3000/api/recommend", {
        headers: {
          host: "127.0.0.1:3000",
          origin: "http://127.0.0.1:3000",
          "x-access-key": "test-access",
        },
      }),
    );
    assert.throws(() =>
      authorize(new Request("https://app.invalid/api/recommend")),
    );
    assert.throws(() =>
      authorize(
        new Request("https://app.invalid/api/recommend", {
          headers: {
            origin: "https://other.invalid",
            "x-access-key": "test-access",
          },
        }),
      ),
    );
    authorize(
      new Request("https://app.invalid/api/recommend", {
        headers: {
          origin: "https://app.invalid",
          "x-access-key": "test-access",
        },
      }),
    );
  } finally {
    if (old === undefined) delete process.env.APP_ACCESS_KEY;
    else process.env.APP_ACCESS_KEY = old;
  }
});
