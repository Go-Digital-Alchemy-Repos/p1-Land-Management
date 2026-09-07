export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getFirstSentence(value: string): string {
  const plainText = stripHtml(value);
  if (!plainText) return "";

  const match = plainText.match(/[^.!?]+[.!?]?/);
  return match?.[0]?.trim() ?? plainText;
}
