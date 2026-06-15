"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RequestConsultationForm({
  onCreated,
  onCancel,
}: {
  onCreated: (conversationId: string) => void;
  onCancel?: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (message.trim().length === 0 || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/mentor/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim() || undefined, message: message.trim() }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.conversationId) {
        setError(data?.error ?? "Không thể gửi yêu cầu. Vui lòng thử lại.");
        return;
      }

      onCreated(data.conversationId as string);
    } catch {
      setError("Lỗi mạng. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg p-4 sm:p-8">
      <h2 className="text-xl font-black tracking-tight">Yêu cầu tư vấn mới</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Mô tả câu hỏi của bạn. Mentor ZPath sẽ phản hồi sớm nhất có thể.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="subject" className="text-sm font-semibold">
            Chủ đề <span className="font-normal text-muted-foreground">(không bắt buộc)</span>
          </label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={120}
            placeholder="VD: Chọn ngành CNTT hay Kinh tế?"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="message" className="text-sm font-semibold">
            Nội dung câu hỏi
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={4000}
            rows={5}
            required
            placeholder="Nhập câu hỏi của bạn..."
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        {error && <p className="text-sm font-medium text-destructive">{error}</p>}

        <div className="flex items-center gap-3">
          <Button type="submit" variant="hero" disabled={submitting || message.trim().length === 0}>
            {submitting ? "Đang gửi..." : "Gửi yêu cầu"}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
              Huỷ
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
