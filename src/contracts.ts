import { z } from "zod";

export const aiLevels = [
  "none",
  "occasional",
  "regular",
  "build_tools",
] as const;
export const educations = [
  "secondary_vocational",
  "associate",
  "bachelor",
  "master",
  "doctorate",
  "other",
  "undisclosed",
] as const;
const text = (max: number) => z.string().trim().min(1).max(max);
export const profileSchema = z
  .object({
    ageRange: z.enum([
      "under-18",
      "18-22",
      "23-29",
      "30-39",
      "40-49",
      "50+",
      "undisclosed",
    ]),
    education: z.enum(educations),
    major: text(80),
    experience: text(1500),
    experienceYears: z
      .number()
      .min(0)
      .max(60)
      .refine(
        (n) => Math.abs(n * 10 - Math.round(n * 10)) < 1e-8,
        "年限最多一位小数",
      ),
    industry: text(80),
    skills: z
      .array(text(40))
      .max(20)
      .transform((items) => [
        ...new Map(items.map((s) => [s.toLowerCase(), s])).values(),
      ]),
    aiUseExperience: z.enum(aiLevels),
    locationPreference: z.array(text(40)).min(1).max(5),
    careerGoals: text(1000),
  })
  .strict();
export type Profile = z.infer<typeof profileSchema>;
export const profileFields = Object.keys(profileSchema.shape);

export const signalSchema = z
  .object({
    id: text(100),
    statement: text(1500),
    sourceTitle: text(200),
    sourceUrl: z
      .url()
      .refine((s) => s.startsWith("https://"), "来源必须使用 HTTPS"),
    date: z.iso.date(),
    region: text(100),
    industry: text(100),
    role: text(100),
    commonRequirements: z.array(text(200)).max(20),
    validUntil: z.iso.date(),
    limitations: z.array(text(500)).min(1).max(10),
  })
  .strict();
export const snapshotSchema = z
  .object({
    snapshotId: text(80),
    updatedAt: z.iso.date(),
    signals: z.array(signalSchema).max(500),
  })
  .strict();
export type MarketContext = {
  snapshotId: string;
  status: "available" | "unavailable";
  signals: z.infer<typeof signalSchema>[];
  limitations: string[];
};

const rationale = z
  .object({
    why: text(1600),
    profileFields: z.array(text(50)).min(1).max(12),
    marketSignalIds: z.array(text(100)).max(10),
    researchFindingIds: z.array(text(30)).max(5),
    marketTrend: z.string().max(1000).nullable(),
    userInference: text(1200),
    assumptions: z.array(text(500)).max(6),
    limitations: z.array(text(600)).min(1).max(6),
  })
  .strict();
const skill = z
  .object({
    skill: text(120),
    status: z.enum([
      "self_reported_gap",
      "needs_verification",
      "self_reported_strength",
    ]),
    rationale,
    nextStep: z
      .object({
        type: z.enum(["project", "experience", "course", "certification"]),
        title: text(200),
        steps: z.array(text(500)).min(1).max(6),
        deliverable: text(500),
        acceptanceCriteria: z.array(text(500)).min(2).max(5),
        verificationMethod: text(500),
        resourceAssumptions: z.array(text(300)).max(5),
        lowResourceAlternative: text(600),
      })
      .strict(),
  })
  .strict();
export const resultSchema = z
  .object({
    industries: z
      .array(
        z
          .object({
            name: text(120),
            rationale,
            jobFunctions: z
              .array(
                z
                  .object({
                    name: text(120),
                    rationale,
                    examplePositions: z.array(text(150)).min(1).max(3),
                    exampleCompanies: z
                      .array(
                        z
                          .object({
                            name: text(100),
                            status: z.literal("unverified_example"),
                          })
                          .strict(),
                      )
                      .max(2),
                    skills: z.array(skill).max(4),
                    taskChanges: z.array(text(600)).max(5),
                    workloadQuestions: z.array(text(500)).max(4),
                  })
                  .strict(),
              )
              .min(1)
              .max(3),
          })
          .strict(),
      )
      .min(3)
      .max(5),
    overallLimitations: z.array(text(600)).min(1).max(8),
  })
  .strict();
export type Recommendation = z.infer<typeof resultSchema>;
export type RunResult = {
  result: Recommendation;
  market: MarketContext;
  meta: {
    version: string;
    promptVersion: string;
    promptHash: string;
    inputHash: string;
    model: string;
    generatedAt: string;
    outputPolicyVersion: string;
    researchIds: string[];
    researchLimitations: string[];
    runtimeMode: "live" | "mock_test";
    adjusted: boolean;
  };
};
