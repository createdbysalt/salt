import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

interface Project {
  id: string;
  name: string;
  clientName: string;
  status: string;
  isRecurring: boolean;
  monthlyValue: number | null;
  totalValue: number | null;
  healthStatus: string | null;
}

interface ProjectsTableProps {
  projects: Project[];
}

export function ProjectsTable({ projects }: ProjectsTableProps) {
  const formatCurrency = (value: number | null) => {
    if (value === null || value === 0) return "—";
    return `$${(value / 1000).toFixed(1)}k`;
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "signed":
        return "secondary";
      case "on_hold":
        return "outline";
      case "completed":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getHealthColor = (health: string | null) => {
    if (!health) return "";
    switch (health) {
      case "healthy":
        return "text-success";
      case "warning":
        return "text-warning";
      case "at-risk":
        return "text-destructive";
      default:
        return "";
    }
  };

  if (projects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Active Projects</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No active projects yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Active Projects</CardTitle>
          <Link href="/dashboard/projects">
            <Button variant="ghost" size="sm">
              View All
              <ArrowUpRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">MRR / Value</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="font-medium">{project.name}</TableCell>
                <TableCell>{project.clientName}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {project.isRecurring ? "Retainer" : "One-time"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {project.isRecurring
                    ? formatCurrency(project.monthlyValue)
                    : formatCurrency(project.totalValue)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusVariant(project.status)}>
                      {project.status}
                    </Badge>
                    {project.healthStatus && (
                      <span className={`text-xs ${getHealthColor(project.healthStatus)}`}>
                        {project.healthStatus}
                      </span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}




