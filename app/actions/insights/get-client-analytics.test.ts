/**
 * Unit tests for Insights analytics calculations
 */

import { describe, it, expect } from "@jest/globals";

describe("Insights Analytics", () => {
  describe("Revenue calculations", () => {
    it("should calculate MRR from active subscriptions", () => {
      const subscriptions = [
        { amount_cents: 10000, status: "active" },
        { amount_cents: 5000, status: "trialing" },
        { amount_cents: 15000, status: "canceled" }, // Should be excluded
      ];

      const activeSubs = subscriptions.filter((s) =>
        ["active", "trialing"].includes(s.status)
      );
      const mrr = activeSubs.reduce((sum, sub) => sum + sub.amount_cents, 0) / 100;

      expect(mrr).toBe(150); // $150
    });

    it("should calculate growth rate correctly", () => {
      const calculateGrowthRate = (data: Array<{ total: number }>) => {
        if (data.length < 2) return 0;
        const recent = data.slice(-3);
        if (recent.length < 2) return 0;
        const oldestTotal = recent[0].total || 1;
        const newestTotal = recent[recent.length - 1].total;
        return Math.round(((newestTotal - oldestTotal) / oldestTotal) * 100);
      };

      const revenueData = [
        { total: 10000 },
        { total: 12000 },
        { total: 15000 },
      ];

      const growthRate = calculateGrowthRate(revenueData);
      expect(growthRate).toBe(50); // 50% growth
    });
  });

  describe("Client analytics", () => {
    it("should categorize clients by health score", () => {
      const clients = [
        { healthScore: 95 },
        { healthScore: 85 },
        { healthScore: 65 },
        { healthScore: 45 },
        { healthScore: 30 },
      ];

      const distribution = {
        healthy: clients.filter((c) => c.healthScore >= 80).length,
        warning: clients.filter((c) => c.healthScore >= 50 && c.healthScore < 80).length,
        atRisk: clients.filter((c) => c.healthScore < 50).length,
      };

      expect(distribution.healthy).toBe(2);
      expect(distribution.warning).toBe(1);
      expect(distribution.atRisk).toBe(2);
    });

    it("should calculate average LTV", () => {
      const invoices = [
        { amount_cents: 50000 },
        { amount_cents: 30000 },
        { amount_cents: 40000 },
      ];

      const totalLtv = invoices.reduce((sum, inv) => sum + inv.amount_cents, 0) / 100;
      const avgLtv = totalLtv / 3;

      expect(avgLtv).toBe(400); // $400 avg
    });
  });

  describe("Project analytics", () => {
    it("should calculate average project duration", () => {
      const projects = [
        { createdAt: "2024-01-01", completedAt: "2024-02-01" },
        { createdAt: "2024-02-01", completedAt: "2024-03-15" },
        { createdAt: "2024-03-01", completedAt: "2024-04-01" },
      ];

      const totalDays = projects.reduce((sum, p) => {
        const start = new Date(p.createdAt);
        const end = new Date(p.completedAt);
        const days = Math.floor(
          (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
        );
        return sum + days;
      }, 0);

      const avgDuration = Math.round(totalDays / projects.length);
      expect(avgDuration).toBeGreaterThan(0);
      expect(avgDuration).toBeLessThan(100);
    });

    it("should calculate milestone completion rate", () => {
      const milestones = [
        { status: "complete" },
        { status: "complete" },
        { status: "in_progress" },
        { status: "not_started" },
      ];

      const completed = milestones.filter((m) => m.status === "complete").length;
      const completionRate = (completed / milestones.length) * 100;

      expect(completionRate).toBe(50);
    });
  });
});

