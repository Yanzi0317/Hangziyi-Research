import { z } from "zod";
import { profileSchema } from "../contracts.ts";
import { interviewEvidence } from "../research/interview-evidence.ts";
import {
  reviewedSurvey,
  surveyProvenance,
} from "../research/reviewed-survey.ts";

export const scenarioInputSchema = z
  .object({
    task: z
      .enum(["unknown", "information", "creative", "interpersonal"])
      .default("unknown"),
    resources: z.enum(["unknown", "available", "limited"]).default("unknown"),
    learningPath: z
      .enum(["unknown", "building", "established"])
      .default("unknown"),
  })
  .strict();
export type ScenarioInput = z.infer<typeof scenarioInputSchema>;
export type Scenario = {
  id: string;
  title: string;
  prediction: string;
  condition: string;
  evidenceIds: string[];
  inputsUsed: string[];
  verification: string;
  alternative: string;
  limitation: string;
};

// Author-written conditional rules, not fitted coefficients or population estimates.
// Unknown context stays unknown. Demographic fields never determine outcomes.
export function predictScenarios(input: unknown, context: unknown = {}) {
  const profile = profileSchema.parse(input);
  const c = scenarioInputSchema.parse(context);
  const active = ["regular", "build_tools"].includes(profile.aiUseExperience);
  const scenarios: Scenario[] = [
    {
      id: "SC-VERIFY",
      title: "技能需求预测：核验责任可能增加",
      prediction: active
        ? "如果继续把AI输出用于真实工作，检查来源、计算与业务适用性的责任可能更重要；已使用AI不代表已经具备核验能力。"
        : "如果开始或扩大AI使用，核验与领域判断可能成为新的学习需求；低使用频率本身不是能力不足。",
      condition: "仅在AI输出实际进入工作流程时适用。",
      evidenceIds: [
        "DOCINT-01",
        "DOCINT-03",
        "SURVEY-CONFIDENCE",
        "SURVEY-USE",
      ],
      inputsUsed: ["aiUseExperience"],
      verification:
        "选一个不含敏感数据的真实任务，保留独立答案与AI答案，核对来源、错误和修改理由，请熟悉业务的人复核。",
      alternative:
        "若任务不适合使用AI或组织不允许使用，优先改进原有专业流程，不强制引入工具。",
      limitation: "没有实测你的技能，也没有证据量化核验工作增长幅度。",
    },
  ];
  if (c.task !== "unknown")
    scenarios.push({
      id: "SC-TASK",
      title: "任务结构预测",
      prediction:
        c.task === "interpersonal"
          ? "如果核心工作依赖现场沟通和协调，AI可能先辅助准备与记录，情境判断和责任仍需人承担；不能据此保证岗位安全。"
          : "如果信息整理或初稿是核心任务，AI可能压缩初步制作环节，并把工作重心推向审查、整合和判断。",
      condition: "用户自选的任务类型与真实主要任务一致，且工具可用、允许使用。",
      evidenceIds: ["DOCINT-01", "SURVEY-STAFFING"],
      inputsUsed: ["scenario.task"],
      verification:
        "拆出一个实际流程，分别记录人工步骤、AI辅助步骤、返工和最终责任；比较同类任务而非不同难度任务。",
      alternative:
        "若工具不可靠、任务依赖现场信息或流程不能接入，原来的任务结构可能保持不变。",
      limitation: "任务类别很粗；不能推断具体行业需求、招聘人数或收入。",
    });
  if (active)
    scenarios.push({
      id: "SC-WORKLOAD",
      title: "工作负荷预测：效率未必换来空闲",
      prediction:
        "如果团队把工具提速纳入交付标准，节省的制作时间可能被更多版本、更快交付与检查工作占用。",
      condition: "已自报规律使用或构建AI工具，但团队是否提高要求尚未知。",
      evidenceIds: ["DOCINT-02"],
      inputsUsed: ["aiUseExperience"],
      verification:
        "在下一次同类交付中分别记录制作、核验、返工时间和交付数量，并询问负责人验收标准是否改变。",
      alternative: "若交付要求不变且检查成本可控，也可能真正减少总工作时间。",
      limitation:
        "访谈是机制线索，不证明你的团队会提高要求，也不能从问卷Q25推算工时收益。",
    });
  if (c.learningPath === "building")
    scenarios.push({
      id: "SC-LEARNING",
      title: "经验积累预测：需要保留独立练习",
      prediction:
        "如果入门训练任务直接交给AI，完成成果不一定带来判断能力；获取反馈和独立处理基础任务可能更重要。",
      condition:
        "用户明确选择正在建立该方向的基础经验；不按年龄、学历或工龄推定。",
      evidenceIds: ["DOCINT-04", "DOCINT-03"],
      inputsUsed: ["scenario.learningPath"],
      verification:
        "先独立完成一个小任务，再用AI修订并列出差异，获得反馈后独立完成同类任务，检验能否解释关键决定。",
      alternative:
        "若有导师带教、错误复盘和独立练习，AI也可能帮助更快建立经验。",
      limitation: "不声称初级岗位已普遍减少，作品也不能替代真实任职经历。",
    });
  if (c.task === "creative")
    scenarios.push({
      id: "SC-VALUE",
      title: "议价情景预测",
      prediction:
        "如果客户接受低成本的AI初稿，标准化内容可能面临议价压力；需求理解、审美取舍和质量责任可能成为差异点。",
      condition:
        "用户自选创作任务，且客户确实接受AI替代产出；后一个条件尚未核实。",
      evidenceIds: ["DOCINT-06"],
      inputsUsed: ["scenario.task"],
      verification:
        "核对近期真实项目需求和验收标准，向客户确认哪些质量、版权与责任要求不能由低成本初稿满足。",
      alternative: "若客户重视原创性、品牌理解或责任保障，价格压力可能不出现。",
      limitation: "没有报价时间序列，不预测工资或价格跌幅。",
    });
  scenarios.push({
    id: "SC-RESOURCE",
    title: "资源条件预测",
    prediction:
      c.resources === "available"
        ? "如果已具备合规工具和训练资源，下一阶段收益仍可能取决于流程整合、核验与业务判断，而不只取决于是否有账号。"
        : c.resources === "limited"
          ? "如果工具或训练受限，适应可能先发生在不依赖付费工具的专业知识和核验流程上；不宜假设自动化项目马上能落地。"
          : "工具、训练和使用政策未知，暂不判断AI能否带来实际收益；资源具备与受限两种情景都保留。",
    condition: "资源由用户确认；公司规模、所在城市和学历不是替代指标。",
    evidenceIds: ["DOCINT-05", "SURVEY-RESOURCES"],
    inputsUsed: ["scenario.resources"],
    verification:
      "向组织确认允许使用的工具、数据边界、培训与最终审核责任；资源不足时先用公开资料做人工核验练习。",
    alternative: "即使资源齐备，任务不适配或纠错成本较高时也可能没有收益。",
    limitation: "访谈对此存在不同观点，没有估计资源与就业结果的因果效应。",
  });
  return {
    methodVersion: "scenario-v1.0",
    kind: "conditional_scenario" as const,
    horizon: "下一次同类任务或学习实践；不是按年份外推的就业预测",
    context: c,
    evidence: interviewEvidence,
    scenarios,
    survey: reviewedSurvey,
    surveyProvenance,
    methodEvidenceIds: [
      "SURVEY-UNCERTAINTY",
      "SURVEY-TRANSPARENCY",
      "DOCINT-07",
    ],
    missingInformation: [
      ...(c.task === "unknown"
        ? ["主要任务类型未知，未生成针对具体任务的预测。"]
        : []),
      ...(c.resources === "unknown" ? ["工具、培训、合规政策未知。"] : []),
      ...(c.learningPath === "unknown"
        ? ["该方向的学习阶段未知，未推定是否为入门者。"]
        : []),
    ],
  };
}
export type ScenarioForecast = ReturnType<typeof predictScenarios>;
