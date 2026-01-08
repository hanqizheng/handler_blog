export const MAX_COMMENT_LENGTH = 500;

export function normalizeCommentContent(raw: string, maxLength = MAX_COMMENT_LENGTH) {
  const withoutNull = raw.replace(/\u0000/g, "");
  const normalizedNewlines = withoutNull.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const withoutTags = normalizedNewlines.replace(/<[^>]*>/g, "");
  const withoutControls = withoutTags.replace(
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,
    "",
  );
  const trimmed = withoutControls.trim();
  return trimmed.slice(0, maxLength);
}
