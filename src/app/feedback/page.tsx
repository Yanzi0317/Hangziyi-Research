"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "../providers";
import { feedbackAnswersSchema } from "../../beta/contracts";
import { containsDirectContact } from "../../privacy";
const questions: [keyof Answers, string, string][] = [
  ["mostUseful", "哪个建议最有用？", "Which suggestion was most useful?"],
  [
    "leastReasonable",
    "哪个建议最不合理？",
    "Which suggestion was least reasonable?",
  ],
  [
    "ignoredBackground",
    "有没有忽略你真实背景的地方？",
    "Did it ignore anything about your real background?",
  ],
  [
    "trustReason",
    "你相信这个结果吗？为什么？",
    "Do you trust the result? Why?",
  ],
  [
    "oneChange",
    "如果只能改一个地方，你希望改什么？",
    "If you could change one thing, what would it be?",
  ],
];
type Answers = {
  mostUseful: string;
  leastReasonable: string;
  ignoredBackground: string;
  trust: "yes" | "partly" | "no" | "";
  trustReason: string;
  oneChange: string;
};
export default function Page() {
  const { run, consent, accessKey, feedbackDone, markFeedbackDone, setRun } =
    useSession();
  const [answers, setAnswers] = useState<Answers>({
    mostUseful: "",
    leastReasonable: "",
    ignoredBackground: "",
    trust: "",
    trustReason: "",
    oneChange: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  if (consent.status !== "accepted")
    return (
      <>
        <div className="eyebrow">FEEDBACK</div>
        <h1>反馈需要先同意记录</h1>
        <div className="card">
          <p>
            {consent.status === "declined"
              ? "你选择了不记录，因此不会保存任何反馈。如果改变主意，可以回到参与说明页重新选择。"
              : "请先阅读参与说明并作出选择。"}
          </p>
          <Link className="button" href="/consent">
            查看参与说明
          </Link>
        </div>
      </>
    );
  if (!run)
    return (
      <>
        <div className="eyebrow">FEEDBACK</div>
        <h1>先生成一次建议</h1>
        <Link className="button" href="/recommendation">
          去生成职业建议
        </Link>
      </>
    );
  const beta = run.beta;
  const code = consent.context.participantId.slice(0, 8);
  if (beta && feedbackDone.has(beta.recordId))
    return (
      <>
        <div className="eyebrow">FEEDBACK</div>
        <h1>谢谢，反馈已保存</h1>
        <div className="card">
          <p>
            本次测试的逻辑版本：{run.meta.version}。你的参与者编号：
            <code>{code}</code>
            ，凭此编号可要求删除记录。
          </p>
          <div className="actions">
            <Link
              className="button"
              href="/recommendation"
              onClick={() => setRun(null)}
            >
              用同一画像再测一个版本 →
            </Link>
            <Link href="/profile">修改画像</Link>
          </div>
        </div>
      </>
    );
  if (!beta?.stored)
    return (
      <>
        <div className="eyebrow">FEEDBACK</div>
        <h1>这次生成没有被记录</h1>
        <div className="card">
          <p>{beta?.error ?? "生成时未附带同意信息。"}</p>
          <p>请回到“职业方向”页重新生成一次，再来填写反馈。</p>
          <Link className="button" href="/recommendation">
            重新生成
          </Link>
        </div>
      </>
    );
  return (
    <>
      <div className="eyebrow">FEEDBACK · 2–3 MIN</div>
      <h1>用两三分钟告诉我们</h1>
      <p className="lead">
        针对刚才 <b>{run.meta.version}</b>{" "}
        版本给出的建议。请不要写姓名、公司或学校名称、联系方式。
      </p>
      <form
        className="card"
        onSubmit={async (e) => {
          e.preventDefault();
          if (lock.current) return;
          setError("");
          const parsed = feedbackAnswersSchema.safeParse(answers);
          if (!parsed.success) {
            setError("请回答全部五个问题，每题不超过 1000 字。");
            return;
          }
          if (containsDirectContact(parsed.data)) {
            setError("请移除联系方式或证件号。");
            return;
          }
          lock.current = true;
          setBusy(true);
          try {
            const r = await fetch("/api/beta/feedback", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-access-key": accessKey,
              },
              body: JSON.stringify({
                recordId: beta.recordId,
                participantId: consent.context.participantId,
                answers: parsed.data,
              }),
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error);
            markFeedbackDone(beta.recordId);
          } catch (err) {
            setError(err instanceof Error ? err.message : "提交失败");
          } finally {
            lock.current = false;
            setBusy(false);
          }
        }}
      >
        {questions.map(([key, zh, en], i) => (
          <div key={key}>
            <label htmlFor={key}>
              {i + 1}. {zh} <small>{en}</small>
            </label>
            {key === "trustReason" && (
              <select
                id="trust"
                required
                value={answers.trust}
                onChange={(e) =>
                  setAnswers({
                    ...answers,
                    trust: e.target.value as Answers["trust"],
                  })
                }
              >
                <option value="" disabled>
                  请选择 / Choose
                </option>
                <option value="yes">相信 / Yes</option>
                <option value="partly">部分相信 / Partly</option>
                <option value="no">不相信 / No</option>
              </select>
            )}
            <textarea
              id={key}
              required
              maxLength={1000}
              value={answers[key]}
              onChange={(e) =>
                setAnswers({ ...answers, [key]: e.target.value })
              }
            />
          </div>
        ))}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="actions">
          <button type="submit" disabled={busy}>
            {busy ? "正在保存…" : "提交反馈"}
          </button>
          <span className="hint">参与者编号 {code}</span>
        </div>
      </form>
    </>
  );
}
