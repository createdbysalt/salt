"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/_components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import { Alert, AlertDescription } from "@/app/_components/ui/alert";
import { Info, Plus, Upload } from "lucide-react";
import toast from "react-hot-toast";

interface Company {
  id: string;
  name: string;
}

interface NewClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: Company[];
  onImportClick: () => void;
  onSubmit: (data: {
    firstName: string;
    lastName: string;
    email: string;
    companyId: string | null;
    newCompanyName: string | null;
  }) => Promise<{ success: boolean; error?: string }>;
}

export function NewClientDialog({
  open,
  onOpenChange,
  companies,
  onImportClick,
  onSubmit,
}: NewClientDialogProps) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("none");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await onSubmit({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        companyId: isCreatingCompany ? null : (selectedCompanyId === "none" ? null : selectedCompanyId),
        newCompanyName: isCreatingCompany ? newCompanyName.trim() : null,
      });

      if (result.success) {
        toast.success("Client created successfully");
        onOpenChange(false);
        resetForm();
        router.refresh();
      } else {
        toast.error(result.error || "Failed to create client");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setSelectedCompanyId("none");
    setNewCompanyName("");
    setIsCreatingCompany(false);
  };

  const handleCompanyChange = (value: string) => {
    if (value === "create-new") {
      setIsCreatingCompany(true);
      setSelectedCompanyId("none");
    } else {
      setIsCreatingCompany(false);
      setSelectedCompanyId(value);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New client</DialogTitle>
          <DialogDescription className="sr-only">
            Create a new client
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tip Alert */}
          <Alert className="bg-muted/50 border-muted">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Creating your first client? Consider inviting yourself to explore
              the Bridge (your client experience). You can use the same
              email you used for your internal user.
            </AlertDescription>
          </Alert>

          {/* First Name */}
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Alex"
              required
            />
          </div>

          {/* Last Name */}
          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Smith"
              required
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.com"
              required
            />
          </div>

          {/* Company */}
          <div className="space-y-2">
            <Label>
              Company{" "}
              <span className="text-muted-foreground font-normal">
                (Optional)
              </span>
            </Label>

            {isCreatingCompany ? (
              <div className="space-y-2">
                <Input
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="Enter company name"
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsCreatingCompany(false);
                    setNewCompanyName("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Select value={selectedCompanyId} onValueChange={handleCompanyChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select company..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No company</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="create-new" className="text-primary">
                    <span className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Create new company
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <DialogFooter className="flex-row justify-between sm:justify-between gap-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => {
                onOpenChange(false);
                onImportClick();
              }}
            >
              <Upload className="h-4 w-4 mr-2" />
              Bulk import clients
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
