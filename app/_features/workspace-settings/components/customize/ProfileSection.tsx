"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Upload, Globe, Linkedin, Twitter, Instagram } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui";
import { updateStudioProfile } from "../../actions";
import { useWorkspaceProfile } from "../../hooks/useWorkspaceProfile";

const profileSchema = z.object({
  name: z.string().min(1, "Workspace name is required").max(100),
  tagline: z.string().max(140, "Tagline must be 140 characters or less").optional(),
  description: z.string().max(1000).optional(),
  website_url: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  team_size: z.enum(["solo", "2-5", "6-10", "11-25", "25+"]).optional(),
  founded_year: z.coerce.number().min(1900).max(new Date().getFullYear()).optional().nullable(),
  social_links: z.object({
    twitter: z.string().optional(),
    linkedin: z.string().optional(),
    instagram: z.string().optional(),
  }).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function ProfileSection() {
  const { studio, isLoading, mutate } = useWorkspaceProfile();
  const [isPending, startTransition] = React.useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      tagline: "",
      description: "",
      website_url: "",
      team_size: undefined,
      founded_year: null,
      social_links: {
        twitter: "",
        linkedin: "",
        instagram: "",
      },
    },
  });

  // Update form when studio data loads
  React.useEffect(() => {
    if (studio) {
      setValue("name", studio.name || "");
      setValue("tagline", studio.tagline || "");
      setValue("description", studio.description || "");
      setValue("website_url", studio.website_url || "");
      setValue("team_size", studio.team_size as ProfileFormData["team_size"]);
      setValue("founded_year", studio.founded_year);
      setValue("social_links", {
        twitter: studio.social_links?.twitter || "",
        linkedin: studio.social_links?.linkedin || "",
        instagram: studio.social_links?.instagram || "",
      });
    }
  }, [studio, setValue]);

  const onSubmit = (data: ProfileFormData) => {
    startTransition(async () => {
      const result = await updateStudioProfile(data);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Profile updated");
      mutate();
    });
  };

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="h-5 w-32 bg-muted animate-pulse rounded" />
            <div className="h-4 w-48 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="h-5 w-32 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Your studio&apos;s public-facing identity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <Avatar className="size-16">
                <AvatarImage src={studio?.logo_url || undefined} />
                <AvatarFallback className="text-lg">
                  {studio?.name?.charAt(0) || "S"}
                </AvatarFallback>
              </Avatar>
              <Button type="button" variant="outline" size="sm">
                <Upload className="size-4 mr-2" />
                Upload Logo
              </Button>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Workspace name</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="Salt Studio"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Tagline */}
            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                {...register("tagline")}
                placeholder="We build things that matter"
                maxLength={140}
              />
              <p className="text-xs text-muted-foreground">
                {watch("tagline")?.length || 0}/140 characters
              </p>
              {errors.tagline && (
                <p className="text-sm text-destructive">{errors.tagline.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Tell clients about your studio..."
                rows={4}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            {/* Website */}
            <div className="space-y-2">
              <Label htmlFor="website_url">Website</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="website_url"
                  {...register("website_url")}
                  placeholder="https://yourstudio.com"
                  className="pl-10"
                />
              </div>
              {errors.website_url && (
                <p className="text-sm text-destructive">{errors.website_url.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Additional Details */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Studio Details</CardTitle>
              <CardDescription>
                Help clients understand your studio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Team Size */}
              <div className="space-y-2">
                <Label htmlFor="team_size">Team Size</Label>
                <Select
                  value={watch("team_size") || ""}
                  onValueChange={(value) => setValue("team_size", value as ProfileFormData["team_size"], { shouldDirty: true })}
                >
                  <SelectTrigger id="team_size">
                    <SelectValue placeholder="Select team size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solo">Solo (Just me)</SelectItem>
                    <SelectItem value="2-5">2-5 people</SelectItem>
                    <SelectItem value="6-10">6-10 people</SelectItem>
                    <SelectItem value="11-25">11-25 people</SelectItem>
                    <SelectItem value="25+">25+ people</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Founded Year */}
              <div className="space-y-2">
                <Label htmlFor="founded_year">Founded Year</Label>
                <Input
                  id="founded_year"
                  type="number"
                  {...register("founded_year")}
                  placeholder={new Date().getFullYear().toString()}
                  min={1900}
                  max={new Date().getFullYear()}
                />
                {errors.founded_year && (
                  <p className="text-sm text-destructive">{errors.founded_year.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Social Links */}
          <Card>
            <CardHeader>
              <CardTitle>Social Links</CardTitle>
              <CardDescription>
                Connect your social profiles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="twitter">Twitter / X</Label>
                <div className="relative">
                  <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="twitter"
                    {...register("social_links.twitter")}
                    placeholder="@yourstudio"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <div className="relative">
                  <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="linkedin"
                    {...register("social_links.linkedin")}
                    placeholder="linkedin.com/company/yourstudio"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <div className="relative">
                  <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="instagram"
                    {...register("social_links.instagram")}
                    placeholder="@yourstudio"
                    className="pl-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end mt-6">
        <Button type="submit" disabled={isPending || !isDirty}>
          {isPending && <Loader2 className="size-4 animate-spin mr-2" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}
