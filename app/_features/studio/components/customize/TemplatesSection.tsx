"use client";

import * as React from "react";
import { FileText, Plus, MoreHorizontal, Pencil, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Badge,
} from "@repo/ui";
import { useContractTemplates } from "../../hooks/useContractTemplates";

const CATEGORY_LABELS: Record<string, string> = {
  msa: "Master Service Agreement",
  sow: "Statement of Work",
  nda: "Non-Disclosure Agreement",
  retainer: "Retainer Agreement",
  custom: "Custom",
};

interface ContractTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  is_default: boolean;
}

export function TemplatesSection() {
  const { templates, isLoading } = useContractTemplates();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-5 w-32 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Contract Templates</CardTitle>
          <CardDescription>
            Reusable templates for proposals and agreements
          </CardDescription>
        </div>
        <Button size="sm">
          <Plus className="size-4 mr-2" />
          Add Template
        </Button>
      </CardHeader>
      <CardContent>
        {!templates?.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="size-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-1">No templates yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create templates to speed up your proposals
            </p>
            <Button size="sm">
              <Plus className="size-4 mr-2" />
              Add Template
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Default</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template: ContractTemplate) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{template.name}</p>
                      {template.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {template.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {CATEGORY_LABELS[template.category] || template.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {template.is_default && (
                      <Badge variant="secondary">Default</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => toast.info("Edit coming soon")}
                        >
                          <Pencil className="size-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toast.info("Duplicate coming soon")}
                        >
                          <Copy className="size-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => toast.info("Delete coming soon")}
                        >
                          <Trash2 className="size-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
