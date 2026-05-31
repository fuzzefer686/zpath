"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  Sparkles,
  ClipboardList,
  User,
  Shield,
  MessageSquareCode,
} from "lucide-react";
import Link from "next/link";

import { AdvisorHero } from "@/components/advisor/AdvisorHero";
import { QuestionCategoryTabs } from "@/components/advisor/QuestionCategoryTabs";
import { QuestionTemplateGrid } from "@/components/advisor/QuestionTemplateGrid";
import { AdvisorAnswer } from "@/components/advisor/AdvisorAnswer";
import { DynamicQuestionForm } from "@/components/advisor/DynamicQuestionForm";
import { Button } from "@/components/ui/button";
import type { AdvisorAnswerRequest } from "@/lib/advisor/schemas";
import {
  advisorTemplateCategories,
  getAdvisorTemplatesByCategory,
} from "@/lib/advisor/templates";
import type {
  AdvisorAnswer as AdvisorAnswerData,
  AdvisorQuestionTemplate,
  AdvisorTemplateValues,
} from "@/lib/advisor/types";
import { useAuth } from "@/components/zpath/AuthProvider";

type LastAdvisorRequest = {
  payload: AdvisorAnswerRequest;
  question: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  type: "text" | "answer";
  text: string;
  answer?: AdvisorAnswerData;
  timestamp: Date;
};

