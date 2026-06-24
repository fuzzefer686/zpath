# ZPath CV Builder — Execution Playbook (Claude Code / Antigravity)

> Đi kèm `zpath-cv-profile-feature-plan.md`. File này chia nhỏ thành **23 task** có thể giao trực tiếp cho agent, mỗi task có **prompt pasteable** + **tiêu chí evaluate** + **model/tool khuyến nghị**.

---

## A. Chọn model/tool nào để execute?

**Lưu ý**: trong lineup hiện tại **không có "Opus 4.7"**. Các lựa chọn thực tế của bạn:

| Công cụ | Model | Thế mạnh | Dùng cho |
|---|---|---|---|
| **Claude Code** | **Opus 4.8** | Mạnh nhất, suy luận sâu, ít lỗi tinh vi | Việc **bảo mật & đúng-sai sống còn**: RLS, race-condition RPC, sanitizer, AI gateway, job xoá ephemeral, age-gate/consent, share-token |
| **Claude Code** | **Sonnet 4.6** | Workhorse nhanh/rẻ, vẫn rất khá cho logic vừa | Logic **trung cấp**: render pipeline, gap analysis, orchestrate AI tools, RPC thường, schema |
| **Antigravity** | **Gemini 3.5 Flash (high)** | Nhanh, rẻ, throughput cao | Việc **cơ học/UI đã đặc tả rõ, rủi ro thấp**: CRUD UI, scaffolding, seed, polish, empty states |

**Nguyên tắc phân bổ (bám "correctness over speed" của ZPath):**
- Mọi thứ chạm **dữ liệu trẻ em / PII / xoá dữ liệu / RLS / cross-border** → **Opus 4.8**. Đây là nhóm mà 1 lỗi = rủi ro pháp lý. Không tiết kiệm ở đây.
- Logic nghiệp vụ vừa phải, có spec rõ → **Sonnet 4.6**.
- UI lặp lại, scaffolding, đặc tả kín → **Gemini 3.5 Flash (high)** trên Antigravity để tiết kiệm.
- **Đừng** chạy nhóm bảo mật/đúng-sai trên Flash — model nhỏ dễ bỏ sót edge case tinh vi; eval khó bắt hết.

**Lưu ý dùng 2 công cụ song song:**
- Claude Code đọc `CLAUDE.md` để lấy context. **Antigravity không đọc `CLAUDE.md`** — hãy mirror cùng bộ quy tắc vào file context/rules của Antigravity (vd `AGENTS.md` hoặc workspace rules) hoặc dán vào đầu prompt.
- Giữ **convention chung** (đặt tên, cấu trúc thư mục theo plan §9) để code 2 tool không lệch nhau.
- Eval gate ở mỗi task là lưới an toàn chung — dù tool nào viết, phải pass eval mới merge.

---

## B. Cách chạy (vòng lặp)

1. **Setup 1 lần**: tạo `CLAUDE.md` ở gốc repo (nội dung mục B.1). Mirror sang rules của Antigravity.
2. **Mỗi task**: dán prompt → agent thực thi → **dừng & báo cáo** → bạn chạy **Evaluate** → pass thì confirm → task sau.
3. Theo **thứ tự dependency** trong bảng §C. Không nhảy cóc qua task nền tảng (schema/RLS/sanitizer).
4. Đổi model trong Claude Code bằng `/model` tuỳ task.

### B.1 — Nội dung `CLAUDE.md` (đặt 1 lần)

```md
# ZPath — Context cho coding agent

## Đọc trước
- Spec đầy đủ: `zpath-cv-profile-feature-plan.md`. Luôn đọc đúng section (§) được nêu trong task.

## Engineering philosophy (BẮT BUỘC)
- Correctness over speed. Configuration over hardcoding. Normalized schema. RLS-first.
- Reuse dữ liệu sẵn có: catalog chứng chỉ, transcript, UniMap — KHÔNG nhân bản.
- AI explainability: mọi recommendation có `rationale`. AI KHÔNG bịa credential.
- Render CV bằng engine deterministic (react-pdf default). KHÔNG dùng Vertex AI để render. KHÔNG bật External renderer.

## Bảo mật & pháp lý (BẮT BUỘC — Luật 91/2025 + NĐ 356/2025)
- Mặc định CV private. Mọi "công bố" (share) là opt-in có cảnh báo.
- User <16: chặn share; hạn chế/không gửi PII cross-border (§13.7 lớp 6).
- Trước MỌI call AI: đi qua sanitizer de-identify (§13.7 lớp 1) + gateway server-side (lớp 2).
- Artifact PII nặng (file render, snapshot share, payload cross-border) luôn ephemeral ≤ 30 phút (§13.8).

## Quy tắc làm việc
- Mỗi task: làm đúng phạm vi, KHÔNG tự mở rộng. Xong thì DỪNG, báo cáo file đã đổi + cách test, CHỜ confirm.
- Viết test kèm cho task có logic. Không commit secret/API key.
```

