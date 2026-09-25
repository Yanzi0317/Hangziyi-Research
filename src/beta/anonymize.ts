import { containsDirectContact } from "../privacy.ts";

// Server-side scrubbing applied before any Beta record is written. It removes
// contact details, links, organisation names and self-introductions by pattern.
// It is a safeguard, not a guarantee: participants are still told not to enter
// identifying details, and the export step scrubs again before files are shared.
const rules: [RegExp, string | ((m: string) => string)][] = [
  [/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "[已删除邮箱]"],
  [/https?:\/\/\S+|www\.\S+/gi, "[已删除链接]"],
  [/(?<!\d)(?:\+?86[-\s]?)?1[3-9]\d{9}(?!\d)/g, "[已删除电话]"],
  [/(?<!\d)\d{17}[\dXx](?!\d)/g, "[已删除证件号]"],
  [
    /(?:微信|微信号|wechat|weixin|qq|QQ号|钉钉|电报|telegram|whatsapp|line)\s*(?:id|号)?\s*[:：]?\s*[A-Za-z0-9_-]{5,}/gi,
    "[已删除联系方式]",
  ],
  [/(?:我叫|本人叫|我的名字是|姓名\s*[:：]?\s*)[一-龥·]{2,4}/g, "[已删除姓名]"],
  [
    /(?:my name is|i am called|name\s*:)\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?/gi,
    "[name removed]",
  ],
  [
    /\b(?:[A-Z][\w&.'-]*\s+){0,3}[A-Z][\w&.'-]*\s+(?:Inc|Ltd|LLC|Corp|Corporation|Co|Group|University|College|Institute|Bank|Hospital|Studio|Technologies|Technology|Limited)\b\.?/g,
    "[organisation removed]",
  ],
];

const orgSuffix =
  /有限公司|股份有限公司|股份公司|集团|公司|大学|学院|中学|小学|研究院|研究所|医院|银行|事务所|工作室|科技园|事业单位/g;
const nameChar = /[一-龥A-Za-z0-9·&（）()]/;
// Function words and pronouns that end an organisation name when scanning
// backwards from its suffix, so "在宝洁公司" becomes "在[某机构]". Kept short
// on purpose: characters that also occur inside brand names (为, 去, 美…) are
// not stop words, so a little surrounding text may be removed instead.
const stopWord = /[在于从到是和与及的了给向把被跟我你他她们]/;
function scrubOrganisations(s: string): string {
  let out = "";
  let cursor = 0;
  for (const m of s.matchAll(orgSuffix)) {
    if (m.index < cursor) continue;
    let start = m.index;
    let n = 0;
    while (start > cursor && n < 24) {
      const ch = s[start - 1];
      if (!nameChar.test(ch) || stopWord.test(ch)) break;
      start--;
      n++;
    }
    if (n === 0 && !["有限公司", "股份有限公司", "股份公司"].includes(m[0]))
      continue;
    out += s.slice(cursor, start) + "[某机构]";
    cursor = m.index + m[0].length;
  }
  return out + s.slice(cursor);
}

export function scrubText(value: string): string {
  let s = scrubOrganisations(value);
  for (const [pattern, replacement] of rules)
    s =
      typeof replacement === "string"
        ? s.replace(pattern, replacement)
        : s.replace(pattern, replacement);
  return s;
}

export function scrub<T>(value: T): T {
  if (typeof value === "string") return scrubText(value) as T;
  if (Array.isArray(value)) return value.map((v) => scrub(v)) as T;
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        scrub(v),
      ]),
    ) as T;
  return value;
}

// Scrub, then refuse anything that still looks like direct contact data.
export function scrubOrReject<T>(value: T): T {
  const cleaned = scrub(value);
  if (containsDirectContact(cleaned))
    throw new Error("记录中仍含联系方式或证件号，未保存。");
  return cleaned;
}