type AdvisorApiResponse = {
  answer?: AdvisorAnswerData;
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
  const [answer, setAnswer] = useState<AdvisorAnswerData | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [answerMessageId, setAnswerMessageId] = useState<string | null>(null);
  const [isAnswerLoading, setIsAnswerLoading] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<LastAdvisorRequest | null>(null);
  const [allowWebSearch, setAllowWebSearch] = useState(true);
  const [hasManualWebSearchChoice, setHasManualWebSearchChoice] = useState(false);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatSequence = useRef(0);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const { user } = useAuth();

  const filteredTemplates = useMemo(
    () => getAdvisorTemplatesByCategory(activeCategory),
    [activeCategory],
  );

  const isChatActive = messages.length > 0;

  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [hasSuggestionsBio, setHasSuggestionsBio] = useState(false);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);

  useEffect(() => {
    async function fetchSuggestions() {
      setIsSuggestionsLoading(true);
      try {
        const response = await fetch("/api/advisor/suggestions");
        if (response.ok) {
          const data = await response.json();
          setAiSuggestions(data.suggestions || []);
          setHasSuggestionsBio(data.hasBio || false);
        }
      } catch (e) {
        console.error("Error fetching AI suggestions:", e);
      } finally {
        setIsSuggestionsLoading(false);
      }
    }
    void fetchSuggestions();
  }, []);

  // Scroll to new assistant messages without jumping page scroll
  useEffect(() => {
    if (!isChatActive || messages.length === 0) return;

    const latestMessage = messages[messages.length - 1];
    
    // Only scroll to the top of assistant answer when a new response arrives
    if (latestMessage.role !== "assistant") return;

    const timeoutId = setTimeout(() => {
      const container = chatContainerRef.current;
      const element = document.getElementById(`msg-anchor-${latestMessage.id}`);
      if (container && element) {
        const targetScrollTop = element.offsetTop - 16;
        container.scrollTo({
          top: targetScrollTop,
          behavior: "smooth",
        });
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [messages, isChatActive]);

  // Scroll to loading indicator / bottom when loading or user messages added
  useEffect(() => {
    if (isChatActive && chatContainerRef.current) {
      const container = chatContainerRef.current;
      const latestMessage = messages[messages.length - 1];
      if (isAnswerLoading || (latestMessage && latestMessage.role === "user")) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth",
        });
      }
    }
  }, [isAnswerLoading, messages, isChatActive]);

  // Scroll window to hide the global navbar when chat active state changes
  useEffect(() => {
    if (isChatActive) {
      window.scrollTo({ top: 64, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [isChatActive]);

  const handleQuestionChange = (nextQuestion: string) => {
    setQuestion(nextQuestion);
  };

  const handleAllowWebSearchChange = (nextAllowWebSearch: boolean) => {
    setHasManualWebSearchChoice(true);
    setAllowWebSearch(true); // Always keep it true!
  };

  const requestAdvisorAnswer = async (
    payload: AdvisorAnswerRequest,
    displayQuestion: string,
  ) => {
    const requestId = chatSequence.current + 1;
    chatSequence.current = requestId;

    const payloadWithPersistence: AdvisorAnswerRequest = {
      ...payload,
      conversationId: payload.conversationId ?? conversationId ?? undefined,
      anonymousId: payload.anonymousId ?? getAdvisorAnonymousId(),
    };

    setLastRequest({ payload: payloadWithPersistence, question: displayQuestion });
    setSubmittedQuestion(displayQuestion);
    setAnswerError(null);
    setIsAnswerLoading(true);

    // 1. Add user question to messages thread
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      type: "text",
      text: displayQuestion,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion(""); // clear bottom input

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

      if (chatSequence.current === requestId) {
        if (process.env.NODE_ENV === "development" && result.debug) {
          console.info("[ZPath advisor debug]", result.debug);
        }

        // 2. Add assistant answer to messages thread
        const assistantMsg: ChatMessage = {
          id: result.assistantMessageId || `assistant-${Date.now()}`,
          role: "assistant",
          type: "answer",
          text: result.answer.summary,
          answer: result.answer,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
        setAnswer(result.answer);
        if (result.conversationId) {
          setConversationId(result.conversationId);
        }
        setAnswerMessageId(result.assistantMessageId ?? null);
        setSelectedTemplate(null); // Clear selected template layout on success
      }
    } catch (error) {
      if (chatSequence.current === requestId) {
        setAnswerError(
          error instanceof Error
            ? error.message
            : "Không thể tạo câu trả lời lúc này.",
        );
      }
    } finally {
      if (chatSequence.current === requestId) {
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
    setSelectedTemplate(template);
    setQuestion(template.examplePrompt);
    if (!hasManualWebSearchChoice) setAllowWebSearch(true);
    setAnswerError(null);
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
    void requestAdvisorAnswer(
      {
        mode: "free_text",
        message: nextQuestion,
        allowWebSearch: true,
      },
      nextQuestion,
    );
  };

  const handleRetry = () => {
    if (!lastRequest) return;
    void requestAdvisorAnswer(lastRequest.payload, lastRequest.question);
  };

  const handleResetConversation = () => {
    setMessages([]);
    setConversationId(null);
    setQuestion("");
    setSelectedTemplate(null);
    setAnswer(null);
    setAnswerMessageId(null);
    setAnswerError(null);
    setLastRequest(null);
  };

  // If conversation has messages, render the gorgeous Messenger Chat thread split layout!
  if (isChatActive) {
    return (
      <main className="min-h-screen bg-zpath-gradient text-foreground pb-6">
        {/* Chat Header */}
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
          <div className="container-page flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display text-sm font-bold">ZPath Career AI Advisor</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">Trực tuyến</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleResetConversation}
              className="text-xs font-bold text-muted-foreground hover:text-foreground transition rounded-xl border border-muted-foreground/30 px-3.5 py-2 hover:bg-muted"
            >
              Hội thoại mới
            </button>
          </div>
        </header>

        <div className="container-page py-6 grid gap-6 xl:grid-cols-[320px_1fr] xl:items-start max-w-[100rem]">
          {/* Left Column: AI suggested questions (Split Screen design) */}
          <div className="hidden xl:block space-y-6 sticky top-22">
            <div className="rounded-2xl border border-white/20 bg-white/55 p-5 backdrop-blur-2xl shadow-none">
              <h3 className="font-display text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" /> Gợi ý câu hỏi
              </h3>
              
              <div className="text-xs text-muted-foreground mb-4 leading-relaxed">
                {hasSuggestionsBio 
                  ? "Được thiết kế riêng dựa trên mô tả bản thân trong hồ sơ của bạn." 
                  : "Hãy cập nhật mô tả bản thân trong Trang cá nhân để AI gợi ý câu hỏi cá nhân hóa."}
              </div>

              {isSuggestionsLoading ? (
                <div className="flex items-center gap-2 py-4 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                  <span className="text-xs text-muted-foreground animate-pulse">Đang tải gợi ý...</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {aiSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleFollowUpQuestion(suggestion)}
                      className="w-full text-left rounded-xl p-3.5 text-xs font-medium bg-white/60 border border-white/20 text-foreground hover:border-white/40 hover:bg-white/75 transition-all leading-relaxed cursor-pointer shadow-sm hover:shadow"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Messenger chat window */}
          <div className="flex flex-col rounded-2xl border border-white/20 bg-white/55 backdrop-blur-2xl overflow-hidden h-[84vh] md:h-[88vh] relative shadow-none">
            
            {/* Messages Thread Container */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin relative">
              {messages.map((msg) => (
                <div key={msg.id} id={`msg-anchor-${msg.id}`} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[88%] md:max-w-[82%] ${msg.role === "user" ? "" : "w-full"}`}>
                    {msg.role === "user" ? (
                      <div className="rounded-2xl bg-gradient-to-r from-primary to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md rounded-br-none">
                        {msg.text}
                      </div>
                    ) : (
                      <AdvisorAnswer
                        answer={msg.answer!}
                        messageId={msg.id}
                        onFollowUpSelect={handleFollowUpQuestion}
                      />
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1.5 px-2 font-medium">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}

              {/* Typing Loader Indicator */}
              {isAnswerLoading && (
                <div className="flex flex-col items-start max-w-[80%]">
                  <div className="rounded-2xl border border-white/30 bg-white/50 px-5 py-4 shadow-sm backdrop-blur-md flex items-center gap-3">
                    <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                    <span className="text-xs font-semibold text-foreground animate-pulse">
                      ZPath AI đang đối sánh dữ liệu...
                    </span>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {answerError && (
                <div className="flex flex-col items-start max-w-[80%]">
                  <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-xs font-bold text-destructive">
                    <p>{answerError}</p>
                    <button
                      onClick={handleRetry}
                      className="mt-2 font-bold underline hover:text-destructive/80 transition"
                    >
                      Thử lại câu hỏi này
                    </button>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Injected Template Form (if template picked inside chat) */}
            {selectedTemplate && (
              <div className="border-t border-muted/50 bg-background/60 p-4 backdrop-blur-md animate-fade-up">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <ClipboardList className="h-4 w-4" /> Mẫu: {selectedTemplate.title}
                  </span>
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground transition"
                  >
                    Hủy mẫu
                  </button>
                </div>
                <DynamicQuestionForm
                  key={selectedTemplate.id}
                  template={selectedTemplate}
                  onSubmit={handleSubmitTemplateQuestion}
                />
              </div>
            )}

            <div className="border-t border-white/20 bg-white/60 p-4 backdrop-blur-2xl flex flex-col sm:flex-row gap-3 items-center">
              {/* Messenger Text box Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAsk();
                }}
                className="flex-1 w-full flex gap-2"
              >
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Nhắn tin với ZPath Advisor..."
                  className="flex-1 h-11 rounded-full border border-white/30 bg-white/75 px-4 text-sm text-foreground placeholder-foreground/60 outline-none transition focus:border-white/40 focus:bg-white/90 shadow-sm"
                  disabled={isAnswerLoading}
                />
                <Button
                  type="submit"
                  variant="hero"
                  className="rounded-full h-11 px-6 shadow-glow font-bold cursor-pointer"
                  disabled={isAnswerLoading || !question.trim()}
                >
                  Gửi
                </Button>
              </form>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Initial dashboard layout when no messages started
  return (
    <main className="min-h-screen bg-background relative overflow-hidden bg-mesh text-foreground">
      {/* Background Dots & Glowing Blobs */}
      <div className="absolute inset-0 grid-dots opacity-20 pointer-events-none" />
      <div className="absolute top-[40%] left-[-10%] h-96 w-96 rounded-full bg-primary/10 blur-3xl animate-float pointer-events-none" />
      <div className="absolute bottom-10 right-[-10%] h-96 w-96 rounded-full bg-zpath-secondary/10 blur-3xl animate-float-slow pointer-events-none" />

      <AdvisorHero
        question={question}
        allowWebSearch={allowWebSearch}
        onQuestionChange={handleQuestionChange}
        onAsk={handleAsk}
        onAllowWebSearchChange={handleAllowWebSearchChange}
      />

      <section className="mx-auto w-full max-w-[56rem] px-5 pb-16 pt-8 sm:px-8 sm:pb-24 sm:pt-10 lg:px-12 relative z-10 animate-fade-up">
        <div className="rounded-3xl border border-white/40 bg-white/55 p-6 sm:p-8 backdrop-blur-2xl space-y-6 shadow-glow">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
            <div>
              <h2 className="font-display text-base sm:text-lg font-black flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary animate-pulse" /> Gợi ý câu hỏi hướng nghiệp dành cho bạn
              </h2>
              <p className="text-xs text-muted-foreground mt-1.5 font-semibold leading-relaxed">
                {hasSuggestionsBio 
                  ? "Câu hỏi được thiết kế riêng dựa trên thông tin mô tả bản thân trong hồ sơ của bạn." 
                  : "Hãy cập nhật mô tả bản thân trong Trang cá nhân để nhận được gợi ý câu hỏi cá nhân hóa từ AI."}
              </p>
            </div>
            {!hasSuggestionsBio && (
              <Link
                href="/profile"
                className="text-xs font-bold text-primary hover:underline bg-primary/10 hover:bg-primary/20 px-4 py-2 rounded-full shrink-0 w-fit transition-colors shadow-sm"
              >
                Cập nhật Hồ sơ ➔
              </Link>
            )}
          </div>

          {isSuggestionsLoading ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary shrink-0" />
              <span className="text-sm text-muted-foreground font-semibold animate-pulse">ZPath AI đang chuẩn bị câu gợi ý...</span>
            </div>
          ) : (
            <div className="grid gap-3.5 sm:grid-cols-2">
              {aiSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleFollowUpQuestion(suggestion)}
                  className="w-full text-left rounded-2xl p-4.5 text-xs sm:text-sm font-semibold bg-white/60 border border-white/25 text-foreground hover:border-white/50 hover:bg-white/85 transition-all duration-300 hover:shadow-glow hover:-translate-y-1 leading-relaxed cursor-pointer shadow-sm"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
