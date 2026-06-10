"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, UploadCloud, FileText, CheckCircle2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const STATUS_LABELS: Record<ConfigStatus, string> = {
  draft: "Nháp",
  pending_review: "Chờ duyệt",
  published: "Đã publish",
  archived: "Lưu trữ",
};

const CURRENT_YEAR = 2026;

export function AdminAdmissionClient() {
  const { isAdmin, isLoading: isAuthLoading } = useUserRole();

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
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    if (isAdmin) void loadConfigs();
  }, [isAdmin, loadConfigs]);

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
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Không thể trích xuất.");
      }

      setDraftText(JSON.stringify(json.draft, null, 2));
      setCurrentId(null);
      setSourcePdfUrl(json.sourcePdfUrl ?? null);
      setSourcePdfPath(json.sourcePdfPath ?? null);
      setMessage(
        json.valid
          ? "AI đã trích xuất cấu hình hợp lệ. Hãy kiểm tra kỹ rồi lưu."
          : `AI đã tạo bản nháp nhưng cần chỉnh sửa: ${(json.warnings ?? []).join(" ")}`,
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Không thể trích xuất.");
    } finally {
      setIsExtracting(false);
    }
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
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Không thể lưu.");
      }
      setCurrentId(json.config.id);
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
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Không thể publish.");
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
        <Loader2 className="h-4 w-4 animate-spin" /> Đang kiểm tra quyền truy cập...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm font-medium text-destructive">
        Bạn cần quyền quản trị viên để truy cập trang này.
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
          <UploadCloud className="h-5 w-5 text-primary" /> 1. Tải PDF & trích xuất
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
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Input
            type="file"
            accept="application/pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="max-w-sm"
          />
          <Button type="button" onClick={handleExtract} disabled={isExtracting}>
            {isExtracting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang đọc PDF...
              </>
            ) : (
              "Trích xuất bằng AI"
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