### B.2 — Prompt kickoff (dán đầu tiên)

```
Đọc CLAUDE.md và zpath-cv-profile-feature-plan.md. Tóm tắt lại trong 5 gạch đầu dòng:
(1) kiến trúc render, (2) vai trò Vertex AI, (3) ràng buộc RLS, (4) cơ chế ephemeral 30 phút,
(5) quy tắc dữ liệu trẻ <16. Sau đó DỪNG, chờ tôi giao task đầu tiên. Chưa viết code.
```

---

## C. Bảng tổng 23 task

| ID | Task | Tool / Model | Depends |
|---|---|---|---|
| T01 | Schema migration + enums | Sonnet 4.6 | — |
| T02 | RLS policies (cv_* + templates) | **Opus 4.8** | T01 |
| T03 | Storage buckets + storage policies | **Opus 4.8** | T01 |
| T04 | Seed (templates + test data) | Gemini Flash | T01–T03 |
| T05 | RPC `get_cv_document` + `compute_completeness_score` | Sonnet 4.6 | T01–T02 |
| T06 | Builder UI — 6 section CRUD | Gemini Flash | T05 |
| T07 | Section reorder + visibility (`sections_config`) | Gemini Flash | T06 |
| T08 | Certificate picker (catalog cũ) + transcript import | Sonnet 4.6 | T05 |
| T09 | Evidence upload (`cv-evidence`) | Gemini Flash | T03, T06 |
| T10 | `CVRenderer` interface + ReactPdfRenderer + font VN | Sonnet 4.6 | T05 |
| T11 | `/api/cv/render` + Storage + `generated_cvs(served_at/purge_at)` | **Opus 4.8** | T10 |
| T12 | Job xoá ephemeral + `purge_cv_now` RPC + countdown UI | **Opus 4.8** | T11 |
| T13 | **Sanitizer / de-identify layer** (code đáng làm cẩn thận) | **Opus 4.8** | T05 |
| T14 | Vertex AI gateway (region + zero-retention) | **Opus 4.8** | T13 |
| T15 | AI tools `enrich_summary` + `suggest_skills` + review UI | Sonnet 4.6 | T14 |
| T16 | Gap analysis `analyze_cert_gap` + `analyze_skill_gap` (UniMap) | Sonnet 4.6 | T14 |
| T17 | `recommend_courses` + `suggest_career_direction` + Capability Map UI | Sonnet 4.6 | T16 |
| T18 | Sponsored placements + affiliate clicks (tách bạch) | Gemini Flash | T17 |
| T19 | Personality framework (table + nút + `include_in_cv`) | Gemini Flash | T01 |
| T20 | Age gate (DOB → tuổi server-side → gate) | **Opus 4.8** | T05 |
| T21 | Consent gate + share-token RPC + export JSON + doc TopCV | **Opus 4.8** | T11, T20 |
| T22 | Mobile + empty states + rate limit | Gemini Flash | sau T15+ |
| T23 | E2E Playwright (RLS, ephemeral, sanitizer no-PII) | Sonnet 4.6 | toàn bộ |

---

## D. Prompt + Evaluate từng task

> Mỗi prompt ngầm áp dụng `CLAUDE.md`. Antigravity: nhớ mirror rules trước.

### T01 — Schema migration + enums · Sonnet 4.6
**Prompt**
```
Thực thi Phase 0 (schema) theo plan §2 & §3 của zpath-cv-profile-feature-plan.md.
Tạo migration SQL: enum types + bảng cv_profiles, cv_education, cv_experiences, cv_skills,
cv_certificates, cv_awards, cv_activities, cv_templates, generated_cvs, cv_recommendations,
personality_results, sponsored_placements, affiliate_clicks. Đủ index như spec.
Chưa tạo RLS (task sau). Xong DỪNG, báo file migration + lệnh chạy.
```
**Evaluate**: `supabase db push` clean; đủ bảng/enum/index; FK `on delete cascade` đúng; chưa bật RLS (để T02).

