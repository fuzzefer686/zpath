# Sơ đồ làm việc và quy ước mở rộng Admission Engines

Tài liệu này mô tả cách tổ chức code, luồng làm việc và các lưu ý khi phát triển hệ thống admission/scoring để có thể mở rộng lên nhiều trường và nhiều engine mà vẫn hạn chế conflict.

## Mục tiêu

- Tách rõ phần **dùng chung** và phần **riêng theo từng trường**.
- Giảm conflict khi nhiều người cùng phát triển nhiều school/engine.
- Scale từ vài trường lên 20+ trường mà không phải sửa một component trung tâm quá nhiều.
- Giữ logic scoring, validation, mapping payload ra khỏi UI.

## Tư duy thiết kế

Nguyên tắc quan trọng nhất là:

- **Shared layer** chỉ chứa phần thật sự dùng chung.
- **School layer** chứa rule, benchmark, cấu hình và UI riêng của từng trường.
- **Engine layer** chứa logic scoring / validate / mapping của từng phương thức xét tuyển.
- **UI container** chỉ điều phối, không chứa rule nghiệp vụ.

Nếu một thay đổi liên quan tới UET nhưng không liên quan FTU/HUST thì thay đổi đó phải nằm trong folder của UET, không chạm vào shared nếu không cần thiết.

## Luồng làm việc chuẩn

```text
User chọn trường
  → load config của trường
  → load danh sách engine/method phù hợp
  → render form theo schema
  → validate input
  → build payload theo engine
  → gọi API chung
  → nhận kết quả
  → map kết quả về UI
  → hiển thị score / benchmark / trạng thái
```

## Sơ đồ thư mục đề xuất

```text
src/
  components/
    admission/
      shared/
        components/
          BaseSelect.tsx
          BaseInput.tsx
          ScoreResultCard.tsx
          ErrorState.tsx
        hooks/
          useDebounce.ts
          useAdmissionApi.ts
        types/
          admission.types.ts
          engine.types.ts
          school.types.ts
        utils/
          normalize.ts
          formatScore.ts
          parseNumber.ts
        api/
          admissionApi.ts
        constants/
          admission.constants.ts
      schools/
        uet/
          components/
            UetAdmissionCalculator.tsx
            UetMethodSelector.tsx
            UetBonusScorePanel.tsx
          engines/
            thpt-score/
              index.ts
              schema.ts
              validate.ts
              scoring.ts
            hsa-score/
              index.ts
              schema.ts
              validate.ts
              scoring.ts
            sat-score/
              index.ts
              schema.ts
              validate.ts
              scoring.ts
          hooks/
            useUetAdmissionForm.ts
          types/
            uet.types.ts
          utils/
            uet-mapper.ts
            uet-rules.ts
          config/
            index.ts
            methods.ts
            benchmarks.ts
            programs.ts
        ftu/
          components/
          engines/
          hooks/
          types/
          utils/
          config/
        hust/
          components/
          engines/
          hooks/
          types/
          utils/
          config/
      AdmissionCalculatorShell.tsx
      AdmissionSchoolSelector.tsx
```

## Ý nghĩa từng phần

### 1) `shared/`

Chứa những thứ mọi trường đều dùng:

- types / interfaces chung
- helper parse / format / normalize
- API adapter chung
- constants chung
- UI base components dùng lại được

Không nên nhét vào đây:

- rule của riêng một trường
- benchmark riêng
- logic validate riêng của UET/FTU/HUST
- hard-code method riêng của một school

### 2) `schools/<school>/`

Chứa phần đặc thù của từng trường:

- các method khả dụng
- benchmark / cutoff / mapping
- input labels riêng
- UI riêng
- config riêng

### 3) `engines/<engine>/`

Chứa phần đặc thù của từng engine:

- field schema
- validate input
- build payload
- scoring logic
- map response

## Cách scale lên 20 trường

### Bước 1: chuẩn hóa contract

Dùng một contract chung cho mọi engine:

- `schoolCode`
- `engineId`
- `year`
- `payload`
- `benchmark`

Khi contract ổn định, các team chỉ cần implement theo chuẩn đó.

