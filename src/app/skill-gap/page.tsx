"use client";
import Link from "next/link";
import { useSession } from "../providers";
import { Results } from "../result-view";
export default function Page() {
  const { run } = useSession();
  return (
    <>
      <div className="eyebrow">SKILLS & ACTIONS</div>
      <h1>用成果验证下一步</h1>
      <p>未提及不等于不会。先区分需要验证的能力与明确的技能缺口。</p>
      {run ? (
        <Results run={run} skillsOnly />
      ) : (
        <Link className="button" href="/recommendation">
          先生成职业建议
        </Link>
      )}
    </>
  );
}
