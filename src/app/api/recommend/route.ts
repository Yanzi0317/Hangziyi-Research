import { z } from "zod";
import { runRecommendation } from "../../../recommendation/engine";
import { profileSchema } from "../../../contracts";
import { authorize, readBody, safeError } from "../../../http";
import { defaultVersion } from "../../../recommendation/registry";
import { scenarioInputSchema } from "../../../prediction/scenario";
import { betaContextSchema } from "../../../beta/contracts";
import { recordRun } from "../../../beta/record";
export const runtime = "nodejs";
export const maxDuration = 120;
const bodySchema = z
  .object({
    profile: profileSchema,
    version: z.string().default(defaultVersion),
    scenario: scenarioInputSchema.optional(),
    // Present only when the participant accepted the consent screen.
    beta: betaContextSchema.optional(),
  })
  .strict();
export async function POST(req: Request) {
  try {
    authorize(req);
    const b = bodySchema.parse(await readBody(req));
    const run = await runRecommendation(b.profile, b.version, {
      scenario: b.scenario,
    });
    const beta = b.beta
      ? await recordRun(run, b.profile, b.beta, b.scenario)
      : undefined;
    return Response.json(
      { ...run, ...(beta ? { beta } : {}) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return safeError(e);
  }
}
