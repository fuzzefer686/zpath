# UET Phase Plan

## Mục tiêu chung
Hoàn thiện UET admission engine, UI, test và chuẩn bị dữ liệu để có thể đưa lên Supabase, bám sát dữ liệu trong `UET-db` và gần nhất có thể với cách tổ chức của FTU.

---

## Phase 1 — Audit & Data Mapping
Trạng thái: **đã hoàn thành**

### Đã làm
- Rà `UET-db/infor.md`
- Rà các CSV trong `UET-db`
- Map dữ liệu chương trình tuyển sinh vào `src/lib/admission-data/uet-programs-2026.ts`
- Map thông tin tuyển sinh tổng quan vào `src/lib/admission-data/uet-info-2026.ts`
- Đồng bộ `uet.spec.ts` theo dữ liệu thật hơn
- Mở rộng `UetProgramCode` theo danh sách ngành UET thực tế
- Siết `uet.validators.ts` theo tổ hợp và dữ liệu chương trình
- Bắt đầu chuẩn hóa `uet.index.ts`

### Kết quả
- UET không còn là module hardcode nhỏ nữa
- Có nguồn data nội bộ để phát triển tiếp
- Phase 1 đủ điều kiện để chuyển sang phase 2

---

## Phase 2 — Finalize UET Engine
Trạng thái: **đang thực hiện**

### Mục tiêu
Làm xong toàn bộ phần engine UET để tính điểm, validate và output kết quả đúng với dữ liệu trong `UET-db`.

### Việc cần hoàn thành

#### 2.1. Hoàn thiện `uet.spec.ts`
- Đảm bảo `summary` khớp với `infor.md`
- Đảm bảo `programs` khớp CSV `admission_programs_rows.csv`
- Đảm bảo `combinations` và `allowedCombinations` đúng theo tài liệu
- Đảm bảo `admissionMethods` đúng theo UET rules
- Rà lại các `unknowns`, `implementationNotes`, `edgeCases`

#### 2.2. Hoàn thiện `uet.validators.ts`
- Siết validate payload theo từng method
- Validate tổ hợp theo ngành và theo combination config
- Chuẩn hóa validate chứng chỉ quốc tế
- Chuẩn hóa award / priority rule
- Chuẩn hóa rule cho diện dự bị đại học
- Giảm hardcode còn sót nếu data trong `UET-db` cho phép thay thế

#### 2.3. Hoàn thiện `uet.index.ts`
- Hoàn thiện xử lý cho tất cả method:
  - `METHOD_1`
  - `METHOD_2_1`
  - `METHOD_2_2`
  - `METHOD_2_3`
  - `METHOD_2_5`
  - `METHOD_2_6`
- Chuẩn hóa `details` output cho từng method
- Loại bỏ placeholder không cần thiết
- Đồng nhất cách normalize / round / warnings

#### 2.4. Hoàn thiện output kết quả
- Thống nhất `formulaUsed`
- Thống nhất `originalScore`, `normalizedScore30`, `originalScale`, `targetScale`
- Thống nhất `details` để UI có thể hiển thị rõ hơn

### Deliverable Phase 2
- UET engine chạy ổn, đúng rule, ít placeholder
- Có thể tính điểm các method chính
- Chuẩn bị tốt cho UI và test

### Cần thêm từ user nếu có
- Benchmark/cutoff CSV riêng nếu muốn compare giống FTU
- Bảng quy đổi chứng chỉ chi tiết hơn nếu có tách riêng
- CSV chi tiết cho methods/rules nếu có ngoài `infor.md`

---

## Phase 3 — Finalize UET UI
Trạng thái: **chưa bắt đầu**

### Mục tiêu
Làm UI UET khớp với engine mới, hiển thị đúng theo method và data thật.

### Việc cần làm

#### 3.1. Cập nhật form theo method
- Hiện/ẩn field đúng theo từng method
- Không để field dư làm người dùng nhập nhầm
- Đồng bộ input name/label với rule UET thật

#### 3.2. Cập nhật result display
- Hiển thị điểm gốc và điểm chuẩn hóa rõ ràng
- Hiển thị `formulaUsed`
- Hiển thị warning nếu có
- Hiển thị details hữu ích theo từng method

#### 3.3. Cải thiện UX
- Làm flow nhập liệu dễ hiểu hơn
- Tách phần chứng chỉ / ưu tiên / dự bị đại học rõ hơn
- Nếu có benchmark thì hiển thị compare/cutoff/chance giống FTU

### Deliverable Phase 3
- UI UET đủ dùng và khớp engine
- Người dùng nhập điểm theo đúng ngữ cảnh
- Kết quả hiển thị rõ, ít gây nhầm lẫn

---

## Phase 4 — Tests & Verification
Trạng thái: **chưa bắt đầu**

### Mục tiêu
Đảm bảo UET không bị vỡ logic sau khi refactor.

### Việc cần làm
- Mở rộng `uet.test.ts`
- Test từng method
- Test từng case quan trọng:
  - award bonus
  - priority bonus
  - certificate replacement / bonus
  - HSA
  - SAT
  - dự bị đại học
  - invalid combinations
- Chạy typecheck
- Chạy lint
- Sửa lỗi còn sót

### Deliverable Phase 4
- Test đủ tốt để chặn regression
- Project sạch lỗi kỹ thuật cho UET

---

## Phase 5 — Supabase Preparation
Trạng thái: **chưa bắt đầu**

### Mục tiêu
Chuẩn bị dữ liệu UET để seed/migration lên Supabase.

### Việc cần làm
- Lập mapping CSV -> bảng DB
- Chuẩn hóa schema cho:
  - admission info
  - programs
  - methods
  - combinations
  - rules
  - benchmarks/cutoffs nếu có
- Tạo seed/migration đúng format Supabase
- Chuẩn bị dữ liệu để engine có thể đọc từ DB về sau

### Deliverable Phase 5
- UET data sẵn sàng để đẩy lên Supabase
- Có thể chuyển từ hardcoded data sang DB-driven cleanly

---

## Danh sách file quan trọng hiện tại
- `UET-db/infor.md`
- `UET-db/admission_info_rows.csv`
- `UET-db/admission_programs_rows.csv`
- `src/lib/admission-data/uet-info-2026.ts`
- `src/lib/admission-data/uet-programs-2026.ts`
- `src/lib/admission-engine/modules/uet/uet.spec.ts`
- `src/lib/admission-engine/modules/uet/uet.validators.ts`
- `src/lib/admission-engine/modules/uet/index.ts`
- `src/lib/admission-engine/modules/uet/uet.test.ts`
- `src/components/admission/UetAdmissionCalculator.tsx`

---

## Ghi chú
- Nếu `UET-db` có thêm CSV benchmark/cutoff/method rules, Phase 2 và Phase 3 sẽ hoàn thiện hơn nhiều.
- Nếu chưa có, mình vẫn tiếp tục hoàn thiện theo dữ liệu hiện có và sẽ hỏi bạn khi thật sự cần thêm dữ liệu.
