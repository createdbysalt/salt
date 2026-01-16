"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Switch } from "@/app/_components/ui/switch";
import { Checkbox } from "@/app/_components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/_components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2 } from "lucide-react";
import { updateSeoConfig } from "@/app/_features/seo/actions";
import type { SeoConfig, ClientVisibleMetrics } from "@/app/_features/seo/types";

interface ProjectSettingsClientProps {
  projectId: string;
  projectName: string;
  initialSeoConfig: SeoConfig | null;
}

export function ProjectSettingsClient({
  projectId,
  projectName,
  initialSeoConfig,
}: ProjectSettingsClientProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  // SEO form state
  const [domain, setDomain] = useState(initialSeoConfig?.domain ?? "");
  const [isEnabled, setIsEnabled] = useState(initialSeoConfig?.isEnabled ?? false);

  // Default client visibility settings (all scores visible, detailed findings hidden)
  const defaultVisibility: ClientVisibleMetrics = {
    performance: true,
    seo: true,
    accessibility: true,
    bestPractices: true,
    detailedFindings: false,
    trendCharts: true,
  };

  const [clientVisibility, setClientVisibility] = useState<ClientVisibleMetrics>(
    initialSeoConfig?.clientVisibleMetrics ?? defaultVisibility
  );

  // Domain validation
  const [domainError, setDomainError] = useState<string | null>(null);

  const validateDomain = (value: string): boolean => {
    if (!value.trim()) {
      setDomainError(null);
      return true; // Empty is valid (optional field)
    }

    try {
      const url = new URL(value);
      if (url.protocol !== "https:") {
        setDomainError("URL must use HTTPS protocol");
        return false;
      }
      setDomainError(null);
      return true;
    } catch {
      setDomainError("Please enter a valid URL (e.g., https://example.com)");
      return false;
    }
  };

  const handleDomainChange = (value: string) => {
    setDomain(value);
    if (value.trim()) {
      validateDomain(value);
    } else {
      setDomainError(null);
    }
  };

  const handleSaveSeoSettings = () => {
    // Validate domain if provided
    if (domain.trim() && !validateDomain(domain)) {
      toast({
        title: "Validation Error",
        description: domainError || "Invalid domain URL",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      const result = await updateSeoConfig({
        projectId,
        domain: domain.trim() || null,
        isEnabled,
        clientVisibleMetrics: clientVisibility,
      });

      if (result.ok) {
        toast({
          title: "Settings Saved",
          description: "SEO configuration has been updated successfully.",
        });
      } else {
        const errorMessage = "message" in result ? result.message : "Failed to save SEO settings";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="seo">
        <TabsList>
          <TabsTrigger value="seo">
            <Search className="h-4 w-4 mr-2" />
            SEO
          </TabsTrigger>
        </TabsList>

        <TabsContent value="seo" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>SEO Monitoring</CardTitle>
              <CardDescription>
                Configure SEO tracking and monitoring for this project. Enable
                tracking to run Lighthouse audits and monitor Core Web Vitals.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Domain Input */}
              <div className="space-y-2">
                <Label htmlFor="domain">Website URL</Label>
                <Input
                  id="domain"
                  type="url"
                  placeholder="https://example.com"
                  value={domain}
                  onChange={(e) => handleDomainChange(e.target.value)}
                  className={domainError ? "border-destructive" : ""}
                />
                {domainError ? (
                  <p className="text-sm text-destructive">{domainError}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Enter the full URL of the website to monitor (must be HTTPS)
                  </p>
                )}
              </div>

              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="seo-enabled">Enable SEO Tracking</Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, automated audits will run periodically to track
                    your site's performance
                  </p>
                </div>
                <Switch
                  id="seo-enabled"
                  checked={isEnabled}
                  onCheckedChange={setIsEnabled}
                />
              </div>

              {/* Client Visibility Settings */}
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold">Client Visibility</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Control which SEO metrics are visible to clients on their
                    Bridge dashboard
                  </p>
                </div>
                <div className="rounded-lg border p-4 space-y-4">
                  {/* Performance Score */}
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="visibility-performance"
                      checked={clientVisibility.performance}
                      onCheckedChange={(checked) =>
                        setClientVisibility((prev) => ({
                          ...prev,
                          performance: checked === true,
                        }))
                      }
                    />
                    <Label
                      htmlFor="visibility-performance"
                      className="font-normal cursor-pointer"
                    >
                      Performance score
                    </Label>
                  </div>

                  {/* SEO Score */}
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="visibility-seo"
                      checked={clientVisibility.seo}
                      onCheckedChange={(checked) =>
                        setClientVisibility((prev) => ({
                          ...prev,
                          seo: checked === true,
                        }))
                      }
                    />
                    <Label
                      htmlFor="visibility-seo"
                      className="font-normal cursor-pointer"
                    >
                      SEO score
                    </Label>
                  </div>

                  {/* Accessibility Score */}
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="visibility-accessibility"
                      checked={clientVisibility.accessibility}
                      onCheckedChange={(checked) =>
                        setClientVisibility((prev) => ({
                          ...prev,
                          accessibility: checked === true,
                        }))
                      }
                    />
                    <Label
                      htmlFor="visibility-accessibility"
                      className="font-normal cursor-pointer"
                    >
                      Accessibility score
                    </Label>
                  </div>

                  {/* Best Practices Score */}
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="visibility-best-practices"
                      checked={clientVisibility.bestPractices}
                      onCheckedChange={(checked) =>
                        setClientVisibility((prev) => ({
                          ...prev,
                          bestPractices: checked === true,
                        }))
                      }
                    />
                    <Label
                      htmlFor="visibility-best-practices"
                      className="font-normal cursor-pointer"
                    >
                      Best Practices score
                    </Label>
                  </div>

                  {/* Detailed Findings */}
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="visibility-detailed-findings"
                      checked={clientVisibility.detailedFindings}
                      onCheckedChange={(checked) =>
                        setClientVisibility((prev) => ({
                          ...prev,
                          detailedFindings: checked === true,
                        }))
                      }
                    />
                    <Label
                      htmlFor="visibility-detailed-findings"
                      className="font-normal cursor-pointer"
                    >
                      Detailed findings
                    </Label>
                  </div>

                  {/* Trend Charts */}
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="visibility-trend-charts"
                      checked={clientVisibility.trendCharts}
                      onCheckedChange={(checked) =>
                        setClientVisibility((prev) => ({
                          ...prev,
                          trendCharts: checked === true,
                        }))
                      }
                    />
                    <Label
                      htmlFor="visibility-trend-charts"
                      className="font-normal cursor-pointer"
                    >
                      Trend charts
                    </Label>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveSeoSettings}
                  disabled={isPending || !!domainError}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Settings"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