### T02 — RLS policies · Opus 4.8
**Prompt**
```
Thực thi RLS theo plan §4. Bật RLS owner-only cho mọi bảng cv_* + generated_cvs +
cv_recommendations + personality_results. cv_templates: public read active, write admin-only.
KHÔNG nới policy cho share/mentor (để qua RPC token sau). Viết test SQL chứng minh:
user A không đọc/sửa được dữ liệu user B. Xong DỪNG, báo file + cách chạy test.
```
**Evaluate**: bật RLS đủ bảng; test cross-user **fail đúng** (A không thấy B); template active đọc public; insert/update chỉ owner.

### T03 — Storage buckets + policies · Opus 4.8
**Prompt**
```
Tạo 2 bucket private: cv-exports, cv-evidence (plan §4 Storage). Path convention {user_id}/{cv_id}/...
Storage policy: chỉ owner (so khớp auth.uid() với prefix path) upload/đọc. Không public.
Viết test: user A không tải được file của user B qua path. Xong DỪNG, báo policy + test.
```
**Evaluate**: bucket private; chỉ owner truy cập theo prefix; cross-user download **bị chặn**.

### T04 — Seed · Gemini 3.5 Flash (high)
**Prompt**
```
Tạo seed script: 2 cv_templates (1 react_pdf 'basic', 1 dự phòng) với layout_config hợp lệ;
3 user test + dữ liệu CV mẫu đủ 6 khối (1 user <16, 1 user 17t, 1 user có chứng chỉ IELTS).
Dùng dữ liệu giả, KHÔNG PII thật. Xong DỪNG, báo cách chạy seed.
```
**Evaluate**: seed chạy không lỗi; có user <16 để test gate; template active hiển thị được.

### T05 — Core RPC · Sonnet 4.6
**Prompt**
```
Implement 2 RPC (plan §3/§6): get_cv_document(user_id) gom 6 khối thành CVDocument chuẩn hoá
(resolve tên hiển thị chứng chỉ từ catalog); compute_completeness_score(user_id) tính % theo
số khối có dữ liệu (config-driven, KHÔNG hardcode trọng số rải rác — để 1 chỗ config).
Viết unit test. Xong DỪNG.
```
**Evaluate**: `get_cv_document` trả đúng cấu trúc CVDocument; chứng chỉ resolve tên; completeness đổi khi thêm/xoá khối; trọng số nằm 1 chỗ.

### T06 — Builder UI (6 sections CRUD) · Gemini Flash
**Prompt**
```
Trang /profile chế độ builder. Tạo component CRUD cho 6 khối (plan §0 + §9 cấu trúc file):
basic, summary, education, experience, skills, awards, activities. Gọi Supabase qua RLS.
Mobile-first. KHÔNG dùng localStorage. Xong DỪNG.
```
**Evaluate**: thêm/sửa/xoá từng khối lưu DB qua RLS; mobile ổn; không lỗi hydration.

### T07 — Reorder + visibility · Gemini Flash
**Prompt**
```
Thêm drag-reorder + toggle ẩn/hiện cho 6 khối, ghi vào cv_profiles.sections_config (order+visibility).
Render CV/preview tôn trọng config này. Xong DỪNG.
```
**Evaluate**: đổi thứ tự/ẩn hiện lưu đúng `sections_config`; preview phản ánh đúng.

### T08 — Reuse cert + transcript · Sonnet 4.6
**Prompt**
```
Section chứng chỉ phải CHỌN từ catalog cert conversion sẵn có (dropdown IELTS/VSTEP/HSK/SAT...),
KHÔNG cho nhập tự do loại chứng chỉ. Nếu user đã có transcript trong hệ thống scoring → cho import
vào cv_education (set linked_transcript_id), KHÔNG copy trùng. Xong DỪNG, nêu rõ bảng catalog đã dùng.
```
**Evaluate**: loại chứng chỉ lấy từ catalog (không free-text); import transcript không nhân bản; linked_transcript_id set đúng.

### T09 — Evidence upload · Gemini Flash
**Prompt**
```
Upload minh chứng chứng chỉ/giải thưởng vào bucket cv-evidence theo path {user_id}/{cv_id}/...
Whitelist MIME (ảnh/pdf), giới hạn size. Hiển thị qua signed URL TTL ngắn. Xong DỪNG.
```
**Evaluate**: upload đúng path; MIME/size validate; file private, chỉ owner xem qua signed URL.

