"use client";

import { useMemo, useState } from "react";
import { FileText, Loader2, Plus, RefreshCw, Sparkles, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  evaluateGeneratedCertificateConfig,
  validateGeneratedCertificateConfig,
  type GeneratedCertificateConfig,
} from "@/src/lib/certificate-converter/generated-config";

type SourceType = "url" | "text";
type SourceItem = {
  id: string;
  type: SourceType;
  label: string;
  value: string;
};

type SourceReportItem = {
  type: SourceType;
  label: string;
  status: "fetched" | "failed";
  error?: string;
  charCount?: number;
  url?: string;
};

function createSourceId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptySource(): SourceItem {
  return {
    id: createSourceId(),
    type: "text",
    label: "",
    value: "",
  };
}

export function AdminCertificateConverterGeneratorClient() {
  const [schoolCode, setSchoolCode] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [year, setYear] = useState(2026);
  const [sources, setSources] = useState<SourceItem[]>([createEmptySource()]);
  const [draftText, setDraftText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [sourceReport, setSourceReport] = useState<SourceReportItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [testCertificateType, setTestCertificateType] = useState("IELTS_ACADEMIC");
  const [testScore, setTestScore] = useState("6.5");
  const [testTextValue, setTestTextValue] = useState("");
  const [toeicListening, setToeicListening] = useState("");
  const [toeicSpeaking, setToeicSpeaking] = useState("");
  const [toeicReading, setToeicReading] = useState("");
  const [toeicWriting, setToeicWriting] = useState("");

  const parsedDraft = useMemo(() => {
    if (!draftText.trim()) {
      return { config: null as GeneratedCertificateConfig | null, error: null as string | null };
    }
    try {
      const parsed = JSON.parse(draftText);
      const validation = validateGeneratedCertificateConfig(parsed);
      if (!validation.ok) {
        return { config: null, error: validation.errors.join(" ") };
      }
      return { config: validation.config, error: null };
    } catch {
      return { config: null, error: "JSON không hợp lệ." };
    }
  }, [draftText]);

  const previewResults = useMemo(() => {
    if (!parsedDraft.config) return [];
    const score = Number(testScore);
    const input = {
      certificateType: testCertificateType.trim().toUpperCase(),
      score: Number.isFinite(score) ? score : undefined,
      textValue: testTextValue.trim() || undefined,
      bandId: testTextValue.trim() || undefined,
      toeic: {
        listening: Number.isFinite(Number(toeicListening))
          ? Number(toeicListening)
          : undefined,
        speaking: Number.isFinite(Number(toeicSpeaking))
          ? Number(toeicSpeaking)
          : undefined,
        reading: Number.isFinite(Number(toeicReading))
          ? Number(toeicReading)
          : undefined,
        writing: Number.isFinite(Number(toeicWriting))
          ? Number(toeicWriting)
          : undefined,
      },
    };
    return evaluateGeneratedCertificateConfig(parsedDraft.config, input);
  }, [
    parsedDraft.config,
    testCertificateType,
    testScore,
    testTextValue,
    toeicListening,
    toeicSpeaking,
    toeicReading,
    toeicWriting,
  ]);

  function updateSource(id: string, key: keyof SourceItem, value: string) {
    setSources((current) =>
      current.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    );
  }

  function removeSource(id: string) {
    setSources((current) =>
      current.length === 1
        ? [{ ...current[0], label: "", value: "" }]
        : current.filter((item) => item.id !== id),
    );
  }

  function resetMessages() {
    setMessage(null);
    setError(null);
  }

  async function handleGenerate() {
    resetMessages();
    if (!schoolCode.trim()) {
      setError("Vui lòng nhập mã trường.");
      return;
    }
    if (!schoolName.trim()) {
      setError("Vui lòng nhập tên trường.");
      return;
    }

    const payloadSources = sources
      .map((item) => ({
        type: item.type,
        label: item.label.trim() || undefined,
        value: item.value.trim(),
      }))
      .filter((item) => item.value.length > 0);

    if (!payloadSources.length) {
      setError("Cần ít nhất một source URL hoặc text.");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/admin/certificate-converter/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolCode: schoolCode.trim().toUpperCase(),
          schoolName: schoolName.trim(),
          year,
          sources: payloadSources,
        }),
      });
      const json = (await response.json()) as {
        ok?: boolean;
        valid?: boolean;
        error?: string;
        draft?: unknown;
        sourceReport?: SourceReportItem[];
      };

      if (Array.isArray(json.sourceReport)) {
        setSourceReport(json.sourceReport);
      } else {
        setSourceReport([]);
      }

      if (!response.ok) {
        throw new Error(json.error ?? "Không thể auto-generate draft.");
      }

      if (json.draft) {
        setDraftText(JSON.stringify(json.draft, null, 2));
      }

      if (json.valid) {
        setMessage("AI đã generate draft hợp lệ. Hãy review kỹ trước khi dùng.");
      } else {
        setError(json.error ?? "AI trả về draft cần chỉnh sửa thêm.");
      }
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Không thể auto-generate draft.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight">
          Auto-generate quy đổi chứng chỉ
        </h1>
        <p className="text-sm text-muted-foreground">
          Dùng AI để tạo draft config quy đổi chứng chỉ theo phương thức xét tuyển.
          Draft luôn cần admin review trước khi đưa vào production.
        </p>
      </header>

      {message ? (
        <div className="rounded-lg border border-emerald-400/40 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm font-medium text-destructive">
          {error}
        </div>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <Sparkles className="h-5 w-5 text-primary" /> 1. Nguồn dữ liệu và Generate
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2">
            <span className="text-sm font-semibold">Mã trường</span>
            <Input
              value={schoolCode}
              onChange={(event) => setSchoolCode(event.target.value.toUpperCase())}
              placeholder="VD: FTU"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Tên trường</span>
            <Input
              value={schoolName}
              onChange={(event) => setSchoolName(event.target.value)}
              placeholder="VD: Đại học Ngoại Thương"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Năm tuyển sinh</span>
            <Input
              type="number"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            />
          </label>
        </div>

        <div className="mt-5 space-y-3 rounded-lg border border-border/70 bg-muted/20 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Sources (URL hoặc Text)</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSources((current) => [...current, createEmptySource()])}
            >
              <Plus className="mr-2 h-4 w-4" />
              Thêm source
            </Button>
          </div>

          {sources.map((source) => (
            <div
              key={source.id}
              className="grid gap-2 rounded-md border border-border p-3 md:grid-cols-12"
            >
              <select
                value={source.type}
                onChange={(event) => updateSource(source.id, "type", event.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm md:col-span-2"
              >
                <option value="text">Text</option>
                <option value="url">URL</option>
              </select>
              <Input
                value={source.label}
                onChange={(event) => updateSource(source.id, "label", event.target.value)}
                placeholder="Nhãn nguồn"
                className="md:col-span-3"
              />
              <Input
                value={source.value}
                onChange={(event) => updateSource(source.id, "value", event.target.value)}
                placeholder={
                  source.type === "url"
                    ? "https://.../de-an-tuyen-sinh"
                    : "Dán nội dung đề án/chứng chỉ..."
                }
                className="md:col-span-6"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeSource(source.id)}
                aria-label="Xóa source"
                className="md:col-span-1"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button type="button" onClick={() => void handleGenerate()} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang generate...
              </>
            ) : (
              "Generate draft config"
            )}
          </Button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
            <FileText className="h-5 w-5 text-primary" />
            2. Draft JSON
          </h2>
          <textarea
            value={draftText}
            onChange={(event) => setDraftText(event.target.value)}
            spellCheck={false}
            className="h-[460px] w-full rounded-md border border-input bg-background p-3 font-mono text-xs leading-5"
            placeholder="JSON draft sẽ hiện ở đây sau khi generate."
          />
          {parsedDraft.error ? (
            <p className="mt-2 text-xs font-medium text-destructive">
              {parsedDraft.error}
            </p>
          ) : parsedDraft.config ? (
            <p className="mt-2 text-xs font-medium text-emerald-600">
              Draft hợp lệ: {parsedDraft.config.methods.length} phương thức.
            </p>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-bold">Source report</h2>
            {sourceReport.length ? (
              <div className="space-y-2 text-sm">
                {sourceReport.map((item, index) => (
                  <div key={`${item.label}-${index}`} className="rounded-md border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{item.label}</span>
                      <span className="rounded bg-muted px-2 py-0.5 text-xs uppercase">
                        {item.type}
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 text-xs uppercase ${
                          item.status === "fetched"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    {item.url ? (
                      <p className="mt-1 truncate text-xs text-muted-foreground">{item.url}</p>
                    ) : null}
                    {typeof item.charCount === "number" ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Ký tự dùng: {item.charCount.toLocaleString("vi-VN")}
                      </p>
                    ) : null}
                    {item.error ? (
                      <p className="mt-1 text-xs text-destructive">{item.error}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-bold">3. Test nhanh draft</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold">Certificate type</span>
                <Input
                  value={testCertificateType}
                  onChange={(event) => setTestCertificateType(event.target.value)}
                  placeholder="IELTS_ACADEMIC"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Score</span>
                <Input
                  value={testScore}
                  onChange={(event) => setTestScore(event.target.value)}
                  placeholder="6.5"
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-semibold">Text/Band value (optional)</span>
                <Input
                  value={testTextValue}
                  onChange={(event) => setTestTextValue(event.target.value)}
                  placeholder="N1 / C1 / B2 / ..."
                />
              </label>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <Input
                value={toeicListening}
                onChange={(event) => setToeicListening(event.target.value)}
                placeholder="TOEIC Listening"
              />
              <Input
                value={toeicSpeaking}
                onChange={(event) => setToeicSpeaking(event.target.value)}
                placeholder="TOEIC Speaking"
              />
              <Input
                value={toeicReading}
                onChange={(event) => setToeicReading(event.target.value)}
                placeholder="TOEIC Reading"
              />
              <Input
                value={toeicWriting}
                onChange={(event) => setToeicWriting(event.target.value)}
                placeholder="TOEIC Writing"
              />
            </div>

            <div className="mt-4 space-y-2">
              {parsedDraft.config ? (
                previewResults.length ? (
                  previewResults.map((item) => (
                    <div
                      key={`${item.methodCode}-${item.status}`}
                      className="rounded-md border border-border/70 bg-muted/20 p-3 text-sm"
                    >
                      <div className="font-semibold">
                        {item.methodCode} - {item.methodName}
                      </div>
                      <div className="mt-1 text-muted-foreground">
                        {item.status} ·{" "}
                        {item.convertedScore !== null
                          ? `${item.convertedScore.toFixed(2)}${item.scoreUnit}`
                          : "—"}
                      </div>
                      <p className="mt-1">{item.reason}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Chưa có kết quả test.
                  </p>
                )
              ) : (
                <p className="text-sm text-muted-foreground">
                  Cần draft hợp lệ để test.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-bold">Lưu ý vận hành</h2>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>• Đây là draft tự động, không publish tự động.</li>
          <li>• Admin phải review lại từng method/rule trước khi đưa vào production.</li>
          <li>• Nguồn scan PDF hoặc bảng phức tạp có thể cần chỉnh tay.</li>
        </ul>
        <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={() => void handleGenerate()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Generate lại
        </Button>
      </section>
    </div>
  );
}
