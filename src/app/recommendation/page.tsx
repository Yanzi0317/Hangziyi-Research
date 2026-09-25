"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "../providers";
import { Results } from "../result-view";
import { listVersions, defaultVersion } from "../../recommendation/registry";
export default function RecommendationPage() {
  const { profile, run, setRun, accessKey, setAccessKey } = useSession();
  const [version, setVersion] = useState<string>(defaultVersion);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  if (!profile)
    return (
      <>
        <h1>先整理你的画像</h1>
        <Link className="button" href="/profile">
          填写画像
        </Link>
      </>
    );
  return (
    <>
      <div className="eyebrow">CAREER DIRECTIONS</div>
      <h1>值得探索的方向</h1>
      <p className="lead">
        这些是需要验证的方向，不是职业排名。生成时会向配置的模型服务发送当前画像。
      </p>
      <div className="card">
        <label htmlFor="version">推荐逻辑版本</label>
        <select
          id="version"
          value={version}
          onChange={(e) => setVersion(e.target.value)}
        >
          {listVersions().map((v) => (
            <option key={v.version} value={v.version}>
              {v.version} · {v.status}
            </option>
          ))}
        </select>
        <label htmlFor="access">访问密钥（公开部署时必需，仅会话内存）</label>
        <input
          id="access"
          type="password"
          autoComplete="off"
          value={accessKey}
          onChange={(e) => setAccessKey(e.target.value)}
        />
        <div className="actions">
          <button
            disabled={busy}
            onClick={async () => {
              if (lock.current) return;
              lock.current = true;
              setBusy(true);
              setError("");
              try {
                const response = await fetch("/api/recommend", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "x-access-key": accessKey,
                  },
                  body: JSON.stringify({ profile, version }),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error);
                setRun(data, profile);
              } catch (e) {
                setError(e instanceof Error ? e.message : "请求失败");
              } finally {
                lock.current = false;
                setBusy(false);
              }
            }}
          >
            {busy ? "正在检查证据并生成…" : "生成探索建议"}
          </button>
          {run && <Link href="/skill-gap">查看技能与行动 →</Link>}
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
      {run && <Results run={run} />}
    </>
  );
}