### T10 — CVRenderer + react-pdf + font VN · Sonnet 4.6
**Prompt**
```
Implement interface CVRenderer (plan §1.4, §6) + ReactPdfRenderer (default). Đăng ký font Unicode
tiếng Việt đầy đủ dấu. Render CVDocument → PDF Buffer, tôn trọng template layout_config + sections_config.
Để sẵn chỗ cho HtmlPdfRenderer/ExternalRenderer nhưng KHÔNG implement (External off). Xong DỪNG.
```
**Evaluate**: PDF khớp 100% dữ liệu; dấu tiếng Việt đúng; render 2 lần cùng input → file giống nhau (deterministic); chỉ react-pdf hoạt động.

### T11 — /api/cv/render + ephemeral fields · Opus 4.8
**Prompt**
```
API route server-only /api/cv/render: load CVDocument → CVRenderer → upload cv-exports →
ghi generated_cvs kèm data_snapshot, served_at=now(), purge_at=now()+interval '30 min'.
Trả signed URL TTL ngắn. KHÔNG lộ logic render ra client. Xong DỪNG, nêu cách test.
```
**Evaluate**: render qua server; `served_at`/`purge_at` set đúng; snapshot lưu; signed URL hết hạn đúng TTL.

### T12 — Ephemeral purge job · Opus 4.8
**Prompt**
```
Theo plan §13.8. Tạo job xoá nền server-guaranteed (pg_cron mỗi phút HOẶC Edge Function cron):
HARD-delete mọi generated_cvs có purge_at<=now() → xoá rows + file Storage tương ứng (+ cache nếu có).
RPC purge_cv_now(user_id) cho nút "Xoá ngay". UI countdown tới purge_at rồi reload (chỉ UX).
KHÔNG soft-delete. Viết test: tạo bản ghi purge_at quá khứ → job xoá sạch cả file. Xong DỪNG.
```
**Evaluate**: hết 30' tự xoá **cả DB lẫn Storage**; `purge_cv_now` xoá tức thì; đóng tab vẫn bị xoá (không phụ thuộc client); hard-delete (không còn dấu vết).

### T13 — Sanitizer / De-identify layer · Opus 4.8 ⭐ (code đáng làm cẩn thận)
**Prompt** (đầy đủ, dán nguyên):
```
Mục tiêu: tạo lớp sanitizer DE-IDENTIFY chạy SERVER-SIDE, là cửa duy nhất trước mọi call Vertex AI
(plan §13.7 lớp 1). Không có lớp này thì cấm gọi AI.

File: lib/ai/sanitizer.ts

Interface:
  type AiTask = 'enrich_summary'|'suggest_skills'|'analyze_skill_gap'|'analyze_cert_gap'
              |'recommend_courses'|'suggest_career_direction';
  interface SanitizeResult { payload: object; restore: (text: string) => string; }
  function sanitizeForAI(profile: FullProfile, task: AiTask, opts: { isUnder16: boolean }): SanitizeResult;

ALLOW-LIST (được phép gửi cho AI):
  - targetMajorCode, targetCareer
  - education[]: level, gpa, grade10/11/12, subjects (chỉ điểm số)        // KHÔNG gửi school_name
  - skills[]: name, category, proficiency
  - certificates[]: certTypeCode, score                                    // KHÔNG gửi evidenceUrl
  - awards[]: level, rank, year, title (đã scrub)                          // KHÔNG gửi issuer là tên người
  - activities[]: type, role, hours, title+description (đã scrub)          // KHÔNG gửi organization thật

DENY-LIST (TUYỆT ĐỐI KHÔNG gửi):
  - fullName            → thay placeholder "[STUDENT]"  (re-inject sau)
  - schoolName          → "[SCHOOL_n]"                  (re-inject sau)
  - organization        → "[ORG_n]"                     (re-inject sau)
  - dateOfBirth         → DROP (không gửi). Nếu task cần tuổi → chỉ gửi ageBand "15-16", không gửi DOB.
  - phone, email, address, avatarUrl, evidenceUrl, attachmentPath → DROP hoàn toàn

SCRUB free-text (mọi field title/description trước khi gửi): regex loại
  SĐT VN (0\d{9,10} | +84...), email, CCCD/CMND (9 hoặc 12 chữ số liền), URL.

PLACEHOLDER MAP:
  - Giữ map { "[STUDENT]": "Nguyễn Văn A", "[SCHOOL_1]": "...", "[ORG_1]": "..." } CHỈ trong bộ nhớ,
    theo vòng đời 1 request. KHÔNG persist, KHÔNG log.
  - restore(text): thay ngược placeholder → giá trị thật trên output của model.
    => Tên xuất hiện ở CV cuối nhưng CHƯA BAO GIỜ được gửi cho model.

RULE user <16 (opts.isUnder16 === true): profile NGHIÊM NGẶT HƠN:
  - Bỏ toàn bộ free-text (mọi description, mọi title của award/activity).
  - Không gửi ageBand. Chỉ gửi tối thiểu: targetMajorCode, danh sách certTypeCode, skill name, level.
  - Export cờ cho caller: nếu muốn, caller có thể chọn KHÔNG gọi AI cho nhóm này (rule-based fallback).

LOGGING GUARD:
  - Cấm log profile thô, cấm log placeholder map. Chỉ được log payload đã sanitize.
  - Thêm assert dev: throw nếu payload còn chứa bất kỳ giá trị deny-list nào.

TESTS (bắt buộc, lib/ai/sanitizer.test.ts):
  1. PII-leak: profile có name/dob/phone/email/address → assert payload KHÔNG chứa các giá trị này;
     school/organization đã thành placeholder.
  2. Round-trip: model trả "Tôi là [STUDENT] học tại [SCHOOL_1]" → restore() ra đúng tên+trường thật.
  3. Scrub: description chứa "gọi 0901234567, mail a@b.com" → bị loại trong payload.
  4. <16: isUnder16=true → payload không có free-text, không có ageBand.
  5. Log guard: spy logger → assert không có PII trong log.

Xong implement + chạy test. DỪNG, báo kết quả test.
```
**Evaluate**: cả 5 test pass; thử thủ công 1 profile thật → payload gửi đi **không còn PII nào**; restore() khôi phục đúng tên/trường; nhánh <16 nghiêm ngặt hơn; grep log không thấy PII.

