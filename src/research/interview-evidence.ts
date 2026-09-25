// Reviewed aggregate paraphrases only: no participant quotes, identities or profiles.
export const interviewEvidence = {
  datasetId: "interview-report-6-v1",
  source: "Interview Finding Part.docx",
  sourceHash:
    "d5ff8e8dff9c5a096d78f6ea2e8fcc4aad9fa6c77e04e899ee1c3573a9c0ef91",
  sampleSize: 6,
  method: "半结构式访谈；研究报告说明访谈设计时长约20–35分钟",
  collectedAt: null,
  region: "中国劳动市场研究语境；具体采集地区未提供",
  reviewedAt: "2026-09-25",
  limitations: [
    "六人定性访谈，不代表全国或某个行业；各主题没有可用于估计发生率的编码计数。",
    "没有纵向就业结局、对照组或模型回测；以下是研究启发的条件性情景预测，不是统计预测。",
    "访谈日期、具体地区、招募方法未提供；审核日期不是数据采集日期。",
    "访谈报告中转述的问卷不重复计为另一批证据；文中二手文献不当作已核验市场来源。",
  ],
  findings: [
    {
      id: "DOCINT-01",
      section:
        "AI Is Restructuring Tasks Before It Replaces Entire Occupations",
      statement:
        "访谈提示信息整理和初稿任务可能交给AI，人仍需承担情境判断、协调和责任；这不等于整个职业消失。",
    },
    {
      id: "DOCINT-02",
      section:
        "Productivity Gains Often Became Higher Expectations Rather Than Less Work",
      statement:
        "部分访谈描述节省的制作时间被更高产出要求吸收，同时新增核验与纠错工作；并非所有工作都会如此。",
    },
    {
      id: "DOCINT-03",
      section:
        "The Skill Premium May Be Moving From Producing an Answer to Judging One",
      statement:
        "跨访谈主题强调领域知识、输出核验和情境判断，提示词熟练度不能代替这些能力。",
    },
    {
      id: "DOCINT-04",
      section: "AI May Remove the Tasks Through Which Beginners Used to Learn",
      statement:
        "访谈提出基础执行任务减少可能压缩入门者通过工作学习的路径；不是已测得的招聘趋势。",
    },
    {
      id: "DOCINT-05",
      section:
        "Unequal Benefits Reflect Existing Resources, Not Just Access to the Same Technology",
      statement:
        "访谈对收益分配存在不同看法；工具、语言、训练、组织资源与已有知识可能影响收益，不能按学历或城市推定个人资源。",
    },
    {
      id: "DOCINT-06",
      section:
        "AI Is Restructuring Tasks Before It Replaces Entire Occupations",
      statement:
        "创作类劳动可能面临客户接受较低成本AI产出后的议价压力，即便就业状态没有改变；这是需验证的机制。",
    },
    {
      id: "DOCINT-07",
      section:
        "Familiarity With AI Did Not Necessarily Produce Greater Trust in AI Career Advice",
      statement:
        "访谈要求数据和方法透明、建议可核验且可执行；熟悉AI不意味着更信任职业建议。",
    },
  ],
} as const;
