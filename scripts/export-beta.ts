import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { FileStore, defaultStorageDir } from "../src/beta/store.ts";
import { scrub } from "../src/beta/anonymize.ts";
import type { RunRecord, FeedbackRecord } from "../src/beta/contracts.ts";

// Usage: pnpm export:beta [--dir data/beta-records] [--out beta/feedback-exports]
// Writes beta-export-<timestamp>.json and .csv with one row per run, joined
// with its feedback (if any). Records are scrubbed again on the way out.
const args = process.argv.slice(2);
const opt = (name: string, fallback: string) =>
  args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const dir = path.resolve(opt("--dir", defaultStorageDir()));
const outDir = path.resolve(opt("--out", "beta/feedback-exports"));
const records = await new FileStore(dir).readAll();
const runs = records.filter((r): r is RunRecord => r.kind === "run");
const feedback = new Map(
  records
    .filter((r): r is FeedbackRecord => r.kind === "feedback")
    .map((f) => [f.recordId, f]),
);
const rows = runs.map((run) => {
  const f = feedback.get(run.recordId);
  return scrub({
    recordId: run.recordId,
    participantId: run.participantId,
    cohort: run.cohort ?? "",
    version: run.version,
    promptVersion: run.promptVersion,
    promptHash: run.promptHash,
    consentVersion: run.consentVersion,
    language: run.language,
    generatedAt: run.storedAt,
    ageRange: run.profile.ageRange,
    education: run.profile.education,
    major: run.profile.major,
    experienceYears: run.profile.experienceYears,
    industry: run.profile.industry,
    aiUseExperience: run.profile.aiUseExperience,
    locationPreference: run.profile.locationPreference.join("; "),
    skills: run.profile.skills.join("; "),
    experience: run.profile.experience,
    careerGoals: run.profile.careerGoals,
    scenarioTask: run.scenario?.task ?? "",
    scenarioResources: run.scenario?.resources ?? "",
    scenarioLearningPath: run.scenario?.learningPath ?? "",
    recommendedIndustries: run.result.industries.map((i) => i.name).join("; "),
    recommendedJobFunctions: run.result.industries
      .flatMap((i) => i.jobFunctions.map((j) => `${i.name} / ${j.name}`))
      .join("; "),
    skillGaps: run.result.industries
      .flatMap((i) =>
        i.jobFunctions.flatMap((j) =>
          j.skills.map((s) => `${s.skill} [${s.status}]`),
        ),
      )
      .join("; "),
    overallLimitations: run.result.overallLimitations.join(" | "),
    feedbackAt: f?.storedAt ?? "",
    q1_mostUseful: f?.answers.mostUseful ?? "",
    q2_leastReasonable: f?.answers.leastReasonable ?? "",
    q3_ignoredBackground: f?.answers.ignoredBackground ?? "",
    q4_trust: f?.answers.trust ?? "",
    q4_trustReason: f?.answers.trustReason ?? "",
    q5_oneChange: f?.answers.oneChange ?? "",
  });
});
const csvCell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const header = rows.length ? Object.keys(rows[0]) : [];
const csv = [
  header.join(","),
  ...rows.map((r) =>
    header.map((k) => csvCell((r as Record<string, unknown>)[k])).join(","),
  ),
].join("\n");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
await mkdir(outDir, { recursive: true });
const jsonFile = path.join(outDir, `beta-export-${stamp}.json`);
const csvFile = path.join(outDir, `beta-export-${stamp}.csv`);
await writeFile(
  jsonFile,
  JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      source: dir,
      runs: rows.length,
      withFeedback: rows.filter((r) => r.feedbackAt).length,
      // Full scrubbed records for analysis; the CSV is the flat view.
      records: scrub(records),
    },
    null,
    2,
  ),
  { flag: "wx" },
);
await writeFile(csvFile, "﻿" + csv, { flag: "wx" });
const byVersion: Record<
  string,
  { runs: number; feedback: number; participants: Set<string> }
> = {};
for (const r of rows) {
  const b = (byVersion[r.version] ??= {
    runs: 0,
    feedback: 0,
    participants: new Set(),
  });
  b.runs++;
  if (r.feedbackAt) b.feedback++;
  b.participants.add(r.participantId);
}
console.log(
  `导出 ${rows.length} 次生成，其中 ${rows.filter((r) => r.feedbackAt).length} 次有反馈`,
);
for (const [v, b] of Object.entries(byVersion))
  console.log(
    `  ${v}: 生成 ${b.runs} · 反馈 ${b.feedback} · 参与者 ${b.participants.size}`,
  );
console.log(jsonFile);
console.log(csvFile);
