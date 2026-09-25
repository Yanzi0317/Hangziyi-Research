"use client";
import type { Recommendation, RunResult } from "../contracts";
type Rationale = Recommendation["industries"][number]["rationale"];
export function Why({ r }: { r: Rationale }) {
  return (
    <div className="rationale">
      <p>{r.why}</p>
      <details>
        <summary>查看依据与推断</summary>
        <p>
          <b>画像字段：</b>
          {r.profileFields.join("、")}
        </p>
        <p>
          <b>市场趋势：</b>
          {r.marketTrend ?? "暂无相关外部市场证据"}
        </p>
        <p>
          <b>市场信号：</b>
          {r.marketSignalIds.join("、") || "无"}
        </p>
        <p>
          <b>研究依据（访谈/问卷）：</b>
          {r.researchFindingIds.join("、") || "无"}
        </p>
        <p>
          <b>针对你的推断：</b>
          {r.userInference}
        </p>
        <p>
          <b>假设：</b>
          {r.assumptions.join("；") || "无额外假设"}
        </p>
        <ul>
          {r.limitations.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
export function Results({
  run,
  skillsOnly = false,
}: {
  run: RunResult;
  skillsOnly?: boolean;
}) {
  return (
    <>
      <div className="notice">
        逻辑 {run.meta.version} · 提示词 {run.meta.promptVersion} · 输出规则{" "}
        {run.meta.outputPolicyVersion}
        <br />
        {run.meta.researchLimitations.join("；")}
        {run.meta.adjusted && <p>部分评分或概率表达已移除。</p>}
      </div>
      {run.result.industries.map((industry, i) => (
        <section className="card" key={i}>
          <h2>{industry.name}</h2>
          {!skillsOnly && <Why r={industry.rationale} />}{" "}
          {industry.jobFunctions.map((job, j) => (
            <div key={j}>
              <h3>{job.name}</h3>
              {!skillsOnly && (
                <>
                  <Why r={job.rationale} />
                  <p>示例岗位：{job.examplePositions.join("、")}</p>
                  <p className="hint">
                    公司探索示例：
                    {job.exampleCompanies.map((c) => c.name).join("、") ||
                      "暂无可靠示例"}
                    。未核实，不代表正在招聘。
                  </p>
                  {job.taskChanges.length > 0 && (
                    <>
                      <h4>任务可能怎样变化</h4>
                      <ul>
                        {job.taskChanges.map((s, k) => (
                          <li key={k}>{s}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  {job.workloadQuestions.length > 0 && (
                    <>
                      <h4>需要向团队核实的问题</h4>
                      <ul>
                        {job.workloadQuestions.map((s, k) => (
                          <li key={k}>{s}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              )}
              {skillsOnly &&
                job.skills.map((s, k) => (
                  <article className="skill" key={k}>
                    <span className="tag">
                      {
                        {
                          self_reported_gap: "明确待补足",
                          needs_verification: "需要验证",
                          self_reported_strength: "已有经验可验证",
                        }[s.status]
                      }
                    </span>
                    <h4>{s.skill}</h4>
                    <Why r={s.rationale} />
                    <h4>下一步：{s.nextStep.title}</h4>
                    <ol>
                      {s.nextStep.steps.map((v, n) => (
                        <li key={n}>{v}</li>
                      ))}
                    </ol>
                    <p>
                      <b>交付物：</b>
                      {s.nextStep.deliverable}
                    </p>
                    <p>
                      <b>验证方式：</b>
                      {s.nextStep.verificationMethod}
                    </p>
                    <ul>
                      {s.nextStep.acceptanceCriteria.map((v, n) => (
                        <li key={n}>{v}</li>
                      ))}
                    </ul>
                    <p>
                      <b>资源前提：</b>
                      {s.nextStep.resourceAssumptions.join("；") ||
                        "未说明额外资源"}
                    </p>
                    <p>
                      <b>低资源替代：</b>
                      {s.nextStep.lowResourceAlternative}
                    </p>
                  </article>
                ))}
              {skillsOnly && !job.skills.length && (
                <p>信息不足，未生成技能缺口。</p>
              )}
            </div>
          ))}
        </section>
      ))}
      <section className="card">
        <h2>总体局限</h2>
        <ul>
          {run.result.overallLimitations.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
export function Evidence({ run }: { run: RunResult }) {
  const rationales = run.result.industries.flatMap((i) => [
    i.rationale,
    ...i.jobFunctions.flatMap((j) => [
      j.rationale,
      ...j.skills.map((s) => s.rationale),
    ]),
  ]);
  const usedIds = new Set(rationales.flatMap((r) => r.marketSignalIds));
  const used = run.market.signals.filter((s) => usedIds.has(s.id));
  return (
    <>
      <div className="card">
        <h2>本次生成记录</h2>
        <p>
          推荐逻辑 {run.meta.version} / 提示词 {run.meta.promptVersion} /
          输出规则 {run.meta.outputPolicyVersion}
        </p>
        <p>
          模型：{run.meta.model} · 时间：{run.meta.generatedAt}
        </p>
        <p>市场快照：{run.market.snapshotId}</p>
        <p className="hint">引用可追溯不代表每条解释已经得到独立事实核验。</p>
      </div>
      <div className="card">
        <h2>实际引用的市场来源</h2>
        {used.length ? (
          used.map((s) => (
            <article key={s.id}>
              <h3>{s.sourceTitle}</h3>
              <p>
                {s.date} · {s.region} · {s.industry} / {s.role}
              </p>
              <p>{s.statement}</p>
              <a href={s.sourceUrl} target="_blank" rel="noreferrer">
                原始聚合来源 ↗
              </a>
              <p>{s.limitations.join("；")}</p>
            </article>
          ))
        ) : (
          <p>本次没有引用外部市场证据，建议主要基于自报信息与模型背景知识。</p>
        )}
      </div>
      <div className="card">
        <h2>研究与资料限制</h2>
        <p>{run.meta.researchIds.join("、") || "未使用研究资料"}</p>
        {[...run.meta.researchLimitations, ...run.market.limitations].map(
          (s, i) => (
            <p key={i}>{s}</p>
          ),
        )}
      </div>
      {run.meta.survey && (
        <section className="card">
          <h2>经审核的问卷观察（不是市场预测）</h2>
          <p>
            资料 {run.meta.survey.datasetId} · 获批样本{" "}
            {run.meta.survey.sampleSize} · 调查日期{" "}
            {run.meta.survey.date ?? "未提供"} · {run.meta.survey.region}
          </p>
          {run.meta.survey.findings.map((f) => (
            <article key={f.id}>
              <h3>
                {f.id} · {f.questionIds.join("、")}
              </h3>
              <p>{f.statement}</p>
              <p>该题分母：{f.denominator}</p>
              <p className="hint">{f.limitations.join("；")}</p>
            </article>
          ))}
          <p className="hint">
            问卷为自报的样本观察，不代表个人能力或就业概率；列出的发现是提供给模型的上下文，逐条实际引用见研究
            ID。
          </p>
        </section>
      )}
      <div className="card">
        <h2>市场趋势与个体推断</h2>
        {run.result.industries.map((i, k) => (
          <div key={k}>
            <h3>{i.name}</h3>
            <Why r={i.rationale} />
          </div>
        ))}
      </div>
    </>
  );
}
