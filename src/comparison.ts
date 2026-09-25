import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  profileSchema,
  type RunResult,
  type MarketContext,
} from "./contracts.ts";
import { runRecommendation } from "./recommendation/engine.ts";
import { getVersion } from "./recommendation/registry.ts";
import { marketSource } from "./market-data/service.ts";
export const personaIds = Array.from(
  { length: 10 },
  (_, i) => `persona-${String(i + 1).padStart(2, "0")}`,
);
const fixtureSchema = z
  .object({
    fixtureSchemaVersion: z.literal("1.0"),
    id: z.string(),
    synthetic: z.literal(true),
    purpose: z.literal("software_regression_only_not_research"),
    context: z.record(z.string(), z.string()),
    profile: profileSchema,
  })
  .strict();
export async function loadPersona(id: string) {
  if (!personaIds.includes(id)) throw new Error("只允许固定合成测试画像");
  const fixture = fixtureSchema.parse(
    JSON.parse(
      await readFile(
        path.join(process.cwd(), "tests/personas", `${id}.json`),
        "utf8",
      ),
    ),
  );
  if (fixture.id !== id) throw new Error("画像 ID 不一致");
  return fixture;
}
const norm = (s: string) =>
  s.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
export function setDiff(left: string[], right: string[]) {
  const a = new Map(left.map((s) => [norm(s), s])),
    b = new Map(right.map((s) => [norm(s), s]));
  return {
    added: [...b].filter(([k]) => !a.has(k)).map(([, v]) => v),
    removed: [...a].filter(([k]) => !b.has(k)).map(([, v]) => v),
    common: [...a].filter(([k]) => b.has(k)).map(([, v]) => v),
    orderChanged:
      a.size === b.size &&
      [...a.keys()].every((k) => b.has(k)) &&
      JSON.stringify([...a.keys()]) !== JSON.stringify([...b.keys()]),
  };
}
export function diffRuns(left: RunResult, right: RunResult) {
  const collect = (run: RunResult) => ({
    industries: run.result.industries.map((i) => i.name),
    jobs: run.result.industries.flatMap((i) =>
      i.jobFunctions.map((j) => `${i.name} / ${j.name}`),
    ),
    skills: run.result.industries.flatMap((i) =>
      i.jobFunctions.flatMap((j) =>
        j.skills.map((s) => `${i.name} / ${j.name} / ${s.skill} [${s.status}]`),
      ),
    ),
    limitations: [
      ...run.result.overallLimitations,
      ...run.result.industries.flatMap((i) => [
        ...i.rationale.limitations,
        ...i.rationale.assumptions,
        i.rationale.userInference,
        ...i.jobFunctions.flatMap((j) => [
          ...j.rationale.limitations,
          ...j.rationale.assumptions,
          j.rationale.userInference,
          ...j.skills.flatMap((s) => [
            ...s.rationale.limitations,
            ...s.rationale.assumptions,
          ]),
        ]),
      ]),
    ],
  });
  const a = collect(left),
    b = collect(right);
  return {
    industries: setDiff(a.industries, b.industries),
    jobFunctions: setDiff(a.jobs, b.jobs),
    skills: setDiff(a.skills, b.skills),
    uncertaintyWording: setDiff(a.limitations, b.limitations),
  };
}
export type Side =
  { status: "success"; run: RunResult } | { status: "failed"; error: string };
export async function comparePersona(id: string, left: string, right: string) {
  getVersion(left);
  getVersion(right);
  const p = await loadPersona(id);
  const market: MarketContext = await marketSource.load("initial");
  async function side(version: string): Promise<Side> {
    try {
      return {
        status: "success",
        run: await runRecommendation(p.profile, version, { market }),
      };
    } catch {
      return {
        status: "failed",
        error: "该版本调用失败，请检查模型配置或重试；没有生成替代结果。",
      };
    }
  }
  const a = await side(left),
    b = await side(right);
  return {
    personaId: id,
    synthetic: true,
    context: p.context,
    left: a,
    right: b,
    diff:
      a.status === "success" && b.status === "success"
        ? diffRuns(a.run, b.run)
        : null,
    limitations: [
      "软件回归画像不是实际调研；学校层次标签未发送给模型。",
      "模型参数固定，但单次差异不证明逻辑改进。",
    ],
  };
}
