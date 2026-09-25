export type Generator = (system: string, input: unknown) => Promise<unknown>;

export const generate: Generator = async (system, input) => {
  if (typeof window !== "undefined") throw new Error("仅服务端可调用模型");
  const { LLM_API_KEY, LLM_BASE_URL, LLM_MODEL } = process.env;
  if (!LLM_API_KEY || !LLM_BASE_URL || !LLM_MODEL)
    throw new Error(
      "模型未配置，请在服务端设置 LLM_API_KEY、LLM_BASE_URL 和 LLM_MODEL。",
    );
  const base = new URL(LLM_BASE_URL);
  if (
    base.protocol !== "https:" &&
    !(
      process.env.NODE_ENV !== "production" &&
      ["localhost", "127.0.0.1"].includes(base.hostname)
    )
  )
    throw new Error("模型地址必须使用 HTTPS。");
  let response: Response;
  try {
    response = await fetch(
      `${LLM_BASE_URL.replace(/\/$/, "")}/chat/completions`,
      {
        method: "POST",
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(45000),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LLM_API_KEY}`,
        },
        body: JSON.stringify({
          model: LLM_MODEL,
          temperature: 0,
          max_tokens: 10000,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: JSON.stringify(input) },
          ],
        }),
      },
    );
  } catch {
    throw new Error("模型连接失败或超时，请稍后重试。");
  }
  if (!response.ok)
    throw new Error(`模型服务请求失败（HTTP ${response.status}）。`);
  const raw = await response.text();
  if (raw.length > 300000) throw new Error("模型响应过大。");
  try {
    const body = JSON.parse(raw);
    if (body.choices?.[0]?.finish_reason === "length") throw new Error();
    return JSON.parse(body.choices[0].message.content);
  } catch {
    throw new Error("模型未返回完整有效的 JSON。");
  }
};
