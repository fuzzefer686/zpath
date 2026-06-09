"use client";

import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

type MarkdownPreviewProps = {
  markdown: string;
  className?: string;
};

export function MarkdownPreview({ markdown, className }: MarkdownPreviewProps) {
  return (
    <div
      className={cn(
        "max-w-none text-[15px] leading-8 text-foreground/85",
        "[&_>*:first-child]:mt-0 [&_>*:last-child]:mb-0",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          h1: ({ ...props }) => (
            <h1 className="mb-4 mt-8 text-3xl font-black leading-tight text-foreground" {...props} />
          ),
          h2: ({ ...props }) => (
            <h2 className="mb-3 mt-7 border-b border-border pb-2 text-2xl font-black leading-tight text-foreground" {...props} />
          ),
          h3: ({ ...props }) => (
            <h3 className="mb-2 mt-6 text-xl font-bold leading-snug text-foreground" {...props} />
          ),
          h4: ({ ...props }) => (
            <h4 className="mb-2 mt-5 text-base font-bold text-foreground" {...props} />
          ),
          p: ({ ...props }) => <p className="my-3 leading-8" {...props} />,
          a: ({ ...props }) => (
            <a className="font-semibold text-primary underline underline-offset-4" {...props} />
          ),
          ul: ({ ...props }) => <ul className="my-4 list-disc space-y-1.5 pl-6" {...props} />,
          ol: ({ ...props }) => <ol className="my-4 list-decimal space-y-1.5 pl-6" {...props} />,
          li: ({ ...props }) => <li className="pl-1 leading-8" {...props} />,
          blockquote: ({ ...props }) => (
            <blockquote
              className="my-5 rounded-r-lg border-l-4 border-primary/50 bg-primary/5 px-4 py-3 text-foreground/75"
              {...props}
            />
          ),
          pre: ({ ...props }) => (
            <pre
              className="my-5 overflow-x-auto rounded-lg border bg-foreground p-4 text-sm leading-7 text-background"
              {...props}
            />
          ),
          code: ({ ...props }) => (
            <code
              className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground"
              {...props}
            />
          ),
          table: ({ ...props }) => (
            <div className="my-5 overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[560px] border-collapse text-sm" {...props} />
            </div>
          ),
          th: ({ ...props }) => (
            <th className="border-b bg-muted px-3 py-2 text-left font-bold text-foreground" {...props} />
          ),
          td: ({ ...props }) => (
            <td className="border-b px-3 py-2 align-top text-foreground/80" {...props} />
          ),
          hr: ({ ...props }) => <hr className="my-8 border-border" {...props} />,
          strong: ({ ...props }) => <strong className="font-bold text-foreground" {...props} />,
          em: ({ ...props }) => <em className="text-foreground/80" {...props} />,
          img: ({ alt, ...props }) => (
            <span className="my-5 block overflow-hidden rounded-lg border bg-muted/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={typeof alt === "string" ? alt : ""}
                className="max-h-[520px] w-full object-contain"
                loading="lazy"
                {...props}
              />
            </span>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
