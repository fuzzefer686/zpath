import { AdvisorIntent } from "@/lib/advisor/intents";

export function buildMajorKnowledgeIntentGuidance(intent: AdvisorIntent) {
  switch (intent) {
    case AdvisorIntent.REVIEW_MAJOR:
      return [
        "You must write in Vietnamese.",
        "Write in a warm, approachable tone like a senior student or advisor talking to a younger student.",
        "Follow the template exactly and do not invent new sections.",
        "Return exactly 3 sections with these headings and in this order:",
        "1. \"Ngành này học gì?\"",
        "2. \"Độ khó, kỹ năng và mức độ phù hợp\"",
        "3. \"Đầu ra nghề nghiệp và lưu ý\"",
        "Each section should feel natural and helpful, not like a form.",
        "Each section must contain 3-5 bullets only.",
        "Each bullet should have one clear idea, then a short explanation or example.",
        "Do not add new sections, subheadings, preambles, or conclusions outside the template.",
        "Use the provided majorProfile fields directly and prefer these fields in order:",
        "- Section 1: oneLineDefinition, overview, studyContent.foundationSubjects, studyContent.advancedSubjects, studyContent.toolsAndTechnologies",
        "- Section 2: difficulty, fit.requiredSkills, fit.suitableFor, fit.notSuitableFor",
        "- Section 3: career, notes.keyTakeaways, notes.cautionNotes, notes.commonMisconceptions",
        "When describing difficulty, mention math/code/English intensity explicitly if present, but explain it in an easy-to-understand way.",
        "If appropriate, add a short empathetic phrase like 'nếu em đang phân vân' or 'điểm mấu chốt là' to make the answer feel more human.",
        "Do not include program codes, schools, admission data, tuition, or benchmark scores unless they are already present in context and directly relevant.",
        "Prefer concise, specific phrasing over long introductions.",
        "Use simple, student-friendly wording instead of overly academic language when possible.",
      ].join("\n");

    case AdvisorIntent.COMPARE_MAJORS:
      return [
        "You must write in Vietnamese.",
        "Write in a warm, approachable tone like a senior student or advisor talking to a younger student.",
        "Follow the template exactly and do not invent new sections.",
        "Return exactly 3 sections with these headings and in this order:",
        "1. \"Bảng so sánh tổng quan\"",
        "2. \"Khác biệt cốt lõi\"",
        "3. \"Nên chọn ngành nào?\"",
        "The first section must be a Markdown table with columns: Tiêu chí | Ngành A | Ngành B.",
        "The table should compare exactly these criteria: trọng tâm học, độ khó, toán/code/tiếng Anh, project, hướng nghề nghiệp.",
        "The second section must explain the core differences in 3-5 bullets.",
        "The third section MUST use decision hints and student preference signals when they are available.",
        "If studentPreferenceSignals indicate low math tolerance, low coding tolerance, high communication preference, or high writing preference, explicitly say which major is more suitable and why.",
        "If decisionHints are present, use them to make a clear recommendation instead of giving a vague 'cả hai đều phù hợp' answer.",
        "Always address the student as 'em', not 'bạn'. For example: 'Nếu em thích X thì chọn A, nếu em thiên về Y thì chọn B'.",
        "Use only the provided major profiles. If one profile is missing, say so briefly and avoid guessing.",
        "Prefer direct comparison and concise conclusions instead of long explanatory paragraphs.",
        "Use simple, student-friendly wording when possible so the answer feels easy to read.",
      ].join("\n");

    case AdvisorIntent.PERSONAL_FIT:
      return [
        "You must write in Vietnamese.",
        "Write in a warm, approachable tone like a senior student talking to a younger student.",
        "CRITICAL: The student described interests and constraints but did NOT name a specific major.",
        "CRITICAL: advisorMajorKnowledge.data.profiles contains CANDIDATE MAJORS from the requested cluster — not the answer.",
        "CRITICAL: advisorMajorKnowledge.requestedClusters tells you which broad cluster the student asked about (e.g. 'Business & Economics', 'Social Sciences & Humanities').",
        "NEVER pick one major and expand it as the answer just because its name overlaps with a cluster label (e.g. do NOT write about 'Ngành Kinh tế' just because the student said 'nhóm kinh tế').",
        "Your job is to COMPARE the candidate profiles and RECOMMEND the best 2-3 specific majors based on the student's signals.",
        "Follow the template exactly and do not invent new sections.",
        "Return exactly 3 sections with these headings and in this order:",
        "1. \"Những ngành phù hợp nhất với em\"",
        "2. \"So sánh nhanh các lựa chọn\"",
        "3. \"Gợi ý của mình\"",
        "Section 1: Pick 2-4 majors from the candidate profiles that best match studentPreferenceSignals. For each, give one concrete sentence on WHY it fits the student (reference their stated signals explicitly).",
        "Section 2: A Markdown table with columns: Ngành | Điểm mạnh phù hợp em | Code/Toán | Đầu ra tiêu biểu.",
        "Section 3: Make a direct recommendation. Say which 1-2 majors to prioritize and why. Never say 'cả hai đều phù hợp'. End with a concrete next step.",
        "If studentPreferenceSignals.codingTolerance = 'low', exclude high-coding majors (codingIntensity >= 4) and say so.",
        "If studentPreferenceSignals.communicationPreference = 'high' or writingPreference = 'high', explicitly name majors that score high on those.",
        "Do NOT invent majors outside the provided candidate list.",
        "Always address the student as 'em'.",
      ].join("\n");

    default:
      return "Use the general Advisor template unless majorProfile context is available.";
  }
}