### T14 — Vertex AI gateway · Opus 4.8
**Prompt**
```
File lib/ai/vertex.ts: gateway server-side gọi Vertex AI. BẮT BUỘC đi qua sanitizeForAI (T13) trước.
Dùng REGIONAL endpoint asia-southeast1 (KHÔNG dùng global endpoint). Cấu hình tắt prompt logging/
caching lưu prompt nếu SDK hỗ trợ; thêm comment TODO ký Cloud DPA + lập hồ sơ CTIA (plan §13.7).
Client KHÔNG gọi thẳng Vertex — chỉ qua API route. Key chỉ ở server env. Xong DỪNG.
```
**Evaluate**: mọi call AI qua sanitizer (không có đường vòng); endpoint = asia-southeast1; key không lộ client; có chỗ cấu hình retention + ghi chú DPA/CTIA.

### T15 — AI tools summary/skills + review UI · Sonnet 4.6
**Prompt**
```
Implement enrich_summary + suggest_skills qua gateway T14 (đã sanitize). Ghi cv_recommendations
status='pending' kèm rationale + source_model. UI review: user accept/dismiss; chỉ khi accept mới
ghi vào CV. KHÔNG auto-apply. AI KHÔNG được đụng chứng chỉ/điểm/giải thưởng. Xong DỪNG.
```
**Evaluate**: gợi ý có rationale; chỉ vào CV khi accept; AI không sửa credential; data gửi AI đã sanitize (kiểm qua log payload).

### T16 — Gap analysis · Sonnet 4.6
**Prompt**
```
analyze_cert_gap + analyze_skill_gap (plan §5.1) qua gateway T14: so hồ sơ với yêu cầu ngành/nghề
mục tiêu trong UniMap + catalog cert conversion → liệt kê thiếu gì + mức cần, mỗi mục có rationale.
Ghi cv_recommendations. Xong DỪNG.
```
**Evaluate**: gap khớp yêu cầu ngành trong UniMap (không bịa); có rationale; dùng catalog cert thật.

### T17 — Courses + career + Capability Map · Sonnet 4.6
**Prompt**
```
recommend_courses (AI gợi ý khoá CƠ BẢN, kèm nguồn) + suggest_career_direction (dựa UniMap, có
personality nếu user đã làm test). Dashboard "Bản đồ năng lực" hiển thị gap + gợi ý + completeness.
Gợi ý AI KHÔNG biết sponsor (tách bạch §5.4). Xong DỪNG.
```
**Evaluate**: khoá học kèm nguồn; định hướng explainable từ UniMap; gợi ý AI không lẫn quảng cáo.

