"use client";

import { useRef } from "react";
import { Paperclip } from "lucide-react";

import { ATTACHMENT_ACCEPT, validateAttachment } from "@/lib/mentor/attachments";

/**
 * A paperclip button that opens the file picker, runs client-side validation,
 * and hands a valid File to `onPick`. Upload + send is the parent's job.
 */
export function AttachmentPicker({
  onPick,
  onError,
  disabled,
}: {
  onPick: (file: File) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-picking the same file
    if (!file) return;

    const result = validateAttachment({ type: file.type, size: file.size });
    if (!result.ok) {
      onError(result.error);
      return;
    }
    onPick(file);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ATTACHMENT_ACCEPT}
        className="hidden"
        onChange={handleChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        aria-label="Đính kèm tệp"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted disabled:opacity-50"
      >
        <Paperclip className="h-5 w-5" />
      </button>
    </>
  );
}
