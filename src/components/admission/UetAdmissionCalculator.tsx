"use client";

import { useMemo, useState } from "react";
import { Calculator, ChevronDown, ChevronUp, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AdmissionScoreResult } from "@/src/lib/admission-engine";
import { UET_PROGRAMS_2026 } from "@/src/lib/admission-data/uet-programs-2026";

const METHOD_OPTIONS = [
  { value: "METHOD_2_1", label: "THPT 2026", helper: "Dùng cho xét tuyển bằng điểm thi THPT" },
  { value: "METHOD_2_2", label: "HSA", helper: "ĐGNL / HSA" },
  { value: "METHOD_2_3", label: "SAT", helper: "Chứng chỉ SAT" },
  { value: "METHOD_2_5", label: "Ưu tiên xét tuyển", helper: "Ưu tiên theo giải / thành tích" },
  { value: "METHOD_2_6", label: "Dự bị đại học", helper: "Theo diện dự bị đại học" },
  { value: "METHOD_1", label: "Xét tuyển thẳng", helper: "Xét tuyển theo giải thưởng" },
] as const;

type UetMethod = (typeof METHOD_OPTIONS)[number]["value"];
type ProgramCode = (typeof UET_PROGRAMS_2026)[number]["code"];
type CombinationCode = "A00" | "A01" | "X06" | "A02";
type ApiResponse = { ok: true; data: { score: AdmissionScoreResult } } | { ok: false; error: string };

type AwardItem = { subject: string; year: string; scoreBonus: string; isGdtx: boolean };

const COMBINATION_LABELS: Record<CombinationCode, string> = {
  A00: "A00 - Toán, Lý, Hóa",
  A01: "A01 - Toán, Lý, Anh",
  X06: "X06 - Toán, Lý, Tin",
  A02: "A02 - Toán, Lý, Sinh",
};

function emptyAward(): AwardItem {
  return { subject: "", year: "2026", scoreBonus: "0", isGdtx: false };
}

