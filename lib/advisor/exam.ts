import "server-only";

import { randomUUID } from "crypto";
import { createPartFromBase64, Type, type GenerateContentConfig } from "@google/genai";

import { supabaseServer } from "@/src/lib/db/supabaseServer";
import { generateGeminiText, generateGeminiTextFromParts } from "@/src/lib/ai/geminiVertexClient";
import { getAuthContext } from "@/lib/zpath-auth";

export type ZpathExamQuestion = {
  index: number;
  label: string;
  content: string;
};

export type ZpathExamSession = {
  id: string;
  conversationId: string | null;
  extractedMarkdown: string;
  questions: ZpathExamQuestion[];
  status: "reviewing" | "confirmed";
  currentQuestionIndex: number;
};

export type ZpathExamAnswerAction = "next" | "full" | "full_answers_only" | "custom";

type ExamOwner = {
  userId: string | null;
  anonymousId: string;
};

const EXAM_IMAGE_BUCKET = "zpath-ai-exam-images";
const MAX_EXAM_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_EXAM_PDF_SIZE = 20 * 1024 * 1024;
export const MAX_EXAM_IMAGE_COUNT = 5;
const ALLOWED_EXAM_FILE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
const VIETNAM_HIGH_SCHOOL_SOLVING_GUIDANCE =
  "Ưu tiên phương pháp, ký hiệu và cách trình bày phù hợp chương trình THPT Việt Nam; tránh dùng kiến thức đại học hoặc mẹo nâng cao nếu có cách THPT đủ giải được.";
const LATEX_FORMAT_GUIDANCE =
  "Định dạng toán học bằng LaTeX chuẩn để UI render bằng KaTeX; không dùng Unicode thay thế khi có công thức phức tạp. Với số thập phân dùng dấu phẩy kiểu Việt Nam trong công thức, viết dạng $95{,}9$ thay vì $95,9$ để không bị giãn/dính hiển thị.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function parseJsonResponse(text: string) {
  const trimmed = text.trim();
  const unfenced = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  return JSON.parse(unfenced) as unknown;
}

function normalizeAnonymousId(value: unknown) {
  const trimmed = readString(value);
  return trimmed || `server-anon-${randomUUID()}`;
}

function sanitizePathSegment(value: string) {
  return value.replace(/[^A-Za-z0-9_.-]/g, "-").slice(0, 120);
}

