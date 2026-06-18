# Generic Admission Engine

Config-driven admission calculator for schools added via Admin flow (PDF upload or admin-curated online sources).

## Architecture

```
Admin Sources (URL/PDF link/text) OR PDF Upload
  → Gemini (pass 1 + pass 2) → GenericAdmissionConfig → admission_configs (Supabase)
  → GenericConfigCalculator → interpretAdmission / POST /api/admission/calculate
```

## Schema version

- **v1**: legacy configs (methods + flat inputs only)
- **v2**: programs, combinations, uiTemplate, eligibility, branding (auto-migrated via `migrateAdmissionConfig`)

## Generic vs dedicated (HUST/FTU/UET)

| Feature | Generic (config) | Dedicated (TypeScript) |
|---------|------------------|------------------------|
| Simple THPT/DGNL formulas | Yes | Yes |
| K01, XTTN portfolio, FTU 7 XTT objects | Via config (limited) | Full support |
| Accuracy-critical schools | Review required | HUST/FTU stay dedicated |

**HUST, FTU, UET** remain in `STATIC_DEDICATED_CODES` and are never replaced by generic configs.

## Primitives

- `weighted_combination` — sum of weighted inputs; supports `maxOfInputKeys` on terms (K01)
- `scale_conversion` — linear rescale to 30
- `formula_group_scale` — FTU-style 30/40 scale by program group
- `scoreClamp` on method — post-formula min/max
- Certificate conversion via `certificateLevels` or `certificate_rich`

## Admin workflow

1. Nhập trường + nguồn (URL / file URL / text) → `POST /api/admin/admission/generate`
2. (Hoặc) Upload PDF local → `POST /api/admin/admission/extract`
3. Review JSON / validation dashboard + source report
4. Import programs CSV → `POST /api/admin/admission/import-programs`
5. Import benchmarks CSV → `POST /api/admin/admission/import-benchmarks`
6. Preview → Save draft → Publish

### Generate from admin-curated sources

- Input sources: `url`, `file_url`, `text` (role `primary` / `supplement`)
- Phase 1-2 support chắc chắn: HTML URL + PDF URL + text dán tay
- DOC/DOCX online: chưa parse, được đánh dấu trong `sourceReport`
- Route trả:
  - `draft`, `valid`, `warnings`
  - `sourceReport` (fetched/failed/skipped)
  - `primaryPdfUrl`, `primaryPdfPath` nếu có PDF chính
- Security: chặn URL nội bộ/private (SSRF basic guard)

### Benchmarks CSV format

```csv
program_code,method_code,combination_code,year,score,scale,program_year
IT001,THPT,A00,2025,26.50,30,2026
IT001,THPT,K01,2025,27.00,30,2026
KT002,THPT,,2025,25.80,30,2026
```

- `year`: năm **điểm chuẩn** (VD 2025)
- `program_year`: năm CT trong `admission_programs` (mặc định = năm tuyển sinh trên form admin)
- Import chương trình (bước 3) **trước** import điểm chuẩn

## Public routes

- `/scoring?school=CODE` — calculator hub
- `/unimap/{code}` — full page for published generic schools
