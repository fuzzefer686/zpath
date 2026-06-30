# ZPath — `/profile` (CV Builder) Feature Implementation Plan

> **Mục đích**: Spec đầy đủ để Claude Code thực thi tính năng **Hồ sơ cá nhân / CV Builder** trên ZPath — nâng cấp `/profile` hiện tại thành công cụ giúp học sinh xây dựng hồ sơ tổng quát về bản thân, nhận gợi ý khoá học/định hướng dựa trên gap kỹ năng–chứng chỉ, và xuất CV để xin tư vấn ở mọi nơi.
> **Nguyên tắc bám sát ZPath**: configuration over hardcoding, normalized schema, RLS-first security, reuse data sẵn có (chứng chỉ, học bạ, UniMap), AI explainability, modular, scalable nationwide.

---

## 0. Tóm tắt tính năng

Học sinh vào `/profile` → điền/nhập liệu theo từng section → hệ thống tổng hợp thành **hồ sơ tổng quát (CV)** → AI gợi ý phần còn thiếu (kỹ năng, chứng chỉ, khoá học, định hướng) → user **download CV (PDF)** hoặc **chia sẻ link** để dùng khi xin tư vấn (kể cả gửi cho mentor ở feature `/mentor`).

**Cấu trúc CV** (6 khối):
1. Thông tin cơ bản (Basic info)
2. Tóm tắt & mục tiêu (Summary / Objective)
3. Trình độ học vấn — học bạ (Education / Transcript)
4. Kinh nghiệm & kỹ năng (Experience / Skills)
5. Chứng chỉ & giải thưởng (Certificates / Awards)
6. Hoạt động ngoại khoá (Extracurricular)

**Giá trị cốt lõi**:
- User có **cái nhìn toàn cảnh** về bản thân (completeness score + bản đồ năng lực).
- **Gap analysis**: thiếu chứng chỉ/kỹ năng gì so với ngành/nghề mục tiêu → gợi ý khoá học bù đắp.
- **Định hướng sớm** ngay từ cấp 3 dựa trên UniMap (ngành ↔ nghề ↔ tính cách) + (tùy chọn) xuất hồ sơ sang TopCV để tham khảo thị trường lao động.
- **Xuất CV** để xin tư vấn ở mọi nơi.

---

## 1. Quyết định kiến trúc QUAN TRỌNG NHẤT — Render CV thế nào?

> Đây là câu hỏi bạn hỏi trực tiếp: *"nên đẩy data cho API dịch vụ tạo CV bên ngoài hay tự dùng Vertex AI để render?"*

### 1.1 Vấn đề cốt lõi: phải TÁCH 2 mối quan tâm

Đây là điểm dễ nhầm nhất. "Tạo CV" thực ra là **hai việc khác hẳn nhau**, và phải dùng công cụ khác nhau:

| Mối quan tâm | Bản chất | Công cụ ĐÚNG | Công cụ SAI |
|---|---|---|---|
| **A. Content Intelligence** (nội dung): viết summary, gợi ý kỹ năng, phân tích gap, đề xuất khoá học/định hướng | Sáng tạo + suy luận trên dữ liệu | ✅ **Vertex AI / Gemini** (tool-calling, đúng thế mạnh ZPath) | — |
| **B. Rendering** (trình bày → file PDF đẹp, đúng layout) | Deterministic, pixel-chính-xác, lặp lại y hệt | ✅ **Template engine bạn kiểm soát** (deterministic) | ❌ **Vertex AI** / ❌ đẩy thô sang API ngoài (mặc định) |

### 1.2 ❌ Tại sao KHÔNG dùng Vertex AI để render CV

Vertex AI là **LLM, không phải engine layout**. Dùng nó để "render" PDF là sai công cụ:

- **Không deterministic**: cùng input → mỗi lần ra layout khác → CV không nhất quán, không reproducible.
- **Không pixel-perfect**: LLM không kiểm soát được khoảng cách, font, lề, ngắt trang → CV trông nghiệp dư.
- **Rủi ro hallucination = rủi ro pháp lý/uy tín**: LLM có thể **tự sửa/bịa** nội dung trong lúc render (thêm chứng chỉ user không có, đổi điểm). Với CV của học sinh, sai 1 điểm dữ liệu là **không chấp nhận được** — CV phải khớp 100% dữ liệu user nhập.
- **Đắt & chậm** cho việc đáng lẽ là deterministic (mỗi lần render = 1 lần gọi LLM tốn token).
- **Không versionable / testable** như template code.

> **Kết luận**: Vertex AI render = đi ngược "scoring/data accuracy is non-negotiable" của ZPath. **Không dùng.**

### 1.3 ⚠️ Tại sao KHÔNG đẩy thô sang API CV bên ngoài (làm mặc định)

- **Privacy & pháp lý (quan trọng nhất)**: user ZPath là **học sinh THPT — gồm cả trẻ em (<16) và người chưa thành niên (<18)**. CV chứa PII (họ tên, ngày sinh, địa chỉ, điểm số, trường). Đẩy data này sang bên thứ 3 (đặc biệt ra nước ngoài) chạm trực tiếp **Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 + Nghị định 356/2025/NĐ-CP** (cùng hiệu lực 01/01/2026, thay thế Nghị định 13/2023): cần cơ sở pháp lý xử lý dữ liệu, **đồng ý của người đại diện theo pháp luật với dữ liệu trẻ em**, và đánh giá **chuyển dữ liệu xuyên biên giới** nếu render/lưu ra nước ngoài. Xem **§13 Tuân thủ pháp lý** để biết chi tiết. Trái nguyên tắc **data sovereignty** mà ZPath đã chủ động giữ.
- **Mất kiểm soát template**: khó tùy biến CV theo ngữ cảnh tuyển sinh VN (học bạ, tổ hợp, chứng chỉ nội địa như VSTEP).
- **Vendor lock-in + cost per render + rate limit**.

### 1.4 ✅ KHUYẾN NGHỊ: Self-render bằng engine bạn kiểm soát, sau một lớp adapter

**Quyết định đề xuất:**

1. **Content** → Vertex AI/Gemini. Output là **JSON có cấu trúc**, ghi vào DB, user **xác nhận** trước khi vào CV (human-verification gate). **Không bao giờ** để AI tự bịa credential.
2. **Render** → **deterministic template engine**, qua một interface `CVRenderer` để có thể đổi engine mà không sửa business logic:
   - **Default đề xuất: `@react-pdf/renderer`** — thuần JS, **chạy tốt serverless trên Vercel** (không cần headless browser), khớp stack Next.js, deterministic, dễ test.
   - **Phương án giàu CSS hơn: HTML → PDF qua headless Chromium** (`puppeteer-core` + `@sparticuz/chromium` trên Vercel function, hoặc **Playwright** — vốn đã có trong stack ZPath — chạy ở 1 microservice riêng). Layout đẹp hơn nhưng nặng/khó vận hành hơn trên serverless.
   - **External API: chỉ là 1 adapter optional, mặc định TẮT.** Bật sau khi đã giải quyết DPA + consent, nếu muốn zero-maintenance rendering.