function getFileExtension(mimeType: string) {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function normalizeQuestions(value: unknown, markdown: string): ZpathExamQuestion[] {
  if (Array.isArray(value)) {
    const questions = value
      .map((item, index) => {
        if (!isRecord(item)) return null;
        const label =
          readString(item.label) ||
          readString(item.number) ||
          readString(item.title) ||
          `Câu ${index + 1}`;
        const content = readString(item.content) || readString(item.text);
        if (!content) return null;
        return {
          index,
          label,
          content,
        };
      })
      .filter((question): question is ZpathExamQuestion => Boolean(question))
      .slice(0, 80);

    if (questions.length) return questions;
  }

  const inferred = markdown.match(/^#{1,4}\s*Câu\s+\d+.*$/gim) ?? [];
  return inferred.slice(0, 80).map((heading, index) => ({
    index,
    label: heading.replace(/^#{1,4}\s*/, "").trim() || `Câu ${index + 1}`,
    content: heading.replace(/^#{1,4}\s*/, "").trim(),
  }));
}

function mapSessionRow(row: Record<string, unknown>): ZpathExamSession {
  const markdown = readString(row.extracted_markdown);
  return {
    id: readString(row.id),
    conversationId: readString(row.conversation_id) || null,
    extractedMarkdown: markdown,
    questions: normalizeQuestions(row.questions, markdown),
    status: row.status === "confirmed" ? "confirmed" : "reviewing",
    currentQuestionIndex:
      typeof row.current_question_index === "number" ? row.current_question_index : 0,
  };
}

export function validateExamImageFile(file: File | null) {
  if (!file) {
    return "Không tìm thấy file đề thi.";
  }

  if (!ALLOWED_EXAM_FILE_MIME_TYPES.includes(file.type)) {
    return "Chỉ hỗ trợ ảnh PNG, JPEG, WebP hoặc PDF.";
  }

  const maxSize = file.type === "application/pdf" ? MAX_EXAM_PDF_SIZE : MAX_EXAM_IMAGE_SIZE;
  if (file.size > maxSize) {
    if (file.type === "application/pdf") {
      return "File PDF đề thi không được vượt quá 20MB.";
    }
    return "Ảnh đề thi không được vượt quá 10MB.";
  }

  return null;
}

export function validateExamImageFiles(files: File[]) {
  if (!files.length) {
    return "Không tìm thấy file đề thi.";
  }

  if (files.length > MAX_EXAM_IMAGE_COUNT) {
    return `Chỉ hỗ trợ tối đa ${MAX_EXAM_IMAGE_COUNT} ảnh cho mỗi đề.`;
  }

  for (const [index, file] of files.entries()) {
    const validationError = validateExamImageFile(file);
    if (validationError) {
      return `File ${index + 1}: ${validationError}`;
    }
  }

  return null;
}

export async function getExamOwner(anonymousId: unknown): Promise<ExamOwner> {
  const auth = await getAuthContext();
  return {
    userId: auth?.user.id ?? null,
    anonymousId: auth?.user.id ? "" : normalizeAnonymousId(anonymousId),
  };
}

async function resolveExamConversation({
  owner,
  conversationId,
  title,
}: {
  owner: ExamOwner;
  conversationId?: string | null;
  title: string;
}) {
  if (conversationId) {
    let query = supabaseServer
      .from("advisor_conversations")
      .select("id")
      .eq("id", conversationId)
      .limit(1);

    if (owner.userId) {
      query = query.eq("user_id", owner.userId);
    } else {
      query = query.eq("anonymous_id", owner.anonymousId);
    }

    const { data } = await query.maybeSingle();
    if (data?.id) return String(data.id);
  }

  const { data, error } = await supabaseServer
    .from("advisor_conversations")
    .insert({
      user_id: owner.userId,
      anonymous_id: owner.userId ? null : owner.anonymousId,
      title,
    })
    .select("id")
    .single();

  if (error) throw error;
  return String(data.id);
}

type ExamImageForOcr = {
  imageBuffer: Buffer;
  mimeType: string;
  pageIndex: number;
};

function isGeminiMaxTokensError(error: unknown) {
  return error instanceof Error && error.message.includes("MAX_TOKENS");
}

function createExamOcrConfig(): GenerateContentConfig {
  return {
    temperature: 0,
    maxOutputTokens: 16384,
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        markdown: { type: Type.STRING },
      },
      required: ["markdown"],
    },
  };
}

function createOcrPrompt(imageCount: number) {
  return [
    "Bạn là OCR chuyên đọc đề thi tiếng Việt từ ảnh hoặc PDF.",
    imageCount === 1
      ? "Hãy chép lại nội dung file đề thi bằng Markdown rõ ràng."
      : `Hãy đọc ${imageCount} file đề thi theo đúng thứ tự: file 1 là phần đầu, file 2 là phần tiếp theo, rồi ghép thành một đề Markdown duy nhất.`,
    "Chép đầy đủ câu hỏi, đáp án lựa chọn, công thức, bảng và ký hiệu quan trọng; không diễn giải thêm.",
    "Mọi biểu thức toán học phải viết bằng LaTeX, bọc inline bằng $...$ hoặc display bằng $$...$$ để UI render bằng KaTeX.",
    "Không mô tả, chép lại hoặc tái tạo hình vẽ, ảnh minh họa, đồ thị, biểu đồ. Với phần đó chỉ ghi '[Hình ảnh/biểu đồ: xem ảnh gốc]'.",
    "Nếu phần nào không chắc hoặc nghi thiếu trang, ghi chú ngay trong Markdown bằng '[không đọc rõ ở ảnh/trang N: ...]'.",
    "Không giải đề ở bước này.",
    "Trả về JSON gồm đúng field markdown.",
  ].join("\n");
}

async function extractExamMarkdownFromImagesOnce(images: ExamImageForOcr[]) {
  const config: GenerateContentConfig = {
    ...createExamOcrConfig(),
  };

  const imageParts = images.flatMap((image) => [
    {
      text: `File ${image.pageIndex + 1}/${images.length}`,
    },
    createPartFromBase64(image.imageBuffer.toString("base64"), image.mimeType),
  ]);

  const text = await generateGeminiTextFromParts({
    parts: [
      {
        text: createOcrPrompt(images.length),
      },
      ...imageParts,
    ],
    config,
  });

  const raw = parseJsonResponse(text);
  if (!isRecord(raw)) {
    throw new Error("OCR_RESPONSE_INVALID");
  }

  const markdown = readString(raw.markdown);
  if (!markdown) {
    throw new Error("OCR_MARKDOWN_EMPTY");
  }

  return {
    markdown,
    questions: normalizeQuestions(undefined, markdown),
  };
}

export async function extractExamMarkdownFromImages(images: ExamImageForOcr[]) {
  try {
    return await extractExamMarkdownFromImagesOnce(images);
  } catch (error) {
    if (!isGeminiMaxTokensError(error) || images.length <= 1) {
      throw error;
    }

    const pageMarkdowns: string[] = [];
    for (const image of images) {
      try {
        const extracted = await extractExamMarkdownFromImagesOnce([image]);
        pageMarkdowns.push(
          [`## Trang ${image.pageIndex + 1}`, extracted.markdown].join("\n\n"),
        );
      } catch (pageError) {
        if (isGeminiMaxTokensError(pageError)) {
          throw new Error(
            `Trang ${image.pageIndex + 1} quá dài hoặc không đọc được trong giới hạn OCR hiện tại. Hãy thử cắt ảnh sát vùng đề hơn hoặc tải từng phần.`,
          );
        }

        throw pageError;
      }
    }

    const markdown = pageMarkdowns.join("\n\n");
    return {
      markdown,
      questions: normalizeQuestions(undefined, markdown),
    };
  }
}

export async function createExamSessionFromUpload({
  file,
  files,
  anonymousId,
  conversationId,
}: {
  file?: File;
  files?: File[];
  anonymousId?: string;
  conversationId?: string | null;
}) {
  const uploadFiles = files?.length ? files : file ? [file] : [];
  const validationError = validateExamImageFiles(uploadFiles);
  if (validationError) {
    throw new Error(validationError);
  }

  const owner = await getExamOwner(anonymousId);
  const resolvedConversationId = await resolveExamConversation({
    owner,
    conversationId,
    title: "Zpath AI đọc đề thi",
  });
  const sessionId = randomUUID();
  const ownerSegment = sanitizePathSegment(owner.userId || owner.anonymousId);
  const uploadedImages = await Promise.all(
    uploadFiles.map(async (uploadFile, pageIndex) => {
      const fileBuffer = Buffer.from(await uploadFile.arrayBuffer());
      const extension = getFileExtension(uploadFile.type);
      const storagePath = `${ownerSegment}/${sessionId}/page-${pageIndex + 1}-${randomUUID()}.${extension}`;

      const { error: uploadError } = await supabaseServer.storage
        .from(EXAM_IMAGE_BUCKET)
        .upload(storagePath, fileBuffer, {
          contentType: uploadFile.type,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      return {
        pageIndex,
        file: uploadFile,
        fileBuffer,
        storagePath,
      };
    }),
  );

  const extracted = await extractExamMarkdownFromImages(
    uploadedImages.map((image) => ({
      imageBuffer: image.fileBuffer,
      mimeType: image.file.type,
      pageIndex: image.pageIndex,
    })),
  );
  const firstImage = uploadedImages[0];
  const firstFile = firstImage.file;

  const { data, error } = await supabaseServer
    .from("zpath_ai_exam_sessions")
    .insert({
      id: sessionId,
      conversation_id: resolvedConversationId,
      user_id: owner.userId,
      anonymous_id: owner.userId ? null : owner.anonymousId,
      storage_bucket: EXAM_IMAGE_BUCKET,
      storage_path: firstImage.storagePath,
      file_name: firstFile.name || `exam.${getFileExtension(firstFile.type)}`,
      file_mime_type: firstFile.type,
      file_size_bytes: firstFile.size,
      extracted_markdown: extracted.markdown,
      questions: extracted.questions,
      status: "reviewing",
    })
    .select("*")
    .single();

  if (error) throw error;

  const imageRows = uploadedImages.map((image) => ({
    exam_session_id: String(data.id),
    page_index: image.pageIndex,
    storage_bucket: EXAM_IMAGE_BUCKET,
    storage_path: image.storagePath,
    file_name: image.file.name || `exam-page-${image.pageIndex + 1}.${getFileExtension(image.file.type)}`,
    file_mime_type: image.file.type,
    file_size_bytes: image.file.size,
  }));

  const { error: imageRowsError } = await supabaseServer
    .from("zpath_ai_exam_session_images")
    .insert(imageRows);

  if (imageRowsError) throw imageRowsError;

  await supabaseServer.from("advisor_messages").insert({
    conversation_id: resolvedConversationId,
    role: "user",
    content:
      uploadFiles.length === 1
        ? `Đã tải file đề thi: ${firstFile.name || "exam file"}`
        : `Đã tải ${uploadFiles.length} file đề thi.`,
    intent: "exam_ocr",
    metadata: {
      kind: "exam_upload",
      examSessionId: data.id,
      storagePaths: uploadedImages.map((image) => image.storagePath),
      imageCount: uploadedImages.length,
    },
  });

  await supabaseServer.from("advisor_messages").insert({
    conversation_id: resolvedConversationId,
    role: "assistant",
    content: extracted.markdown,
    intent: "exam_ocr",
    metadata: {
      kind: "exam_ocr_review",
      examSessionId: data.id,
      questionCount: extracted.questions.length,
    },
  });

  return mapSessionRow(data);
}

export async function getExamSession({
  sessionId,
  anonymousId,
}: {
  sessionId: string;
  anonymousId?: string;
}) {
  const owner = await getExamOwner(anonymousId);
  let query = supabaseServer
    .from("zpath_ai_exam_sessions")
    .select("*")
    .eq("id", sessionId)
    .limit(1);

  if (owner.userId) {
    query = query.eq("user_id", owner.userId);
  } else {
    query = query.eq("anonymous_id", owner.anonymousId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data ? mapSessionRow(data) : null;
}

export async function updateExamMarkdown({
  sessionId,
  markdown,
  anonymousId,
}: {
  sessionId: string;
  markdown: string;
  anonymousId?: string;
}) {
  const session = await getExamSession({ sessionId, anonymousId });
  if (!session) return null;
  if (session.status === "confirmed") {
    throw new Error("Đề đã được xác nhận, không thể sửa ở bước này.");
  }

  const questions = normalizeQuestions(undefined, markdown);
  const { data, error } = await supabaseServer
    .from("zpath_ai_exam_sessions")
    .update({
      extracted_markdown: markdown,
      questions,
    })
    .eq("id", session.id)
    .select("*")
    .single();

  if (error) throw error;
  return mapSessionRow(data);
}

export async function confirmExamSession({
  sessionId,
  anonymousId,
}: {
  sessionId: string;
  anonymousId?: string;
}) {
  const session = await getExamSession({ sessionId, anonymousId });
  if (!session) return null;

  const questions = session.questions.length
    ? session.questions
    : normalizeQuestions(undefined, session.extractedMarkdown);

  const { data, error } = await supabaseServer
    .from("zpath_ai_exam_sessions")
    .update({
      status: "confirmed",
      questions,
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", session.id)
    .select("*")
    .single();

  if (error) throw error;
  return mapSessionRow(data);
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim();
}

function wantsFullExam(prompt: string) {
  const normalized = normalizeSearchText(prompt);
  return [
    "giai ca de",
    "lam ca de",
    "toan bo de",
    "giai toan bo",
    "giai het de",
    "giai tat ca",
    "tat ca cau",
    "full exam",
    "full",
    "all",
  ].some((phrase) => normalized.includes(phrase));
}

function extractRequestedQuestionIndex(prompt: string, questions: ZpathExamQuestion[]) {
  const match = prompt.match(/\b(?:câu|cau|bài|bai)\s*(\d{1,3})\b/iu);
  if (!match) return null;

  const requestedNumber = Number(match[1]);
  if (!Number.isInteger(requestedNumber) || requestedNumber < 1) return null;

  const labelIndex = questions.findIndex((question) =>
    new RegExp(`\\b${requestedNumber}\\b`).test(question.label),
  );
  return labelIndex >= 0 ? labelIndex : requestedNumber - 1;
}

type ExamQuestionPrompt =
  | {
      mode: "full_exam";
      questionIndex: null;
      targetQuestion: null;
    }
  | {
      mode: "single_question" | "next_question" | "custom_prompt";
      questionIndex: number | null;
      targetQuestion: ZpathExamQuestion | null;
    };

function getQuestionPrompt(
  session: ZpathExamSession,
  userPrompt: string,
  action: ZpathExamAnswerAction,
): ExamQuestionPrompt {
  if (action === "full" || action === "full_answers_only" || wantsFullExam(userPrompt)) {
    return {
      mode: "full_exam" as const,
      questionIndex: null,
      targetQuestion: null,
    };
  }

  const requestedIndex = extractRequestedQuestionIndex(userPrompt, session.questions);
  if (action === "custom" && requestedIndex === null) {
    return {
      mode: "custom_prompt" as const,
      questionIndex: null,
      targetQuestion: null,
    };
  }

  const questionIndex =
    requestedIndex !== null ? requestedIndex : session.currentQuestionIndex;
  const targetQuestion = session.questions[questionIndex] ?? null;

  return {
    mode: requestedIndex !== null ? ("single_question" as const) : ("next_question" as const),
    questionIndex,
    targetQuestion,
  };
}

export async function answerExamQuestion({
  sessionId,
  prompt,
  action = "custom",
  anonymousId,
}: {
  sessionId: string;
  prompt?: string;
  action?: ZpathExamAnswerAction;
  anonymousId?: string;
}) {
  const session = await getExamSession({ sessionId, anonymousId });
  if (!session) return null;
  if (session.status !== "confirmed") {
    throw new Error("Vui lòng xác nhận đề trước khi yêu cầu Zpath AI giải.");
  }

  const userPrompt = prompt?.trim() || "";
  const request = getQuestionPrompt(session, userPrompt, action);
  if (request.mode === "next_question" && !request.targetQuestion) {
    return {
      mode: request.mode,
      questionIndex: request.questionIndex,
      answer:
        "Zpath AI đã giải hết các câu trong đề hiện tại. **Hãy cung cấp đề mới để mình tiếp tục giải.**",
      runId: null,
      shouldVerify: false,
      currentQuestionIndex: session.currentQuestionIndex,
    };
  }

  const runIndex = 1;
  const runMode = request.mode === "custom_prompt" ? "single_question" : request.mode;

  const { data: run, error: runError } = await supabaseServer
    .from("zpath_ai_exam_solution_runs")
    .insert({
      exam_session_id: session.id,
      run_index: runIndex,
      mode: runMode,
      user_prompt: userPrompt || null,
      question_index: request.questionIndex,
      status: "running",
      progress_label:
        request.mode === "full_exam"
          ? "Đang giải đề lần 1"
          : request.mode === "custom_prompt"
            ? "Đang trả lời yêu cầu"
            : "Đang giải câu hỏi",
    })
    .select("id")
    .single();

  if (runError) throw runError;

  try {
    const isFullAnswersOnly = action === "full_answers_only";
    const instruction =
      request.mode === "full_exam"
        ? isFullAnswersOnly
          ? [
              "Hãy xử lý toàn bộ đề theo đúng thứ tự nhưng chỉ xuất ra đáp án cuối cùng.",
              session.questions.length
                ? `Đề đã nhận diện ${session.questions.length} câu; phải đưa đáp án cho đủ các câu này nếu nội dung đề có trong Markdown.`
                : "Nếu không có danh sách câu tách sẵn, hãy đưa đáp án cho mọi câu xuất hiện trong Markdown.",
              "Không trình bày lời giải, không giải thích, không viết bước tính.",
              "Định dạng mỗi dòng ngắn gọn, ví dụ: **Câu 1: A** hoặc **Câu 2: $95{,}9$**.",
              VIETNAM_HIGH_SCHOOL_SOLVING_GUIDANCE,
              "Mọi biểu thức toán học phải viết bằng LaTeX, bọc inline bằng $...$ hoặc display bằng $$...$$.",
            ].join("\n")
          : [
              "Hãy giải toàn bộ đề theo đúng thứ tự, không được chỉ dừng ở câu đầu tiên.",
              session.questions.length
                ? `Đề đã nhận diện ${session.questions.length} câu; phải xử lý đủ các câu này nếu nội dung đề có trong Markdown.`
                : "Nếu không có danh sách câu tách sẵn, hãy giải mọi câu xuất hiện trong Markdown.",
              "Mỗi câu cần có lập luận ngắn gọn và dòng đáp án cuối cùng được in đậm.",
              VIETNAM_HIGH_SCHOOL_SOLVING_GUIDANCE,
              "Mọi biểu thức toán học phải viết bằng LaTeX, bọc inline bằng $...$ hoặc display bằng $$...$$.",
            ].join("\n")
        : request.mode === "custom_prompt"
          ? [
              "Trả lời đúng yêu cầu tự do của người dùng dựa trên toàn bộ đề đã xác nhận.",
              "Nếu người dùng yêu cầu giải lại một câu hoặc giải lại toàn bộ, hãy thực hiện theo yêu cầu đó.",
              VIETNAM_HIGH_SCHOOL_SOLVING_GUIDANCE,
              "Nếu có đáp án cuối cùng, dòng đáp án cuối cùng bắt buộc dùng Markdown bold.",
              "Mọi biểu thức toán học phải viết bằng LaTeX, bọc inline bằng $...$ hoặc display bằng $$...$$.",
            ].join("\n")
        : [
            "Chỉ giải đúng câu được yêu cầu, không giải các câu khác.",
            request.targetQuestion
              ? `Câu cần giải: ${request.targetQuestion.label}\n${request.targetQuestion.content}`
              : "Người dùng yêu cầu một câu không có trong danh sách đã nhận diện. Hãy nói rõ không tìm thấy câu đó trong đề đã xác nhận và đề nghị họ nhập lại số câu.",
            VIETNAM_HIGH_SCHOOL_SOLVING_GUIDANCE,
            "Dòng đáp án cuối cùng bắt buộc dùng Markdown bold, ví dụ **Đáp án: A**.",
            "Mọi biểu thức toán học phải viết bằng LaTeX, bọc inline bằng $...$ hoặc display bằng $$...$$.",
          ].join("\n");

    const answer = await generateGeminiText({
      prompt: [
        "Bạn là Zpath AI, trợ lý học tập giải đề thi bằng tiếng Việt.",
        "Nguồn sự thật duy nhất là đề Markdown đã được người dùng xác nhận dưới đây.",
        "Nếu người dùng hỏi cụ thể, chỉ trả lời câu hỏi đó.",
        "Không bịa dữ kiện ngoài đề.",
        LATEX_FORMAT_GUIDANCE,
        instruction,
        userPrompt ? `Yêu cầu của người dùng: ${userPrompt}` : "",
        "Đề đã xác nhận:",
        session.extractedMarkdown,
      ].join("\n\n"),
      config: {
        temperature: 0.15,
        maxOutputTokens: request.mode === "full_exam" ? 8192 : 2048,
      },
    });

    const { data: completedRun, error: updateError } = await supabaseServer
      .from("zpath_ai_exam_solution_runs")
      .update({
        status: "completed",
        answer_markdown: answer,
        completed_at: new Date().toISOString(),
        progress_label:
          request.mode === "full_exam"
            ? "Đã giải đề lần 1"
            : request.mode === "custom_prompt"
              ? "Đã trả lời yêu cầu"
              : "Đã giải câu hỏi",
      })
      .eq("id", run.id)
      .select("*")
      .single();

    if (updateError) throw updateError;

    const nextQuestionIndex =
      request.mode === "next_question" &&
      request.targetQuestion &&
      typeof request.questionIndex === "number"
        ? request.questionIndex + 1
        : session.currentQuestionIndex;

    if (request.mode === "next_question" && request.targetQuestion) {
      await supabaseServer
        .from("zpath_ai_exam_sessions")
        .update({ current_question_index: nextQuestionIndex })
        .eq("id", session.id);
    }

    if (session.conversationId) {
      await supabaseServer.from("advisor_messages").insert({
        conversation_id: session.conversationId,
        role: "assistant",
        content: answer,
        intent: "exam_answer",
        metadata: {
          kind: "exam_answer",
          examSessionId: session.id,
          runId: run.id,
          mode: request.mode,
          questionIndex: request.questionIndex,
        },
      });
    }

    return {
      mode: request.mode,
      questionIndex: request.questionIndex,
      answer,
      runId: String(completedRun.id),
      shouldVerify: request.mode === "full_exam",
      currentQuestionIndex: nextQuestionIndex,
    };
  } catch (error) {
    await supabaseServer
      .from("zpath_ai_exam_solution_runs")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Không thể giải đề.",
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    throw error;
  }
}

export async function verifyFullExamAnswer({
  sessionId,
  firstAnswer,
  anonymousId,
}: {
  sessionId: string;
  firstAnswer: string;
  anonymousId?: string;
}) {
  const session = await getExamSession({ sessionId, anonymousId });
  if (!session) return null;
  if (session.status !== "confirmed") {
    throw new Error("Vui lòng xác nhận đề trước khi kiểm tra lời giải.");
  }

  const verificationResults: Array<{
    runIndex: number;
    progressLabel: string;
    hasIssue: boolean;
    summary: string;
    answer: string;
    runId: string;
  }> = [];

  for (const runIndex of [2, 3]) {
    const displayIndex = runIndex === 2 ? 1 : 2;
    const progressLabel = `Đang kiểm tra kết quả lần ${displayIndex}/2`;
    const { data: run, error: runError } = await supabaseServer
      .from("zpath_ai_exam_solution_runs")
      .insert({
        exam_session_id: session.id,
        run_index: runIndex,
        mode: "verification",
        status: "running",
        progress_label: progressLabel,
      })
      .select("id")
      .single();

    if (runError) throw runError;

    try {
      const rawAnswer = await generateGeminiText({
        prompt: [
          "Bạn là Zpath AI đang kiểm tra chéo lời giải đề thi.",
          "Hãy tự giải lại toàn bộ đề từ Markdown đã xác nhận, rồi so sánh với lời giải lần 1.",
          VIETNAM_HIGH_SCHOOL_SOLVING_GUIDANCE,
          "Chỉ đánh dấu hasIssue=true nếu có câu sai đáp án, thiếu lời giải quan trọng, hoặc lập luận làm đổi kết quả cuối.",
          "Nếu kết quả khớp, đặt hasIssue=false, summary='Kết quả đã chính xác', details=''.",
          "Nếu có sai sót, details phải nêu rõ câu nào sai, đáp án/lập luận đúng đề xuất, và đáp án cuối cùng phải dùng Markdown bold.",
          "Trả về JSON đúng schema.",
          "Đề đã xác nhận:",
          session.extractedMarkdown,
          "Lời giải lần 1:",
          firstAnswer,
        ].join("\n\n"),
        config: {
          temperature: 0,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              hasIssue: { type: Type.BOOLEAN },
              summary: { type: Type.STRING },
              details: { type: Type.STRING },
            },
            required: ["hasIssue", "summary", "details"],
          },
        },
      });
      const parsedAnswer = parseJsonResponse(rawAnswer);
      const answerRecord = isRecord(parsedAnswer) ? parsedAnswer : {};
      const hasIssue = answerRecord.hasIssue === true;
      const summary = readString(
        answerRecord.summary,
        hasIssue ? "Kết quả có sai sót" : "Kết quả đã chính xác",
      );
      const answer = hasIssue
        ? readString(answerRecord.details, summary)
        : "";

      const { data: completedRun, error: updateError } = await supabaseServer
        .from("zpath_ai_exam_solution_runs")
        .update({
          status: "completed",
          answer_markdown: hasIssue ? answer : summary,
          completed_at: new Date().toISOString(),
          progress_label: `${progressLabel} - ${
            hasIssue ? "Kết quả có sai sót" : "Kết quả đã chính xác"
          }`,
        })
        .eq("id", run.id)
        .select("*")
        .single();

      if (updateError) throw updateError;
      verificationResults.push({
        runIndex,
        progressLabel: `${progressLabel} - ${
          hasIssue ? "Kết quả có sai sót" : "Kết quả đã chính xác"
        }`,
        hasIssue,
        summary,
        answer,
        runId: String(completedRun.id),
      });
    } catch (error) {
      await supabaseServer
        .from("zpath_ai_exam_solution_runs")
        .update({
          status: "failed",
          error_message:
            error instanceof Error ? error.message : "Không thể kiểm tra lời giải.",
          completed_at: new Date().toISOString(),
        })
        .eq("id", run.id);
      throw error;
    }
  }

  return verificationResults;
}
