export type markdown_packet_kind = "receipt-review" | "redacted-review";

export type markdown_packet_mode = "compact" | "full";

export function buildMarkdownPacketFileName(input: {
  mode?: markdown_packet_mode;
  packetKind: markdown_packet_kind;
  receiptId: string;
}) {
  const receiptId = sanitizeFileSegment(input.receiptId) || "receipt";
  const mode = input.mode ? `${sanitizeFileSegment(input.mode)}.` : "";

  return `${receiptId}.${mode}${input.packetKind}.md`;
}

export function downloadMarkdownFile(input: {
  fileName: string;
  markdown: string;
}) {
  const markdown = input.markdown.endsWith("\n")
    ? input.markdown
    : `${input.markdown}\n`;
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = input.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function sanitizeFileSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80);
}