3. **Template lưu DB-driven** (`cv_templates`) → đúng "configuration over hardcoding". Thêm/sửa mẫu CV không cần deploy.

```ts
// lib/cv/renderer/types.ts  — lớp trừu tượng để swap engine
export interface CVRenderer {
  render(doc: CVDocument, template: CVTemplate): Promise<{ buffer: Buffer; mime: string }>;
}
// Implementations: ReactPdfRenderer (default) | HtmlPdfRenderer (Playwright) | ExternalApiRenderer (off)
```

### 1.5 Bảng quyết định nhanh

| Tiêu chí | Self-render (react-pdf) ✅ | HTML→PDF (Playwright) | External CV API | Vertex AI render |
|---|---|---|---|---|
| Data ở lại hạ tầng ZPath | ✅ | ✅ | ❌ | ✅ |
| Phù hợp PDPD / data trẻ vị thành niên | ✅ | ✅ | ⚠️ cần DPA+consent | ✅ |
| Deterministic / chính xác dữ liệu | ✅ | ✅ | ✅ | ❌ |
| Chạy tốt trên Vercel serverless | ✅ | ⚠️ nặng | ✅ | ✅ |
| Tự do thiết kế template | ⚠️ vừa | ✅ cao | ⚠️ giới hạn | ❌ |
| Cost vận hành | ✅ thấp | ⚠️ trung | ❌ per-render | ❌ token cao |
| Maintenance | ⚠️ tự build | ⚠️ tự build | ✅ thấp | ❌ |

**Chốt**: **react-pdf làm default**, giữ adapter cho Playwright (HTML→PDF) khi cần mẫu cầu kỳ, và adapter External (off) để mở đường tương lai. **Vertex AI chỉ lo nội dung, tuyệt đối không render.**

---

## 2. Các quyết định kiến trúc khác (đã đề xuất)

| Quyết định | Lựa chọn đề xuất |
|---|---|
| Nâng cấp hay tạo mới | Nâng cấp `/profile` hiện tại, thêm "CV mode" — không tạo route tách rời |
| Storage CV xuất ra | Supabase Storage, bucket riêng `cv-exports`, signed URL TTL ngắn |
| Reuse dữ liệu | **Tái sử dụng** Language Certificate Conversion System (IELTS/VSTEP/HSK…) + dữ liệu học bạ/transcript đã có — KHÔNG nhân bản |
| Định hướng nghề | **Native qua UniMap** (ngành↔nghề↔tính cách) là chính; TopCV chỉ là export/tham khảo (xem §7) |
| AI content | Vertex AI tool-calling, output JSON, **human-confirm** trước khi vào CV |
| Snapshot | `generated_cvs.data_snapshot` lưu nguyên trạng CV lúc xuất file → reproducible (giống pattern staging snapshot) |
| Personality (MBTI/Holland) | **Cần chốt** (xem §10) — optional, feed định hướng |

---

## 3. Data model

> Tất cả bảng có `user_id uuid references auth.users(id)`, RLS theo owner. Section nào tái sử dụng hệ thống cũ thì **tham chiếu**, không copy.

### 3.1 `cv_profiles` — Thông tin cơ bản + Tóm tắt/Mục tiêu (khối 1 & 2)

```sql
create table public.cv_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- Basic info
  full_name text,
  date_of_birth date,
  gender text,
  phone text,
  email text,
  address text,
  avatar_url text,
  -- Summary / objective
  headline text,                 -- 1 dòng định vị bản thân
  summary text,                  -- đoạn tóm tắt
  target_major_code text,        -- ngành mục tiêu (liên kết UniMap)
  target_career text,            -- nghề/định hướng mục tiêu
  -- Cấu hình hiển thị section (configuration over hardcoding)
  sections_config jsonb not null default '{
    "order": ["basic","summary","education","experience_skills","certs_awards","activities"],
    "visibility": {"basic":true,"summary":true,"education":true,"experience_skills":true,"certs_awards":true,"activities":true}
  }'::jsonb,
  completeness_score int not null default 0,  -- tính bằng RPC, KHÔNG hardcode
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 3.2 `cv_education` — Học vấn / Học bạ (khối 3)

```sql
create table public.cv_education (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  level text not null,           -- 'THPT', 'THCS', 'university'...
  school_name text not null,
  school_code text,              -- link tới schools nếu có
  gpa numeric(4,2),
  grade_10 numeric(4,2),
  grade_11 numeric(4,2),
  grade_12 numeric(4,2),
  subjects jsonb,                -- {"Toan":9.2,"Van":8.0,...} — phục vụ scoring engine
  start_year int,
  end_year int,
  is_current boolean not null default false,
  -- Cờ liên kết dữ liệu transcript đã có trong hệ thống scoring (nếu user đã nhập)
  linked_transcript_id uuid,
  created_at timestamptz not null default now()
);
create index idx_cv_education_user on public.cv_education(user_id);
```

### 3.3 `cv_experiences` — Kinh nghiệm (một nửa khối 4)

```sql
create type public.experience_type as enum ('work','volunteer','project','internship','competition','other');

create table public.cv_experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.experience_type not null default 'project',
  title text not null,
  organization text,
  description text,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index idx_cv_experiences_user on public.cv_experiences(user_id, sort_order);
```

### 3.4 `cv_skills` — Kỹ năng (nửa còn lại khối 4)

```sql
create type public.skill_category as enum ('technical','soft','language','tool','other');

create table public.cv_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category public.skill_category not null default 'other',
  proficiency int check (proficiency between 1 and 5),
  source text not null default 'self',   -- 'self' | 'verified' | 'ai_suggested'
  is_confirmed boolean not null default true, -- ai_suggested cần user confirm
  created_at timestamptz not null default now()
);
create index idx_cv_skills_user on public.cv_skills(user_id);
```

### 3.5 `cv_certificates` — Chứng chỉ (REUSE hệ thống cũ)

> **Không tạo bảng chứng chỉ mới.** Tham chiếu Language Certificate Conversion System đã có.

```sql
create table public.cv_certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cert_type_code text not null,   -- FK logic tới catalog chứng chỉ sẵn có (IELTS/VSTEP/HSK/SAT...)
  score text,                     -- giữ text để hỗ trợ band/điểm dạng khác nhau
  issued_date date,
  expiry_date date,
  evidence_url text,              -- ảnh/scan minh chứng (Supabase Storage)
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_cv_certificates_user on public.cv_certificates(user_id);
```

### 3.6 `cv_awards` — Giải thưởng (cùng khối 5)

```sql
create type public.award_level as enum ('school','district','province','national','international');

