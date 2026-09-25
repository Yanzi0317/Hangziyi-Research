import type { MarketContext, Profile, Recommendation } from "../contracts.ts";
import { profileFields } from "../contracts.ts";

export const outputPolicyVersion = "1.0";
export function prohibited(s: string) {
  const measure =
    /\d+(?:\.\d+)?\s*(?:%|％|\/\s*10|out of 10|分|颗星)|[一二三四五六七八九十]成|百分之[\d一二三四五六七八九十百]+|(?:概率|probability)\s*[:：]?\s*0\.\d+|[★⭐]{2,}/i;
  const judgement =
    /概率|成功率|录用率|失业率|替代|匹配|评分|得分|职业分|竞争力|胜算|likely|chance|score|automated|probability|fit|rating|适合|星级/i;
  return (
    (measure.test(s) && judgement.test(s)) ||
    /(?:评分|匹配分|career score|星级)\s*[:：为是]?\s*[\d一二三四五六七八九十]|[一二三四五六七八九十]颗星|[★⭐]{2,}/i.test(
      s,
    ) ||
    /(?:保证|必然|肯定|一定)(?:会)?(?:就业|录用|被替代|消失)/.test(s)
  );
}
export function sanitize(result: Recommendation): {
  result: Recommendation;
  adjusted: boolean;
} {
  let adjusted = false;
  function visit(value: unknown, key = ""): unknown {
    if (typeof value === "string") {
      if (
        ["name", "title", "skill", "status", "type"].includes(key) &&
        prohibited(value)
      )
        throw new Error("输出标签含评分表达");
      if (prohibited(value)) {
        adjusted = true;
        return "现有信息不足以可靠量化这一判断，请结合证据与限制进一步验证。";
      }
      return value;
    }
    if (Array.isArray(value)) return value.map((v) => visit(v, key));
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, visit(v, k)]),
      );
    return value;
  }
  return { result: visit(result) as Recommendation, adjusted };
}
export function validateReferences(
  result: Recommendation,
  profile: Profile,
  market: MarketContext,
  researchIds: string[],
) {
  const ids = new Set(market.signals.map((s) => s.id));
  const rids = new Set(researchIds);
  for (const industry of result.industries) {
    const rationales = [
      industry.rationale,
      ...industry.jobFunctions.flatMap((job) => [
        job.rationale,
        ...job.skills.map((s) => s.rationale),
      ]),
    ];
    for (const r of rationales) {
      if (
        r.profileFields.some(
          (f) =>
            !profileFields.includes(f) ||
            profile[f as keyof Profile] === undefined ||
            profile[f as keyof Profile] === "undisclosed" ||
            (Array.isArray(profile[f as keyof Profile]) &&
              !(profile[f as keyof Profile] as string[]).length),
        )
      )
        throw new Error("引用了不存在或未提供的画像字段");
      if (
        r.marketSignalIds.some((id) => !ids.has(id)) ||
        r.researchFindingIds.some((id) => !rids.has(id))
      )
        throw new Error("引用了未提供的证据");
      if (r.marketTrend !== null && r.marketSignalIds.length === 0)
        throw new Error("市场趋势缺少引用");
      if (
        !market.signals.length &&
        (r.marketTrend !== null || r.marketSignalIds.length)
      )
        throw new Error("无市场证据时不能生成趋势");
    }
  }
}
