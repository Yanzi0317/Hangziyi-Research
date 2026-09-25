import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { z } from "zod";
import {
  profileSchema,
  resultSchema,
  type MarketContext,
  type RunResult,
} from "../contracts.ts";
import { containsDirectContact } from "../privacy.ts";
import { generate, type Generator } from "../llm/client.ts";
import { getVersion } from "./registry.ts";
import { marketSource } from "../market-data/service.ts";
import { loadApprovedSurvey } from "../research/survey-context.ts";
import {
  predictScenarios,
  type ScenarioInput,
} from "../prediction/scenario.ts";
import {
  sanitize,
  validateReferences,
  outputPolicyVersion,
} from "../postprocess/policy.ts";

export const hash = (data: unknown) =>
  createHash("sha256").update(JSON.stringify(data)).digest("hex");
export async function runRecommendation(
  input: unknown,
  version: string,
  options: {
    market?: MarketContext;
    generator?: Generator;
    scenario?: ScenarioInput;
  } = {},
): Promise<RunResult> {
  const profile = profileSchema.parse(input);
  if (containsDirectContact(profile))
    throw new Error("请先移除联系方式或身份证信息。");
  const entry = getVersion(version);
  const scenarioForecast =
    entry.version === "v3.2"
      ? predictScenarios(profile, options.scenario)
      : undefined;
  const market = options.market ?? (await marketSource.load("initial"));
  // Historical versions remain pinned to their original context. Only the new
  // revision can read an explicitly approved survey; local quarantine is never read.
  const survey =
    "surveyDatasetId" in entry
      ? await loadApprovedSurvey(entry.surveyDatasetId)
      : null;
  const researchIds = [
    ...entry.researchIds,
    ...(survey?.findings.map((f) => f.id) ?? []),
  ];
  const researchLimitations = [
    ...entry.limitations,
    ...(scenarioForecast?.evidence.limitations ?? []),
    ...(survey?.limitations ?? []),
  ];
  const files =
    entry.version === "v1"
      ? ["v1"]
      : entry.version === "v3.1"
        ? ["v1", "v3", "v3.1"]
        : ["v1", entry.version];
  const prompt = (
    await Promise.all(
      files.map((v) =>
        readFile(
          path.join(process.cwd(), "src/recommendation", v, "system-prompt.md"),
          "utf8",
        ),
      ),
    )
  ).join("\n\n");
  const schema = z.toJSONSchema(resultSchema);
  const system = `${prompt}\n输出必须符合以下 JSON Schema：\n${JSON.stringify(schema)}`;
  const request = {
    profile,
    market,
    researchRecords: [
      ...(scenarioForecast
        ? scenarioForecast.evidence.findings.map((f) => ({
            ...f,
            type: "qualitative_interview",
            source: scenarioForecast.evidence.source,
            sampleSize: scenarioForecast.evidence.sampleSize,
            collectedAt: scenarioForecast.evidence.collectedAt,
            region: scenarioForecast.evidence.region,
          }))
        : entry.researchIds.map((id) => ({
            id,
            type: "qualitative_interview",
            limitations: entry.limitations,
          }))),
      ...(survey?.findings ?? []),
    ],
    ...(survey
      ? {
          surveyContext: {
            datasetId: survey.datasetId,
            sampleSize: survey.sampleSize,
            date: survey.surveyDate,
            region: survey.region,
          },
        }
      : {}),
    researchLimitations,
    ...(scenarioForecast ? { scenarioForecast } : {}),
  };
  const call = options.generator ?? generate;
  let final: ReturnType<typeof sanitize> | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    // Network errors do not trigger a paid format-repair retry.
    const raw = await call(
      system,
      attempt
        ? {
            ...request,
            repair:
              "上次输出未通过结构或证据检查。请按 schema 重写；不要虚构引用。",
          }
        : request,
    );
    try {
      const result = resultSchema.parse(raw);
      validateReferences(result, profile, market, researchIds);
      if (
        scenarioForecast &&
        result.industries.some(
          (i) =>
            !i.jobFunctions.some((j) =>
              j.rationale.researchFindingIds.some((id) =>
                id.startsWith("DOCINT-"),
              ),
            ),
        )
      )
        throw new Error("每个方向需解释相关访谈依据");
      if (
        scenarioForecast &&
        !result.industries.some((i) =>
          [
            i.rationale,
            ...i.jobFunctions.flatMap((j) => [
              j.rationale,
              ...j.skills.map((s) => s.rationale),
            ]),
          ].some((r) =>
            r.researchFindingIds.some((id) => id.startsWith("SURVEY-")),
          ),
        )
      )
        throw new Error("缺少问卷依据的具体解释");
      final = sanitize(result);
      resultSchema.parse(final.result);
      validateReferences(final.result, profile, market, researchIds);
      if (containsDirectContact(final.result))
        throw new Error("输出含身份信息");
      break;
    } catch {
      if (attempt === 1)
        throw new Error("生成内容未通过结构、隐私或证据检查，请重试。");
    }
  }
  if (!final) throw new Error("没有可展示的生成结果");
  return {
    result: final.result,
    ...(scenarioForecast ? { scenarioForecast } : {}),
    market,
    meta: {
      version: entry.version,
      promptVersion: entry.promptVersion,
      promptHash: hash(prompt),
      inputHash: hash(profile),
      model: options.generator
        ? "injected-test-generator"
        : process.env.LLM_MODEL!,
      generatedAt: new Date().toISOString(),
      outputPolicyVersion,
      researchIds,
      researchLimitations,
      ...(survey
        ? {
            survey: {
              datasetId: survey.datasetId,
              contextHash: hash(survey),
              sampleSize: survey.sampleSize,
              date: survey.surveyDate,
              region: survey.region,
              findings: survey.findings,
            },
          }
        : {}),
      runtimeMode: options.generator ? "mock_test" : "live",
      adjusted: final.adjusted,
      ...(scenarioForecast ? { scenarioHash: hash(scenarioForecast) } : {}),
    },
  };
}
