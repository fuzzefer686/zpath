"use client";

import { useMemo, useState } from "react";
import { SendHorizonal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateVietnameseQuestion } from "@/lib/advisor/answer";
import type {
  AdvisorQuestionTemplate,
  AdvisorTemplateField,
  AdvisorTemplateFieldOption,
  AdvisorTemplateValues,
} from "@/lib/advisor/types";

type DynamicQuestionFormProps = {
  template: AdvisorQuestionTemplate;
  onSubmit: (question: string, values: AdvisorTemplateValues) => void;
};

const combinationOptions: AdvisorTemplateFieldOption[] = [
  "A00",
  "A01",
  "B00",
  "C00",
  "D01",
  "D07",
  "D14",
  "D15",
  "H00",
  "V00",
].map((code) => ({ label: code, value: code }));

combinationOptions.push({ label: "Khác", value: "other" });

const regionOptions: AdvisorTemplateFieldOption[] = [
  "Toàn quốc",
  "Miền Bắc",
  "Miền Trung",
  "Miền Nam",
].map((region) => ({ label: region, value: region }));

const priorityOptions: AdvisorTemplateFieldOption[] = [
  "Dễ xin việc",
  "Thu nhập tốt",
  "Phù hợp sở thích",
  "Ít áp lực",
  "Có thể đi nước ngoài",
  "Có thể học lên cao",
].map((priority) => ({ label: priority, value: priority }));

function getFieldOptions(field: AdvisorTemplateField) {
  if (field.name === "combination") return combinationOptions;
  if (field.name === "region") return regionOptions;
  if (field.name === "priority") return priorityOptions;
  return field.options ?? [];
}

function getFieldType(field: AdvisorTemplateField): AdvisorTemplateField["type"] {
  if (field.name === "combination" || field.name === "region" || field.name === "priority") {
    return "select";
  }
  return field.type;
}

function isAutocompleteReadyField(fieldName: string) {
  const normalized = fieldName.toLowerCase();
  return normalized.includes("school") || normalized.includes("major");
}

function read(values: AdvisorTemplateValues, name: string) {
  return values[name]?.trim() ?? "";
}

export function DynamicQuestionForm({
  template,
  onSubmit,
}: DynamicQuestionFormProps) {
  const initialValues = useMemo(
    () =>
      template.requiredFields.reduce((values, field) => {
        values[field.name] = "";
        return values;
      }, {} as AdvisorTemplateValues),
    [template],
  );
  const [values, setValues] = useState<AdvisorTemplateValues>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateValue = (name: string, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    template.requiredFields.forEach((field) => {
      const value = read(values, field.name);
      if (field.required && !value) {
        nextErrors[field.name] = "Vui lòng nhập thông tin này.";
        return;
      }
      if (field.type === "number" && value && !Number.isFinite(Number(value))) {
        nextErrors[field.name] = "Vui lòng nhập một số hợp lệ.";
      }
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    onSubmit(generateVietnameseQuestion(template, values), values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <div className="text-xs font-bold uppercase text-primary">
          {template.category}
        </div>
        <h2 className="mt-1 font-display text-xl font-bold">{template.title}</h2>
        {template.description && (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {template.description}
          </p>
        )}
      </div>

      <div className="space-y-3">
        {template.requiredFields.map((field) => (
          <FieldControl
            key={field.name}
            field={field}
            templateId={template.id}
            value={values[field.name] ?? ""}
            error={errors[field.name]}
            onChange={(value) => updateValue(field.name, value)}
          />
        ))}
      </div>

      <div className="rounded-md border border-border bg-muted/40 p-3">
        <div className="text-xs font-bold uppercase text-muted-foreground">
          Câu hỏi sẽ gửi
        </div>
        <p className="mt-2 text-sm font-semibold leading-6">
          {generateVietnameseQuestion(template, values)}
        </p>
      </div>

      <Button type="submit" className="w-full rounded-md">
        Tạo câu hỏi mẫu
        <SendHorizonal className="h-4 w-4" />
      </Button>
    </form>
  );
}

function FieldControl({
  field,
  templateId,
  value,
  error,
  onChange,
}: {
  field: AdvisorTemplateField;
  templateId: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const fieldType = getFieldType(field);
  const options = getFieldOptions(field);
  const datalistId = `${templateId}-${field.name}-suggestions`;
  const inputClassName =
    "h-11 rounded-md border-border bg-background text-sm focus-visible:ring-primary";

  return (
    <label className="block">
      <span className="text-sm font-bold">
        {field.label}
        {field.required && <span className="text-destructive"> *</span>}
      </span>

      {fieldType === "select" ? (
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="mt-2 h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="">{field.placeholder ?? "Chọn một lựa chọn"}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : fieldType === "textarea" ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className="mt-2 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      ) : (
        <>
          <Input
            type={fieldType}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={field.placeholder}
            list={isAutocompleteReadyField(field.name) ? datalistId : undefined}
            autoComplete={isAutocompleteReadyField(field.name) ? "off" : undefined}
            className={`mt-2 ${inputClassName}`}
          />
          {isAutocompleteReadyField(field.name) && (
            <datalist id={datalistId} />
          )}
        </>
      )}

      {error && <span className="mt-1 block text-xs font-semibold text-destructive">{error}</span>}
    </label>
  );
}
