import type { Metadata } from "next";
import Link from "next/link";
import { Providers } from "./providers";
import "./globals.css";
export const metadata: Metadata = {
  title: "职路 · 职业探索",
  description: "有依据、有边界、可验证的职业探索",
};
const links = [
  ["/consent", "参与说明"],
  ["/profile", "我的画像"],
  ["/recommendation", "职业方向"],
  ["/market", "市场资料"],
  ["/skill-gap", "技能与行动"],
  ["/evidence", "证据与局限"],
  ["/feedback", "使用反馈"],
  ["/compare", "版本对比（开发）"],
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
            探索方向，不预测命运。Beta
            测试记录仅在你同意后以匿名方式保存，不含姓名、联系方式、IP
            或设备信息；没有账号。画像本身只保留在当前页面会话内存中，刷新即清除。
          </footer>
        </Providers>
      </body>
    </html>
  );
}
