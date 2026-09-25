import { z } from "zod";
import { profileSchema, resultSchema } from "../contracts.ts";
import { scenarioInputSchema } from "../prediction/scenario.ts";

// Bump when the consent wording changes so old records stay attributable.
export const consentVersion = "2026-09-25";
const uuid = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
const text = (max: number) => z.string().trim().min(1).max(max);

// Sent by the browser only after the participant accepted the consent screen.
export const betaContextSchema = z
  .object({
    participantId: uuid,
    consentVersion: z.literal(consentVersion),
    consentedAt: z.iso.datetime(),
    language: z.enum(["zh", "en"]),
    // Optional cohort label the study owner puts in the invite link (e.g. "A").
    cohort: z
      .string()
      .regex(/^[A-Za-z0-9_-]{1,20}$/)
      .optional(),
  })
  .strict();
export type BetaContext = z.infer<typeof betaContextSchema>;

export const feedbackAnswersSchema = z
  .object({
    mostUseful: text(1000),
    leastReasonable: text(1000),
    ignoredBackground: text(1000),
    trust: z.enum(["yes", "partly", "no"]),
    trustReason: text(1000),
    oneChange: text(1000),
  })
  .strict();
export type FeedbackAnswers = z.infer<typeof feedbackAnswersSchema>;

export const feedbackRequestSchema = z
  .object({
    recordId: uuid,
    participantId: uuid,
    answers: feedbackAnswersSchema,
  })
  .strict();

// Stored records. Profile and result are scrubbed copies; no IP, cookie or
// user-agent is ever attached.
export const runRecordSchema = z
  .object({
    kind: z.literal("run"),
    schemaVersion: z.literal("1.0"),
    recordId: uuid,
    participantId: uuid,
    cohort: z.string().optional(),
    consentVersion: z.string(),
    consentedAt: z.iso.datetime(),
    language: z.enum(["zh", "en"]),
    storedAt: z.iso.datetime(),
    version: z.string(),
    promptVersion: z.string(),
    promptHash: z.string(),
    inputHash: z.string(),
    outputPolicyVersion: z.string(),
    model: z.string(),
    marketSnapshotId: z.string(),
    scenario: scenarioInputSchema.optional(),
    profile: profileSchema,
    result: resultSchema,
  })
  .strict();
export type RunRecord = z.infer<typeof runRecordSchema>;

export const feedbackRecordSchema = z
  .object({
    kind: z.literal("feedback"),
    schemaVersion: z.literal("1.0"),
    recordId: uuid,
    participantId: uuid,
    storedAt: z.iso.datetime(),
    answers: feedbackAnswersSchema,
  })
  .strict();
export type FeedbackRecord = z.infer<typeof feedbackRecordSchema>;
export type BetaRecord = RunRecord | FeedbackRecord;
