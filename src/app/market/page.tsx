"use client";
import { useEffect, useState } from "react";
import type { MarketContext } from "../../contracts";
export default function Page() {
  const [data, setData] = useState<MarketContext | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/market")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setData(d);
      })
      .catch(() => setError("市场资料暂不可用"));
  }, []);
  return (
    <>
      <div className="eyebrow">LABOR MARKET</div>
      <h1>只使用可追溯的聚合资料</h1>
      <p>
        不抓取个人社交帖、姓名或招聘联系人。人工快照优先；实时搜索暂未配置。
      </p>
      {error && <p role="alert">{error}</p>}
      {!data && !error && <p>读取中…</p>}
      {data && (
        <>
          <div className="notice">
            快照 {data.snapshotId} · {data.signals.length} 条有效信号
            <br />
            {data.limitations.join("；")}
          </div>
          {data.signals.map((s) => (
            <article className="card" key={s.id}>
              <h2>
                {s.industry} / {s.role}
              </h2>
              <p>
                {s.date} · {s.region}
              </p>
              <p>{s.statement}</p>
              <ul>
                {s.commonRequirements.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
              <a href={s.sourceUrl} rel="noreferrer" target="_blank">
                {s.sourceTitle}
              </a>
              <p className="hint">{s.limitations.join("；")}</p>
            </article>
          ))}
        </>
      )}
    </>
  );
}
