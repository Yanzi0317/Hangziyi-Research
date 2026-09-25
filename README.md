# 职路 · Hangziyi Research

面向中国劳动力市场的职业探索应用。Next.js + TypeScript + Zod，默认推荐 v3，支持 v1/v2/v3/v4 选择和合成画像回归。

## 当前已实现

- 中文画像表单、校验、技能标签；画像与结果仅在页面会话内存中，刷新即清除。
- 服务端 OpenAI-compatible JSON 模型调用；结构、引用及基本隐私检查，格式问题最多修复一次。
- 行业/岗位建议、技能与行动、证据与不确定性展示。
- 人工市场快照、进程内聚合缓存、可注入搜索数据源接口。实时搜索尚未接入供应商。
- /compare 和 CLI：固定合成画像比较行业、岗位、技能状态与不确定性原文。
- 没有 Beta 调研、参与者存储、反馈上传、研究导出、账号或数据库。

## 版本状态

| 版本 | 当前实现 | 证据边界 |
| --- | --- | --- |
| v1 / v1.0 | 基础推荐提示词和共享引擎 | 画像、模型背景知识、公开聚合快照 |
| v2 | 可运行的独立版本 | 问卷数据未提供，没有虚构调查规则 |
| v3（默认） | 五条访谈观察的任务分析 | 访谈日期、地区、样本与方法未知 |
| v4 | 可运行的待验证提示词草案 | 无 Beta 数据，不声称效果提升 |

技能行动使用相同结构协议，在同次模型调用中生成。版本比较反映整份提示词的影响，不是假设已经拆分的独立行动引擎比较。

## 本地运行

安装 Node.js 22+ 与 pnpm 11.25.0（本次使用 Node 24 验证）。

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm typecheck
pnpm test
pnpm build
```

复制 .env.example 为 .env.local，填写服务端 LLM_API_KEY、LLM_BASE_URL、LLM_MODEL。根地址包含供应商所需的 /v1 等路径，程序再追加 /chat/completions。供应商须支持 JSON object 响应模式。缺少配置时页面和构建仍正常，生成操作明确失败。

公开环境必须设置 APP_ACCESS_KEY，使用者在页面临时输入该访问密钥；它不同于模型 API key。模型密钥只在服务端。ENABLE_COMPARISON 默认 false，明确启用后才允许网页付费对比。

## 回归命令

```sh
pnpm personas --version v3 --all --dry-run
pnpm compare --all --left v1 --right v3 --dry-run
# CLI 不自动读取 Next.js 的 .env.local；可通过 Node 显式加载：
node --env-file=.env.local --import tsx scripts/run-personas.ts --version v3 --all
node --env-file=.env.local --import tsx scripts/compare.ts --all --left v1 --right v3
```

十份 tests/personas 文件明确为 synthetic/software_regression_only_not_research，学校背景仅为测试覆盖标签，不送入模型。它们不是 Beta 参与者，不提供调研证据。

真实运行需要模型配置，可能收费。逐版本输出写到 tests/outputs/<version>/；对比写到 gitignored 的 work/comparisons/。缺少 API key 时拒绝运行，不生成替代输出。默认不覆盖已有单份结果。当前只完成 mock 合同测试，未生成真实模型基线，因此历史发布说明中的前后引文仍不能补写。

## 市场资料

维护 data/market-snapshots/initial.json。src/contracts.ts 中的 snapshotSchema 是实际校验规则，src/market-data/snapshot.schema.json 为对应 JSON Schema。每条聚合信号必须包含出处、日期、地区、行业、角色、适用期和限制。不录入个人社交帖或招聘联系人资料。

初始快照为空，不用伪造数据填充。搜索接口仅保留可注入适配能力；当前没有自动联网查询市场信息。

## 新增逻辑版本

1. 新建 src/recommendation/<version>/system-prompt.md。
2. 在 registry.ts 注册新版本及研究依据；保留旧提示词。
3. 在 engine.ts 明确其提示词组合；更改共享协议或输出规则需独立标版本。
4. 使用相同模型参数、画像和快照比较，保留失败状态，不能将模型随机差异直接解释成改进。
5. 通过测试后单独决定是否改变 defaultVersion。当前仍为 v3。

## 部署到 Vercel

导入此仓库，使用 Next.js preset，根目录为仓库根，构建命令 pnpm build。配置 LLM_API_KEY、LLM_BASE_URL、LLM_MODEL、APP_ACCESS_KEY；需要网页比较时再设置 ENABLE_COMPARISON=true。Preview/Production 的变量分别配置，变更后重新部署。密钥不得使用 NEXT_PUBLIC_ 前缀。

建议先使用受保护的 Preview 校对。公开环境没有 APP_ACCESS_KEY 时，模型 API 拒绝调用。没有用户身份验证体系，不应将共享访问密钥作为大规模公开运营的完整防护。

Vercel Hobby 仅适用于个人非商业用途；模型 API 费用另计。部署本次尚未执行，没有公共网址。参考：[环境变量](https://vercel.com/docs/environment-variables)、[GitHub 部署](https://vercel.com/docs/git/vercel-for-github)。

## 当前限制

输出约束和隐私规则是风险防线，不能保证识别全部自然语言违规或身份信息；不要输入身份细节。模型服务及托管平台的留存需按供应商配置另行核实。课程与证书不做联网核验，默认推荐项目任务。未完成真实模型端到端质量评估。

此前 prompts/ 中的文档保留为设计历史，含 Beta 的历史计划不代表当前实现或授权；当前以此 README 和“排除 Beta 调研”范围为准。
