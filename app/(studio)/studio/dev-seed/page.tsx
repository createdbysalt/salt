"use client";

import { useState } from "react";
import { Button } from "@repo/ui";
import { seedDashboardTestData } from "@/app/actions/insights/seed-dashboard-test-data";

export default function DevSeedPage() {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSeed() {
    setLoading(true);
    setResult(null);

    try {
      const res = await seedDashboardTestData();
      setResult(JSON.stringify(res, null, 2));
    } catch (error) {
      setResult(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Seed Dashboard Test Data</h1>
      <p className="text-muted-foreground mb-6">
        This will create test invoices, proposals, milestones, and update client stages
        to populate the dashboard with sample data.
      </p>

      <Button onClick={handleSeed} disabled={loading}>
        {loading ? "Seeding..." : "Seed Test Data"}
      </Button>

      {result && (
        <pre className="mt-6 p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap">
          {result}
        </pre>
      )}
    </div>
  );
}
