"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Label,
  Badge,
} from "@repo/ui";
import { Globe, ArrowRight, Check, Copy, ExternalLink } from "lucide-react";
import { cn } from "@repo/utils";
import { toast } from "sonner";
import { addCustomDomain } from "@/app/_features/serve/actions";

interface DomainWizardProps {
  studioId: string;
  onDomainAdded?: () => void;
}

type Step = "input" | "instructions" | "verifying";

// Step indicator component
function StepIndicator({ currentStep }: { currentStep: Step }) {
  const steps = [
    { key: "input", label: "Enter Domain" },
    { key: "instructions", label: "Configure DNS" },
    { key: "verifying", label: "Verify" },
  ];
  
  const currentIndex = steps.findIndex(s => s.key === currentStep);
  
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((step, index) => (
        <div key={step.key} className="flex items-center">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                index < currentIndex
                  ? "bg-primary text-primary-foreground"
                  : index === currentIndex
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {index < currentIndex ? (
                <Check className="h-3 w-3" />
              ) : (
                index + 1
              )}
            </div>
            <span
              className={cn(
                "text-xs hidden sm:inline",
                index <= currentIndex
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                "w-8 h-0.5 mx-2",
                index < currentIndex ? "bg-primary" : "bg-muted"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// Popular subdomain suggestions
const SUBDOMAIN_SUGGESTIONS = [
  { value: "bridge", label: "bridge", description: "Default" },
  { value: "portal", label: "portal", description: "Client portal" },
  { value: "clients", label: "clients", description: "Client hub" },
  { value: "hub", label: "hub", description: "Project hub" },
  { value: "", label: "None", description: "Root domain" },
];

// Validate subdomain format
function isValidSubdomain(subdomain: string): boolean {
  if (subdomain === "") return true; // Empty is valid (root domain)
  // Lowercase alphanumeric and hyphens, cant start/end with hyphen
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(subdomain) && subdomain.length <= 63;
}

// Validate domain format
function isValidDomain(domain: string): boolean {
  // Basic domain validation - must have at least one dot, valid characters
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain.toLowerCase());
}

export function DomainWizard({ studioId, onDomainAdded }: DomainWizardProps) {
  const [step, setStep] = useState<Step>("input");
  const [subdomain, setSubdomain] = useState("bridge");
  const [rootDomain, setRootDomain] = useState("");
  const [adding, setAdding] = useState(false);
  const [dnsRecords, setDnsRecords] = useState<
    Array<{ type: string; host: string; value: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  // Compute the full hostname
  const hostname = useMemo(() => {
    const cleanSubdomain = subdomain.trim().toLowerCase();
    const cleanDomain = rootDomain.trim().toLowerCase();
    if (!cleanDomain) return "";
    if (!cleanSubdomain) return cleanDomain;
    return cleanSubdomain + "." + cleanDomain;
  }, [subdomain, rootDomain]);

  const handleSubmit = async () => {
    // Validate root domain
    if (!rootDomain.trim()) {
      setError("Please enter your domain");
      return;
    }

    if (!isValidDomain(rootDomain.trim().toLowerCase())) {
      setError("Please enter a valid domain (e.g., yourstudio.com)");
      return;
    }

    // Validate subdomain if provided
    if (subdomain && !isValidSubdomain(subdomain.trim().toLowerCase())) {
      setError("Subdomain must be lowercase letters, numbers, and hyphens only");
      return;
    }

    if (!hostname) {
      setError("Please enter a domain");
      return;
    }

    setAdding(true);
    setError(null);

    try {
      const result = await addCustomDomain(studioId, hostname);

      if (result.success && result.verification) {
        setDnsRecords(result.verification);
        setStep("instructions");
        toast.success("Domain added! Configure your DNS to complete setup.");
      } else {
        setError(result.error || "Failed to add domain");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && rootDomain && !adding) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const copyAllDnsRecords = () => {
    const text = dnsRecords
      .map(r => "Type: " + r.type + "\\nHost: " + r.host + "\\nValue: " + r.value)
      .join("\\n\\n");
    navigator.clipboard.writeText(text);
    toast.success("All DNS records copied");
  };

  const handleSubdomainSuggestion = (value: string) => {
    setSubdomain(value);
    setError(null);
  };

  if (step === "instructions") {
    return (
      <Card>
        <CardHeader>
          <StepIndicator currentStep={step} />
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Configure DNS for {hostname}
          </CardTitle>
          <CardDescription>
            Add these DNS records at your domain registrar to complete setup.
            DNS changes can take up to 24 hours to propagate.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Copy All Button */}
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={copyAllDnsRecords}>
              <Copy className="h-3 w-3 mr-2" />
              Copy All Records
            </Button>
          </div>

          {dnsRecords.map((record, index) => (
            <div key={index} className="space-y-2">
              <Label className="text-sm font-medium">
                {record.type} Record
              </Label>
              <div className="bg-muted rounded-lg p-4 font-mono text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Host:</span>
                  <div className="flex items-center gap-2">
                    <code className="bg-background px-2 py-1 rounded">
                      {record.host}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(record.host)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Value:</span>
                  <div className="flex items-center gap-2">
                    <code className="bg-background px-2 py-1 rounded truncate max-w-[200px]">
                      {record.value}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(record.value)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="bg-muted rounded-lg p-4 text-sm">
            <p className="font-medium">Common DNS Providers:</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li>
                <a href="https://www.cloudflare.com/learning/dns/dns-records/dns-cname-record/" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">
                  Cloudflare <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a href="https://www.namecheap.com/support/knowledgebase/article.aspx/9646/2237/how-to-create-a-cname-record-for-your-domain/" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">
                  Namecheap <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a href="https://www.godaddy.com/help/add-a-cname-record-19236" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">
                  GoDaddy <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => {
              setStep("input");
              setSubdomain("bridge");
              setRootDomain("");
              setDnsRecords([]);
            }}>
              Add Another Domain
            </Button>
            <Button onClick={() => {
              onDomainAdded?.();
              setStep("input");
              setSubdomain("bridge");
              setRootDomain("");
              setDnsRecords([]);
            }}>
              <Check className="h-4 w-4 mr-2" />
              Done
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <StepIndicator currentStep={step} />
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Custom Domain
        </CardTitle>
        <CardDescription>
          Use your own domain for your Bridge client portal.
          Choose a subdomain prefix or use your root domain.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Subdomain Selection */}
        <div className="space-y-3">
          <Label>Subdomain Prefix</Label>
          <div className="flex flex-wrap gap-2">
            {SUBDOMAIN_SUGGESTIONS.map((suggestion) => (
              <Badge
                key={suggestion.value}
                variant={subdomain === suggestion.value ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary/10 transition-colors px-3 py-1"
                onClick={() => handleSubdomainSuggestion(suggestion.value)}
              >
                {suggestion.label || "No prefix"}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="custom"
              value={subdomain}
              onChange={(e) => {
                setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              className="w-32"
            />
            <span className="text-muted-foreground">.</span>
            <span className="text-muted-foreground text-sm">
              {rootDomain || "yourstudio.com"}
            </span>
          </div>
        </div>

        {/* Root Domain Input */}
        <div className="space-y-2">
          <Label htmlFor="rootDomain">Your Domain</Label>
          <Input
            id="rootDomain"
            placeholder="yourstudio.com"
            value={rootDomain}
            onChange={(e) => {
              setRootDomain(e.target.value.toLowerCase());
              setError(null);
            }}
            onKeyDown={handleKeyDown}
          />
          <p className="text-xs text-muted-foreground">
            Enter your root domain without any subdomain prefix
          </p>
        </div>

        {/* Preview */}
        {hostname && (
          <div className="bg-muted/50 rounded-lg p-4 border">
            <Label className="text-xs text-muted-foreground">Your Portal URL</Label>
            <p className="text-lg font-mono mt-1">{hostname}</p>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button onClick={handleSubmit} disabled={adding || !rootDomain} className="w-full">
          {adding ? (
            "Adding..."
          ) : (
            <>
              Add Domain
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>

        <div className="text-sm text-muted-foreground">
          <p>Requirements:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>You must own the domain</li>
            <li>Access to DNS settings is required</li>
            <li>SSL certificate will be provisioned automatically</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
