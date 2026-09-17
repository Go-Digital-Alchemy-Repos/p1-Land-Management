export interface ExportableSubmission {
  id: string;
  createdAt?: string | Date | null;
  source?: string | null;
  data: Record<string, unknown>;
}
function csvCell(value: unknown): string {
  const text = value == null ? "" : typeof value === "string" ? value : JSON.stringify(value);
  // Quoting alone does not stop spreadsheet formula interpretation.
  const safe = /^[\s\uFEFF]*[=+@-]/u.test(text) || /^[\t\r\n]/u.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}
export function buildSubmissionCsv(submissions: ExportableSubmission[]): string {
  const keys = [...new Set(submissions.flatMap((row) => Object.keys(row.data)))];
  const rows: unknown[][] = [["Submission ID", "Submitted At", "Source", ...keys]];
  for (const row of submissions) {
    const date = row.createdAt ? new Date(row.createdAt) : null;
    rows.push([
      row.id,
      date && !Number.isNaN(date.getTime()) ? date.toISOString() : row.createdAt || "",
      row.source || "",
      ...keys.map((key) => (Object.hasOwn(row.data, key) ? row.data[key] : undefined)),
    ]);
  }
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