### Bước 2: mỗi trường là một module

Mỗi trường có folder riêng để đảm bảo:

- không conflict trực tiếp giữa các trường
- dễ giao việc
- dễ bật/tắt từng trường

### Bước 3: mỗi engine là một module

Mỗi engine phải có:

- file schema
- file validation
- file scoring
- file export chính

### Bước 4: registry chỉ là lớp mỏng

Registry chỉ nên làm nhiệm vụ map `schoolCode -> school module` hoặc `engineId -> engine module`.

Không nên viết registry theo kiểu một file khổng lồ chứa toàn bộ logic.

### Bước 5: test theo engine

Mỗi engine nên có test riêng:

- input hợp lệ
- input thiếu field
- input sai kiểu
- output chuẩn
- regression case

## File nào dễ conflict nhất

Những file dễ conflict nhất là các file dùng chung quá nhiều:

- registry trung tâm
- types chung nếu chưa ổn định
- API adapter chung
- component form base nếu chứa rule riêng
- one-file calculator lớn chứa toàn bộ logic

Cách hạn chế conflict là giữ các file này thật mỏng và đẩy logic riêng ra folder của từng trường.

## Checklist khi thêm một trường mới

- [ ] Tạo folder riêng cho school
- [ ] Tạo config riêng cho school
- [ ] Tách engine riêng nếu có nhiều phương thức
- [ ] Không sửa shared nếu không bắt buộc
- [ ] Có test tối thiểu cho rule mới
- [ ] Không hard-code UI theo cách không thể tái sử dụng
- [ ] Review lại dependency để tránh import chéo

## Checklist khi thêm một engine mới

- [ ] Có `schema.ts`
- [ ] Có `validate.ts`
- [ ] Có `scoring.ts`
- [ ] Có `index.ts` export public API
- [ ] Có mẫu payload chuẩn
- [ ] Có test case cho edge cases
- [ ] Đã đăng ký vào school module tương ứng

## Lưu ý khi làm việc để tránh conflict

- Không sửa file shared nếu chỉ là rule riêng của một trường.
- Không để UI component chứa logic tính điểm.
- Không import chéo giữa các school.
- Không gộp refactor lớn với feature mới trong cùng một PR.
- Giữ PR nhỏ và rõ phạm vi.
- Ưu tiên config-driven thay vì hard-code.
- Tách dữ liệu theo school/engine thay vì dùng một file khổng lồ.

## Sơ đồ triển khai thực tế khi thêm một trường mới

```text
1. Tạo folder mới trong `schools/<new-school>/`
2. Khai báo config riêng của trường
3. Tạo engine module cho từng phương thức xét tuyển
4. Viết validate + scoring + mapping cho engine
5. Gắn school module vào shell/router/registry
6. Viết test cho từng engine
7. Review UI và payload để đảm bảo không đụng shared không cần thiết
```

## Sơ đồ cây thao tác khi làm việc hằng ngày

```text
Feature / School / Engine mới
  → xác định thuộc shared hay school hay engine
  → nếu là school riêng: làm trong `schools/<school>/`
  → nếu là engine riêng: làm trong `engines/<engine>/`
  → nếu là contract chung: chỉnh thật tối thiểu ở `shared/`
  → viết test cho phần thay đổi
  → review dependency trước khi merge
```

## Gợi ý cấu trúc tối thiểu để bắt đầu

Nếu muốn đi nhanh nhưng vẫn dễ scale, có thể bắt đầu bằng cấu trúc này:

```text
src/components/admission/
  shared/
  schools/
    uet/
    ftu/
    hust/
  AdmissionCalculatorShell.tsx
```

Sau đó, bên trong mỗi school mới tách tiếp theo `engines/`, `components/`, `types/`, `utils/`, `config/` khi số lượng rule tăng lên.

## Kết luận

Kiến trúc tốt nhất cho hệ thống admission/scoring là:

- shared thật mỏng
- school tách riêng
- engine tách riêng
- UI chỉ điều phối

Cách làm này giúp hệ thống dễ mở rộng lên 20+ trường, giảm conflict khi nhiều người cùng làm, và dễ test / bảo trì về lâu dài.
