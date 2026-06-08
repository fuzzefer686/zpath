import type { ReactNode } from "react";
import { renderToString } from "katex";

type MarkdownContentProps = {
  content: string;
};

type MarkdownBlock =
  | { type: "heading"; level: number; text: string; key: string }
  | { type: "math"; text: string; key: string }
  | { type: "table"; rows: string[][]; key: string }
  | { type: "list"; items: string[]; key: string }
  | { type: "paragraph"; text: string; key: string };

function isTableLine(line: string) {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.endsWith("|");
}

function isSeparatorLine(line: string) {
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim());
}

function parseTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isListLine(line: string) {
  return /^\s*(?:[-*•]|\d+[.)])\s+/.test(line);
}

function stripListMarker(line: string) {
  return line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim();
}

function parseHeading(line: string) {
  const match = line.match(/^(#{1,4})\s+(.+)$/);
  if (!match) return null;

  return {
    level: match[1].length,
    text: match[2].trim(),
  };
}

function isMathBlockStart(line: string) {
  const trimmedLine = line.trim();
  return (
    trimmedLine === "$$" ||
    trimmedLine === "\\[" ||
    (trimmedLine.startsWith("$$") && !trimmedLine.endsWith("$$")) ||
    (trimmedLine.startsWith("$$") && trimmedLine.endsWith("$$") && trimmedLine.length > 4) ||
    (trimmedLine.startsWith("\\[") && trimmedLine.endsWith("\\]"))
  );
}

function parseBlocks(content: string): MarkdownBlock[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const trimmedLine = line.trim();
    if (
      (trimmedLine.startsWith("$$") && !trimmedLine.endsWith("$$")) ||
      trimmedLine === "$$" ||
      trimmedLine === "\\["
    ) {
      const endMarker = trimmedLine.startsWith("$$") ? "$$" : "\\]";
      const mathLines: string[] = [];
      const firstLine = trimmedLine.replace(/^\$\$|^\\\[/, "").trim();
      if (firstLine) mathLines.push(firstLine);
      index += 1;

      while (index < lines.length && lines[index].trim() !== endMarker) {
        mathLines.push(lines[index]);
        index += 1;
      }

      if (index < lines.length) index += 1;

      blocks.push({
        type: "math",
        text: mathLines.join("\n").trim(),
        key: `math-${index}`,
      });
      continue;
    }

    if (
      (trimmedLine.startsWith("$$") && trimmedLine.endsWith("$$") && trimmedLine.length > 4) ||
      (trimmedLine.startsWith("\\[") && trimmedLine.endsWith("\\]"))
    ) {
      blocks.push({
        type: "math",
        text: trimmedLine
          .replace(/^\$\$|^\s*\\\[/, "")
          .replace(/\$\$$|\\\]\s*$/, "")
          .trim(),
        key: `math-${index}`,
      });
      index += 1;
      continue;
    }

    const heading = parseHeading(line.trim());
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading.level,
        text: heading.text,
        key: `heading-${index}`,
      });
      index += 1;
      continue;
    }

    if (isTableLine(line)) {
      const tableLines: string[] = [];
      while (index < lines.length && isTableLine(lines[index])) {
        tableLines.push(lines[index]);
        index += 1;
      }

      const bodyLines = tableLines.filter((tableLine) => !isSeparatorLine(tableLine));
      if (bodyLines.length >= 2) {
        blocks.push({
          type: "table",
          rows: bodyLines.map(parseTableRow),
          key: `table-${index}`,
        });
        continue;
      }

      blocks.push({
        type: "paragraph",
        text: tableLines.join("\n"),
        key: `paragraph-${index}`,
      });
      continue;
    }

    if (isListLine(line)) {
      const items: string[] = [];
      while (index < lines.length && isListLine(lines[index])) {
        items.push(stripListMarker(lines[index]));
        index += 1;
      }

      blocks.push({ type: "list", items, key: `list-${index}` });
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !isTableLine(lines[index]) &&
      !isListLine(lines[index]) &&
      !parseHeading(lines[index].trim()) &&
      !isMathBlockStart(lines[index])
    ) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }

    blocks.push({
      type: "paragraph",
      text: paragraphLines.join(" "),
      key: `paragraph-${index}`,
    });
  }

  return blocks;
}

function normalizeLatex(value: string) {
  return value
    .replace(/\\left/g, "")
    .replace(/\\right/g, "")
    .replace(/;(?=\s*[0-9-])/g, ",")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .trim();
}

function renderMath(tex: string, displayMode: boolean) {
  try {
    const html = renderToString(normalizeLatex(tex), {
      displayMode,
      throwOnError: false,
      strict: "ignore",
      trust: false,
      output: "htmlAndMathml",
    });

    return (
      <span
        className={displayMode ? "block overflow-x-auto py-2" : "inline-block align-middle"}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch {
    return (
      <code className="rounded bg-muted px-1.5 py-0.5 text-[0.92em] font-semibold text-foreground">
        {tex}
      </code>
    );
  }
}

function renderInline(text: string) {
  const parts = text
    .split(/(\*\*[^*]+\*\*|`[^`]+`|\$[^$\n]+\$|\\\([^)]+\\\))/g)
    .filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${part}-${index}`} className="font-bold text-foreground">
          {renderInline(part.slice(2, -2))}
        </strong>
      );
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={`${part}-${index}`}
          className="rounded bg-muted px-1.5 py-0.5 text-[0.92em] font-semibold text-foreground"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    if (
      (part.startsWith("$") && part.endsWith("$")) ||
      (part.startsWith("\\(") && part.endsWith("\\)"))
    ) {
      const raw = part.startsWith("$") ? part.slice(1, -1) : part.slice(2, -2);
      return <span key={`${part}-${index}`}>{renderMath(raw, false)}</span>;
    }

    return part;
  });
}

function renderCells(cells: string[], tag: "th" | "td") {
  return cells.map((cell, index) => {
    const className =
      tag === "th"
        ? "border-b border-border bg-transparent px-4 py-3.5 text-left text-sm font-bold text-foreground"
        : "border-b border-border/50 px-4 py-3 align-top text-sm leading-6 text-foreground";

    const content = renderInline(cell);
    return tag === "th" ? (
      <th key={`${cell}-${index}`} className={className}>
        {content}
      </th>
    ) : (
      <td key={`${cell}-${index}`} className={className}>
        {content}
      </td>
    );
  });
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  const blocks = parseBlocks(content);

  return (
    <div className="space-y-4 text-base leading-8 text-foreground">
      {blocks.map((block): ReactNode => {
        if (block.type === "math") {
          return <div key={block.key}>{renderMath(block.text, true)}</div>;
        }

        if (block.type === "heading") {
          const className =
            block.level <= 2
              ? "pt-1 text-xl font-black leading-8 text-foreground"
              : "pt-1 text-lg font-black leading-7 text-foreground";

          return (
            <h3 key={block.key} className={className}>
              {renderInline(block.text)}
            </h3>
          );
        }

        if (block.type === "table") {
          const [header, ...rows] = block.rows;

          return (
            <div key={block.key} className="overflow-x-auto bg-transparent my-4">
              <table className="w-full min-w-[680px] border-collapse bg-transparent">
                <thead>
                  <tr>{renderCells(header, "th")}</tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr key={`${block.key}-${rowIndex}`} className="hover:bg-muted/10 transition-colors">
                      {renderCells(row, "td")}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={block.key} className="space-y-2 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`} className="list-disc pl-1">
                  {renderInline(item)}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={block.key} className="text-base leading-8 text-foreground">
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}
