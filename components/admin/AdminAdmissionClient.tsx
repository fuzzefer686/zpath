"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, UploadCloud, FileText, CheckCircle2, RefreshCw, Link2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdmissionSourceForm } from "@/hooks/useAdmissionSourceForm";
import { useUserRole } from "@/hooks/useUserRole";
import { GenericConfigCalculator } from "@/src/components/admission/GenericConfigCalculator";
import {
  validateAdmissionConfig,
  type GenericAdmissionConfig,
} from "@/src/lib/admission-engine/generic";

type ConfigStatus = "draft" | "pending_review" | "published" | "archived";

type AdmissionConfigRecord = {
  id: string;
  school_code: string;
  school_name: string;
  year: number;
  status: ConfigStatus;
  config: GenericAdmissionConfig;
  source_pdf_url: string | null;
  source_pdf_path: string | null;
  updated_at: string | null;
};

type SourceReportStatus = "fetched" | "failed" | "skipped";

type SourceReportItem = {
  label?: string;
  url?: string;
  type: "url" | "file_url" | "text";
  role: "primary" | "supplement";
  status: SourceReportStatus;
  error?: string;
  charCount?: number;
};

const STATUS_LABELS: Record<ConfigStatus, string> = {
  draft: "Nháp",
  pending_review: "Chờ duyệt",
  published: "Đã publish",
  archived: "Lưu trữ",
};

const CURRENT_YEAR = 2026;
/** Vercel serverless request body limit (~4.5 MiB). Keep uploads under this on deploy. */
const MAX_PDF_BYTES_VERCEL = 4 * 1024 * 1024;

async function readApiJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const snippet = text.trim().slice(0, 120);
    if (/request entity too large/i.test(text)) {
      throw new Error(
        "File PDF quá lớn cho môi trường deploy (giới hạn ~4MB). Hãy nén PDF hoặc cắt bớt trang rồi thử lại.",
      );
    }
    throw new Error(
      snippet
        ? `Phản hồi không hợp lệ từ server: ${snippet}`
        : `Phản hồi không hợp lệ từ server (HTTP ${res.status}).`,
    );
  }
}

