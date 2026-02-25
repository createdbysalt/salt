import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Calendar, Plus } from "lucide-react";
import Link from "next/link";

export function UpcomingMeetingsWidget() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Meetings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted mb-4">
            <Calendar className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium mb-1">No meetings scheduled</p>
          <p className="text-xs text-muted-foreground mb-4">
            Track client meetings in the Meetings page
          </p>
          <Link href="/studio/meetings">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              View Meetings
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}


