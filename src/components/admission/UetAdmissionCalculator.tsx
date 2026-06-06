"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AdmissionScoreResult } from "@/src/lib/admission-engine";
import { UET_BENCHMARKS_2025 } from "@/src/lib/admission-engine/modules/uet/uet.spec";
import { UET_PROGRAMS_2026 } from "@/src/lib/admission-data/uet-programs-2026";
import { UET_TUITION_2025 } from "@/src/lib/admission-data/uet-tuition-2025";

const METHOD_OPTIONS = [
  {
    value: "METHOD_2_1",
    label: "THPT 2026",
    helper: "Dùng cho xét tuyển bằng điểm thi THPT",
  },
  { value: "METHOD_2_2", label: "HSA", helper: "ĐGNL / HSA" },
  { value: "METHOD_2_3", label: "SAT", helper: "Chứng chỉ SAT" },
] as const;

type UetMethod = "METHOD_2_1" | "METHOD_2_2" | "METHOD_2_3";
type ProgramCode = (typeof UET_PROGRAMS_2026)[number]["code"];
type CombinationCode = "A00" | "A01" | "X06" | "A02";
type ChanceResult = {
  level: string;
  label: string;
  diff: number;
  message: string;
} | null;

type ApiResponse =
  | { ok: true; data: { score: AdmissionScoreResult; chance: ChanceResult } }
  | { ok: false; error: string };

type AwardItem = {
  subject: string;
  year: string;
  scoreBonus: string;
  level: "national" | "provincial";
  rank: "Nhất" | "Nhì" | "Ba" | "Khuyến khích";
  isGdtx: boolean;
};


const COMBINATION_LABELS: Record<CombinationCode, string> = {
  A00: "A00 - Toán, Lý, Hóa",
  A01: "A01 - Toán, Lý, Anh",
  X06: "X06 - Toán, Lý, Tin",
  A02: "A02 - Toán, Lý, Sinh",
};

export function getCalculatedAwardBonus(
  level: "national" | "provincial",
  rank: "Nhất" | "Nhì" | "Ba" | "Khuyến khích",
  isGdtx: boolean
): number {
  if (isGdtx && level === "provincial") {
    return 0;
  }
  if (level === "national") {
    if (rank === "Nhất") return 3.0;
    if (rank === "Nhì") return 2.5;
    if (rank === "Ba") return 2.0;
    if (rank === "Khuyến khích") return 1.5;
  } else {
    if (rank === "Nhất") return 2.5;
    if (rank === "Nhì") return 2.0;
    if (rank === "Ba") return 1.5;
    if (rank === "Khuyến khích") return 1.0;
  }
  return 0;
}

function emptyAward(): AwardItem {
  return { subject: "Toán", year: "2026", scoreBonus: "3.0", level: "national", rank: "Nhất", isGdtx: false };
}

