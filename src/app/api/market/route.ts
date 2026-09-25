import { marketSource } from "../../../market-data/service";
export const runtime = "nodejs";
export async function GET() {
  try {
    return Response.json(await marketSource.load("initial"));
  } catch {
    return Response.json(
      { error: "市场快照读取失败，请检查资料配置。" },
      { status: 500 },
    );
  }
}
