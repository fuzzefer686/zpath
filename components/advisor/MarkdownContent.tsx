import type { ReactNode } from "react";

type MarkdownContentProps = {
  content: string;
};

type MarkdownBlock =
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
      !isListLine(lines[index])
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

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${part}-${index}`} className="font-bold text-foreground">
          {part.slice(2, -2)}
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
