# Hangziyi Research

面向中国劳动力市场的 AI 职业探索网站。

## 当前状态：尚不可部署

当前仓库主要为空文件骨架，没有 `package.json`、可运行的 Next.js 应用、推荐引擎或 `/compare` 页面。v1/v2/v3 提示词、测试画像及 CLI 尚未实现。输出目录中的 `.gitkeep` 不是测试结果。不得将此仓库的现状描述为已经完成的 v3。

目标发布行为：新推荐默认 v3，受保护的 `/compare` 可选择 v1、v2、v3；先部署校对，再决定是否进入 Beta。

## 本地设置（实现完成后）

1. 安装与项目 `engines` 配置一致的 Node.js；该配置应由应用实现确定。
2. 使用提交的 lockfile 执行 `npm ci`。当前尚无 package.json，不能执行此步骤。
3. 将 `.env.example` 复制为 `.env.local`，填写模型服务的 API key、API 根地址与模型标识。
4. 确认 `.env.local` 被 Git 忽略；不要把密钥提交到仓库或聊天中。
5. 项目实现必须提供 `npm run dev`、`npm run lint`、`npm run typecheck`、`npm test` 和 `npm run build`。这些命令当前尚未定义。

## 环境变量

| 名称 | 用途 |
| --- | --- |
| LLM_API_KEY | 模型服务密钥，只允许服务端读取 |
| LLM_BASE_URL | 兼容 API 根地址，包含供应商要求的版本路径；调用封装再追加接口路径 |
| LLM_MODEL | 供应商实际支持的模型标识 |

这些是待实现封装的配置约定，不表示当前代码已消费它们。缺少密钥不得阻止静态页面构建，但模型请求须返回明确错误。不得使用 NEXT_PUBLIC_ 暴露密钥。

## 添加逻辑版本

1. 在 `src/recommendation/<new-version>/` 新建引擎、manifest 和 system-prompt.md，遵循已实现的共享协议。
2. 保留旧版本文件及冻结哈希，不覆盖旧提示词。
3. 在 registry 注册新版本；默认版本与可选版本分开管理。部署本次要求默认 v3，v1/v2 仍可选。
4. 记录提示词、市场及研究快照、行动计划和输出规则版本。
5. 使用相同合成画像与受控配置回归，说明模型随机性及其他配置变化。
6. 通过测试后再切换默认版本。未知版本报错，不回退伪装成功。

当前引擎和注册表为空，以上是实施约定，并非现有可运行接口。

## Vercel 手动部署（前置实现通过构建后）

1. 登录 Vercel，选择 Add New → Project，连接 GitHub 并导入 `Yanzi0317/Hangziyi-Research`。
2. 选择实际包含 package.json 的 Root Directory；采用 Next.js preset，使用项目的安装和构建脚本。
3. 在项目 Settings → Environment Variables 中设置上述三个变量。只为需要的 Preview/Production 环境配置，不把密钥写入代码或 vercel.json。
4. 先用非生产分支生成 Preview。配置变更后重新部署才能生效。
5. Preview 必须有访问保护，尤其是能调用收费模型的 `/compare` 和推荐 API；保护页面同时保护接口。
6. 等待 Ready，保存实际部署 URL 与提交 SHA，按下方清单校对。没有成功部署不能填写示例 URL 冒充结果。
7. 校对完成后仍不自动开放 Beta；记录待用户验收状态。

Vercel Hobby 仅限个人非商业用途。免费托管不代表模型调用免费。账户或提交作者权限问题应通过正确账户授权解决，不能伪造作者身份。

官方参考：[GitHub 集成](https://vercel.com/docs/git/vercel-for-github)、[环境变量](https://vercel.com/docs/environment-variables)、[Preview 环境](https://vercel.com/docs/deployments/environments)、[Hobby 适用范围](https://vercel.com/docs/plans/hobby)。

## 部署后校对与 Beta 门槛

- 首页、六个模块与 /compare 可访问，手机布局与中文文案正常。
- 合成画像生成的结果元数据显示实际执行 v3；v1/v2 选择运行独立旧版本。
- 缺失配置、超时、失败及重复点击得到正确处理。
- 引用、日期、地区、不确定性和输出规则显示正确，无虚构调查数据。
- 客户端与日志不泄露密钥或画像；Feedback 未授权不保存。
- 对比 API 受保护，不是公开无限模型调用入口。
- 报告实际测试项、失败项、部署 URL 和提交 SHA。功能不完整时不标记为可进入 Beta。

部署提示词见 `prompts/prompt-14-deploy.md`。
