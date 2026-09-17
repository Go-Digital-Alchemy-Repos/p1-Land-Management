/** Editorial title case. Preserve brand names, acronyms, and contractions. */
export function toTitleCase(text: string): string {
  const minor = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of', 'on', 'or', 'per', 'the', 'to', 'via', 'vs', 'with']);
  const acronyms = new Set(['SEO', 'QA', 'P1', 'SC', 'NC', 'SCM', 'HOA', 'HOAs', 'FAQ', 'FAQs', 'US', 'USA', 'ADA', 'EPA', 'GPS', 'DIY', 'DOT', 'SCDOT', 'NCDOT']);
  const words = [...text.matchAll(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)];
  let index = 0;
  return text.replace(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu, (word, offset) => {
    const position = index++;
    if (acronyms.has(word) || /\d/.test(word)) return word;
    const lower = word.toLowerCase();
    const startsPhrase = position === 0 || /[:—–.!?]\s*$/.test(text.slice(0, offset));
    if (!startsPhrase && position !== words.length - 1 && minor.has(lower)) return lower;
    if (word !== word.toUpperCase() && /[a-z][A-Z]/.test(word)) return word;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  });
}
