"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "../providers";
import { consentVersion } from "../../beta/contracts";
type Config = {
  enabled: boolean;
  store: string;
  versions: { version: string; status: string }[];
};
const recorded = [
  [
    "你填写的画像（年龄段、学历、专业、经历描述、年限、行业、技能、AI 使用经验、地点偏好、目标）",
    "The profile you enter (age range, education, major, experience description, years, industry, skills, AI use, location preference, goals)",
  ],
  [
    "AI 生成的建议全文，以及使用的逻辑版本和时间",
    "The full AI result, the logic version used and timestamps",
  ],
  [
    "你在反馈页填写的五个问题的答案",
    "Your answers to the five feedback questions",
  ],
];
const notRecorded = [
  ["姓名、联系方式、账号", "Name, contact details, accounts"],
  [
    "IP 地址、设备信息、浏览器指纹、Cookie",
    "IP address, device information, browser fingerprint, cookies",
  ],
  [
    "雇主、学校等机构名称（自动删除，请也不要填写）",
    "Employer or school names (auto-removed; please do not enter them)",
  ],
];
function ConsentForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { consent, setConsent, setAccessKey, setPreferredVersion, hydrated } =
    useSession();
  const [config, setConfig] = useState<Config | null>(null);
  const [lang, setLang] = useState<"zh" | "en">("zh");
  useEffect(() => {
    // Invite links may carry ?v=<version>&k=<access key>&c=<cohort>. Apply
    // them only after stored session values have been restored.
    if (!hydrated) return;
    const v = params.get("v"),
      k = params.get("k");
    if (v) setPreferredVersion(v);
    if (k) setAccessKey(k);
    fetch("/api/beta/config")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() =>
        setConfig({ enabled: false, store: "unknown", versions: [] }),
      );
  }, [hydrated, params, setAccessKey, setPreferredVersion]);
  const cohort = params.get("c") ?? undefined;
  const t = (zh: string, en: string) => (lang === "zh" ? zh : en);
  return (
    <>
      <div className="eyebrow">BETA TEST · CONSENT</div>
      <div className="actions">
        <button
          type="button"
          className="secondary"
          onClick={() => setLang(lang === "zh" ? "en" : "zh")}
        >
          {lang === "zh" ? "English" : "中文"}
        </button>
      </div>
      <h1>{t("参与测试前，请先阅读", "Please read before you start")}</h1>
      <p className="lead">
        {t(
          "这是一个 AI 职业探索工具的测试版本。我们正在比较几套不同的推荐逻辑，需要有真实中国就业市场经历的人来试用并告诉我们哪里合理、哪里不合理。",
          "This is a beta of an AI career-exploration tool. We are comparing several recommendation-logic versions and need people with real experience of China's labor market to try it and tell us what is reasonable and what is not.",
        )}
      </p>
      <div className="card">
        <h2>
          {t(
            "如果你同意，我们会匿名记录",
            "If you agree, we record anonymously",
          )}
        </h2>
        <ul>
          {recorded.map(([zh, en]) => (
            <li key={zh}>{t(zh, en)}</li>
          ))}
        </ul>
        <h2>{t("我们不会记录", "We do not record")}</h2>
        <ul>
          {notRecorded.map(([zh, en]) => (
            <li key={zh}>{t(zh, en)}</li>
          ))}
        </ul>
        <p>
          {t(
            "所有记录只挂在一个随机生成的参与者编号下。你可以随时凭编号要求删除自己的记录。记录用于改进这个产品，以及关于 AI 职业建议的研究；只以汇总、去标识的形式使用和发布。",
            "Every record is linked only to a randomly generated participant code. You can quote that code at any time to have your records deleted. Records are used to improve this product and for research on AI career advice, and are only used and published in aggregated, de-identified form.",
          )}
        </p>
        <p>
          {t(
            "请不要在任何输入框填写姓名、雇主或学校名称、联系方式和详细地址。系统会在保存前自动删除这类内容，但自动删除并不完美。",
            "Please do not enter names, employer or school names, contact details or street addresses anywhere. The system removes such content before saving, but automatic removal is not perfect.",
          )}
        </p>
        <p>
          {t(
            "如果你不同意，仍然可以正常使用本站，只是不会保存任何内容，也无法提交反馈。",
            "If you decline, you can still use the site normally; nothing is stored and feedback cannot be submitted.",
          )}
        </p>
        <p className="hint">
          {t("同意说明版本", "Consent text version")} {consentVersion}
          {config && (
            <>
              {" · "}
              {config.enabled
                ? t(
                    `记录功能已开启（${config.store}）`,
                    `Recording is on (${config.store})`,
                  )
                : t(
                    "记录功能当前关闭，本次不会保存任何内容",
                    "Recording is currently off; nothing will be saved",
                  )}
            </>
          )}
        </p>
        {consent.status === "accepted" && (
          <p className="notice">
            {t("你已同意。参与者编号：", "You have agreed. Participant code: ")}
            <code>{consent.context.participantId.slice(0, 8)}</code>
          </p>
        )}
        {consent.status === "declined" && (
          <p className="notice">
            {t("你已选择不记录。", "You chose not to be recorded.")}
          </p>
        )}
        <div className="actions">
          <button
            type="button"
            onClick={() => {
              setConsent({
                status: "accepted",
                context: {
                  participantId: crypto.randomUUID(),
                  consentVersion,
                  consentedAt: new Date().toISOString(),
                  language: lang,
                  ...(cohort ? { cohort } : {}),
                },
              });
              router.push("/profile");
            }}
          >
            {t("同意并开始", "I agree, start")}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setConsent({
                status: "declined",
                decidedAt: new Date().toISOString(),
              });
              router.push("/profile");
            }}
          >
            {t("不同意，仅试用", "Decline, just try it")}
          </button>
        </div>
      </div>
    </>
  );
}
export default function Page() {
  return (
    <Suspense fallback={<p>读取中…</p>}>
      <ConsentForm />
    </Suspense>
  );
}