### T18 — Sponsored + affiliate · Gemini Flash
**Prompt**
```
Slot poster tài trợ RIÊNG BIỆT (plan §3.12, §5.4): đọc sponsored_placements active, render có NHÃN
"Tài trợ" rõ ràng, tách khỏi danh sách gợi ý AI. Endpoint /api/sponsored/click ghi affiliate_clicks
rồi redirect target_url. Target CHỈ theo context_tags chung, KHÔNG theo PII. Xong DỪNG.
```
**Evaluate**: poster có nhãn "Tài trợ"; tách khỏi gợi ý AI; click track + redirect đúng; không target bằng PII.

### T19 — Personality framework · Gemini Flash
**Prompt**
```
Mục tính cách trên /profile để TRỐNG mặc định + nút "Làm bài trắc nghiệm tính cách". Bảng
personality_results (đã có schema). Engine chấm điểm DB-driven (bộ câu hỏi nạp sau — để khung +
1 bộ mẫu nhỏ). Sau khi có kết quả: toggle include_in_cv để user TỰ chọn gắn vào CV. Xong DỪNG.
```
**Evaluate**: mục trống tới khi làm bài; làm xong lưu kết quả; user bật/tắt hiển thị; không ép buộc.

### T20 — Age gate · Opus 4.8
**Prompt**
```
Theo plan §13.2. Yêu cầu nhập date_of_birth; TÍNH TUỔI PHÍA SERVER tại thời điểm hành động
(không tin client, không cache). Tạo helper isUnder16(userId) + guard. user <16 → CHẶN tính năng
share và truyền cờ isUnder16=true xuống sanitizer/gateway (T13/T14). Viết test ranh giới (15t, 16t,
qua sinh nhật). Xong DỪNG.
```
**Evaluate**: tuổi tính server-side; <16 bị chặn share; cờ isUnder16 chảy xuống sanitizer; test ranh giới pass.

### T21 — Consent + share + export · Opus 4.8
**Prompt**
```
Theo plan §13.4/§13.6. Mặc định CV private. Bật share công khai phải qua CONSENT GATE + cảnh báo PII
(với <16: chặn hẳn — đã làm T20). Share đọc qua RPC dùng share_token (KHÔNG nới RLS bảng); tắt share →
token chết; có TTL/revoke. Export JSON. Viết doc hướng dẫn upload TopCV thủ công. Xong DỪNG.
```
**Evaluate**: share qua token không nới RLS; tắt → link chết; consent gate hiện trước khi public; <16 không share được; export JSON đúng.

### T22 — Mobile + empty states + rate limit · Gemini Flash
**Prompt**
```
Polish: responsive toàn bộ /profile (đa số user mobile, input không bị keyboard che); empty states đẹp
cho từng khối; rate limit render (vd 10 render/giờ/user) + AI call. Xong DỪNG.
```
**Evaluate**: mobile mượt; empty states rõ; rate limit chặn đúng ngưỡng.

### T23 — E2E Playwright · Sonnet 4.6
**Prompt**
```
Viết E2E (Playwright): (1) nhập hồ sơ → AI gợi ý → accept → render → download; (2) share/consent +
chặn share cho <16; (3) ephemeral: render rồi chờ/force purge → dữ liệu+file biến mất; (4) RLS:
user A không truy cập dữ liệu/file user B; (5) sanitizer: assert payload gửi AI không chứa PII.
Xong DỪNG, báo cách chạy.
```
**Evaluate**: tất cả 5 luồng pass; đặc biệt (3),(4),(5) là gate bảo mật phải xanh.

---

## E. Thứ tự chạy gợi ý

Nền tảng **T01→T02→T03→T04** → dữ liệu/UI **T05→T06→T07→T08→T09** → render+ephemeral **T10→T11→T12** → **AI: T13 (sanitizer) → T14 (gateway) → T15→T16→T17** → **T18, T19** → compliance **T20→T21** → polish **T22** → **T23**.

> Quy tắc vàng: **T13 (sanitizer) + T14 (gateway) phải xong và pass test TRƯỚC khi bất kỳ task nào gọi AI thật** (T15–T17). Đừng để task AI nào chạy "tạm" mà bỏ qua sanitizer.

---

**Last updated**: 2026-06-22
