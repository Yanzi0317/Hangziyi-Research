import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

// Only explicitly reviewed, aggregate findings belong here. Quarantined imports
// never enter this loader, the prompt, or the public browser bundle.
export const approvedSurveySchema = z
  .object({
    datasetId: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
    reviewStatus: z.literal("approved"),
    consentScope: z.literal("consented_responses_only"),
    sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
    reviewNote: z.string().min(10),
    sampleSize: z.number().int().positive(),
    surveyDate: z.iso.date().nullable(),
    region: z.string().min(1),
    findings: z
      .array(
        z
          .object({
            id: z
              .string()
              .regex(/^SURVEY-[A-Z0-9-]+$/)
              .max(30),
            questionIds: z.array(z.string().regex(/^Q\d+$/)).min(1),
            statement: z.string().min(1).max(1200),
            denominator: z.number().int().positive(),
            limitations: z.array(z.string().min(1).max(500)).min(1),
            type: z.literal("aggregate_survey"),
          })
          .strict(),
      )
      .max(12),
    limitations: z.array(z.string().min(1).max(600)).min(1),
  })
  .strict()
  .superRefine((dataset, ctx) => {
    if (
      new Set(dataset.findings.map((f) => f.id)).size !==
      dataset.findings.length
    )
      ctx.addIssue({ code: "custom", message: "研究ID重复" });
    if (dataset.findings.some((f) => f.denominator > dataset.sampleSize))
      ctx.addIssue({ code: "custom", message: "题目分母不能大于获批样本量" });
  });
export async function loadApprovedSurvey(id: string) {
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) throw new Error("无效研究快照ID");
  let raw: string;
  try {
    raw = await readFile(
      path.join(process.cwd(), "data/research/approved", `${id}.json`),
      "utf8",
    );
  } catch {
    throw new Error("问卷尚未完成同意范围和统计口径审核，未用于推荐。");
  }
  const parsed = approvedSurveySchema.safeParse(JSON.parse(raw));
  if (!parsed.success || parsed.data.datasetId !== id)
    throw new Error("问卷研究快照未通过审核协议校验，未用于推荐。");
  return parsed.data;
}
