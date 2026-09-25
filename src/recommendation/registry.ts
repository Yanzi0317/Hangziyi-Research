export const versions = Object.freeze({
  v1: {
    version: "v1",
    promptVersion: "v1.0",
    status: "implemented",
    runnable: true,
    researchIds: [] as string[],
    limitations: ["仅使用画像、模型背景知识和人工市场快照。"],
  },
  v2: {
    version: "v2",
    promptVersion: "v2.0",
    status: "awaiting_survey",
    runnable: true,
    researchIds: [] as string[],
    limitations: [
      "问卷数据尚未提供；本版没有调查驱动规则，不得解释为已验证改进。",
    ],
  },
  v3: {
    version: "v3",
    promptVersion: "v3.0",
    status: "implemented",
    runnable: true,
    researchIds: ["INT-01", "INT-02", "INT-03", "INT-04", "INT-05"],
    limitations: ["用户提供的五条定性访谈结论，日期、地区、样本与方法未知。"],
  },
  v4: {
    version: "v4",
    promptVersion: "v4.0-draft.1",
    status: "draft",
    runnable: true,
    researchIds: ["INT-01", "INT-02", "INT-03", "INT-04", "INT-05"],
    limitations: ["Beta 反馈尚未分析；基于既有访谈和产品原则的未验证草案。"],
  },
  "v3.1": {
    version: "v3.1",
    promptVersion: "v3.1.0-survey",
    status: "awaiting_survey_review",
    runnable: true,
    surveyDatasetId: "survey-49-v1",
    researchIds: ["INT-01", "INT-02", "INT-03", "INT-04", "INT-05"],
    limitations: [
      "问卷仅在同意范围及统计口径审核通过后使用；未获批时阻止模型调用。",
    ],
  },
  "v3.2": {
    version: "v3.2",
    promptVersion: "v3.2.0-scenarios",
    status: "exploratory_scenarios",
    runnable: true,
    surveyDatasetId: "survey-49-reviewed-2026-09",
    researchIds: [
      "DOCINT-01",
      "DOCINT-02",
      "DOCINT-03",
      "DOCINT-04",
      "DOCINT-05",
      "DOCINT-06",
      "DOCINT-07",
    ],
    limitations: [
      "49份问卷描述性汇总与六人访谈支持的条件性情景预测，未经过结局回测；Q25排除。",
    ],
  },
});
export type Version = keyof typeof versions;
export const defaultVersion: Version = "v3.2";

export function listVersions() {
  return Object.values(versions);
}

export function getVersion(version: string) {
  if (version === "v1.0") version = "v1";
  if (!Object.hasOwn(versions, version)) {
    throw new Error(`Unknown recommendation version: ${version}`);
  }
  return versions[version as keyof typeof versions];
}

export function requireRunnableVersion(version: string) {
  const entry = getVersion(version);
  return entry;
}

// Every runnable version can be handed to real Beta testers; the stored
// record carries the version and prompt hash so feedback can be compared.
export function listBetaVersions() {
  return listVersions().filter((v) => v.runnable);
}
