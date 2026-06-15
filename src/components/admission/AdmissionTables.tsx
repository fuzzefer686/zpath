"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

// Searchable data tables for the branded admission page. The server formats
// every value (scores, money) into plain strings and passes serializable rows;
// these client leaves only filter and render, so no internal fields (notes,
// data_confidence markers) ever reach the user.

export type BenchmarkRow = {
  id: string;
  program: string;
  method: string;
  combo: string;
  scoreText: string;
  searchText: string;
};

export type BenchmarkHighlight = {
  scoreText: string;
  program: string;
  combo: string | null;
};

export type TuitionRow = {
  id: string;
  program: string;
  feeText: string;
  period: string;
  searchText: string;
};

function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400"
      />
    </div>
  );
}

export function BenchmarkPanel({
  highlight,
  highlightLabel,
  rows,
  accentText,
  accentTintBg,
  accentHoverBg,
  referenceNote,
}: {
  highlight: BenchmarkHighlight | null;
  highlightLabel: string;
  rows: BenchmarkRow[];
  accentText: string;
  accentTintBg: string;
  accentHoverBg: string;
  referenceNote: string | null;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () => (q ? rows.filter((r) => r.searchText.includes(q)) : rows),
    [q, rows],
  );

  return (
    <div className="space-y-5">
      {referenceNote ? (
        <p className="rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800">
          {referenceNote}
        </p>
      ) : null}

      {highlight ? (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="grid gap-6 p-6 sm:grid-cols-[auto,1fr] sm:items-center">
            <div className={`rounded-2xl ${accentTintBg} px-6 py-5 text-center`}>
              <div className={`text-xs font-bold uppercase tracking-[0.16em] ${accentText}`}>
                {highlightLabel}
              </div>
              <div className="mt-2 font-display text-5xl font-extrabold leading-none text-slate-950">
                {highlight.scoreText}
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold leading-6 text-slate-900">
                {highlight.program}
              </div>
              {highlight.combo ? (
                <div className="mt-1 text-xs text-slate-500">Tổ hợp {highlight.combo}</div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="Tìm theo ngành, phương thức, tổ hợp, điểm..."
      />

      {filtered.length ? (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-sm font-medium text-slate-500">
            {filtered.length} bản ghi điểm chuẩn
          </div>
          <div className="max-h-[640px] overflow-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-white text-xs uppercase tracking-[0.12em] text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Chương trình</th>
                  <th className="w-32 px-5 py-3.5">Phương thức</th>
                  <th className="w-28 px-5 py-3.5">Tổ hợp</th>
                  <th className="w-28 px-5 py-3.5 text-right">Điểm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => (
                  <tr key={row.id} className={`align-top transition-colors ${accentHoverBg}`}>
                    <td className="px-5 py-3.5 font-semibold leading-6 text-slate-950">
                      {row.program}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{row.method}</td>
                    <td className="px-5 py-3.5 text-slate-600">{row.combo}</td>
                    <td className="px-5 py-3.5 text-right font-display text-base font-extrabold tabular-nums text-slate-950">
                      {row.scoreText}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-center text-sm text-slate-500">
          Không có bản ghi nào khớp với &quot;{query}&quot;.
        </p>
      )}
    </div>
  );
}

export function TuitionPanel({
  rows,
  accentText,
  accentHoverBg,
}: {
  rows: TuitionRow[];
  accentText: string;
  accentHoverBg: string;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () => (q ? rows.filter((r) => r.searchText.includes(q)) : rows),
    [q, rows],
  );

  return (
    <div className="space-y-5">
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="Tìm theo ngành học..."
      />

      {filtered.length ? (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-sm font-medium text-slate-500">
            {filtered.length} chương trình
          </div>
          <div className="max-h-[640px] overflow-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-white text-xs uppercase tracking-[0.12em] text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Chương trình</th>
                  <th className="w-56 px-5 py-3.5 text-right">Học phí</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => (
                  <tr key={row.id} className={`align-top transition-colors ${accentHoverBg}`}>
                    <td className="px-5 py-3.5 font-semibold leading-6 text-slate-950">
                      {row.program}
                    </td>
                    <td className="px-5 py-3.5 text-right leading-6">
                      <span className={`font-display text-base font-extrabold tabular-nums ${accentText}`}>
                        {row.feeText}
                      </span>
                      {row.period ? (
                        <span className="ml-1 text-xs font-medium text-slate-400">{row.period}</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-center text-sm text-slate-500">
          Không có chương trình nào khớp với &quot;{query}&quot;.
        </p>
      )}
    </div>
  );
}
