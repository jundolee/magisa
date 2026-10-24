function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <span className="article-summary-emphasis" key={index}>{part.slice(2, -2)}</span>;
    if (part.startsWith("*") && part.endsWith("*")) return <span className="article-summary-emphasis" key={index}>{part.slice(1, -1)}</span>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    return part.replace(/^#{1,6}\s+/, "");
  });
}

export function ArticleSummaryCopy({ text, className = "" }: { text: string; className?: string }) {
  const lines = text.trim().split(/\r?\n/).filter((line) => line.trim());
  const blocks: Array<{ type: "list" | "paragraph"; lines: string[] }> = [];
  for (const line of lines) {
    const isList = /^\s*(?:[-*+]\s+|\d+[.)]\s+)/.test(line);
    const previous = blocks.at(-1);
    if (previous?.type === (isList ? "list" : "paragraph")) previous.lines.push(line);
    else blocks.push({ type: isList ? "list" : "paragraph", lines: [line] });
  }

  return (
    <div className={`article-summary-copy ${className}`.trim()}>
      {blocks.map((block, index) => block.type === "list" ? (
        <ul key={index}>{block.lines.map((line, itemIndex) => (
          <li key={itemIndex}>{renderInline(line.replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/, ""))}</li>
        ))}</ul>
      ) : <p key={index}>{renderInline(block.lines.join(" ").replace(/\s*\*\s*/g, " "))}</p>)}
    </div>
  );
}