create table public.cv_awards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  level public.award_level not null default 'school',
  rank text,                      -- 'Giải Nhất', 'Top 10'...
  issuer text,
  award_year int,
  evidence_url text,
  created_at timestamptz not null default now()
);
create index idx_cv_awards_user on public.cv_awards(user_id);
```

### 3.7 `cv_activities` — Hoạt động ngoại khoá (khối 6)

```sql
create table public.cv_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  role text,
  organization text,
  description text,
  start_date date,
  end_date date,
  hours int,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
```

### 3.8 `cv_templates` — Mẫu CV (DB-driven config)

```sql
create type public.cv_render_engine as enum ('react_pdf','html_pdf','external');

create table public.cv_templates (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  engine public.cv_render_engine not null default 'react_pdf',
  layout_config jsonb not null,   -- màu, font, thứ tự khối, density... (config over hardcoding)
  locale text not null default 'vi',
  is_active boolean not null default true,
  preview_image_url text,
  created_at timestamptz not null default now()
);
```

### 3.9 `generated_cvs` — File CV đã xuất (+ snapshot)

```sql
create table public.generated_cvs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid references public.cv_templates(id) on delete set null,
  storage_path text not null,     -- trong bucket cv-exports
  format text not null default 'pdf',
  data_snapshot jsonb not null,   -- toàn bộ CVDocument tại thời điểm render → reproducible
  share_token text unique,        -- nếu cho phép chia sẻ link
  is_public boolean not null default false,
  version int not null default 1,
  created_at timestamptz not null default now(),
  expires_at timestamptz          -- dọn file cũ
);
create index idx_generated_cvs_user on public.generated_cvs(user_id, created_at desc);
```

### 3.10 `cv_recommendations` — Output AI (gap, khoá học, định hướng)

```sql
create type public.reco_type as enum ('skill_gap','cert_gap','course','career_direction','summary_suggestion');

