"use client";
import { useState } from "react";
import Link from "next/link";
import { useSession } from "../providers";
import { profileSchema, educations, aiLevels } from "../../contracts";
import { containsDirectContact } from "../../privacy";
const educationLabels = [
  "高中/中职/技校及以下",
  "大专",
  "本科",
  "硕士",
  "博士",
  "其他",
  "不愿透露",
];
const aiLabels = ["从未使用", "偶尔使用", "经常使用", "开发或搭建工具"];
export default function ProfilePage() {
  const { profile, setProfile } = useSession();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [tags, setTags] = useState(profile?.skills ?? []);
  const [tag, setTag] = useState("");
  function add() {
    const v = tag.trim();
    if (
      v &&
      v.length <= 40 &&
      tags.length < 20 &&
      !tags.some((s) => s.toLowerCase() === v.toLowerCase())
    )
      setTags([...tags, v]);
    setTag("");
  }
  return (
    <>
      <div className="eyebrow">USER PROFILE</div>
      <h1>从你的真实经验开始</h1>
      <p className="lead">
        只描述职责、技能和目标。不要填写姓名、学校或雇主名称、联系方式及详细地址。
      </p>
      <form
        className="card"
        key={profile ? "saved" : "empty"}
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          const f = new FormData(e.currentTarget);
          const value = {
            ageRange: f.get("ageRange"),
            education: f.get("education"),
            major: f.get("major"),
            experience: f.get("experience"),
            experienceYears: Number(f.get("experienceYears")),
            industry: f.get("industry"),
            skills: tags,
            aiUseExperience: f.get("aiUseExperience"),
            locationPreference: String(f.get("locationPreference"))
              .split(/[，,]/)
              .map((s) => s.trim())
              .filter(Boolean),
            careerGoals: f.get("careerGoals"),
          };
          const parsed = profileSchema.safeParse(value);
          if (!parsed.success) {
            setError(
              parsed.error.issues
                .map((i) => `${i.path.join(".")}: ${i.message}`)
                .join("；"),
            );
            return;
          }
          if (containsDirectContact(parsed.data)) {
            setError("请移除联系方式或身份证信息。");
            return;
          }
          setProfile(parsed.data);
          setSaved(true);
        }}
      >
        <div className="grid">
          <div>
            <label htmlFor="ageRange">年龄段</label>
            <select
              id="ageRange"
              name="ageRange"
              required
              defaultValue={profile?.ageRange ?? ""}
            >
              <option value="" disabled>
                请选择
              </option>
              {[
                "under-18",
                "18-22",
                "23-29",
                "30-39",
                "40-49",
                "50+",
                "undisclosed",
              ].map((v, i) => (
                <option key={v} value={v}>
                  {
                    [
                      "18岁以下",
                      "18–22",
                      "23–29",
                      "30–39",
                      "40–49",
                      "50岁及以上",
                      "不愿透露",
                    ][i]
                  }
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="education">学历（当前在读或最高已获得）</label>
            <select
              id="education"
              name="education"
              required
              defaultValue={profile?.education ?? ""}
            >
              <option value="" disabled>
                请选择
              </option>
              {educations.map((v, i) => (
                <option key={v} value={v}>
                  {educationLabels[i]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="major">专业类别</label>
            <input
              id="major"
              name="major"
              required
              maxLength={80}
              defaultValue={profile?.major}
              placeholder="例如：机械工程；无专业可填不适用"
            />
          </div>
          <div>
            <label htmlFor="experienceYears">
              累计工作/实习年限（重叠时间不重复计算）
            </label>
            <input
              id="experienceYears"
              name="experienceYears"
              type="number"
              required
              min="0"
              max="60"
              step="0.1"
              defaultValue={profile?.experienceYears}
            />
          </div>
        </div>
        <label htmlFor="experience">工作/实习经历</label>
        <textarea
          id="experience"
          name="experience"
          maxLength={1500}
          required
          defaultValue={profile?.experience}
          placeholder="描述任务与成果；无经历可填暂无。"
        />
        <div className="grid">
          <div>
            <label htmlFor="industry">行业类别</label>
            <input
              id="industry"
              name="industry"
              required
              maxLength={80}
              defaultValue={profile?.industry}
              placeholder="例如：制造业、尚未进入职场"
            />
          </div>
          <div>
            <label htmlFor="aiUseExperience">AI 使用经验</label>
            <select
              id="aiUseExperience"
              name="aiUseExperience"
              required
              defaultValue={profile?.aiUseExperience ?? ""}
            >
              <option value="" disabled>
                请选择
              </option>
              {aiLevels.map((v, i) => (
                <option key={v} value={v}>
                  {aiLabels[i]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <label htmlFor="skill">技能标签（最多20项）</label>
        <div className="actions">
          <input
            id="skill"
            value={tag}
            maxLength={40}
            onChange={(e) => setTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                add();
              }
            }}
            placeholder="输入技能，回车添加"
          />
          <button type="button" className="secondary" onClick={add}>
            添加
          </button>
        </div>
        <div>
          {tags.map((t) => (
            <button
              type="button"
              className="secondary"
              key={t}
              onClick={() => setTags(tags.filter((s) => s !== t))}
              aria-label={`删除 ${t}`}
            >
              {t} ×
            </button>
          ))}
        </div>
        <p className="hint">没填写技能不代表没有能力。</p>
        <label htmlFor="locationPreference">地点偏好</label>
        <input
          id="locationPreference"
          name="locationPreference"
          required
          defaultValue={profile?.locationPreference.join("，")}
          placeholder="最多5项，用逗号分隔，如：北京、远程、不限；不要填写详细地址"
        />
        <label htmlFor="careerGoals">职业目标</label>
        <textarea
          id="careerGoals"
          name="careerGoals"
          required
          maxLength={1000}
          defaultValue={profile?.careerGoals}
        />
        <label>
          <input type="checkbox" required />
          我已移除本人或他人的身份信息。
        </label>
        <div className="notice">
          画像只保留在当前页面会话中，刷新或关闭即清除。生成建议时，必要输入会发送给你配置的模型供应商；本站不保存画像或研究记录。
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="actions">
          <button type="submit">保存到当前会话</button>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setProfile(null);
              setTags([]);
              setSaved(false);
            }}
          >
            清空画像
          </button>
          {saved && <Link href="/recommendation">已保存，查看职业方向 →</Link>}
        </div>
      </form>
    </>
  );
}
