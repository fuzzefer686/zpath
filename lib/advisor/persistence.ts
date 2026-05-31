import "server-only";

import { randomUUID } from "crypto";

import { getAuthContext } from "@/lib/zpath-auth";
import { supabaseServer } from "@/src/lib/db/supabaseServer";
import type { AdvisorIntent } from "@/lib/advisor/intents";
import type { AdvisorAnswer } from "@/lib/advisor/types";

export type AdvisorPersistenceInput = {
  conversationId?: string;
  anonymousId?: string;
  question: string;
  answer: AdvisorAnswer;
  intent: AdvisorIntent;
  webSearchAllowed: boolean;
  webSearchUsed: boolean;
  sourceUrls: string[];
};

export type AdvisorPersistenceResult = {
  conversationId: string;
  userMessageId: string;
  assistantMessageId: string;
};

function normalizeAnonymousId(value?: string) {
  const trimmed = value?.trim();
  return trimmed || `server-anon-${randomUUID()}`;
}

async function getCurrentUserId() {
  try {
    const auth = await getAuthContext();
    return auth?.user.id ?? null;
  } catch (error) {
    console.warn("Advisor persistence auth lookup failed:", error);
    return null;
  }
}

function createConversationTitle(question: string) {
  const title = question.trim().replace(/\s+/g, " ");
  return title.length > 80 ? `${title.slice(0, 77)}...` : title || "Hỏi ZPath";
}

async function resolveConversation({
  conversationId,
  userId,
  anonymousId,
  title,
}: {
  conversationId?: string;
  userId: string | null;
  anonymousId: string;
  title: string;
}) {
  if (conversationId) {
    let query = supabaseServer
      .from("advisor_conversations")
      .select("id")
      .eq("id", conversationId)
      .limit(1);

    if (userId) {
      query = query.eq("user_id", userId);
    } else {
      query = query.eq("anonymous_id", anonymousId);
    }

    const { data } = await query.maybeSingle();
    if (data?.id) return String(data.id);
  }

  const { data, error } = await supabaseServer
    .from("advisor_conversations")
    .insert({
      user_id: userId,
      anonymous_id: userId ? null : anonymousId,
      title,
    })
    .select("id")
    .single();

  if (error) throw error;
  return String(data.id);
}

export async function persistAdvisorExchange(
  input: AdvisorPersistenceInput,
): Promise<AdvisorPersistenceResult> {
  const userId = await getCurrentUserId();
  const anonymousId = normalizeAnonymousId(input.anonymousId);
  const conversationId = await resolveConversation({
    conversationId: input.conversationId,
    userId,
    anonymousId,
    title: createConversationTitle(input.question),
  });

  const { data: userMessage, error: userMessageError } = await supabaseServer
    .from("advisor_messages")
    .insert({
      conversation_id: conversationId,
      role: "user",
      content: input.question,
      intent: input.intent,
      metadata: {
        webSearchAllowed: input.webSearchAllowed,
      },
    })
    .select("id")
    .single();

  if (userMessageError) throw userMessageError;

  const { data: assistantMessage, error: assistantMessageError } =
    await supabaseServer
      .from("advisor_messages")
      .insert({
        conversation_id: conversationId,
        role: "assistant",
        content: JSON.stringify(input.answer),
        intent: input.intent,
        metadata: {
          webSearchUsed: input.webSearchUsed,
          sourceUrls: input.sourceUrls,
          confidence: input.answer.confidence,
          dataStatus: input.answer.dataStatus,
        },
      })
      .select("id")
      .single();

  if (assistantMessageError) throw assistantMessageError;

  // Log question to separate user_survey_questions table for AI quality improvement
  try {
    await supabaseServer
      .from("user_survey_questions")
      .insert({
        user_id: userId,
        anonymous_id: userId ? null : anonymousId,
        question: input.question,
        intent: input.intent,
        metadata: {
          webSearchAllowed: input.webSearchAllowed,
          webSearchUsed: input.webSearchUsed,
          sourceUrls: input.sourceUrls,
          confidence: input.answer.confidence,
          dataStatus: input.answer.dataStatus,
        },
      });
  } catch (surveyErr) {
    console.warn("Failed to log survey question to user_survey_questions:", surveyErr);
  }

  await supabaseServer
    .from("advisor_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return {
    conversationId,
    userMessageId: String(userMessage.id),
    assistantMessageId: String(assistantMessage.id),
  };
}

export async function persistAdvisorFeedback({
  messageId,
  rating,
  comment,
}: {
  messageId: string;
  rating: "up" | "down";
  comment?: string;
}) {
  const { error } = await supabaseServer
    .from("advisor_feedback")
    .insert({
      message_id: messageId,
      rating,
      comment: comment?.trim() || null,
    });

  if (error) throw error;
}
