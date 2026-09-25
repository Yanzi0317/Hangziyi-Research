import { authorize, readBody, safeError } from "../../../../http";
import { recordFeedback } from "../../../../beta/record";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    authorize(req);
    const status = await recordFeedback(await readBody(req, 30000));
    return Response.json(status, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return safeError(e);
  }
}
