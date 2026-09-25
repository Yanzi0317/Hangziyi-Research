import dataset from "../../data/research/approved/survey-49-reviewed-2026-09.json";

// This module exposes only the approved aggregate subset, never raw documents.
export const reviewedSurvey = dataset;
export const surveyProvenance = {
  source: "Survey_Report.docx",
  reportMonth: "2026-09",
  crossCheckSource: "Questionnaire Finding Part.docx",
  crossCheckHash:
    "4dae22ec296dadd0626433d2682b53cd12a9a2a08bbed959c5fbc53b0cc8aa02",
  excludedQuestionIds: ["Q25"],
  method:
    "人工核对原报告人数与分母；百分比由人数/49四舍五入到两位小数。分析文本仅交叉核对，不是第二批样本。",
};
