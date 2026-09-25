import { timingSafeEqual } from "node:crypto";
export function authorize(req: Request) {
  const origin = req.headers.get("origin");
  // Next may normalize req.url to localhost while the browser uses 127.0.0.1.
  // Compare against the actual request Host (not an arbitrary forwarded header).
  const requestHost = req.headers.get("host") ?? new URL(req.url).host;
  if (origin && new URL(origin).host !== requestHost)
    throw new Error("不允许跨站请求。");
  const configured = process.env.APP_ACCESS_KEY;
  if (process.env.NODE_ENV === "production" && !configured)
    throw new Error("公开环境尚未配置访问密钥，模型调用已关闭。");
  if (configured) {
    const given = req.headers.get("x-access-key") ?? "";
    const a = Buffer.from(given),
      b = Buffer.from(configured);
    if (a.length !== b.length || !timingSafeEqual(a, b))
      throw new Error("访问密钥无效。");
  }
}
export async function readBody(req: Request, maxBytes = 20000) {
  const reader = req.body?.getReader();
  if (!reader) throw new Error("请求为空");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error("请求过大");
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}
export function safeError(error: unknown) {
  // Never expose schema errors containing submitted input, or upstream response bodies.
  const message =
    error instanceof Error && !["ZodError", "SyntaxError"].includes(error.name)
      ? error.message
      : "输入格式不正确，请检查后重试。";
  return Response.json(
    { error: message.slice(0, 200) },
    { status: 400, headers: { "Cache-Control": "no-store" } },
  );
}