export function AdminAdmissionClient() {
  const { isLoading: isAuthLoading } = useUserRole();
  const sourceForm = useAdmissionSourceForm();

  const [configs, setConfigs] = useState<AdmissionConfigRecord[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [isListLoading, setIsListLoading] = useState(true);

  const [schoolCode, setSchoolCode] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [year, setYear] = useState(CURRENT_YEAR);
  const [file, setFile] = useState<File | null>(null);

  const [draftText, setDraftText] = useState("");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [sourcePdfUrl, setSourcePdfUrl] = useState<string | null>(null);
  const [sourcePdfPath, setSourcePdfPath] = useState<string | null>(null);

  const [isExtracting, setIsExtracting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sourceReport, setSourceReport] = useState<SourceReportItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isAnalyzing = isExtracting || isGenerating;

  const loadConfigs = useCallback(async () => {
    setIsListLoading(true);
    try {
      const res = await fetch("/api/admin/admission/configs");
      if (res.status === 401 || res.status === 403) {
        setListError("forbidden");
        return;
      }
      if (!res.ok) throw new Error("Cannot load configs");
      const json = (await res.json()) as { configs: AdmissionConfigRecord[] };
      setConfigs(json.configs);
      setListError(null);
    } catch {
      setListError("Không thể tải danh sách cấu hình.");
    } finally {
      setIsListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfigs();
  }, [loadConfigs]);

  const previewResult = useMemo(() => {
    if (!draftText.trim()) return { config: null as GenericAdmissionConfig | null, error: null as string | null };
    try {
      const parsed = JSON.parse(draftText);
      const validated = validateAdmissionConfig(parsed);
      if (!validated.ok) {
        return { config: null, error: validated.errors.join(" ") };
      }
      return { config: validated.config, error: null };
    } catch {
      return { config: null, error: "JSON không hợp lệ." };
    }
  }, [draftText]);

  function resetMessages() {
    setMessage(null);
    setErrorMessage(null);
  }

  async function handleExtract() {
    resetMessages();
    if (!file) {
      setErrorMessage("Vui lòng chọn file PDF.");
      return;
    }
    if (file.size > MAX_PDF_BYTES_VERCEL) {
      setErrorMessage(
        `File PDF (${(file.size / (1024 * 1024)).toFixed(1)} MB) vượt giới hạn ~4 MB trên Vercel. Hãy nén hoặc cắt bớt trang.`,
      );
      return;
    }
    if (!schoolCode.trim()) {
      setErrorMessage("Vui lòng nhập mã trường.");
      return;
    }

    setIsExtracting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("schoolCode", schoolCode.trim());
      formData.append("schoolName", schoolName.trim());
      formData.append("year", String(year));

      const res = await fetch("/api/admin/admission/extract", {
        method: "POST",
        body: formData,
      });
      const json = await readApiJson(res);
      if (!res.ok) {
        throw new Error(
          typeof json.error === "string" ? json.error : "Không thể trích xuất.",
        );
      }

      setDraftText(JSON.stringify(json.draft, null, 2));
      setCurrentId(null);
      setSourceReport([]);
      setSourcePdfUrl(
        typeof json.sourcePdfUrl === "string" ? json.sourcePdfUrl : null,
      );
      setSourcePdfPath(
        typeof json.sourcePdfPath === "string" ? json.sourcePdfPath : null,
      );
      const warnings = Array.isArray(json.warnings)
        ? json.warnings.filter((w): w is string => typeof w === "string")
        : [];
      setMessage(
        json.valid === true
          ? "AI đã trích xuất cấu hình hợp lệ. Hãy kiểm tra kỹ rồi lưu."
          : `AI đã tạo bản nháp nhưng cần chỉnh sửa: ${warnings.join(" ")}`,
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Không thể trích xuất.");
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleGenerate() {
    resetMessages();

    if (!schoolCode.trim()) {
      setErrorMessage("Vui lòng nhập mã trường.");
      return;
    }
    if (!schoolName.trim()) {
      setErrorMessage("Vui lòng nhập tên trường.");
      return;
    }

    const sources = sourceForm.buildPayload();
    if (!sources.length) {
      setErrorMessage("Cần ít nhất một URL hoặc nội dung text để phân tích.");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/admin/admission/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolCode: schoolCode.trim(),
          schoolName: schoolName.trim(),
          year,
          sources,
        }),
      });
      const json = await readApiJson(res);
      if (!res.ok) {
        throw new Error(
          typeof json.error === "string"
            ? json.error
            : "Không thể phân tích nguồn đã cung cấp.",
        );
      }

      setDraftText(JSON.stringify(json.draft, null, 2));
      setCurrentId(null);
      setSourcePdfUrl(
        typeof json.primaryPdfUrl === "string" ? json.primaryPdfUrl : null,
      );
      setSourcePdfPath(
        typeof json.primaryPdfPath === "string" ? json.primaryPdfPath : null,
      );
      const warnings = Array.isArray(json.warnings)
        ? json.warnings.filter((w): w is string => typeof w === "string")
        : [];
      setSourceReport(
        Array.isArray(json.sourceReport)
          ? json.sourceReport.filter(
              (item): item is SourceReportItem =>
                typeof item === "object" &&
                item !== null &&
                typeof (item as { type?: unknown }).type === "string" &&
                typeof (item as { status?: unknown }).status === "string",
            )
          : [],
      );
      setMessage(
        json.valid === true
          ? "Đã sinh cấu hình từ nguồn admin cung cấp. Hãy kiểm tra kỹ trước khi lưu."
          : `Đã tạo bản nháp nhưng cần chỉnh sửa: ${warnings.join(" ")}`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Không thể sinh cấu hình.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleAnalyze() {
    resetMessages();

    if (file) {
      await handleExtract();
      return;
    }

    await handleGenerate();
  }

  async function handleSaveDraft() {
    resetMessages();
    if (!previewResult.config) {
      setErrorMessage(previewResult.error ?? "Config chưa hợp lệ.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/admission/configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentId ?? undefined,
          config: previewResult.config,
          sourcePdfUrl,
          sourcePdfPath,
        }),
      });
      const json = await readApiJson(res);
      if (!res.ok) {
        throw new Error(
          typeof json.error === "string" ? json.error : "Không thể lưu.",
        );
      }
      const config = json.config as { id?: string } | undefined;
      setCurrentId(typeof config?.id === "string" ? config.id : null);
      setMessage("Đã lưu bản nháp.");
      await loadConfigs();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Không thể lưu.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePublish(id: string | null, action: "publish" | "unpublish") {
    resetMessages();
    if (!id) {
      setErrorMessage("Hãy lưu bản nháp trước khi publish.");
      return;
    }

    setIsPublishing(true);
    try {
      const res = await fetch("/api/admin/admission/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const json = await readApiJson(res);
      if (!res.ok) {
        throw new Error(
          typeof json.error === "string" ? json.error : "Không thể publish.",
        );
      }
      setMessage(
        action === "publish"
          ? "Đã phê duyệt và publish lên web chính."
          : "Đã gỡ publish (chuyển sang lưu trữ).",
      );
      await loadConfigs();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Không thể publish.");
    } finally {
      setIsPublishing(false);
    }
  }

  function loadIntoEditor(record: AdmissionConfigRecord) {
    resetMessages();
    setSourceReport([]);
    setDraftText(JSON.stringify(record.config, null, 2));
    setCurrentId(record.id);
    setSchoolCode(record.school_code);
    setSchoolName(record.school_name);
    setYear(record.year);
    setSourcePdfUrl(record.source_pdf_url);
    setSourcePdfPath(record.source_pdf_path);
  }

  if (isAuthLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight">
          Quản lý trang tính điểm theo trường
        </h1>
        <p className="text-sm text-muted-foreground">
          Tải lên đề án tuyển sinh (PDF) để AI tạo cấu hình tính điểm. Kiểm tra,
          chỉnh sửa rồi phê duyệt để trang xuất hiện trên web chính.
        </p>
      </header>

      {message ? (
        <div className="rounded-lg border border-emerald-400/40 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
          {message}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm font-medium text-destructive">
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <UploadCloud className="h-5 w-5 text-primary" /> 1. Nguồn dữ liệu & trích xuất
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2">
            <span className="text-sm font-semibold">Mã trường</span>
            <Input
              value={schoolCode}
              onChange={(event) => setSchoolCode(event.target.value.toUpperCase())}
              placeholder="VD: VNU"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Tên trường</span>
            <Input
              value={schoolName}
              onChange={(event) => setSchoolName(event.target.value)}
              placeholder="VD: Đại học Quốc gia Hà Nội"
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
        <div className="mt-6 space-y-3 rounded-lg border border-border/70 bg-muted/20 p-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <Link2 className="h-4 w-4 text-primary" /> Nguồn URL do admin cung cấp
            </h3>
            <Button type="button" variant="outline" size="sm" onClick={sourceForm.addSource}>
              <Plus className="mr-2 h-4 w-4" /> Thêm nguồn
            </Button>
          </div>
          <div className="space-y-3">
            {sourceForm.sources.map((source) => (
              <div key={source.id} className="grid gap-2 rounded-md border border-border p-3 md:grid-cols-12">
                <select
                  value={source.type}
                  onChange={(event) =>
                    sourceForm.updateSource(
                      source.id,
                      "type",
                      event.target.value as "url" | "file_url",
                    )
                  }
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm md:col-span-2"
                >
                  <option value="url">URL trang</option>
                  <option value="file_url">Link file</option>
                </select>
                <Input
                  value={source.value}
                  onChange={(event) =>
                    sourceForm.updateSource(source.id, "value", event.target.value)
                  }
                  placeholder={
                    source.type === "file_url"
                      ? "https://.../de-an-tuyen-sinh.pdf"
                      : "https://.../phuong-thuc-tuyen-sinh"
                  }
                  className="md:col-span-5"
                />
                <Input
                  value={source.label}
                  onChange={(event) =>
                    sourceForm.updateSource(source.id, "label", event.target.value)
                  }
                  placeholder="Nhãn (tuỳ chọn)"
                  className="md:col-span-3"
                />
                <div className="flex items-center gap-2 md:col-span-2">
                  <select
                    value={source.role}
                    onChange={(event) =>
                      sourceForm.updateSource(
                        source.id,
                        "role",
                        event.target.value as "primary" | "supplement",
                      )
                    }
                    className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="primary">Primary</option>
                    <option value="supplement">Supplement</option>
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => sourceForm.removeSource(source.id)}
                    aria-label="Xoá nguồn"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <label className="space-y-2">
            <span className="text-xs font-semibold text-muted-foreground">
              Nội dung dán tay (tuỳ chọn)
            </span>
            <textarea
              value={sourceForm.pastedText}
              onChange={(event) => sourceForm.setPastedText(event.target.value)}
              rows={5}
              className="w-full rounded-md border border-input bg-background p-3 text-xs"
              placeholder="Dán đoạn đề án, lưu ý riêng hoặc quy tắc tính điểm..."
            />
          </label>
          <div className="space-y-2">
            <span className="text-xs font-semibold text-muted-foreground">
              File PDF từ máy (tuỳ chọn)
            </span>
            <Input
              type="file"
              accept="application/pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="max-w-sm"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleAnalyze()}
            disabled={isAnalyzing || (!file && !sourceForm.hasAnyInput)}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang phân tích nguồn...
              </>
            ) : (
              "Phân tích & trích xuất"
            )}
          </Button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <FileText className="h-5 w-5 text-primary" /> 2. Cấu hình (JSON)
            </h2>
            {sourcePdfUrl ? (
              <a
                href={sourcePdfUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-primary underline"
              >
                Xem PDF nguồn
              </a>
            ) : null}
          </div>
          <textarea
            value={draftText}
            onChange={(event) => setDraftText(event.target.value)}
            spellCheck={false}
            className="h-[420px] w-full rounded-md border border-input bg-background p-3 font-mono text-xs leading-5"
            placeholder="Cấu hình JSON sẽ hiện ở đây sau khi trích xuất, hoặc dán thủ công."
          />
          {previewResult.error ? (
            <p className="mt-2 text-xs font-medium text-destructive">
              {previewResult.error}
            </p>
          ) : (
            <p className="mt-2 text-xs font-medium text-emerald-600">
              Cấu hình hợp lệ.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isSaving || !previewResult.config}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang lưu...
                </>
              ) : (
                "Lưu bản nháp"
              )}
            </Button>
            <Button
              type="button"
              onClick={() => handlePublish(currentId, "publish")}
              disabled={isPublishing || !currentId}
            >
              {isPublishing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang xử lý...
                </>
              ) : (
                "Duyệt & Publish"
              )}
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-3 text-lg font-bold">Validation dashboard</h2>
          {previewResult.error ? (
            <ul className="space-y-1 text-sm text-destructive">
              {previewResult.error.split(". ").filter(Boolean).map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          ) : previewResult.config ? (
            <div className="space-y-2 text-sm text-emerald-700">
              <p>Schema hợp lệ (v{previewResult.config.schemaVersion ?? 2}).</p>
              <p>
                {previewResult.config.methods.length} phương thức ·{" "}
                {previewResult.config.programs?.length ?? 0} CT inline · benchmarkSource:{" "}
                {previewResult.config.benchmarkSource ?? "method_default"}
              </p>
              <p className="text-muted-foreground">
                Sau publish: /scoring?school={previewResult.config.schoolCode} và /unimap/
                {previewResult.config.schoolCode.toLowerCase()}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Chưa có JSON hợp lệ để kiểm tra.</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-3 text-lg font-bold">Source report</h2>
          {sourceReport.length ? (
            <div className="space-y-2 text-sm">
              {sourceReport.map((item, index) => (
                <div
                  key={`${item.type}-${item.url ?? "text"}-${index}`}
                  className="rounded-md border border-border/70 bg-muted/10 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{item.label ?? "Không nhãn"}</span>
                    <span className="rounded bg-muted px-2 py-0.5 text-xs uppercase">
                      {item.type}
                    </span>
                    <span className="rounded bg-muted px-2 py-0.5 text-xs uppercase">
                      {item.role}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-xs uppercase ${
                        item.status === "fetched"
                          ? "bg-emerald-100 text-emerald-700"
                          : item.status === "failed"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-amber-100 text-amber-800"
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
                      Ký tự đọc được: {item.charCount.toLocaleString("vi-VN")}
                    </p>
                  ) : null}
                  {item.error ? (
                    <p className="mt-1 text-xs text-destructive">{item.error}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Chưa có kết quả phân tích nguồn.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-bold">3. Xem trước</h2>
          {previewResult.config ? (
            <GenericConfigCalculator config={previewResult.config} previewMode />
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
              Nhập cấu hình hợp lệ để xem trước trang tính điểm.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Danh sách cấu hình</h2>
          <Button type="button" variant="ghost" size="sm" onClick={() => loadConfigs()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Tải lại
          </Button>
        </div>
        {isListLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
          </div>
        ) : listError === "forbidden" ? (
          <p className="text-sm text-destructive">Không có quyền truy cập.</p>
        ) : listError ? (
          <p className="text-sm text-destructive">{listError}</p>
        ) : configs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có cấu hình nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-3">Trường</th>
                  <th className="py-2 pr-3">Năm</th>
                  <th className="py-2 pr-3">Trạng thái</th>
                  <th className="py-2 pr-3">Cập nhật</th>
                  <th className="py-2 pr-3">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {configs.map((record) => (
                  <tr key={record.id} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-semibold">
                      {record.school_code} — {record.school_name}
                    </td>
                    <td className="py-2 pr-3">{record.year}</td>
                    <td className="py-2 pr-3">
                      <span className="inline-flex items-center gap-1">
                        {record.status === "published" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : null}
                        {STATUS_LABELS[record.status]}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {record.updated_at
                        ? new Date(record.updated_at).toLocaleString("vi-VN")
                        : "—"}
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => loadIntoEditor(record)}
                        >
                          Sửa
                        </Button>
                        {record.status === "published" ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePublish(record.id, "unpublish")}
                            disabled={isPublishing}
                          >
                            Gỡ publish
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handlePublish(record.id, "publish")}
                            disabled={isPublishing}
                          >
                            Publish
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