create table public.cv_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.reco_type not null,
  payload jsonb not null,         -- nội dung gợi ý có cấu trúc + lý do (AI explainability)
  rationale text,                 -- giải thích "vì sao" (bám AI explainability của ZPath)
  source_model text,              -- 'gemini-2.x' để truy vết
  status text not null default 'pending' check (status in ('pending','accepted','dismissed')),
  generated_at timestamptz not null default now()
);
create index idx_cv_reco_user on public.cv_recommendations(user_id, type, status);
```

### 3.11 `personality_results` — Kết quả trắc nghiệm tính cách (mục để TRỐNG mặc định)

> Mục tính cách trong CV **để trống** cho tới khi user chủ động bấm "Làm bài trắc nghiệm". Bộ câu hỏi/scoring sẽ chuẩn bị sau (DB-driven). Làm xong, user **tự chọn** có gắn vào CV hay không (`include_in_cv`).

```sql
create table public.personality_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_slug text not null,        -- 'mbti' | 'holland' | ... (catalog chuẩn bị sau)
  result_code text,               -- 'INTJ' | 'RIA' ...
  scores jsonb,                   -- chi tiết điểm từng chiều
  summary text,                   -- mô tả ngắn (có thể do AI sinh, có rationale)
  include_in_cv boolean not null default false,  -- user tự bật/tắt hiển thị trên CV
  taken_at timestamptz not null default now()
);
create index idx_personality_user on public.personality_results(user_id, taken_at desc);
```

### 3.12 `sponsored_placements` + `affiliate_clicks` — Poster tài trợ / hoa hồng

> AI gợi ý **khoá học cơ bản** (miễn phí, khách quan). Bên cạnh đó, có **slot quảng cáo tài trợ** (poster bên thứ 3) — user bấm vào → ZPath nhận hoa hồng. **Bắt buộc tách bạch** với gợi ý AI (xem §5.4) và tuân thủ §13.

```sql
create table public.sponsored_placements (
  id uuid primary key default gen_random_uuid(),
  sponsor_name text not null,
  title text not null,
  poster_url text not null,        -- ảnh poster (Supabase Storage hoặc CDN sponsor)
  target_url text not null,        -- link đích (gắn tracking)
  discount_label text,             -- "Giảm 30%" ...
  -- Nhắm mục tiêu theo ngữ cảnh (KHÔNG dùng dữ liệu cá nhân nhạy cảm để target)
  context_tags text[],             -- ['it','ielts','design'] khớp gap chung, không khớp PII
  commission_model text,           -- 'cpc' | 'cpa'
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  placement_id uuid not null references public.sponsored_placements(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,  -- có thể null để giảm thu thập PII
  clicked_at timestamptz not null default now(),
  context text                     -- nơi hiển thị: 'capability_map' | 'course_reco' ...
);
create index idx_affiliate_clicks_placement on public.affiliate_clicks(placement_id, clicked_at desc);
```

> **Lưu ý compliance** (§13): poster hiển thị cho học sinh là **quảng cáo nhắm tới người chưa thành niên** → phải gắn nhãn "Tài trợ/Quảng cáo" rõ ràng, không gây nhầm với gợi ý khách quan, không lừa dối, và **không target bằng dữ liệu cá nhân của trẻ em**. Chỉ target theo **context tag chung** (vd ngành/chứng chỉ), không theo hồ sơ cá nhân.

---

## 4. RLS Policies (CRITICAL)

Mọi bảng `cv_*` đều bật RLS, owner-only. Mẫu chung:

```sql
alter table public.cv_profiles enable row level security;

create policy "owner reads own cv_profile"
  on public.cv_profiles for select using (auth.uid() = user_id);
create policy "owner writes own cv_profile"
  on public.cv_profiles for insert with check (auth.uid() = user_id);
create policy "owner updates own cv_profile"
  on public.cv_profiles for update using (auth.uid() = user_id);
-- Lặp pattern này cho cv_education, cv_experiences, cv_skills,
-- cv_certificates, cv_awards, cv_activities, generated_cvs, cv_recommendations
```

**`cv_templates`** — đọc công khai (mẫu active), chỉ admin sửa:

```sql
alter table public.cv_templates enable row level security;
create policy "public read active templates"
  on public.cv_templates for select using (is_active = true);
-- write: chỉ admin (qua role hoặc service role)
```

**Tích hợp với `/mentor`** (optional, cần chốt): cho mentor đang tư vấn user xem CV của user đó. Nên làm **qua RPC `share_cv_with_mentor`** thay vì policy rộng, để kiểm soát phạm vi (chỉ mentor có conversation active với user).

**Public share link**: nếu bật `is_public=true` + `share_token`, đọc CV qua **RPC riêng dùng token** (không nới RLS bảng). Cảnh báo user rõ ràng vì CV chứa PII (xem §10).

**Storage `cv-exports` & `cv-evidence`**:
- Path convention: `{user_id}/{cv_id}/{filename}`.
- Policy: chỉ owner upload/download (so khớp `auth.uid()` với prefix path). File public chỉ qua signed URL có TTL.

---

## 5. AI Layer — Vertex AI (chỉ lo NỘI DUNG)

> Vertex AI/Gemini với tool-calling, output **JSON có cấu trúc**, ghi vào `cv_recommendations`, **user confirm** trước khi đưa vào CV. **Không tự bịa credential.**

### 5.1 Các "tool"/chức năng AI

| Hàm | Input | Output | Ghi chú |
|---|---|---|---|
| `enrich_summary` | profile + target_major/career | `summary`, `headline` đề xuất | User sửa được, không auto-apply |
| `suggest_skills` | experiences + target | danh sách kỹ năng (status `ai_suggested`, `is_confirmed=false`) | User tick chọn |
| `analyze_cert_gap` | cv_certificates + UniMap (yêu cầu chứng chỉ của ngành mục tiêu) | thiếu chứng chỉ gì + mức cần | Dùng dữ liệu cert conversion sẵn có |
| `analyze_skill_gap` | cv_skills + nghề mục tiêu | kỹ năng còn thiếu + lý do | `rationale` bắt buộc |
| `recommend_courses` | gap (skill+cert) | khoá học đề xuất (xem §5.3 nguồn khoá học) | Có link/nguồn |
| `suggest_career_direction` | profile + UniMap (ngành↔nghề↔tính cách) + (optional) personality | 2–3 định hướng + reasoning | "Định hướng sớm từ cấp 3" |

### 5.2 Nguyên tắc bắt buộc (bám ZPath)

- **AI explainability**: mỗi recommendation phải có `rationale` ("vì sao gợi ý điều này").
- **Human gate**: AI ghi `status='pending'`; chỉ vào CV khi user `accept`.
- **Integrity tuyệt đối**: AI **không** được tạo/sửa chứng chỉ, điểm, giải thưởng. AI chỉ gợi ý kỹ năng/khoá học/định hướng và **chỉnh văn phong** summary.
- **Traceability**: lưu `source_model`.

### 5.3 Nguồn dữ liệu khoá học — ĐÃ CHỐT

- **AI gợi ý các khoá cơ bản** (khách quan, không trả phí). Dùng Gemini + Search Grounding để gợi ý khoá học công khai phù hợp gap, **lưu kèm nguồn** và `rationale`. Đây là nội dung **độc lập với tài trợ**.
- (Dài hạn, optional) Có thể bổ sung bảng `courses` native gắn UniMap khi cần curate sâu hơn.

### 5.4 Tách bạch GỢI Ý AI ≠ POSTER TÀI TRỢ (bắt buộc)

Đây là ranh giới sống còn về **tính trung thực + pháp lý**:

- **Gợi ý AI**: sinh ra **chỉ** từ gap năng lực của user, **tuyệt đối không** bị thiên vị bởi hoa hồng. AI **không biết** sponsor nào trả tiền. Thứ tự/độ liên quan của gợi ý AI **không** phụ thuộc commission.
- **Poster tài trợ** (`sponsored_placements`): hiển thị ở **slot riêng biệt, có nhãn rõ ràng** ("Tài trợ" / "Quảng cáo"), tách khỏi danh sách gợi ý AI. Khi user bấm → ghi `affiliate_clicks` → redirect qua `target_url`.
- **Target poster theo context chung** (vd tag `ielts`, `it`), **KHÔNG** dùng PII/dữ liệu cá nhân của học sinh để nhắm quảng cáo (xem §13.5).
- Lý do: trộn quảng cáo trả phí vào gợi ý "khách quan" cho học sinh vừa **mất niềm tin**, vừa rủi ro **quảng cáo gây nhầm lẫn nhắm tới người chưa thành niên** (Luật Quảng cáo + bảo vệ trẻ em).

---

## 6. Render pipeline (chi tiết kỹ thuật)

### 6.1 Luồng

```
[CV data trong DB]
   │  RPC get_cv_document(user_id)  → gom 6 khối thành 1 CVDocument JSON chuẩn hoá
   ▼
[API route /api/cv/render]  (server-side, KHÔNG lộ ra client)
   │  chọn template (cv_templates) → CVRenderer.render(doc, template)
   ▼
[CVRenderer adapter]
   ├─ ReactPdfRenderer (default)         → Buffer PDF
   ├─ HtmlPdfRenderer (Playwright)       → Buffer PDF (mẫu cầu kỳ)
   └─ ExternalApiRenderer (OFF mặc định) → gọi API ngoài
   ▼
[Upload Supabase Storage cv-exports/{user_id}/{cv_id}.pdf]
   │  ghi generated_cvs (+ data_snapshot, version)
   ▼
[Trả signed URL TTL ngắn cho client download]
```

### 6.2 Chuẩn hoá `CVDocument`

Một interface trung gian tách dữ liệu khỏi engine — đổi template/engine không đụng query:

```ts
interface CVDocument {
  basic: { fullName: string; dob?: string; phone?: string; email?: string; address?: string; avatarUrl?: string };
  summary: { headline?: string; objective?: string };
  education: EducationItem[];
  experiences: ExperienceItem[];
  skills: SkillItem[];
  certificates: CertItem[];   // đã resolve tên hiển thị từ catalog cert
  awards: AwardItem[];
  activities: ActivityItem[];
  meta: { locale: string; generatedAt: string };
}
```

### 6.3 Lưu ý vận hành

- **react-pdf**: dùng được trên Vercel Node runtime (không phải Edge). Đăng ký font tiếng Việt (Unicode đầy đủ dấu) — **bắt buộc** test dấu tiếng Việt.
- **Playwright**: nếu chọn HTML→PDF, chạy ở **service riêng/Cloud Run**, không nhồi vào Vercel function (cold start + bundle size). Stack ZPath đã có Playwright → tái dùng được.
- **Dọn rác**: cron xoá `generated_cvs` quá `expires_at` + file Storage tương ứng.

---

## 7. Tích hợp "định hướng / TopCV" (đã kiểm chứng thực tế)

> **Thực tế từ kiểm tra**: TopCV **không có public API phía ứng viên/học sinh**. API TopCV là **B2B phía nhà tuyển dụng (ATS sync), trả phí**, lấy Access Token trong tài khoản nhà tuyển dụng. → Không thể "auto-link" kiểu plug-and-play.

**Chiến lược 3 lớp (ưu tiên từ trên xuống):**

1. **Native orientation qua UniMap (chính)**: ZPath đã có graph ngành↔nghề↔career paths↔personality. Định hướng nên build **nội bộ** trên dữ liệu này → không phụ thuộc bên ngoài, đúng triết lý knowledge graph. Đây là "tìm định hướng phù hợp từ cấp 3" chuẩn nhất.
2. **Export thủ công (nhẹ, v1)**: cho user **download CV/JSON** để tự upload lên TopCV nếu muốn tham khảo thị trường lao động. Không cần tích hợp kỹ thuật.
3. **Partnership API (tương lai)**: nếu muốn liên kết dữ liệu thật, cần **thoả thuận hợp tác/thương mại** với TopCV (B2B). Tách thành đề mục riêng, **không** chặn v1.

> Khuyến nghị v1: làm **(1) + (2)**. Đừng phụ thuộc TopCV cho luồng định hướng cốt lõi.

---

## 8. Phases thực thi (cho Claude Code)

Mỗi phase có **deliverable** + **acceptance**. Hoàn thành phase trước → báo cáo → confirm → sang phase sau.

### Phase 0 — Schema + RLS + Storage
**Tasks**: migration §3, RLS §4, tạo bucket `cv-exports` + `cv-evidence` với policy, enum types, seed 2 `cv_templates` (1 react_pdf cơ bản, 1 dự phòng).
**Acceptance**: `supabase db push` clean; user A không đọc được CV user B (RLS test); template active đọc được public.

### Phase 1 — CRUD dữ liệu CV + Builder UI
**Tasks**: trang `/profile` chế độ builder, từng section CRUD (basic, summary, education, experience, skills, awards, activities); drag-reorder + toggle visibility ghi vào `sections_config`; RPC `compute_completeness_score`.
**Acceptance**: nhập/sửa/xoá từng khối; completeness score cập nhật; sections_config lưu đúng; tất cả qua RLS.

### Phase 2 — Tái sử dụng Chứng chỉ + Học bạ
**Tasks**: section chứng chỉ **đọc từ catalog cert conversion sẵn có** (dropdown IELTS/VSTEP/HSK/SAT…); nếu user đã nhập transcript cho scoring → cho **import** vào `cv_education` (set `linked_transcript_id`); upload minh chứng vào `cv-evidence`.
**Acceptance**: chọn chứng chỉ từ catalog (không nhập tay loại); import học bạ không nhân bản dữ liệu; minh chứng chỉ owner xem được.

### Phase 3 — Render pipeline + Download PDF
**Tasks**: `CVRenderer` interface + `ReactPdfRenderer`; RPC `get_cv_document`; API `/api/cv/render`; upload + ghi `generated_cvs` (snapshot); nút Download; **font tiếng Việt**.
**Acceptance**: render PDF khớp 100% dữ liệu DB; dấu tiếng Việt đúng; render 2 lần cùng data → file giống nhau; signed URL hết hạn đúng TTL.

### Phase 4 — AI Content Intelligence (Vertex AI)
**Tasks**: tool `enrich_summary`, `suggest_skills`; ghi `cv_recommendations` (`pending`); UI review accept/dismiss; **không auto-apply**.
**Acceptance**: AI gợi ý summary/kỹ năng có `rationale`; chỉ vào CV khi accept; AI không đụng chứng chỉ/điểm/giải thưởng.

### Phase 5 — Gap Analysis + Khoá học + Định hướng + Slot tài trợ
**Tasks**: `analyze_cert_gap`, `analyze_skill_gap` (dùng UniMap + cert conversion), `recommend_courses` (AI gợi ý khoá cơ bản, kèm nguồn), `suggest_career_direction` (UniMap). Dashboard "Bản đồ năng lực" hiển thị gap + gợi ý. Thêm **slot poster tài trợ riêng biệt** (`sponsored_placements`) có nhãn "Tài trợ", endpoint `/api/sponsored/click` ghi `affiliate_clicks` rồi redirect. **Tách bạch tuyệt đối** gợi ý AI ≠ tài trợ (§5.4).
**Acceptance**: gap khớp yêu cầu ngành mục tiêu trong UniMap; mỗi gợi ý có lý do; gợi ý AI không bị ảnh hưởng bởi sponsor; poster có nhãn rõ; click được track + redirect đúng; target poster chỉ theo context tag, không theo PII.

### Phase 5.5 — Trắc nghiệm tính cách (khung trước, nội dung sau)
**Tasks**: bảng `personality_results` + nút "Làm bài trắc nghiệm tính cách" trên `/profile` (mục tính cách **để trống** mặc định); khung engine chấm điểm DB-driven (bộ câu hỏi bạn chuẩn bị sau); sau khi có kết quả, toggle `include_in_cv` để user **tự chọn** gắn vào CV; feed (nếu có) vào `suggest_career_direction`.
**Acceptance**: mục tính cách trống cho tới khi user làm bài; làm xong lưu kết quả; user bật/tắt hiển thị trên CV; không ép buộc.

### Phase 6 — Export / TopCV / Share (kèm Consent gate)
**Tasks**: export JSON; share link (`share_token`, `is_public`) qua RPC token; **consent gate cho dữ liệu trẻ em + cảnh báo PII** trước khi bật share công khai (§13); tài liệu hướng dẫn upload TopCV thủ công.
**Acceptance**: share link đọc được CV mà không nới RLS; tắt share → link chết; share công khai yêu cầu xác nhận consent rõ ràng; CV mặc định private.

### Phase 7 — Polish + Mobile + Templates + Testing
**Tasks**: thêm 1–2 template; mobile responsive (đa số user mobile); empty states; E2E (Playwright): nhập → AI gợi ý → render → download → share; rate limit render (vd 10 render/giờ/user).
**Acceptance**: E2E pass; mobile mượt; rate limit hoạt động; CV đẹp trên mobile preview.

---

## 9. Cấu trúc file đề xuất (Next.js App Router)

```
app/
├── (public)/profile/
│   ├── page.tsx                       # Builder + preview
│   ├── share/[token]/page.tsx         # Public CV qua token
│   └── _components/
│       ├── SectionBasic.tsx
│       ├── SectionSummary.tsx
│       ├── SectionEducation.tsx
│       ├── SectionExperienceSkills.tsx
│       ├── SectionCertsAwards.tsx
│       ├── SectionActivities.tsx
│       ├── CompletenessMeter.tsx
│       ├── CapabilityMap.tsx          # gap + gợi ý
│       ├── AiSuggestionReview.tsx     # accept/dismiss
│       └── TemplatePicker.tsx
├── api/cv/
│   ├── render/route.ts                # server-only render
│   └── ai/route.ts                    # gọi Vertex AI tools
lib/
├── cv/
│   ├── renderer/
│   │   ├── types.ts                   # CVRenderer interface
│   │   ├── reactPdf.tsx               # default
│   │   ├── htmlPdf.ts                 # Playwright (optional)
│   │   └── external.ts                # OFF mặc định
│   ├── document.ts                    # build CVDocument
│   ├── completeness.ts
│   └── types.ts
├── ai/
│   ├── vertex.ts                      # client + tool-calling
│   └── cvTools.ts                     # enrich/gap/recommend/career
└── supabase/{client,server}.ts
config/
└── features.ts                        # FEATURES.cvBuilder, FEATURES.cvShare, FEATURES.externalRenderer(false)
supabase/migrations/
├── 2026XXXX_cv_schema.sql
├── 2026XXXX_cv_rls.sql
├── 2026XXXX_cv_rpc.sql
└── 2026XXXX_cv_storage_policies.sql
```

---

## 10. Edge cases & quyết định cần chốt sớm

| Tình huống | Đề xuất xử lý | Trạng thái |
|---|---|---|
| Chiều tính cách (MBTI/Holland) | **CHỐT**: mục để **trống** mặc định; nút "Làm bài trắc nghiệm"; nội dung bài chuẩn bị sau; user **tự chọn** gắn vào CV (`include_in_cv`). | ✅ chốt |
| Nguồn khoá học | **CHỐT**: AI gợi ý khoá **cơ bản** (khách quan) + slot **poster tài trợ** tách riêng có hoa hồng (§5.4). | ✅ chốt |
| External renderer bật/tắt | TẮT mặc định; chỉ bật sau khi xong consent + đánh giá xuyên biên giới (§13). | ✅ chốt |
| **Dữ liệu trẻ em/người chưa thành niên** | Xem **§13** — consent người đại diện, mặc định CV private, gate cho share công khai. | ✅ chốt hướng |
| Poster tài trợ cho học sinh | Nhãn "Tài trợ" rõ ràng; không target bằng PII; tách khỏi gợi ý AI (§5.4, §13.5). | ✅ chốt |
| AI auto-fill vs confirm | Mặc định **confirm** (human gate). Có cho phép auto-apply summary không? | ☐ cần xác nhận |
| Mentor xem CV của user | Qua RPC `share_cv_with_mentor`, chỉ khi có conversation active | ☐ cần xác nhận |
| Public share link bị phát tán | TTL + revoke + watermark "ZPath"? | ☐ cần xác nhận |
| Retention file PDF | Auto-xoá sau N ngày (`expires_at`) | ☐ cần xác nhận |

---

## 11. Acceptance Criteria tổng

✅ User xây CV theo 6 khối, đảo thứ tự & ẩn/hiện section (config-driven).
✅ Chứng chỉ & học bạ **tái sử dụng** hệ thống sẵn có, không nhân bản dữ liệu.
✅ **Render bằng engine ZPath kiểm soát**; PDF khớp 100% dữ liệu DB; dấu tiếng Việt đúng; reproducible.
✅ Vertex AI chỉ gợi ý **nội dung** (summary, kỹ năng, gap, khoá học, định hướng) — có `rationale`, qua human gate, **không bịa credential**.
✅ Gap analysis & định hướng dựa trên **UniMap** (explainable).
✅ Download PDF + (optional) share link có cảnh báo PII; CV mặc định private.
✅ RLS chặn cross-user; verified bằng test.
✅ Mobile responsive.
✅ External CV API **không** bật mặc định; mọi config/template **database-driven**.

---

## 12. Lệnh khởi động cho Claude Code

> "Đọc file `zpath-cv-profile-feature-plan.md`. Bắt đầu Phase 0. Xong Phase 0 thì dừng, báo cáo, chờ confirm trước khi sang Phase 1. Tuân thủ ZPath: configuration over hardcoding, normalized schema, RLS-first, reuse cert/transcript/UniMap, AI explainability. QUAN TRỌNG: render CV bằng engine deterministic (react-pdf default) — KHÔNG dùng Vertex AI để render, KHÔNG bật External renderer."

---

## 13. Tuân thủ pháp lý — Dữ liệu cá nhân & trẻ em (QUAN TRỌNG)

> ⚠️ Đây là tổng hợp thông tin để bạn nắm bức tranh kỹ thuật–pháp lý, **không phải tư vấn pháp lý**. Với một sản phẩm xử lý dữ liệu học sinh quy mô lớn, bạn **nên** tham vấn luật sư/đơn vị tư vấn về bảo vệ dữ liệu cá nhân ở VN trước khi go-live.

### 13.1 Luật áp dụng
- **Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15** — Quốc hội thông qua 26/6/2025, **hiệu lực 01/01/2026**.
- **Nghị định 356/2025/NĐ-CP** (ban hành 31/12/2025, hiệu lực 01/01/2026) hướng dẫn Luật, **thay thế Nghị định 13/2023/NĐ-CP**.
- Liên quan: Luật Trẻ em 2016, Luật Quảng cáo, và Nghị định bảo vệ trẻ em trên môi trường mạng (siết công khai thông tin trẻ em, hiệu lực giữa 2026).

### 13.2 Phân biệt độ tuổi — RẤT QUAN TRỌNG cho ZPath
- **"Trẻ em" = dưới 16 tuổi** (Luật Trẻ em) → nhóm được bảo vệ ở **mức cao nhất**, có quy định riêng về đồng ý.
- **"Người chưa thành niên" = dưới 18 tuổi** → vẫn có đầy đủ quyền chủ thể dữ liệu, nhưng không trùng hoàn toàn với nhóm "trẻ em".
- User ZPath trải dài cả hai: lớp 10 (15 tuổi) thường là **trẻ em <16**; lớp 12 (17–18) là người chưa thành niên. → **Hệ thống nên lưu `date_of_birth` và phân luồng xử lý theo độ tuổi.**

**Age gate (đã chốt hướng):** yêu cầu user nhập ngày sinh → **tính tuổi phía server** (đừng tin client) → user <16 thì **chặn tính năng share** (và chặn/hạn chế gửi data cross-border, xem §13.7 lớp 6). Lưu ý thực tế:
- Ngày sinh tự khai **không xác minh được** — một học sinh quyết tâm vẫn có thể khai sai. Đây vẫn là biện pháp thiện chí hợp lý (chuẩn mực ngành), nhưng đừng coi là "đã đủ" về mặt kiểm tra tuổi.
- **Tối thiểu hoá**: nếu chỉ cần kiểm soát truy cập, có thể chỉ lưu cờ dẫn xuất `is_under_16` thay vì phơi ngày sinh khắp nơi (dù scoring tuyển sinh có thể vẫn cần DOB — khi đó vẫn lưu nhưng bảo vệ chặt).
- Tính tuổi **tại thời điểm thực hiện hành động** (không cache cũ), vì user sẽ qua sinh nhật.
- Nếu sau này muốn **cho phép** share với user <16 thì **không đủ** chỉ DOB — phải có **consent xác minh của người đại diện**. v1 đơn giản nhất là **chặn share cho <16**.

### 13.3 Đồng ý (consent)
- Quyền cốt lõi của chủ thể dữ liệu: **được biết, đồng ý/không đồng ý, rút lại đồng ý, truy cập, chỉnh sửa, yêu cầu xóa, hạn chế xử lý**. Phải hiện thực hoá bằng UI (privacy policy rõ ràng + nút rút đồng ý + xóa dữ liệu).
- **Dữ liệu trẻ em**: người đại diện theo pháp luật (cha mẹ/người giám hộ) thay mặt thực hiện quyền của chủ thể dữ liệu là trẻ em.
- **Điểm mới đáng chú ý**: việc xử lý dữ liệu trẻ em nhằm **công bố/tiết lộ thông tin đời sống riêng tư, bí mật cá nhân** của **trẻ em từ đủ 7 tuổi trở lên** phải có **đồng ý của CẢ trẻ em VÀ người đại diện theo pháp luật**. (Khác Nghị định 13 cũ — vốn yêu cầu đồng ý cả hai bất kể mục đích.)

### 13.4 Ánh xạ vào feature CV — đâu là điểm rủi ro cao
| Hành vi trong feature | Mức rủi ro | Cách xử lý đề xuất |
|---|---|---|
| Lưu CV (PII) trong Supabase, user tự xem | Thấp–trung | Privacy policy + consent khi tạo hồ sơ; RLS owner-only |
| **Public share link** CV của học sinh | **CAO** = "công bố/tiết lộ" thông tin | Mặc định **private**. Bật share công khai phải qua **consent gate**: nếu user <16 → cần xác nhận đồng ý của cả em + người đại diện; cảnh báo PII; cho revoke + TTL |
| **Gửi data sang Vertex AI** (Google Cloud) | **CAO** nếu xử lý ngoài VN | = **chuyển dữ liệu xuyên biên giới** → cần đánh giá tác động (CTIA) trừ khi thuộc diện miễn. Giảm rủi ro: chọn region gần/in-region nếu có, **tối thiểu hoá & ẩn danh** dữ liệu gửi lên model (đừng gửi họ tên/địa chỉ/ngày sinh khi chỉ cần gap năng lực) |
| **External CV renderer** ra nước ngoài | **CAO** | Giữ TẮT mặc định; nếu bật phải có hợp đồng xử lý dữ liệu + đánh giá xuyên biên giới + consent |
| Lưu file PDF có PII trong Storage | Trung | Bucket private, signed URL TTL ngắn, auto-xoá theo `expires_at` |
| Minh chứng (ảnh chứng chỉ/giải thưởng) | Trung–cao (có thể là dữ liệu nhạy cảm) | Private, RLS, không public |

### 13.5 Quảng cáo / poster tài trợ tới học sinh
- Đối tượng xem phần lớn là **người chưa thành niên** → quảng cáo phải **gắn nhãn rõ ("Tài trợ"/"Quảng cáo")**, **không gây nhầm lẫn** với gợi ý khách quan, **không lừa dối**.
- **KHÔNG nhắm quảng cáo bằng dữ liệu cá nhân của trẻ em** (chỉ target theo context tag chung như ngành/chứng chỉ — đã thiết kế ở `sponsored_placements.context_tags`).
- `affiliate_clicks` nên cho phép `user_id` null để giảm thu thập PII; nếu lưu thì khai báo rõ trong privacy policy.

### 13.6 Checklist tuân thủ tối thiểu (bake vào sản phẩm)
1. **Privacy policy / thông báo xử lý dữ liệu** rõ ràng, ngôn ngữ dễ hiểu cho học sinh + phụ huynh.
2. **Cơ chế consent** lúc tạo hồ sơ; lưu mốc thời gian + phiên bản chính sách đã đồng ý.
3. **Phân luồng tuổi** từ `date_of_birth`: user <16 → quy trình **consent người đại diện** cho các hành vi rủi ro cao (share công khai, gửi dữ liệu ra ngoài).
4. **Quyền của user**: nút **xem/sửa/xóa dữ liệu** + **rút đồng ý** (Luật cho phép yêu cầu xóa từ 2026).
5. **Tối thiểu hoá dữ liệu gửi cho AI**: chỉ gửi đủ để phân tích gap; ẩn danh khi có thể.
6. **Mặc định private**; mọi việc "công bố" (share link) là **opt-in có cảnh báo**.
7. **Đánh giá chuyển dữ liệu xuyên biên giới** cho Vertex AI / external renderer.
8. **Tách bạch quảng cáo** khỏi gợi ý AI; gắn nhãn tài trợ.
9. **Bảo mật**: RLS, signed URL TTL, mã hoá khi truyền, log truy cập; thông báo khi có sự cố lộ dữ liệu.
10. **Lưu trữ tối thiểu**: xoá file/dữ liệu khi hết mục đích (`expires_at`, xóa theo yêu cầu).

> Mức phạt vi phạm bảo vệ dữ liệu cá nhân đã được quy định và áp dụng từ 01/01/2026 — sai sót với dữ liệu trẻ em là nhóm rủi ro nặng. Đầu tư đúng phần consent + xuyên biên giới ngay từ v1 sẽ rẻ hơn nhiều so với sửa sau.

### 13.7 Bảo mật AI xuyên biên giới (Vertex AI) — phòng thủ theo lớp

> Thực tế hạ tầng: **không có region Google Cloud đặt tại VN**; gần nhất là **Singapore (asia-southeast1)**. Cam kết data-residency (DRZ) cho xử lý ML của Vertex **chỉ áp dụng ở US và EU**. → Gửi data sang Vertex = **luôn là chuyển xuyên biên giới** với VN. Không "né" được bằng region, nhưng **giảm rủi ro tới mức gần như vô hại** bằng các lớp sau. Đòn bẩy lớn nhất: **đừng gửi PII ngay từ đầu.**

| Lớp | Biện pháp | Hiệu quả |
|---|---|---|
| **1. De-identify / minimize (QUAN TRỌNG NHẤT)** | Trước mọi lần gọi AI, một **sanitizer server-side** loại bỏ PII. AI phân tích gap/summary chỉ cần: ngành/nghề mục tiêu, danh sách chứng chỉ (loại + điểm), kỹ năng, học lực/GPA, hoạt động. **KHÔNG gửi**: họ tên, ngày sinh, SĐT, email, địa chỉ, ảnh minh chứng. Tên/PII được **chèn lại sau** khi model trả kết quả (template phía server). Dùng placeholder `[STUDENT]`, `[SCHOOL]`. | Dữ liệu rời VN trở thành **phi định danh** → cross-border không còn là dữ liệu cá nhân nhạy cảm |
| **2. Gateway pattern** | Mọi call AI đi qua backend (Edge Function / API route), client **không** gọi thẳng Vertex. Một chốt chặn duy nhất để ép redaction + log + giữ key server-side. | Kiểm soát tập trung, không lộ key |
| **3. Region pinning** | Dùng **regional endpoint asia-southeast1 (Singapore)**, KHÔNG dùng global endpoint (global không hỗ trợ data residency). Gần VN nhất, latency thấp. | Xử lý gói gọn ở Singapore (vẫn cross-border, nhưng hẹp) |
| **4. Zero-retention + DPA** | Ký **Cloud Data Processing Addendum** với Google; Vertex (bản trả phí) mặc định **không dùng prompt của bạn để train model** — cần **xác minh & tắt logging/caching lưu prompt**. | Cái đã gửi **không bị lưu lại** → cơ chế xoá 30 phút (§13.8) mới thật sự trọn vẹn |
| **5. CTIA** | Lập **Hồ sơ đánh giá tác động chuyển dữ liệu xuyên biên giới** theo Luật 91/2025 + NĐ 356/2025; consent của user phải **nêu rõ việc xử lý ở nước ngoài**. | Tuân thủ pháp lý |
| **6. Riêng user <16** | Posture mạnh nhất: **không gửi PII của trẻ <16 ra nước ngoài**, hoặc chỉ gửi bản phi định danh hoàn toàn; cân nhắc gap-analysis bằng rule-based/local cho nhóm này. | Bảo vệ nhóm rủi ro cao nhất |
| **7. Transport/at-rest** | TLS (mặc định); **không lưu** prompt/response thô có PII; nếu cache thì cache bản phi định danh. | Giảm bề mặt lộ lọt |
| **8. (Tối đa) Model in-country** | Nếu muốn **zero cross-border**: chạy model mở (Gemma/Llama) trên data center/cloud tại VN. Đánh đổi: chất lượng + chi phí vận hành. | Loại bỏ hoàn toàn cross-border |

> **Chốt khuyến nghị**: làm **(1) + (2) + (4)** ngay từ v1 — rẻ, hiệu quả nhất. Với lớp (1)+(4), dữ liệu rời VN vừa **phi định danh** vừa **không bị lưu** → trung hoà gần hết cả rủi ro xuyên biên giới lẫn lo ngại "đã gửi đi rồi xoá ở DB còn ý nghĩa gì".

### 13.8 Cơ chế dữ liệu ephemeral / tự xoá sau 30 phút

> Mong muốn của bạn: dữ liệu CV bị **xoá khỏi toàn bộ DB trong vòng 30 phút** kể từ khi server trả CV cho user xem; user xoá được bất kỳ lúc nào trong cửa sổ đó; hết 30 phút → auto-xoá + reload web. Đây là **data minimization mạnh**, rất tốt cho PDPD/trẻ em.

**⚠️ Cảnh báo thiết kế (cần bạn cân nhắc)**: nếu xoá **toàn bộ** dữ liệu nguồn sau 30 phút thì mâu thuẫn với chính giá trị "xây hồ sơ từ cấp 3, có cái nhìn toàn cảnh lâu dài, tải CV mọi lúc" — user phải nhập lại từ đầu mỗi lần. Đề xuất **tách 2 tầng dữ liệu**, để bạn chọn:

- **Tầng nguồn (persistent, tuỳ chọn lưu)**: 6 khối hồ sơ. User **chủ động** chọn "Lưu hồ sơ" → tồn tại dưới RLS + xoá thủ công bất kỳ lúc nào. Nếu **không** chọn lưu → coi như phiên ephemeral, áp dụng quy tắc 30 phút cho tất cả.
- **Tầng artifact rủi ro cao (luôn ephemeral)**: **file CV đã render**, **snapshot share công khai**, và **mọi payload đã gửi cross-border**. Nhóm này **luôn** auto-xoá ≤ 30 phút bất kể user có lưu hồ sơ hay không.

→ Vừa đạt mục tiêu privacy (artifact chứa PII nặng nhất luôn bị xoá nhanh), vừa không phá UX (hồ sơ nguồn persist nếu user muốn). Mặc định nếu chưa chốt: bật **ephemeral mode** cho mọi thứ (an toàn nhất).

**Thiết kế kỹ thuật (đảm bảo xoá thật, không phụ thuộc client):**

```sql
-- Cột mốc neo thời gian: thời điểm server trả CV cho user
alter table public.generated_cvs add column served_at timestamptz;
alter table public.generated_cvs add column purge_at  timestamptz; -- = served_at + interval '30 min'
```

1. **Neo thời gian phía server**: khi `/api/cv/render` trả CV → set `served_at = now()`, `purge_at = now() + 30min`. **Không** tin timer phía client (user có thể đóng tab — timer chết nhưng dữ liệu phải vẫn bị xoá).
2. **Job xoá nền (server-guaranteed)**: **pg_cron** trong Supabase (hoặc Edge Function chạy cron mỗi phút) **hard-delete** mọi bản ghi `purge_at <= now()`: rows DB + **file Storage** (PDF, ảnh minh chứng) + bản cache phi định danh phía AI (nếu có).
3. **Xoá thủ công bất kỳ lúc nào**: RPC `purge_cv_now(user_id)` — user bấm "Xoá ngay".
4. **"Reload web sau 30 phút"** chỉ là UX phía client (đếm ngược tới `purge_at` rồi gọi reload) — **nguồn sự thật vẫn là job server**. Hiển thị đồng hồ đếm ngược cho user biết.
5. **Hard delete, không soft delete** cho nhóm ephemeral (soft delete = vẫn còn dữ liệu → không đạt mục đích xoá).
6. **Phải xoá đủ mọi nơi**: DB rows, Storage objects, CDN cache (nếu có), và **đảm bảo bên AI không giữ lại** (nhờ §13.7 lớp 4) — nếu không, "xoá ở DB" chỉ là xoá một bản sao.

---

**Last updated**: 2026-06-22
**Author context**: ZPath Phase 4 — AI-native admissions infrastructure
**Quyết định trọng tâm**: Vertex AI = nội dung; deterministic engine = render; external API = adapter optional (off).
