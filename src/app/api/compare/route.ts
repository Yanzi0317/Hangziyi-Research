import { z } from "zod";
import { comparePersona } from "../../../comparison";
import { authorize, readBody, safeError } from "../../../http";
export const runtime = "nodejs";
export const maxDuration = 240;
const schema = z
  .object({ personaId: z.string(), left: z.string(), right: z.string() })
  .strict();
export async function POST(req: Request) {
  try {
    authorize(req);
    if (process.env.ENABLE_COMPARISON !== "true")
      throw new Error("比较调用未启用，请设置 ENABLE_COMPARISON=true。");
    const b = schema.parse(await readBody(req));
    return Response.json(await comparePersona(b.personaId, b.left, b.right), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return safeError(e);
  }
}
