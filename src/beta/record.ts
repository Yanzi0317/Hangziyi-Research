import { randomUUID } from "node:crypto";
import type { RunResult } from "../contracts.ts";
import type { ScenarioInput } from "../prediction/scenario.ts";
import { scrubOrReject } from "./anonymize.ts";
import {
  feedbackRequestSchema,
  runRecordSchema,
  feedbackRecordSchema,
  type BetaContext,
  type RunRecord,
  type FeedbackRecord,
} from "./contracts.ts";
import { betaEnabled, createStore, type BetaStore } from "./store.ts";

export type BetaStatus = {
  recordId: string;
  stored: boolean;
  store?: string;
  error?: string;
};

// Called by /api/recommend right after a successful generation, so the stored
// result is exactly what the server produced, never a client-supplied copy.
export async function recordRun(
  run: RunResult,
  profile: unknown,
  beta: BetaContext,
  scenario?: ScenarioInput,
  store: BetaStore | null = betaEnabled() ? createStore() : null,
): Promise<BetaStatus> {
  const recordId = randomUUID();
  if (!store) return { recordId, stored: false, error: "记录功能已关闭。" };
  try {
    const record: RunRecord = runRecordSchema.parse({
      kind: "run",
      schemaVersion: "1.0",
      recordId,
      participantId: beta.participantId,
      ...(beta.cohort ? { cohort: beta.cohort } : {}),
      consentVersion: beta.consentVersion,
      consentedAt: beta.consentedAt,
      language: beta.language,
      storedAt: new Date().toISOString(),
      version: run.meta.version,
      promptVersion: run.meta.promptVersion,
      promptHash: run.meta.promptHash,
      inputHash: run.meta.inputHash,
      outputPolicyVersion: run.meta.outputPolicyVersion,
      model: run.meta.model,
      marketSnapshotId: run.market.snapshotId,
      ...(scenario ? { scenario } : {}),
      profile: scrubOrReject(profile),
      result: scrubOrReject(run.result),
    });
    await store.append(record);
    return { recordId, stored: true, store: store.name };
  } catch (e) {
    return {
      recordId,
      stored: false,
      error: e instanceof Error ? e.message.slice(0, 200) : "记录失败",
    };
  }
}

export async function recordFeedback(
  input: unknown,
  store: BetaStore | null = betaEnabled() ? createStore() : null,
): Promise<BetaStatus> {
  if (!store) throw new Error("记录功能已关闭，反馈未保存。");
  const body = feedbackRequestSchema.parse(input);
  // With a file store we can verify the run exists and belongs to the same
  // anonymous participant; a webhook-only store accepts on trust.
  if (store.readAll) {
    const runs = (await store.readAll()).filter((r) => r.kind === "run");
    const run = runs.find((r) => r.recordId === body.recordId);
    if (!run) throw new Error("找不到对应的生成记录，反馈未保存。");
    if (run.participantId !== body.participantId)
      throw new Error("参与者编号与记录不一致，反馈未保存。");
  }
  const record: FeedbackRecord = feedbackRecordSchema.parse({
    kind: "feedback",
    schemaVersion: "1.0",
    recordId: body.recordId,
    participantId: body.participantId,
    storedAt: new Date().toISOString(),
    answers: scrubOrReject(body.answers),
  });
  await store.append(record);
  return { recordId: record.recordId, stored: true, store: store.name };
}
