"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "../providers";
import { Results } from "../result-view";
import {
  listVersions,
  defaultVersion,
  getVersion,
} from "../../recommendation/registry";
import {
  predictScenarios,
  scenarioInputSchema,
  type ScenarioInput,
} from "../../prediction/scenario";
import { ScenarioView } from "../scenario-view";
export default function RecommendationPage() {
  const {
    profile,
    run,
    setRun,
    accessKey,
    setAccessKey,
    consent,
    preferredVersion,
  } = useSession();
  const [version, setVersion] = useState<string>(defaultVersion);
  useEffect(() => {
    // An invite link (?v=) can pre-select the version a tester should use.
    if (!preferredVersion) return;
    try {
      setVersion(getVersion(preferredVersion).version);
    } catch {}
  }, [preferredVersion]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [scenario, setScenario] = useState<ScenarioInput>(
    scenarioInputSchema.parse({}),
  );
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
      {consent.status === "undecided" && (
        <div className="notice">
          你还没有阅读参与说明。<Link href="/consent">先看一下</Link>
          ，再决定是否让本次结果进入测试记录。
        </div>
      )}
      {consent.status === "accepted" && (
        <div className="notice">
          测试模式：本次生成的画像与结果会以匿名方式记录（参与者编号{" "}
          {consent.context.participantId.slice(0, 8)}
          ）。生成后请到“使用反馈”页回答五个问题。
        </div>
      )}
      {version === "v3.2" && (
        <>
          <div className="card">
            <h2>先做数据支持的情景预测</h2>
            <p>
              这部分直接运行版本化规则，无需模型密钥；输入仅在当前页面内存中。补充条件会即时改变预测，不猜测未填写的情况。
            </p>
            <label htmlFor="task">主要任务</label>
            <select
              id="task"
              value={scenario.task}
              onChange={(e) =>
                setScenario({
                  ...scenario,
                  task: e.target.value as ScenarioInput["task"],
                })
              }
            >
              <option value="unknown">尚未确认</option>
              <option value="information">信息整理、分析或初稿制作</option>
              <option value="creative">内容、设计等创作</option>
              <option value="interpersonal">现场服务、沟通或协调</option>
            </select>
            <label htmlFor="resources">合规工具与训练资源</label>
            <select
              id="resources"
              value={scenario.resources}
              onChange={(e) =>
                setScenario({
                  ...scenario,
                  resources: e.target.value as ScenarioInput["resources"],
                })
              }
            >
              <option value="unknown">尚未确认</option>
              <option value="available">已具备</option>
              <option value="limited">资源受限</option>
            </select>
            <label htmlFor="learning">目标方向的实践基础</label>
            <select
              id="learning"
              value={scenario.learningPath}
              onChange={(e) =>
                setScenario({
                  ...scenario,
                  learningPath: e.target.value as ScenarioInput["learningPath"],
                })
              }
            >
              <option value="unknown">尚未确认</option>
              <option value="building">正在建立基础经验</option>
              <option value="established">已有独立实践经验</option>
            </select>
          </div>
          <ScenarioView forecast={predictScenarios(profile, scenario)} />
        </>
      )}
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
                  body: JSON.stringify({
                    profile,
                    version,
                    ...(version === "v3.2" ? { scenario } : {}),
                    ...(consent.status === "accepted"
                      ? { beta: consent.context }
                      : {}),
                  }),
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
          {run && run.beta?.stored && <Link href="/feedback">填写反馈 →</Link>}
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
      {run && (
        <>
          {run.beta && (
            <p className={run.beta.stored ? "hint" : "error"}>
              {run.beta.stored
                ? `本次结果已匿名记录（${run.beta.store}）。`
                : `本次结果未能记录：${run.beta.error ?? "未知原因"}`}
            </p>
          )}
          <p className="hint">
            以下为上次生成的建议及当时条件。调整上方条件后，请重新生成行业与岗位建议。
          </p>
          <Results run={run} />
        </>
      )}
    </>
  );
}
