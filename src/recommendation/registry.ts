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
    limitations: ["无 Beta 数据；基于既有访谈和产品原则的未验证草案。"],
  },
});
export type Version = keyof typeof versions;
export const defaultVersion: Version = "v3";

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
