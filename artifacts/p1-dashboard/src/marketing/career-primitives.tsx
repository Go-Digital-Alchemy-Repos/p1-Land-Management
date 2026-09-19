import type { HTMLAttributes } from "react";
import { builderPrimitives } from "./builder-primitives";
const tablePart =
  (Tag: "table" | "thead" | "tbody" | "tr" | "th" | "td", base: string) =>
  (props: HTMLAttributes<HTMLElement>) => (
    <Tag {...props} className={`${base} ${props.className || ""}`} />
  );
export const careerUI = {
  ...builderPrimitives,
  Table: tablePart("table", "career-table"),
  TableHeader: tablePart("thead", ""),
  TableBody: tablePart("tbody", ""),
  TableRow: tablePart("tr", ""),
  TableHead: tablePart("th", ""),
  TableCell: tablePart("td", ""),
};
