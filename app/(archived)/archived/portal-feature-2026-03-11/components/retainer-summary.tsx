import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Progress } from "@/app/_components/ui/progress";
import { Clock } from "lucide-react";
import { getRetainerSummary } from "@/app/actions/retainers/retainer-actions";

interface RetainerSummaryProps {
  projectId: string;
}

export async function RetainerSummary({ projectId }: RetainerSummaryProps) {
  const result = await getRetainerSummary(projectId);

  if (!result.success || !result.data) {
    return null; // No retainer for this project
  }

  const { hoursUsed, hoursRemaining, includedHours, currentMonth, entries } = result.data;
  const percentageUsed = (hoursUsed / includedHours) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Retainer Hours - {currentMonth}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hours Summary */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Hours Used</span>
            <span className="font-medium">
              {hoursUsed.toFixed(1)} / {includedHours.toFixed(1)}
            </span>
          </div>
          <Progress value={percentageUsed} className="h-2" />
          <div className="text-sm text-muted-foreground">
            {hoursRemaining.toFixed(1)} hours remaining this month
          </div>
        </div>

        {/* Recent Work */}
        {entries.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recent Work</h4>
            <div className="space-y-2">
              {entries.slice(0, 5).map((entry) => (
                <div
                  key={entry.id}
                  className="flex justify-between text-sm border-l-2 border-primary/50 pl-3 py-1"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{entry.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.work_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-muted-foreground ml-2 flex-shrink-0">
                    {parseFloat(entry.hours.toString()).toFixed(1)}h
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Encouragement */}
        {hoursRemaining > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm">
            <p className="font-medium text-primary">
              💡 You have {hoursRemaining.toFixed(1)} hours remaining
            </p>
            <p className="text-muted-foreground mt-1">
              Need something done? Submit a request to use your included hours.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


