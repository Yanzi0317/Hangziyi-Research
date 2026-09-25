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
        当前默认
        v3.2：使用49份问卷与六人访谈的匿名汇总进行条件性情景预测，可不依赖模型先查看。
        Q25因统计口径问题排除。旧版本保留；没有统计概率预测或 Beta 调研。
      </div>
    </>
  );
}
