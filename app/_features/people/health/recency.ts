import type { HealthBand } from "./types";

const LN2 = Math.LN2;

export function daysSince(isoDate: string | null, now = Date.now()): number | null {
  if (!isoDate) return null;
  const timestamp = new Date(isoDate).getTime();
  if (Number.isNaN(timestamp)) return null;
  return Math.max(0, (now - timestamp) / 86400000);
}

/** Exponential decay sub-score: 100 at contact time, halves every halfLife days. */
export function recencySubScore(days: number | null, halfLife: number): number {
  if (days == null) return 0;
  if (halfLife <= 0) return 0;
  return Math.round(100 * Math.exp((-LN2 * days) / halfLife));
}

export function booleanSubScore(value: boolean, goodWhenTrue = true): number {
  if (goodWhenTrue) return value ? 100 : 20;
  return value ? 20 : 100;
}

export function countSubScore(count: number, goodWhenZero = true): number {
  if (goodWhenZero) {
    if (count <= 0) return 100;
    if (count === 1) return 55;
    return 25;
  }
  if (count <= 0) return 20;
  if (count === 1) return 70;
  return 100;
}

export function trendSubScore(current: number, prior: number): number {
  if (prior <= 0 && current <= 0) return 40;
  if (prior <= 0 && current > 0) return 85;
  if (current <= 0 && prior > 0) return 25;
  const ratio = current / prior;
  if (ratio >= 1.25) return 90;
  if (ratio >= 1) return 75;
  if (ratio >= 0.75) return 55;
  return 30;
}

export function stalenessSubScore(days: number | null, warningDays: number, criticalDays: number): number {
  if (days == null) return 100;
  if (days < warningDays) return 100;
  if (days < criticalDays) return 45;
  return 15;
}

export function breadthSubScore(contactCount: number, keyContactQuiet: boolean): number {
  if (keyContactQuiet) return 20;
  if (contactCount >= 3) return 100;
  if (contactCount === 2) return 80;
  if (contactCount === 1) return 60;
  return 35;
}

export function compositeScore(factors: Array<{ subScore: number; weight: number }>): number {
  const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
  if (totalWeight <= 0) return 0;
  const weighted = factors.reduce((sum, factor) => sum + factor.subScore * factor.weight, 0);
  return Math.max(0, Math.min(100, Math.round(weighted / totalWeight)));
}

export function scoreToBand(score: number | null): HealthBand {
  if (score == null) return "insufficient";
  if (score >= 75) return "healthy";
  if (score >= 45) return "watch";
  return "risk";
}
