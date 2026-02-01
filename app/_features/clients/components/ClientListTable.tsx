"use client";

import Link from "next/link";
import { Badge } from "@/app/_components/ui/badge";
import { Avatar, AvatarFallback } from "@/app/_components/ui/avatar";
import { Button } from "@/app/_components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/_components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/_components/ui/table";
import { ClientCell } from "./ClientCell";
import { MoreHorizontal, Mail, Trash2, Edit, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface ClientCompany {
  id: string;
  name: string;
}

interface ClientTag {
  id: string;
  label: string;
  color: string;
}

export interface ClientListItem {
  id: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  company: ClientCompany | null;
  status: "active" | "invited" | "inactive";
  createdAt: string;
  tags: ClientTag[];
}

interface ClientListTableProps {
  clients: ClientListItem[];
  onDelete?: (clientId: string) => void;
  onMessage?: (clientId: string) => void;
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  active: {
    label: "Active",
    className: "bg-success/10 text-success border-success/20",
  },
  invited: {
    label: "Invited",
    className: "bg-warning/10 text-warning border-warning/20",
  },
  inactive: {
    label: "Inactive",
    className: "bg-muted text-muted-foreground border-border",
  },
};

function getCompanyInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

function getCompanyColor(name: string): string {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-teal-500",
    "bg-indigo-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function ClientListTable({
  clients,
  onDelete,
  onMessage,
}: ClientListTableProps) {
  if (clients.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No clients found</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-[300px]">Name</TableHead>
            <TableHead className="w-[200px]">Company</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="w-[140px]">Created</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => {
            const statusStyle = STATUS_STYLES[client.status] || STATUS_STYLES.inactive;

            return (
              <TableRow
                key={client.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <TableCell>
                  <Link
                    href={`/dashboard/clients/${client.id}`}
                    className="block"
                  >
                    <ClientCell
                      name={client.name}
                      email={client.contactEmail}
                    />
                  </Link>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/dashboard/clients/${client.id}`}
                    className="block"
                  >
                    {client.company ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback
                            className={`${getCompanyColor(client.company.name)} text-white text-xs`}
                          >
                            {getCompanyInitial(client.company.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{client.company.name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/dashboard/clients/${client.id}`}
                    className="block"
                  >
                    <Badge
                      variant="outline"
                      className={`text-xs ${statusStyle.className}`}
                    >
                      {statusStyle.label}
                    </Badge>
                  </Link>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/dashboard/clients/${client.id}`}
                    className="block text-sm text-muted-foreground"
                  >
                    {format(new Date(client.createdAt), "MMM d, yyyy")}
                  </Link>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[160px]">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/clients/${client.id}`}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/clients/${client.id}/edit`}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      {onMessage && (
                        <DropdownMenuItem
                          onClick={() => onMessage(client.id)}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Send message
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {onDelete && (
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDelete(client.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
