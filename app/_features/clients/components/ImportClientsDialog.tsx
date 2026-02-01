"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/_components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/_components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/_components/ui/table";
import { Badge } from "@/app/_components/ui/badge";
import { Upload, FileText, Download, AlertCircle, Check, X } from "lucide-react";
import toast from "react-hot-toast";

interface ParsedClient {
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  phone?: string;
  isValid: boolean;
  errors: string[];
}

interface ImportClientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (clients: ParsedClient[]) => Promise<{ success: boolean; imported: number; errors: string[] }>;
}

export function ImportClientsDialog({
  open,
  onOpenChange,
  onImport,
}: ImportClientsDialogProps) {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [parsedClients, setParsedClients] = useState<ParsedClient[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const parseCSV = (text: string): ParsedClient[] => {
    const lines = text.split("\n").filter((line) => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(",").map((h) => h.trim());
    const clients: ParsedClient[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const client: ParsedClient = {
        firstName: "",
        lastName: "",
        email: "",
        isValid: true,
        errors: [],
      };

      headers.forEach((header, index) => {
        const value = values[index] || "";
        switch (header) {
          case "first_name":
          case "firstname":
          case "first name":
            client.firstName = value;
            break;
          case "last_name":
          case "lastname":
          case "last name":
            client.lastName = value;
            break;
          case "email":
          case "email_address":
            client.email = value;
            break;
          case "company":
          case "company_name":
            client.company = value || undefined;
            break;
          case "phone":
          case "phone_number":
            client.phone = value || undefined;
            break;
        }
      });

      // Validate
      if (!client.firstName) {
        client.isValid = false;
        client.errors.push("Missing first name");
      }
      if (!client.lastName) {
        client.isValid = false;
        client.errors.push("Missing last name");
      }
      if (!client.email) {
        client.isValid = false;
        client.errors.push("Missing email");
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email)) {
        client.isValid = false;
        client.errors.push("Invalid email format");
      }

      clients.push(client);
    }

    return clients;
  };

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv") && !file.name.endsWith(".xlsx")) {
      toast.error("Please upload a CSV or XLSX file");
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const clients = parseCSV(text);
      setParsedClients(clients);

      if (clients.length === 0) {
        toast.error("No valid data found in file");
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleImport = async () => {
    const validClients = parsedClients.filter((c) => c.isValid);
    if (validClients.length === 0) {
      toast.error("No valid clients to import");
      return;
    }

    setIsImporting(true);

    try {
      const result = await onImport(validClients);

      if (result.success) {
        toast.success(`Successfully imported ${result.imported} clients`);
        onOpenChange(false);
        resetState();
        router.refresh();
      } else {
        toast.error(`Import failed: ${result.errors.join(", ")}`);
      }
    } catch (error) {
      toast.error("An error occurred during import");
    } finally {
      setIsImporting(false);
    }
  };

  const resetState = () => {
    setParsedClients([]);
    setFileName(null);
    setIsDragging(false);
  };

  const downloadTemplate = () => {
    const template = "first_name,last_name,email,company,phone\nJohn,Doe,john@example.com,Acme Corp,(555) 123-4567\nJane,Smith,jane@example.com,,";
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "client_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = parsedClients.filter((c) => c.isValid).length;
  const invalidCount = parsedClients.filter((c) => !c.isValid).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import clients</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import clients
          </DialogDescription>
        </DialogHeader>

        {parsedClients.length === 0 ? (
          <>
            {/* Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center transition-colors
                ${isDragging ? "border-primary bg-primary/5" : "border-border"}
              `}
            >
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileInput}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="text-sm font-medium">
                    Drop your CSV file here
                  </div>
                  <div className="text-xs text-muted-foreground">
                    or click to browse
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Supports: .csv, .xlsx
                  </div>
                </div>
              </label>
            </div>

            {/* Template Download */}
            <Button
              variant="link"
              size="sm"
              className="text-muted-foreground"
              onClick={downloadTemplate}
            >
              <Download className="h-4 w-4 mr-2" />
              Download template
            </Button>

            {/* Expected Columns */}
            <div className="text-sm space-y-1">
              <div className="font-medium">Expected columns:</div>
              <ul className="text-muted-foreground space-y-0.5 ml-4">
                <li>• first_name (required)</li>
                <li>• last_name (required)</li>
                <li>• email (required)</li>
                <li>• company (optional)</li>
                <li>• phone (optional)</li>
              </ul>
            </div>
          </>
        ) : (
          <>
            {/* File Info */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{fileName}</div>
                <div className="text-xs text-muted-foreground">
                  {parsedClients.length} rows found
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={resetState}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Stats */}
            <div className="flex gap-4">
              <Badge variant="outline" className="bg-success/10 text-success">
                <Check className="h-3 w-3 mr-1" />
                {validCount} valid
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="outline" className="bg-destructive/10 text-destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {invalidCount} invalid
                </Badge>
              )}
            </div>

            {/* Preview Table */}
            <div className="max-h-[300px] overflow-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30px]"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedClients.slice(0, 10).map((client, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {client.isValid ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {client.firstName} {client.lastName}
                        </div>
                        {!client.isValid && (
                          <div className="text-xs text-destructive">
                            {client.errors.join(", ")}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{client.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {client.company || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {parsedClients.length > 10 && (
              <div className="text-xs text-muted-foreground text-center">
                Showing first 10 of {parsedClients.length} rows
              </div>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={validCount === 0 || isImporting}
          >
            {isImporting ? "Importing..." : `Import ${validCount} clients`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
