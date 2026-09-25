"use client";
import { useRef, useState } from "react";
import { listVersions } from "../../recommendation/registry";
import { useSession } from "../providers";
import { Results } from "../result-view";
import type { comparePersona } from "../../comparison";
type Comparison = Awaited<ReturnType<typeof comparePersona>>;
export default function Page() {
  const { accessKey, setAccessKey } = useSession();
  const [id, setId] = useState("persona-01"),
    [left, setLeft] = useState("v1"),
    [right, setRight] = useState("v3");
  const [data, setData] = useState<Comparison | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  return (
    <>
      <div className="eyebrow">REGRESSION · NOT USER RESEARCH</div>
      <h1>同一输入，看见版本差异</h1>
      <p>
        十份合成画像仅用于软件回归，不是 Beta
        参与者。比较行业、岗位、技能状态和不确定性原文；差异不代表优劣。
      </p>
      <div className="card">
        <label htmlFor="persona">测试画像</label>
        <select id="persona" value={id} onChange={(e) => setId(e.target.value)}>
          {Array.from({ length: 10 }, (_, i) => {
            const value = `persona-${String(i + 1).padStart(2, "0")}`;
            return <option key={value}>{value}</option>;
          })}
        </select>
        <div className="grid">
          {[
            ["左侧版本", left, setLeft],
            ["右侧版本", right, setRight],
          ].map(([label, value, set], i) => (
            <div key={i}>
              <label htmlFor={`v${i}`}>{label as string}</label>
              <select
                id={`v${i}`}
                value={value as string}
                onChange={(e) => (set as typeof setLeft)(e.target.value)}
              >
                {listVersions().map((v) => (
                  <option key={v.version} value={v.version}>
                    {v.version} · {v.status}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <label htmlFor="compare-access">访问密钥</label>
        <input
          id="compare-access"
          type="password"
          value={accessKey}
          onChange={(e) => setAccessKey(e.target.value)}
        />
        <p className="hint">
          点击将串行调用两次模型（无效输出最多各纠错一次），可能产生费用。使用同一人工市场快照，禁用实时搜索。
        </p>
        <button
          disabled={busy}
          onClick={async () => {
            if (lock.current) return;
            lock.current = true;
            setBusy(true);
            setData(null);
            setError("");
            try {
              const r = await fetch("/api/compare", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-access-key": accessKey,
                },
                body: JSON.stringify({ personaId: id, left, right }),
              });
              const d = await r.json();
              if (!r.ok) throw new Error(d.error);
              setData(d);
            } catch (e) {
              setError(e instanceof Error ? e.message : "对比失败");
            } finally {
              lock.current = false;
              setBusy(false);
            }
          }}
        >
          {busy ? "正在运行两个版本…" : "运行对比"}
        </button>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </div>
      {data && (
        <>
          <div className="notice">{data.limitations.join(" ")}</div>
          <section className="card">
            <h2>差异（新增 / 移除 / 共同项）</h2>
            {data.diff ? (
              Object.entries(data.diff).map(([k, v]) => (
                <details key={k} open>
                  <summary>
                    {
                      (
                        {
                          industries: "推荐行业",
                          jobFunctions: "岗位职能",
                          skills: "技能与状态",
                          uncertaintyWording: "不确定性与局限原文",
                        } as Record<string, string>
                      )[k]
                    }
                  </summary>
                  <div className="grid">
                    <div>
                      <b>移除或改写前</b>
                      <ul>
                        {v.removed.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <b>新增或改写后</b>
                      <ul>
                        {v.added.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <p className="hint">
                    共同项 {v.common.length}；
                    {v.orderChanged
                      ? "仅顺序有变化，不表示排名变化"
                      : "精确规范化标签比较；命名变化也可能表现为增删。"}
                  </p>
                </details>
              ))
            ) : (
              <p>存在失败结果，不能生成完整差异。</p>
            )}
          </section>
          <div className="grid compare">
            {[data.left, data.right].map((side, i) => (
              <div key={i}>
                <h2>{i === 0 ? "左侧" : "右侧"}结果</h2>
                {side.status === "success" ? (
                  <>
                    <Results run={side.run} />
                    <details>
                      <summary>技能与行动</summary>
                      <Results run={side.run} skillsOnly />
                    </details>
                  </>
                ) : (
                  <p className="error">{side.error}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
