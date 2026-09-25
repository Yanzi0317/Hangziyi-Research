import type { Metadata } from "next";
import Link from "next/link";
import { Providers } from "./providers";
import "./globals.css";
export const metadata: Metadata = {
  title: "职路 · 职业探索",
  description: "有依据、有边界、可验证的职业探索",
};
const links = [
  ["/profile", "我的画像"],
  ["/recommendation", "职业方向"],
  ["/market", "市场资料"],
  ["/skill-gap", "技能与行动"],
  ["/evidence", "证据与局限"],
  ["/compare", "版本对比"],
  ["/feedback", "使用反馈"],
];
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <Providers>
          <header>
            <Link className="brand" href="/">
              职路 <small>CAREER EXPLORER</small>
            </Link>
            <nav aria-label="主导航">
              {links.map(([href, label]) => (
                <Link key={href} href={href}>
                  {label}
                </Link>
              ))}
            </nav>
          </header>
          <main>{children}</main>
          <footer>
            探索方向，不预测命运。没有 Beta
            调研、账号或研究数据收集。画像仅保留在当前页面会话内存中，刷新即清除。
          </footer>
        </Providers>
      </body>
    </html>
  );
}
