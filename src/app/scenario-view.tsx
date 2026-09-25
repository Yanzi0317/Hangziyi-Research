import type { ScenarioForecast } from "../prediction/scenario";

export function ScenarioView({ forecast }: { forecast: ScenarioForecast }) {
  return (
    <section className="card">
      <h2>研究支持的情景预测</h2>
      <p>
        方法 {forecast.methodVersion} · 49份问卷与六人定性访谈 ·
        未经回测的条件规则，不是统计概率模型。
      </p>
      <p>{forecast.horizon}</p>
      <p>
        问卷按49份真实汇总接入，未缩放；提供者已更正同意记录。Q25因跳题分母问题排除。
      </p>
      {forecast.missingInformation.map((s) => (
        <p className="hint" key={s}>
          {s}
        </p>
      ))}
      {forecast.scenarios.map((s) => (
        <article className="skill" key={s.id}>
          <h3>{s.title}</h3>
          <p>
            <b>条件性预测：</b>
            {s.prediction}
          </p>
          <p>
            <b>前提：</b>
            {s.condition}
          </p>
          <p>
            <b>实际使用的输入：</b>
            {s.inputsUsed.join("、")}
          </p>
          <p>
            <b>怎样验证：</b>
            {s.verification}
          </p>
          <p>
            <b>另一种可能：</b>
            {s.alternative}
          </p>
          <p className="hint">{s.limitation}</p>
          <details>
            <summary>研究依据 {s.evidenceIds.join("、")}</summary>
            {forecast.evidence.findings
              .filter((f) => s.evidenceIds.includes(f.id))
              .map((f) => (
                <p key={f.id}>
                  {f.id} · {f.section}
                  <br />
                  {f.statement}
                </p>
              ))}
            {forecast.survey.findings
              .filter((f) => s.evidenceIds.includes(f.id))
              .map((f) => (
                <p key={f.id}>
                  {f.id} · {f.questionIds.join("、")} · 分母{f.denominator}
                  <br />
                  {f.statement}
                  <br />
                  {f.limitations.join("；")}
                </p>
              ))}
          </details>
        </article>
      ))}
      <details>
        <summary>数据来源、方法与限制</summary>
        <p>
          {forecast.evidence.source} · 样本 {forecast.evidence.sampleSize} ·{" "}
          {forecast.evidence.method}
        </p>
        <p>
          采集日期：{forecast.evidence.collectedAt ?? "未提供"} ·{" "}
          {forecast.evidence.region}
        </p>
        <p>资料审核日期：{forecast.evidence.reviewedAt}（不是采集日期）</p>
        <p>来源指纹：{forecast.evidence.sourceHash}</p>
        <ul>
          {forecast.evidence.limitations.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <p>
          问卷来源：{forecast.surveyProvenance.source}；交叉核对：
          {forecast.surveyProvenance.crossCheckSource}（同一份调查）。报告月份
          {forecast.surveyProvenance.reportMonth}，采集日期未提供。地区：
          {forecast.survey.region}。
        </p>
        <p>{forecast.surveyProvenance.method}</p>
        <p>{forecast.survey.reviewNote}</p>
        <p>问卷来源指纹：{forecast.survey.sourceHash}</p>
        {forecast.survey.findings
          .filter((f) => forecast.methodEvidenceIds.includes(f.id))
          .map((f) => (
            <p key={f.id}>
              {f.id} · {f.questionIds.join("、")} · {f.statement}
            </p>
          ))}
        <ul>
          {forecast.survey.limitations.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}
