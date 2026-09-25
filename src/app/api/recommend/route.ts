import { z } from "zod";
import { runRecommendation } from "../../../recommendation/engine";
import { profileSchema } from "../../../contracts";
import { authorize, readBody, safeError } from "../../../http";
import { defaultVersion } from "../../../recommendation/registry";
import { scenarioInputSchema } from "../../../prediction/scenario";
export const runtime = "nodejs";
export const maxDuration = 120;
const bodySchema = z
  .object({
    profile: profileSchema,
    version: z.string().default(defaultVersion),
    scenario: scenarioInputSchema.optional(),
  })
  .strict();
export async function POST(req: Request) {
  try {
    authorize(req);
    const b = bodySchema.parse(await readBody(req));
    return Response.json(
      await runRecommendation(b.profile, b.version, { scenario: b.scenario }),
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (e) {
    return safeError(e);
  }
}
