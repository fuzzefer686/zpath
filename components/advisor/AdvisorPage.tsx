"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { AdvisorHero } from "@/components/advisor/AdvisorHero";
import { AdvisorInteractionPanel } from "@/components/advisor/AdvisorInteractionPanel";
import { QuestionCategoryTabs } from "@/components/advisor/QuestionCategoryTabs";
import { QuestionTemplateGrid } from "@/components/advisor/QuestionTemplateGrid";
import type { AdvisorAnswerRequest } from "@/lib/advisor/schemas";
import {
  advisorTemplateCategories,
  getAdvisorTemplatesByCategory,
} from "@/lib/advisor/templates";
import type {
  AdvisorAnswer,
  AdvisorQuestionTemplate,
  AdvisorTemplateValues,
} from "@/lib/advisor/types";

type LastAdvisorRequest = {
  payload: AdvisorAnswerRequest;
  question: string;
};

type AdvisorApiResponse = {
  answer?: AdvisorAnswer;
  conversationId?: string;
  userMessageId?: string;
  assistantMessageId?: string;
  debug?: {
    usedMock: boolean;
    usedGemini: boolean;
    usedInternalRetrieval: boolean;
    usedWebSearch: boolean;
    intent: string;
    extracted: Record<string, unknown>;
    webSearchProvider: string;
    webSearchResultCount: number;
    internalResultCount: number;
    fallbackReason: string | null;
  };
  error?: {
    message?: string;
  };
};

const advisorAnonymousIdKey = "zpath:advisor_anonymous_id";