function parseNumber(value: string, label: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} phải là số hợp lệ.`);
  return parsed;
}

function methodNeedsCertificate(method: UetMethod) {
  return method === "METHOD_2_1";
}



export function UetAdmissionCalculator() {
  const [method, setMethod] = useState<UetMethod>("METHOD_2_1");
  const [programCode, setProgramCode] = useState<ProgramCode>("CN1");
  const [combinationCode, setCombinationCode] =
    useState<CombinationCode>("A00");
  const [aspirationOrder, setAspirationOrder] = useState("1");
  const [math, setMath] = useState("9");
  const [physics, setPhysics] = useState("8");
  const [chemistry, setChemistry] = useState("7");
  const [biology, setBiology] = useState("7");
  const [english, setEnglish] = useState("6");
  const [informatics, setInformatics] = useState("8");
  const [hsaScore, setHsaScore] = useState("");
  const [hsaYear, setHsaYear] = useState("2025");
  const [satScore, setSatScore] = useState("");
  const [awards, setAwards] = useState<AwardItem[]>([]);
  const [usedMethod1] = useState(false);
  const [certificateType] = useState<"IELTS" | "TOEFL_iBT">("IELTS");
  const [certificateOnline] = useState(false);
  const [certificateListening] = useState("6");
  const [certificateReading] = useState("6");
  const [certificateWriting] = useState("6");
  const [certificateSpeaking] = useState("6");
  const [certificateReplacementScore] = useState("7");
  const [scoreResult, setScoreResult] = useState<AdmissionScoreResult | null>(
    null,
  );
  const [chanceResult, setChanceResult] = useState<ChanceResult>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const selectedProgram = useMemo(
    () =>
      UET_PROGRAMS_2026.find((item) => item.code === programCode) ??
      UET_PROGRAMS_2026[0],
    [programCode],
  );
  const selectedBenchmark = useMemo(
    () =>
      UET_BENCHMARKS_2025.thpt2025[
        programCode as keyof typeof UET_BENCHMARKS_2025.thpt2025
      ],
    [programCode],
  );
  const selectedTuition = useMemo(
    () => UET_TUITION_2025.find((item) => item.programCode === programCode),
    [programCode],
  );

  const availableCombinations = useMemo(() => {
    const allowed =
      programCode === "CN10" || programCode === "CN21"
        ? ["A00", "A01", "X06", "A02"]
        : ["A00", "A01", "X06"];
    return allowed as CombinationCode[];
  }, [programCode]);

  const showThptInputs = method === "METHOD_2_1";
  const showHsaInput = method === "METHOD_2_2";
  const showSatInput = method === "METHOD_2_3";
  const showAwardsInput = true;

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
          replacementEnglishScore: parseNumber(
            certificateReplacementScore,
            "Điểm quy đổi tiếng Anh",
          ),
        }
      : undefined;

    const awardPayload = awards
      .filter((item) => item.subject.trim())
      .map((item) => ({
        name: `${item.level === "national" ? "Quốc gia" : "Tỉnh"} - ${item.subject} - ${item.rank}`,
        subject: item.subject,
        year: Number(item.year),
        scoreBonus: Number(item.scoreBonus),
        level: item.level,
        rank: item.rank,
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
      hsaYear: hsaScore ? Number(hsaYear) : undefined,
      satScore: satScore ? Number(satScore) : undefined,
    };
  }

  async function handleCalculate() {
    setError(null);
    setChanceResult(null);
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
          benchmark30: selectedBenchmark,
        }),
      });
      const body: ApiResponse = await response.json();
      if (!body.ok) throw new Error(body.error);
      setScoreResult(body.data.score);
      setChanceResult(body.data.chance);
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
          Chọn đúng phương thức và chỉ nhập các trường liên quan để tránh nhầm
          lẫn.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 text-sm md:grid-cols-3">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Năm tuyển sinh</div>
            <div className="mt-1 font-medium text-foreground">2026</div>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Điểm chuẩn so sánh</div>
            <div className="mt-1 font-medium text-foreground">2025</div>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Mốc tham chiếu</div>
            <div className="mt-1 font-medium text-foreground">
              {selectedBenchmark?.toFixed(2) ?? "--"}/30
            </div>
          </div>
        </div>

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
            <Input
              type="number"
              min="1"
              step="1"
              value={aspirationOrder}
              onChange={(e) => setAspirationOrder(e.target.value)}
            />
          </label>
        </div>

        {showThptInputs ? (
          <div className="grid gap-4 md:grid-cols-4">
            <label className="space-y-2">
              <span className="text-sm font-semibold">Tổ hợp</span>
              <select
                className="h-11 w-full rounded-md border bg-background px-3 text-sm"
                value={combinationCode}
                onChange={(e) =>
                  setCombinationCode(e.target.value as CombinationCode)
                }
              >
                {availableCombinations.map((item) => (
                  <option key={item} value={item}>
                    {COMBINATION_LABELS[item]}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold">Toán</span>
              <Input value={math} onChange={(e) => setMath(e.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold">Lý</span>
              <Input
                value={physics}
                onChange={(e) => setPhysics(e.target.value)}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold">Môn thứ 3</span>
              <div className="text-xs text-muted-foreground">
                Nhập điểm theo môn được dùng trong tổ hợp đã chọn.
              </div>
              <Input
                value={
                  combinationCode === "A00"
                    ? chemistry
                    : combinationCode === "A02"
                      ? biology
                      : combinationCode === "A01"
                        ? english
                        : informatics
                }
                onChange={(e) => {
                  const value = e.target.value;
                  if (combinationCode === "A00") setChemistry(value);
                  else if (combinationCode === "A02") setBiology(value);
                  else if (combinationCode === "A01") setEnglish(value);
                  else setInformatics(value);
                }}
              />
            </label>
          </div>
        ) : null}

        {showHsaInput ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold">Điểm thi HSA (thang 150)</span>
              <Input
                type="number"
                placeholder="Ví dụ: 88"
                value={hsaScore}
                onChange={(e) => setHsaScore(e.target.value)}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold">Năm thi HSA</span>
              <select
                className="h-11 w-full rounded-md border bg-background px-3 text-sm"
                value={hsaYear}
                onChange={(e) => setHsaYear(e.target.value)}
              >
                <option value="2025">Năm 2025</option>
                <option value="2024">Năm 2024</option>
              </select>
            </label>
          </div>
        ) : null}

        {showSatInput ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold">Điểm thi SAT (400 - 1600)</span>
              <Input
                type="number"
                placeholder="Ví dụ: 1400"
                value={satScore}
                onChange={(e) => setSatScore(e.target.value)}
              />
            </label>
          </div>
        ) : null}



        {showAwardsInput ? (
          <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Giải thưởng / Chứng nhận HSG</div>
                <div className="text-xs text-muted-foreground">
                  Dùng cho xét tuyển thẳng và ưu tiên cộng điểm khuyến khích.
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setAwards((current) => [...current, emptyAward()])
                }
              >
                Thêm giải thưởng
              </Button>
            </div>
            {awards.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Chưa khai báo giải thưởng nào. Thí sinh không có giải thưởng có thể bỏ qua phần này.
              </div>
            ) : (
              <div className="space-y-3">
                {awards.map((award, index) => (
                  <div
                    key={`${award.subject}-${index}`}
                    className="grid gap-3 rounded-md border bg-background p-3 md:grid-cols-6 items-center"
                  >
                    <label className="space-y-1">
                      <span className="text-xs font-semibold text-muted-foreground">Môn học</span>
                      <select
                        className="h-10 w-full rounded-md border bg-background px-2 text-xs"
                        value={award.subject}
                        onChange={(e) =>
                          setAwards((current) =>
                            current.map((item, i) =>
                              i === index
                                ? { ...item, subject: e.target.value }
                                : item,
                            ),
                          )
                        }
                      >
                        <option value="Toán">Toán</option>
                        <option value="Tin học">Tin học</option>
                        <option value="Vật lý">Vật lý</option>
                        <option value="Hóa học">Hóa học</option>
                        <option value="Sinh học">Sinh học</option>
                      </select>
                    </label>

                    <label className="space-y-1">
                      <span className="text-xs font-semibold text-muted-foreground">Cấp giải</span>
                      <select
                        className="h-10 w-full rounded-md border bg-background px-2 text-xs"
                        value={award.level}
                        onChange={(e) => {
                          const newLevel = e.target.value as "national" | "provincial";
                          setAwards((current) =>
                            current.map((item, i) =>
                              i === index
                                ? {
                                    ...item,
                                    level: newLevel,
                                    scoreBonus: getCalculatedAwardBonus(newLevel, item.rank, item.isGdtx).toString(),
                                  }
                                : item,
                            ),
                          );
                        }}
                      >
                        <option value="national">Quốc gia / Quốc tế</option>
                        <option value="provincial">Tỉnh / Thành phố</option>
                      </select>
                    </label>

                    <label className="space-y-1">
                      <span className="text-xs font-semibold text-muted-foreground">Giải thưởng</span>
                      <select
                        className="h-10 w-full rounded-md border bg-background px-2 text-xs"
                        value={award.rank}
                        onChange={(e) => {
                          const newRank = e.target.value as "Nhất" | "Nhì" | "Ba" | "Khuyến khích";
                          setAwards((current) =>
                            current.map((item, i) =>
                              i === index
                                ? {
                                    ...item,
                                    rank: newRank,
                                    scoreBonus: getCalculatedAwardBonus(item.level, newRank, item.isGdtx).toString(),
                                  }
                                : item,
                            ),
                          );
                        }}
                      >
                        <option value="Nhất">Giải Nhất</option>
                        <option value="Nhì">Giải Nhì</option>
                        <option value="Ba">Giải Ba</option>
                        <option value="Khuyến khích">Giải Khuyến khích</option>
                      </select>
                    </label>

                    <label className="space-y-1">
                      <span className="text-xs font-semibold text-muted-foreground">Năm đoạt giải</span>
                      <Input
                        className="h-10 text-xs"
                        placeholder="Năm"
                        value={award.year}
                        onChange={(e) =>
                          setAwards((current) =>
                            current.map((item, i) =>
                              i === index
                                ? { ...item, year: e.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </label>

                    <div className="flex flex-col space-y-1.5 items-start justify-center">
                      <label className="flex items-center gap-1.5 text-xs font-semibold">
                        <input
                          type="checkbox"
                          checked={award.isGdtx}
                          onChange={(e) => {
                            const newGdtx = e.target.checked;
                            setAwards((current) =>
                              current.map((item, i) =>
                                i === index
                                  ? {
                                      ...item,
                                      isGdtx: newGdtx,
                                      scoreBonus: getCalculatedAwardBonus(item.level, item.rank, newGdtx).toString(),
                                    }
                                  : item,
                              ),
                            );
                          }}
                        />{" "}
                        GDTX
                      </label>
                      <div className="text-xs font-bold text-primary">
                        Điểm: +{award.scoreBonus}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 text-xs"
                        onClick={() =>
                          setAwards((current) => current.filter((_, i) => i !== index))
                        }
                      >
                        Xóa
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}



        <Button
          type="button"
          onClick={handleCalculate}
          disabled={isCalculating}
          className="w-full md:w-auto"
        >
          {isCalculating ? "Đang tính..." : "Tính điểm UET"}
        </Button>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm font-medium text-destructive">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
            <div className="text-sm font-semibold">Điểm chuẩn 2025</div>
            <div className="text-2xl font-bold">
              {selectedBenchmark?.toFixed(2) ?? "--"}/30
            </div>
            <div className="text-xs text-muted-foreground">
              THPT 2025 theo ngành đang chọn
            </div>
          </div>
          <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
            <div className="text-sm font-semibold">Học phí 2025</div>
            <div className="text-2xl font-bold">
              {selectedTuition
                ? selectedTuition.minFee === 0 && selectedTuition.maxFee === 0
                  ? "Miễn phí"
                  : `${selectedTuition.minFee.toLocaleString("vi-VN")} - ${selectedTuition.maxFee.toLocaleString("vi-VN")} VND`
                : "Chưa có dữ liệu"}
            </div>
            <div className="text-xs text-muted-foreground">
              {selectedTuition?.description ?? "Đang chờ dữ liệu Supabase"}
            </div>
          </div>
        </div>

        {scoreResult ? (
          <div className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
            <div className="space-y-3">
              <div>
                <div className="text-sm font-semibold">Kết quả</div>
                <div className="text-3xl font-bold">
                  {scoreResult.normalizedScore30.toFixed(2)}/30
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {scoreResult.formulaUsed}
                </div>
              </div>
              {chanceResult ? (() => {
                const isSurplus = chanceResult.diff > 0;
                const isEqual = chanceResult.diff === 0;
                let statusClassName = "";
                let statusText = "";

                if (isSurplus) {
                  statusClassName = "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
                  statusText = `Thừa ${chanceResult.diff.toFixed(2)} điểm so với điểm chuẩn 2025`;
                } else if (isEqual) {
                  statusClassName = "text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/20";
                  statusText = "Bằng điểm chuẩn 2025";
                } else {
                  statusClassName = "text-rose-700 dark:text-rose-400 bg-rose-500/10 border-rose-500/20";
                  statusText = `Thiếu ${Math.abs(chanceResult.diff).toFixed(2)} điểm so với điểm chuẩn 2025`;
                }

                return (
                  <div className={`rounded-md border p-3 text-sm ${statusClassName}`}>
                    <div className="font-semibold uppercase text-[10px] opacity-80 tracking-wider">
                      Khả năng đậu ngành đang chọn
                    </div>
                    <div className="mt-1 text-base font-extrabold">
                      {statusText}
                    </div>
                    <div className="mt-1 text-xs opacity-90 leading-relaxed">
                      {chanceResult.message}
                    </div>
                  </div>
                );
              })() : null}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
