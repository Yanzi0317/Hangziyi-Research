"use client";
import Link from "next/link";
import { useSession } from "../providers";
import { Evidence } from "../result-view";
export default function Page() {
  const { run } = useSession();
  return (
    <>
      <div className="eyebrow">EVIDENCE & UNCERTAINTY</div>
      <h1>建议背后的证据与边界</h1>
      {run ? (
        <Evidence run={run} />
      ) : (
        <Link className="button" href="/recommendation">
          先生成职业建议
        </Link>
      )}
    </>
  );
}
