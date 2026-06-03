import type { AdvisorIntent } from "@/lib/advisor/intents";

export type AdvisorTemplateFieldType = "text" | "number" | "select" | "textarea";

export type AdvisorTemplateFieldOption = {
  label: string;
  value: string;
};

export type AdvisorTemplateField = {
  name: string;
  label: string;
  type: AdvisorTemplateFieldType;
  placeholder?: string;
  options?: AdvisorTemplateFieldOption[];
  required: boolean;
};

export type AdvisorQuestionTemplate = {
  id: string;
  title: string;
  category: string;
  description?: string;
  defaultIntent: AdvisorIntent;
  requiredFields: AdvisorTemplateField[];
  examplePrompt: string;
  displayOrder: number;
  allowWebSearch?: boolean;
};

export type AdvisorTemplateValues = Record<string, string>;

export type AdvisorClarificationQuestion = {
  id: string;
  label: string;
  placeholder: string;
  required: boolean;
};

export type AdvisorClarificationAnswer = {
  id: string;
  value: string;
};

export type AdvisorClarification = {
  conversationId: string;
  originalQuestion: string;
  intent: AdvisorIntent;
  questions: AdvisorClarificationQuestion[];
};

export type AdvisorAnswerConfidence = "high" | "medium" | "low";

export type AdvisorAnswerDataStatus =
  | "internal_data"
  | "web_augmented"
  | "limited_data"
  | "general_advice";

export type AdvisorAnswerSourceType =
  | "zpath_database"
  | "official_school_site"
  | "government_site"
  | "news"
  | "other";

export type AdvisorAnswer = {
  title: string;
  summary: string;
  answerType: AdvisorIntent;
  confidence: AdvisorAnswerConfidence;
  dataStatus: AdvisorAnswerDataStatus;
  sections: {
    heading: string;
    content: string;
  }[];
  warnings: string[];
  sources: {
    title: string;
    url: string;
    publisher?: string;
    accessedAt?: string;
    sourceType: AdvisorAnswerSourceType;
  }[];
  followUpQuestions: string[];
};