function parseNumber(value: string, label: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} phải là số hợp lệ.`);
  return parsed;
}

function methodNeedsCertificate(method: UetMethod) {
  return method === "METHOD_2_1" || method === "METHOD_2_5";
}

function methodNeedsScoreInputs(method: UetMethod) {
  return method === "METHOD_2_1";
}

export function UetAdmissionCalculator() {
  const [method, setMethod] = useState<UetMethod>("METHOD_2_1");
  const [programCode, setProgramCode] = useState<ProgramCode>("CN1");
  const [combinationCode, setCombinationCode] = useState<CombinationCode>("A00");
  const [aspirationOrder, setAspirationOrder] = useState("1");
  const [math, setMath] = useState("9");
  const [physics, setPhysics] = useState("8");
  const [chemistry, setChemistry] = useState("7");
  const [biology, setBiology] = useState("7");
  const [english, setEnglish] = useState("6");
  const [informatics, setInformatics] = useState("8");
  const [hsaScore, setHsaScore] = useState("");
  const [satScore, setSatScore] = useState("");
  const [thpt2025Score, setThpt2025Score] = useState("");
  const [preUniCompleted, setPreUniCompleted] = useState(true);
  const [awards, setAwards] = useState<AwardItem[]>([]);
  const [usedMethod1, setUsedMethod1] = useState(false);
  const [certificateType, setCertificateType] = useState<"IELTS" | "TOEFL_iBT">("IELTS");
  const [certificateOnline, setCertificateOnline] = useState(false);
  const [certificateListening, setCertificateListening] = useState("6");
  const [certificateReading, setCertificateReading] = useState("6");
  const [certificateWriting, setCertificateWriting] = useState("6");
  const [certificateSpeaking, setCertificateSpeaking] = useState("6");
  const [certificateReplacementScore, setCertificateReplacementScore] = useState("7");
  const [scoreResult, setScoreResult] = useState<AdmissionScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const selectedProgram = useMemo(
    () => UET_PROGRAMS_2026.find((item) => item.code === programCode) ?? UET_PROGRAMS_2026[0],
    [programCode],
  );

  const availableCombinations = useMemo(() => {
    const allowed = programCode === "CN10" || programCode === "CN21" ? ["A00", "A01", "X06", "A02"] : ["A00", "A01", "X06"];
    return allowed as CombinationCode[];
  }, [programCode]);

  const visibleScores = methodNeedsScoreInputs(method);

  function buildPayload() {
    const certificate = methodNeedsCertificate(method)
      ? {
          type: certificateType,
          online: certificateOnline,
          testDate: "2026-01-01",
          skills: {
            listening: parseNumber(certificateListening, "Listening"),
            reading: parseNumber(certificateReading, "Reading"),
            writing: parseNumber(certificateWriting, "Writing"),
            speaking: parseNumber(certificateSpeaking, "Speaking"),
          },
          replacementEnglishScore: parseNumber(certificateReplacementScore, "Điểm quy đổi tiếng Anh"),
        }
      : undefined;

    const awardPayload = awards
      .filter((item) => item.subject.trim())
      .map((item) => ({
        name: item.subject,
        subject: item.subject,
        year: Number(item.year),
        scoreBonus: Number(item.scoreBonus),
        isGdtx: item.isGdtx,
      }));

    return {
      programCode,
      combinationCode,
      aspirationOrder: Number(aspirationOrder),
      scores: {
        math: parseNumber(math, "Toán"),
        physics: parseNumber(physics, "Lý"),
        chemistry: parseNumber(chemistry, "Hóa"),
        biology: parseNumber(biology, "Sinh"),
        english: parseNumber(english, "Anh"),
        informatics: parseNumber(informatics, "Tin"),
      },
      certificate,
      awards: awardPayload,
      usedMethod1,
      hsaScore: hsaScore ? Number(hsaScore) : undefined,
      satScore: satScore ? Number(satScore) : undefined,
      thpt2025Score: thpt2025Score ? Number(thpt2025Score) : undefined,
      preUniversityCompleted: preUniCompleted,
      preUniversityGraduatedYear: 2025,
    };
  }

  async function handleCalculate() {
    setError(null);
    setIsCalculating(true);
    try {
      const response = await fetch("/api/admission/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolCode: "UET",
          method,
          year: 2026,
          payload: buildPayload(),
        }),
      });
      const body: ApiResponse = await response.json();
      if (!body.ok) throw new Error(body.error);
      setScoreResult(body.data.score);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tính điểm UET.");
    } finally {
      setIsCalculating(false);
    }
  }

  return (
    <Card className="border border-border/60 bg-background/95 shadow-sm">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Calculator className="h-5 w-5 text-primary" />
          Công cụ tính điểm xét tuyển UET
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Chọn đúng phương thức và chỉ nhập các trường liên quan để tránh nhầm lẫn.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <label className="space-y-2">
            <span className="text-sm font-semibold">Phương thức</span>
            <select
              className="h-11 w-full rounded-md border bg-background px-3 text-sm"
              value={method}
              onChange={(e) => setMethod(e.target.value as UetMethod)}
            >
              {METHOD_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label} — {item.helper}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Ngành</span>
            <select
              className="h-11 w-full rounded-md border bg-background px-3 text-sm"
              value={programCode}
              onChange={(e) => setProgramCode(e.target.value as ProgramCode)}
            >
              {UET_PROGRAMS_2026.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code} - {item.name}
                </option>
              ))}
            </select>
            <div className="text-xs text-muted-foreground">
              Ngành đang chọn: {selectedProgram.code} - {selectedProgram.name}
            </div>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Nguyện vọng</span>
            <Input type="number" min="1" step="1" value={aspirationOrder} onChange={(e) => setAspirationOrder(e.target.value)} />
          </label>
        </div>

        <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-semibold">Hiển thị theo phương thức</div>
              <div className="text-xs text-muted-foreground">
                Chỉ hiện các nhóm trường cần thiết cho phương thức bạn chọn.
              </div>
            </div>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdvanced((v) => !v)}>
            {showAdvanced ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
            {showAdvanced ? "Ẩn" : "Hiện"} phần nâng cao
          </Button>
        </div>

        {visibleScores ? (
          <div className="grid gap-4 md:grid-cols-4">
            <label className="space-y-2"><span className="text-sm font-semibold">Tổ hợp</span><select className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={combinationCode} onChange={(e) => setCombinationCode(e.target.value as CombinationCode)}>{availableCombinations.map((item) => <option key={item} value={item}>{COMBINATION_LABELS[item]}</option>)}</select></label>
            <label className="space-y-2"><span className="text-sm font-semibold">Toán</span><Input value={math} onChange={(e) => setMath(e.target.value)} /></label>
            <label className="space-y-2"><span className="text-sm font-semibold">Lý</span><Input value={physics} onChange={(e) => setPhysics(e.target.value)} /></label>
            <label className="space-y-2"><span className="text-sm font-semibold">Môn thứ 3</span>
              <Input
                value={combinationCode === "A00" ? chemistry : combinationCode === "A02" ? biology : combinationCode === "A01" ? english : informatics}
                onChange={() => undefined}
                disabled
              />
            </label>
          </div>
        ) : null}

        {showAdvanced ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2"><span className="text-sm font-semibold">HSA</span><Input value={hsaScore} onChange={(e) => setHsaScore(e.target.value)} /></label>
            <label className="space-y-2"><span className="text-sm font-semibold">SAT</span><Input value={satScore} onChange={(e) => setSatScore(e.target.value)} /></label>
            <label className="space-y-2"><span className="text-sm font-semibold">THPT 2025</span><Input value={thpt2025Score} onChange={(e) => setThpt2025Score(e.target.value)} /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={usedMethod1} onChange={(e) => setUsedMethod1(e.target.checked)} /> Đã dùng quyền tuyển thẳng</label>
          </div>
        ) : null}

        <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
          <div className="text-sm font-semibold">Chứng chỉ tiếng Anh</div>
          <div className="grid gap-3 md:grid-cols-5">
            <label className="space-y-2"><span className="text-xs">Type</span><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={certificateType} onChange={(e) => setCertificateType(e.target.value as "IELTS" | "TOEFL_iBT") }><option value="IELTS">IELTS</option><option value="TOEFL_iBT">TOEFL iBT</option></select></label>
            <label className="space-y-2"><span className="text-xs">Listening</span><Input value={certificateListening} onChange={(e) => setCertificateListening(e.target.value)} /></label>
            <label className="space-y-2"><span className="text-xs">Reading</span><Input value={certificateReading} onChange={(e) => setCertificateReading(e.target.value)} /></label>
            <label className="space-y-2"><span className="text-xs">Writing</span><Input value={certificateWriting} onChange={(e) => setCertificateWriting(e.target.value)} /></label>
            <label className="space-y-2"><span className="text-xs">Speaking</span><Input value={certificateSpeaking} onChange={(e) => setCertificateSpeaking(e.target.value)} /></label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={certificateOnline} onChange={(e) => setCertificateOnline(e.target.checked)} /> Thi online tại nhà</label>
            <label className="space-y-2"><span className="text-xs">Điểm quy đổi thay thế tiếng Anh</span><Input value={certificateReplacementScore} onChange={(e) => setCertificateReplacementScore(e.target.value)} /></label>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Giải thưởng / ưu tiên</div>
            <Button type="button" variant="outline" size="sm" onClick={() => setAwards((current) => [...current, emptyAward()])}>
              Thêm giải thưởng
            </Button>
          </div>
          {awards.length === 0 ? (
            <div className="text-sm text-muted-foreground">Chưa có giải thưởng nào.</div>
          ) : (
            <div className="space-y-3">
              {awards.map((award, index) => (
                <div key={`${award.subject}-${index}`} className="grid gap-3 rounded-md border bg-background p-3 md:grid-cols-4">
                  <Input placeholder="Môn/giải" value={award.subject} onChange={(e) => setAwards((current) => current.map((item, i) => (i === index ? { ...item, subject: e.target.value } : item)))} />
                  <Input placeholder="Năm" value={award.year} onChange={(e) => setAwards((current) => current.map((item, i) => (i === index ? { ...item, year: e.target.value } : item)))} />
                  <Input placeholder="Bonus" value={award.scoreBonus} onChange={(e) => setAwards((current) => current.map((item, i) => (i === index ? { ...item, scoreBonus: e.target.value } : item)))} />
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={award.isGdtx} onChange={(e) => setAwards((current) => current.map((item, i) => (i === index ? { ...item, isGdtx: e.target.checked } : item)))} /> GDTX</label>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button type="button" onClick={handleCalculate} disabled={isCalculating} className="w-full md:w-auto">
          {isCalculating ? "Đang tính..." : "Tính điểm UET"}
        </Button>

        {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm font-medium text-destructive">{error}</div> : null}

        {scoreResult ? (
          <div className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
            <div>
              <div className="text-sm font-semibold">Kết quả</div>
              <div className="text-3xl font-bold">{scoreResult.normalizedScore30.toFixed(2)}/30</div>
              <div className="mt-1 text-xs text-muted-foreground">{scoreResult.formulaUsed}</div>
            </div>
            <div className="space-y-1 text-sm">
              <div><span className="font-semibold">Điểm gốc:</span> {scoreResult.originalScore.toFixed(2)}</div>
              <div><span className="font-semibold">Scale gốc:</span> {scoreResult.originalScale}</div>
              <div><span className="font-semibold">Scale đích:</span> {scoreResult.targetScale}</div>
              {Array.isArray(scoreResult.warnings) && scoreResult.warnings.length > 0 ? (
                <div className="rounded-md bg-amber-500/10 p-2 text-amber-700">
                  {scoreResult.warnings.join(" · ")}
                </div>
              ) : null}
              <details className="rounded-md border bg-muted/20 p-2">
                <summary className="cursor-pointer text-sm font-semibold">Xem chi tiết</summary>
                <pre className="mt-2 overflow-auto text-xs">{JSON.stringify(scoreResult.details, null, 2)}</pre>
              </details>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
