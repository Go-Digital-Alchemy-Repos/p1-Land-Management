import { describe, expect, it } from "vitest";
import { comparison, csvCell, metricFormat } from "./analytics-format";
describe("analytics presentation", () => {
  it("does not invent a growth percentage from no baseline", () => {
    expect(comparison(10, 0)).toBe("No prior baseline");
    expect(comparison(undefined, 1)).toBe("Comparison unavailable");
    expect(comparison(15, 10)).toBe("+50.0% vs previous period");
  });
  it("escapes spreadsheet formulas and quoted dimensions", () => {
    expect(csvCell("=1+1")).toBe('"\'=1+1"');
    expect(csvCell('a"b')).toBe('"a""b"');
  });
  it("formats provider rates and duration in their actual units", () => {
    expect(metricFormat(0.125, "engagementRate")).toBe("12.5%");
    expect(metricFormat(125, "averageSessionDuration")).toBe("2m 5s");
  });
});
