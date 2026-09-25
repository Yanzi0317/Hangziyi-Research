import { readFile } from "node:fs/promises";
import path from "node:path";
import { snapshotSchema, type MarketContext } from "../contracts.ts";

export interface MarketSource {
  load(snapshotId: string): Promise<MarketContext>;
}
export class CuratedSource implements MarketSource {
  async load(id: string): Promise<MarketContext> {
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) throw new Error("无效快照 ID");
    const snapshot = snapshotSchema.parse(
      JSON.parse(
        await readFile(
          path.join(process.cwd(), "data/market-snapshots", `${id}.json`),
          "utf8",
        ),
      ),
    );
    if (snapshot.snapshotId !== id) throw new Error("快照 ID 不一致");
    if (
      new Set(snapshot.signals.map((s) => s.id)).size !==
      snapshot.signals.length
    )
      throw new Error("快照信号 ID 重复");
    const today = new Date().toISOString().slice(0, 10);
    const signals = snapshot.signals.filter(
      (s) => s.date <= today && s.validUntil >= today && s.date <= s.validUntil,
    );
    return {
      snapshotId: id,
      status: signals.length ? "available" : "unavailable",
      signals,
      limitations: [
        ...(signals.length
          ? []
          : ["暂无有效公开市场证据；模型背景知识不等于当前市场事实。"]),
        ...(signals.length !== snapshot.signals.length
          ? ["已排除过期或日期无效的信号。"]
          : []),
      ],
    };
  }
}
// Search providers must supply reviewed aggregate signals, not posts or personal content.
export class OptionalSearchSource implements MarketSource {
  constructor(private readonly provider?: MarketSource) {}
  async load(id: string): Promise<MarketContext> {
    return this.provider
      ? this.provider.load(id)
      : {
          snapshotId: id,
          status: "unavailable",
          signals: [],
          limitations: ["实时搜索未配置。"],
        };
  }
}
export class CachedSource implements MarketSource {
  private cache = new Map<string, { expires: number; value: MarketContext }>();
  constructor(
    private source: MarketSource,
    private ttl = 6 * 60 * 60 * 1000,
  ) {}
  async load(id: string) {
    const key = `${id}:${new Date().toISOString().slice(0, 10)}`;
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now())
      return structuredClone(cached.value);
    const value = await this.source.load(id);
    if (this.cache.size >= 20)
      this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(key, {
      value: structuredClone(value),
      expires: Date.now() + this.ttl,
    });
    return value;
  }
}
export const marketSource = new CachedSource(new CuratedSource());
