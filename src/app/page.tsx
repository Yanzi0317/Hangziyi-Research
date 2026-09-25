import Link from "next/link";
export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="eyebrow">以证据为起点 · 以行动来验证</div>
        <h1>
          下一步怎么走，
          <br />
          从你已经会的事开始。
        </h1>
        <p className="lead">
          把经历、技能与目标转化为值得探索的行业和岗位。每条建议展示依据、假设与限制，不给职业打分，也不预测你的命运。
        </p>
        <div className="actions">
          <Link className="button" href="/profile">
            整理我的画像 →
          </Link>
          <Link href="/compare">查看版本对比</Link>
        </div>
      </section>
      <section className="grid">
        <div className="card">
          <span className="eyebrow">01 / 认识现状</span>
          <h2>经验比标签更具体</h2>
          <p>关注实际任务与技能。未填写的信息不等于你缺乏能力。</p>
        </div>
        <div className="card">
          <span className="eyebrow">02 / 验证方向</span>
          <h2>建议应当可以检查</h2>
          <p>看到为什么推荐、需要验证什么，以及一份可以完成的成果。</p>
        </div>
      </section>
      <div className="notice">
        当前默认 v3：结合五条定性访谈观察。v2 问卷资料未提供；v4
        为未验证草案。公开市场资料为空时会明确说明。本站不开展 Beta 调研。
      </div>
    </>
  );
}
