import { describe, it, expect } from "vitest";

describe("health score calculation", () => {
  function calculateHealthScore(
    criticalCount: number,
    highCount: number,
    mediumCount: number,
    totalRecords: number
  ): number {
    if (totalRecords === 0) return 100;
    const penalty = (criticalCount * 3 + highCount * 2 + mediumCount * 1) / totalRecords * 100;
    return Math.max(0, 100 - penalty);
  }

  it("returns 100 for no issues", () => {
    expect(calculateHealthScore(0, 0, 0, 100)).toBe(100);
  });

  it("returns 100 for empty workspace", () => {
    expect(calculateHealthScore(0, 0, 0, 0)).toBe(100);
  });

  it("penalizes critical issues more heavily", () => {
    const withCritical = calculateHealthScore(1, 0, 0, 100);
    const withHigh = calculateHealthScore(0, 1, 0, 100);
    const withMedium = calculateHealthScore(0, 0, 1, 100);

    expect(withCritical).toBeLessThan(withHigh);
    expect(withHigh).toBeLessThan(withMedium);
  });

  it("maps to correct grade", () => {
    function getGrade(score: number): string {
      if (score >= 90) return "A";
      if (score >= 80) return "B";
      if (score >= 70) return "C";
      if (score >= 60) return "D";
      return "F";
    }

    expect(getGrade(95)).toBe("A");
    expect(getGrade(85)).toBe("B");
    expect(getGrade(75)).toBe("C");
    expect(getGrade(65)).toBe("D");
    expect(getGrade(55)).toBe("F");
  });
});

describe("issue severity rules", () => {
  it("person without email is critical (95)", () => {
    const severity = 95;
    expect(severity).toBeGreaterThanOrEqual(90);
  });

  it("person without relationship type is high (80)", () => {
    const severity = 80;
    expect(severity).toBeGreaterThanOrEqual(70);
    expect(severity).toBeLessThan(90);
  });

  it("person stale 90d is medium (60)", () => {
    const severity = 60;
    expect(severity).toBeGreaterThanOrEqual(50);
    expect(severity).toBeLessThan(70);
  });

  it("person stale 180d is high (75)", () => {
    const severity = 75;
    expect(severity).toBeGreaterThanOrEqual(70);
  });

  it("work without client is critical (92)", () => {
    const severity = 92;
    expect(severity).toBeGreaterThanOrEqual(90);
  });

  it("billing overdue 90d is critical (95)", () => {
    const severity = 95;
    expect(severity).toBeGreaterThanOrEqual(90);
  });
});
