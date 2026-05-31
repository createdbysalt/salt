// ds-guardian-ignore: logo preview backgrounds use zinc for contrast testing
"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Switch } from "@/app/_components/ui/switch";
import { Progress } from "@/app/_components/ui/progress";
import { ConfirmDialog } from "@repo/patterns";
import { Upload, X, Image as ImageIcon, Palette, AlertTriangle } from "lucide-react";
import { cn } from "@repo/utils";
import { toast } from "sonner";
import type { BridgeBrandingConfig } from "@/app/_lib/roundtables/branding-config";
import { 
  updateBridgeBranding, 
  uploadBrandingAsset, 
  deleteBrandingAsset 
} from "@/app/_features/serve/actions";
import { getContrastingColor, isValidHexColor } from "@/app/_lib/roundtables/branding-config";

// Color presets for quick selection
const COLOR_PRESETS = [
  { value: "#6366F1", label: "Indigo", description: "Salt default" },
  { value: "#3B82F6", label: "Blue", description: "Professional" },
  { value: "#8B5CF6", label: "Purple", description: "Creative" },
  { value: "#10B981", label: "Green", description: "Fresh" },
  { value: "#F97316", label: "Orange", description: "Energetic" },
  { value: "#EF4444", label: "Red", description: "Bold" },
  { value: "#EC4899", label: "Pink", description: "Playful" },
  { value: "#14B8A6", label: "Teal", description: "Modern" },
];

interface BrandingEditorProps {
  studioId: string;
  initialBranding: BridgeBrandingConfig;
}