function createAdvisorAnonymousId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `anon-${crypto.randomUUID()}`;
  }

  return `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getAdvisorAnonymousId() {
  if (typeof window === "undefined") return undefined;

  try {
    const existingId = window.localStorage.getItem(advisorAnonymousIdKey);
    if (existingId) return existingId;

    const nextId = createAdvisorAnonymousId();
    window.localStorage.setItem(advisorAnonymousIdKey, nextId);
    return nextId;
  } catch {
    return createAdvisorAnonymousId();
  }
}

function shouldAutoEnableWebSearch(question: string) {
  return [
    /\bmới nhất\b/i,
    /\bmoi nhat\b/i,
    /\bnăm nay\b/i,
    /\bnam nay\b/i,
    /\b2026\b/,
    /\b20[2-3]\d\b/,
    /\bthông tin tuyển sinh\b/i,
    /\bthong tin tuyen sinh\b/i,
    /\bhọc phí hiện nay\b/i,
    /\bhoc phi hien nay\b/i,
    /\bđiểm chuẩn mới nhất\b/i,
    /\bdiem chuan moi nhat\b/i,
  ].some((pattern) => pattern.test(question));
}

export function AdvisorPage() {
  const [question, setQuestion] = useState("");
  const [activeCategory, setActiveCategory] = useState(advisorTemplateCategories[0]);
  const [submittedQuestion, setSubmittedQuestion] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<AdvisorQuestionTemplate | null>(null);
  const [answer, setAnswer] = useState<AdvisorAnswer | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [answerMessageId, setAnswerMessageId] = useState<string | null>(null);
  const [isAnswerLoading, setIsAnswerLoading] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<LastAdvisorRequest | null>(null);
  const [allowWebSearch, setAllowWebSearch] = useState(true);
  const [hasManualWebSearchChoice, setHasManualWebSearchChoice] = useState(false);
  const requestSequence = useRef(0);
  const outputRef = useRef<HTMLDivElement | null>(null);

  const filteredTemplates = useMemo(
    () => getAdvisorTemplatesByCategory(activeCategory),
    [activeCategory],
  );
  const isAnswerLayout = Boolean(answer || isAnswerLoading || answerError);

  useEffect(() => {
    if (!isAnswerLayout) return;

    const timeoutId = window.setTimeout(() => {
      outputRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);

    return () => window.clearTimeout(timeoutId);
  }, [answer, answerError, isAnswerLayout]);

  const handleQuestionChange = (nextQuestion: string) => {
    setQuestion(nextQuestion);
  };

  const handleAllowWebSearchChange = (nextAllowWebSearch: boolean) => {
    setHasManualWebSearchChoice(true);
    setAllowWebSearch(nextAllowWebSearch);
  };

  const requestAdvisorAnswer = async (
    payload: AdvisorAnswerRequest,
    displayQuestion: string,
  ) => {
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;

    const payloadWithPersistence: AdvisorAnswerRequest = {
      ...payload,
      conversationId: payload.conversationId ?? conversationId ?? undefined,
      anonymousId: payload.anonymousId ?? getAdvisorAnonymousId(),
    };

    setLastRequest({ payload: payloadWithPersistence, question: displayQuestion });
    setSubmittedQuestion(displayQuestion);
    setAnswer(null);
    setAnswerMessageId(null);
    setAnswerError(null);
    setIsAnswerLoading(true);

    try {
      const response = await fetch("/api/advisor/answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payloadWithPersistence),
      });

      const result = (await response.json().catch(() => null)) as AdvisorApiResponse | null;

      if (!response.ok) {
        throw new Error(
          result?.error?.message ?? "Không thể tạo câu trả lời lúc này.",
        );
      }

      if (!result?.answer) {
        throw new Error("Phản hồi từ ZPath không hợp lệ.");
      }

      if (requestSequence.current === requestId) {
        if (process.env.NODE_ENV === "development" && result.debug) {
          console.info("[ZPath advisor debug]", result.debug);
        }

        setAnswer(result.answer);
        if (result.conversationId) {
          setConversationId(result.conversationId);
        }
        setAnswerMessageId(result.assistantMessageId ?? null);
      }
    } catch (error) {
      if (requestSequence.current === requestId) {
        setAnswerError(
          error instanceof Error
            ? error.message
            : "Không thể tạo câu trả lời lúc này.",
        );
      }
    } finally {
      if (requestSequence.current === requestId) {
        setIsAnswerLoading(false);
      }
    }
  };

  const handleAsk = () => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;

    setSelectedTemplate(null);
    void requestAdvisorAnswer(
      {
        mode: "free_text",
        message: trimmedQuestion,
        allowWebSearch,
      },
      trimmedQuestion,
    );
  };

  const handlePickTemplate = (template: AdvisorQuestionTemplate) => {
    requestSequence.current += 1;
    setSelectedTemplate(template);
    setQuestion(template.examplePrompt);
    if (!hasManualWebSearchChoice) setAllowWebSearch(true);
    setSubmittedQuestion("");
    setAnswer(null);
    setAnswerMessageId(null);
    setAnswerError(null);
    setIsAnswerLoading(false);
  };

  const handleSubmitTemplateQuestion = (
    nextQuestion: string,
    values: AdvisorTemplateValues,
  ) => {
    if (!selectedTemplate) return;

    setQuestion(nextQuestion);
    void requestAdvisorAnswer(
      {
        mode: "template",
        templateId: selectedTemplate.id,
        fields: values,
        allowWebSearch,
      },
      nextQuestion,
    );
  };

  const handleFollowUpQuestion = (nextQuestion: string) => {
    setQuestion(nextQuestion);
    setSelectedTemplate(null);
    if (!hasManualWebSearchChoice && shouldAutoEnableWebSearch(nextQuestion)) {
      setAllowWebSearch(true);
    }
    void requestAdvisorAnswer(
      {
        mode: "free_text",
        message: nextQuestion,
        allowWebSearch: allowWebSearch || shouldAutoEnableWebSearch(nextQuestion),
      },
      nextQuestion,
    );
  };

  const handleRetry = () => {
    if (!lastRequest) return;
    void requestAdvisorAnswer(lastRequest.payload, lastRequest.question);
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <AdvisorHero
        question={question}
        allowWebSearch={allowWebSearch}
        onQuestionChange={handleQuestionChange}
        onAsk={handleAsk}
        onAllowWebSearchChange={handleAllowWebSearchChange}
      />

      <section className="mx-auto w-full max-w-[96rem] px-5 pb-14 pt-8 sm:px-8 sm:pb-20 sm:pt-10 lg:px-12">
        <div
          className={
            isAnswerLayout
              ? "grid gap-6 xl:grid-cols-[minmax(240px,320px)_minmax(0,1fr)] xl:items-start"
              : "grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,480px)] lg:items-start"
          }
        >
          <div className={isAnswerLayout ? "space-y-6 xl:sticky xl:top-6" : "space-y-6"}>
            <QuestionCategoryTabs
              categories={advisorTemplateCategories}
              activeCategory={activeCategory}
              onChange={setActiveCategory}
            />

            <QuestionTemplateGrid
              templates={filteredTemplates}
              compact={isAnswerLayout}
              onPickTemplate={handlePickTemplate}
            />
          </div>

          <div ref={outputRef} className="scroll-mt-6">
            <AdvisorInteractionPanel
              selectedTemplate={selectedTemplate}
              question={submittedQuestion || question}
              answer={answer}
              allowWebSearch={allowWebSearch}
              isLoading={isAnswerLoading}
              errorMessage={answerError}
              canRetry={Boolean(lastRequest)}
              onSubmitQuestion={handleSubmitTemplateQuestion}
              onFollowUpQuestion={handleFollowUpQuestion}
              answerMessageId={answerMessageId}
              onRetry={handleRetry}
              wide={isAnswerLayout}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
