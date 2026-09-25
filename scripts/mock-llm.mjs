import { createServer } from "node:http";
// Local stand-in for an OpenAI-compatible endpoint so the Beta flow (consent →
// profile → generate → feedback → export) can be rehearsed without paying for a
// model. It returns a fixed, schema-valid answer that echoes the profile, and
// must never be used for real testers: LLM_BASE_URL=http://127.0.0.1:8787
const port = Number(process.env.PORT ?? 8787);
const rationale = (fields, research = []) => ({
  why: "这是本地假模型的固定回答，仅用于演练流程，不是真实建议。",
  profileFields: fields,
  marketSignalIds: [],
  researchFindingIds: research,
  marketTrend: null,
  userInference: "根据自报技能与目标提出的待验证方向。",
  assumptions: ["假设自报信息准确"],
  limitations: ["假模型输出，无任何证据价值。"],
});
createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const { messages } = JSON.parse(body);
    const input = JSON.parse(messages[1].content);
    const ids = (input.researchRecords ?? []).map((r) => r.id);
    const doc = ids.filter((i) => i.startsWith("DOCINT-")).slice(0, 1);
    const survey = ids.filter((i) => i.startsWith("SURVEY-")).slice(0, 1);
    const skill = input.profile.skills[0] ?? "沟通";
    const result = {
      industries: ["行业方向一", "行业方向二", "行业方向三"].map((name, i) => ({
        name: `${name}（${input.profile.industry}相关）`,
        rationale: rationale(
          ["industry", "careerGoals"],
          i === 0 ? survey : [],
        ),
        jobFunctions: [
          {
            name: `职能示例 ${i + 1}`,
            rationale: rationale(["skills"], doc),
            examplePositions: ["示例岗位"],
            exampleCompanies: [],
            skills: [
              {
                skill,
                status: "self_reported_strength",
                rationale: rationale(["skills"]),
                nextStep: {
                  type: "project",
                  title: `用 ${skill} 完成一个可检查的小项目`,
                  steps: ["确定范围", "完成并记录决策"],
                  deliverable: "可运行或可阅读的成果",
                  acceptanceCriteria: ["他人可复现", "能解释关键决定"],
                  verificationMethod: "请熟悉该领域的人复核",
                  resourceAssumptions: [],
                  lowResourceAlternative: "只用公开资料完成",
                },
              },
            ],
            taskChanges: doc.length ? ["假模型：任务变化示例"] : [],
            workloadQuestions: doc.length ? ["假模型：工作量核实问题"] : [],
          },
        ],
      })),
      overallLimitations: ["假模型输出，仅用于流程演练。"],
    };
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        choices: [
          {
            finish_reason: "stop",
            message: { content: JSON.stringify(result) },
          },
        ],
      }),
    );
  });
}).listen(port, "127.0.0.1", () =>
  console.log(`mock LLM listening on http://127.0.0.1:${port} (dev only)`),
);