export function BrandingEditor({ studioId, initialBranding }: BrandingEditorProps) {
  const [branding, setBranding] = useState<BridgeBrandingConfig>(initialBranding);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const lightLogoRef = useRef<HTMLInputElement>(null);
  const darkLogoRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);

  // Check if there are unsaved changes
  const hasChanges = useMemo(() => {
    return JSON.stringify(branding) !== JSON.stringify(initialBranding);
  }, [branding, initialBranding]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateBridgeBranding(studioId, branding);
      if (result.success) {
        toast.success("Branding saved successfully");
      } else {
        toast.error(result.error || "Failed to save branding");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (
    type: "logo-light" | "logo-dark" | "favicon",
    file: File
  ) => {
    setUploading(type);
    setUploadProgress(0);
    
    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await uploadBrandingAsset(studioId, type, formData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (result.success && result.url) {
        // Update branding state with new URL
        setBranding((prev) => {
          if (type === "favicon") {
            return { ...prev, favicon: { url: result.url } };
          }
          return {
            ...prev,
            logo: {
              ...prev.logo,
              [type === "logo-light" ? "lightUrl" : "darkUrl"]: result.url,
            },
          };
        });
        toast.success("Asset uploaded successfully");
      } else {
        toast.error(result.error || "Failed to upload asset");
      }
    } catch (error) {
      clearInterval(progressInterval);
      toast.error("Upload failed");
    } finally {
      setTimeout(() => {
        setUploading(null);
        setUploadProgress(0);
      }, 500);
    }
  };

  const handleDeleteAsset = async (type: "logo-light" | "logo-dark" | "favicon") => {
    try {
      const result = await deleteBrandingAsset(studioId, type);
      if (result.success) {
        setBranding((prev) => {
          if (type === "favicon") {
            return { ...prev, favicon: undefined };
          }
          return {
            ...prev,
            logo: {
              ...prev.logo,
              [type === "logo-light" ? "lightUrl" : "darkUrl"]: undefined,
            },
          };
        });
        toast.success("Asset removed");
      } else {
        toast.error(result.error || "Failed to remove asset");
      }
    } catch (error) {
      toast.error("Failed to remove asset");
    }
  };

  const handleColorChange = (color: string) => {
    if (isValidHexColor(color)) {
      setBranding((prev) => ({
        ...prev,
        colors: {
          accent: color,
          accentForeground: getContrastingColor(color),
        },
      }));
    }
  };

  const handleColorPreset = (color: string) => {
    setBranding((prev) => ({
      ...prev,
      colors: {
        accent: color,
        accentForeground: getContrastingColor(color),
      },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Unsaved Changes Banner */}
      {hasChanges && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              You have unsaved changes
            </p>
            <p className="text-xs text-muted-foreground">
              Save your changes before leaving to keep your branding updates.
            </p>
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Now"}
          </Button>
        </div>
      )}

      {/* Logo Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Logo
          </CardTitle>
          <CardDescription>
            Upload your studio logo. We recommend a PNG or SVG with transparent background.
            Max dimensions: 200x60px.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Light Mode Logo */}
          <div>
            <Label className="text-sm font-medium">Light Mode Logo</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Used on dark backgrounds
            </p>
            <div className="flex items-center gap-4">
              {branding.logo?.lightUrl ? (
                <div className="relative bg-zinc-900 rounded-lg p-4 flex items-center justify-center min-w-[200px] min-h-[60px]">
                  <img
                    src={branding.logo.lightUrl}
                    alt="Light mode logo"
                    className="max-h-[60px] max-w-[200px] object-contain"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground"
                    onClick={() => handleDeleteAsset("logo-light")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="h-20 w-[200px] border-dashed"
                    onClick={() => lightLogoRef.current?.click()}
                    disabled={uploading === "logo-light"}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="h-5 w-5" />
                      <span className="text-xs">
                        {uploading === "logo-light" ? "Uploading..." : "Upload Logo"}
                      </span>
                    </div>
                  </Button>
                  {uploading === "logo-light" && (
                    <Progress value={uploadProgress} className="w-[200px] h-1" />
                  )}
                </div>
              )}
              <input
                ref={lightLogoRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload("logo-light", file);
                }}
              />
            </div>
          </div>

          {/* Dark Mode Logo */}
          <div>
            <Label className="text-sm font-medium">Dark Mode Logo</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Used on light backgrounds
            </p>
            <div className="flex items-center gap-4">
              {branding.logo?.darkUrl ? (
                <div className="relative bg-zinc-100 rounded-lg p-4 flex items-center justify-center min-w-[200px] min-h-[60px]">
                  <img
                    src={branding.logo.darkUrl}
                    alt="Dark mode logo"
                    className="max-h-[60px] max-w-[200px] object-contain"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground"
                    onClick={() => handleDeleteAsset("logo-dark")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="h-20 w-[200px] border-dashed"
                    onClick={() => darkLogoRef.current?.click()}
                    disabled={uploading === "logo-dark"}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="h-5 w-5" />
                      <span className="text-xs">
                        {uploading === "logo-dark" ? "Uploading..." : "Upload Logo"}
                      </span>
                    </div>
                  </Button>
                  {uploading === "logo-dark" && (
                    <Progress value={uploadProgress} className="w-[200px] h-1" />
                  )}
                </div>
              )}
              <input
                ref={darkLogoRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload("logo-dark", file);
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Favicon Section */}
      <Card>
        <CardHeader>
          <CardTitle>Favicon</CardTitle>
          <CardDescription>
            The small icon that appears in browser tabs. Recommended size: 32x32px or 180x180px.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {branding.favicon?.url ? (
              <div className="relative bg-muted rounded-lg p-3 flex items-center justify-center">
                <img
                  src={branding.favicon.url}
                  alt="Favicon"
                  className="h-8 w-8 object-contain"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground"
                  onClick={() => handleDeleteAsset("favicon")}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="h-16 w-16 border-dashed"
                  onClick={() => faviconRef.current?.click()}
                  disabled={uploading === "favicon"}
                >
                  <Upload className="h-5 w-5" />
                </Button>
                {uploading === "favicon" && (
                  <Progress value={uploadProgress} className="w-16 h-1" />
                )}
              </div>
            )}
            <input
              ref={faviconRef}
              type="file"
              accept="image/png,image/x-icon,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload("favicon", file);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Colors Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Colors
          </CardTitle>
          <CardDescription>
            Customize the accent color used for buttons, links, and highlights.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Color Presets */}
          <div className="space-y-2">
            <Label className="text-sm">Quick Presets</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handleColorPreset(preset.value)}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
                    branding.colors?.accent === preset.value
                      ? "border-foreground ring-2 ring-offset-2 ring-primary"
                      : "border-transparent"
                  )}
                  style={{ backgroundColor: preset.value }}
                  title={preset.label}
                />
              ))}
            </div>
          </div>

          {/* Custom Color Picker */}
          <div className="flex items-center gap-4">
            <Label htmlFor="accent-color" className="w-24">
              Custom
            </Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="accent-color"
                value={branding.colors?.accent || "#6366F1"}
                onChange={(e) => handleColorChange(e.target.value)}
                className="h-10 w-10 rounded cursor-pointer border-0"
              />
              <Input
                value={branding.colors?.accent || "#6366F1"}
                onChange={(e) => handleColorChange(e.target.value)}
                placeholder="#6366F1"
                className="w-28 font-mono text-sm"
              />
            </div>
            <div
              className="h-10 px-4 rounded-md flex items-center text-sm font-medium"
              style={{
                backgroundColor: branding.colors?.accent || "#6366F1",
                color: branding.colors?.accentForeground || "#FFFFFF",
              }}
            >
              Preview
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer Section */}
      <Card>
        <CardHeader>
          <CardTitle>Footer</CardTitle>
          <CardDescription>
            Configure what appears at the bottom of your Bridge.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="powered-by" className="text-sm font-medium">
                Show "Powered by Salt"
              </Label>
              <p className="text-xs text-muted-foreground">
                Display the Salt attribution in the Bridge footer
              </p>
            </div>
            <Switch
              id="powered-by"
              checked={branding.footer?.showPoweredBy !== false}
              onCheckedChange={(checked) =>
                setBranding((prev) => ({
                  ...prev,
                  footer: { ...prev.footer, showPoweredBy: checked },
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => setBranding(initialBranding)}
          disabled={saving || !hasChanges}
        >
          Reset
        </Button>
        <Button onClick={handleSave} disabled={saving || !hasChanges}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Unsaved Changes Dialog */}
      <ConfirmDialog
        open={showUnsavedDialog}
        onOpenChange={setShowUnsavedDialog}
        title="Unsaved Changes"
        description="You have unsaved changes. Are you sure you want to leave? Your changes will be lost."
        confirmText="Leave"
        cancelText="Stay"
        onConfirm={() => {
          if (pendingNavigation) {
            window.location.href = pendingNavigation;
          }
        }}
        variant="destructive"
      />
    </div>
  );
}
