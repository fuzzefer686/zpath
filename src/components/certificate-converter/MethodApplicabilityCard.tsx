"use client";

import type { MethodApplicabilityResult } from "@/src/lib/certificate-converter";

function statusLabel(status: MethodApplicabilityResult["status"]) {
  if (status === "applicable") return "Áp dụng trực tiếp";
  if (status === "conditional") return "Áp dụng có điều kiện";
  return "Không áp dụng";
}

function statusClassName(status: MethodApplicabilityResult["status"]) {
  if (status === "applicable") return "bg-emerald-100 text-emerald-700";
  if (status === "conditional") return "bg-amber-100 text-amber-700";
  return "bg-muted text-muted-foreground";
}

export function MethodApplicabilityCard({
  item,
}: {
  item: MethodApplicabilityResult;
}) {
  return (
    <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            {item.schoolCode} · {item.schoolName}
          </p>
          <h3 className="mt-1 text-base font-bold">
            {item.methodName}
          </h3>
          <p className="text-xs text-muted-foreground">{item.methodCode}</p>
        </div>
        <span
          className={`rounded px-2 py-1 text-xs font-semibold ${statusClassName(item.status)}`}
        >
          {statusLabel(item.status)}
        </span>
      </div>

      <div className="mt-3 rounded-lg border border-border/70 bg-muted/20 p-3">
        <p className="text-xs uppercase text-muted-foreground">Điểm quy đổi</p>
        <p className="mt-1 text-lg font-bold">
          {item.convertedScore === null ? "—" : item.convertedScore.toFixed(2)}
          {item.convertedScore === null ? "" : item.scoreUnit}
        </p>
      </div>

      <p className="mt-3 text-sm">{item.reason}</p>

      {item.notes.length ? (
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          {item.notes.map((note) => (
            <li key={note}>• {note}</li>
          ))}
        </ul>
      ) : null}

      <p className="mt-3 text-xs text-muted-foreground">
        Nguồn: {item.sourceLabel}
      </p>

      <div className="mt-3 flex flex-wrap gap-3 text-xs">
        <a
          href={`/scoring?school=${item.schoolCode}`}
          className="font-semibold text-primary underline"
        >
          Mở trang Tính điểm
        </a>
        <a
          href={`/unimap/${item.schoolCode.toLowerCase()}`}
          className="font-semibold text-primary underline"
        >
          Mở UniMap
        </a>
      </div>
    </article>
  );
}
