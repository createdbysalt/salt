"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/app/_components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface CopyButtonProps {
  value: string;
  label?: string;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "default" | "outline" | "ghost" | "secondary";
}

export function CopyButton({ value, label, size = "sm", variant = "ghost" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: label ? `${label}: ${value}` : value,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        variant: "destructive",
      });
    }
  };

  // Generate accessible label
  const ariaLabel = label || `Copy ${value.length > 30 ? value.substring(0, 30) + '...' : value}`;

  return (
    <Button
      onClick={handleCopy}
      size={size}
      variant={variant}
      className="gap-2"
      aria-label={copied ? `Copied ${ariaLabel}` : ariaLabel}
    >
      {copied ? (
        <Check className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Copy className="h-4 w-4" aria-hidden="true" />
      )}
      {label && <span>{label}</span>}
    </Button>
  );
}

