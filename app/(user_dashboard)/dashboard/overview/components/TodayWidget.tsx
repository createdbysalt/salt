import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Badge } from "@/app/_components/ui/badge";
import { Button } from "@/app/_components/ui/button";
import { AlertCircle, Clock, Calendar } from "lucide-react";
import Link from "next/link";
import type { TaskWithRelations } from "@/app/_features/tasks/types";

interface TodayWidgetProps {
  urgent: TaskWithRelations[];
  dueToday: TaskWithRelations[];
  dueThisWeek: TaskWithRelations[];
  urgentCount: number;
  dueTodayCount: number;
  dueThisWeekCount: number;
}

export function TodayWidget({
  urgent,
  dueToday,
  dueThisWeek,
  urgentCount,
  dueTodayCount,
  dueThisWeekCount,
}: TodayWidgetProps) {
  const sections = [
    {
      title: "Urgent",
      icon: AlertCircle,
      iconColor: "text-destructive",
      tasks: urgent,
      count: urgentCount,
      filter: "priority=urgent&priority=revenue_blocker&is_urgent=true",
    },
    {
      title: "Due Today",
      icon: Clock,
      iconColor: "text-warning",
      tasks: dueToday,
      count: dueTodayCount,
      filter: "due_today=true",
    },
    {
      title: "This Week",
      icon: Calendar,
      iconColor: "text-info",
      tasks: dueThisWeek,
      count: dueThisWeekCount,
      filter: "due_this_week=true",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.title} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${section.iconColor}`} />
                  <h3 className="text-sm font-semibold">{section.title}</h3>
                  {section.count > 0 && (
                    <Badge variant="secondary" className="h-5 px-2 text-xs">
                      {section.count}
                    </Badge>
                  )}
                </div>
                {section.count > 3 && (
                  <Link href={`/dashboard/tasks?${section.filter}`}>
                    <Button variant="ghost" size="sm" className="h-7 text-xs">
                      View All
                    </Button>
                  </Link>
                )}
              </div>

              {section.tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground pl-6">None</p>
              ) : (
                <div className="space-y-2 pl-6">
                  {section.tasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/dashboard/tasks?task=${task.id}`}
                      className="block group"
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium group-hover:text-primary truncate">
                            {task.title}
                          </p>
                          {task.client?.name && (
                            <p className="text-xs text-muted-foreground truncate">
                              {task.client.name}
                            </p>
                          )}
                        </div>
                        {task.is_urgent && (
                          <Badge variant="destructive" className="h-5 px-1.5 text-xs shrink-0">
                            Urgent
                          </Badge>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}


