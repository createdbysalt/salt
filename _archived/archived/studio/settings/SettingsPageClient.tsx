"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Textarea } from "@/app/_components/ui/textarea";
import { Switch } from "@/app/_components/ui/switch";
import { Separator } from "@/app/_components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/_components/ui/tabs";
import { Alert, AlertDescription } from "@/app/_components/ui/alert";
import { useToast } from "@/app/_components/ui/use-toast";
import { ThemeToggle } from "@/app/_components/theme-toggle";
import { PageGreetingHeader } from "@/app/_components/patterns/page-greeting-header";
import { useDashboardUser } from "@/app/_features/shell/contexts/DashboardUserContext";
import {
  User,
  Bell,
  Lock,
  CreditCard,
  Info,
  Loader2,
} from "lucide-react";

import { updateProfileAction, uploadAvatarAction, changeEmailAction } from "@/app/_features/auth/actions";

type UserData = {
  id: string;
  email?: string;
  user_metadata?: any;
};

type ProfileData = {
  id: string;
  email: string | null;
  saas_subscription_status?: string;
  saas_tier?: string;
  trial_ends_at?: string | null;
  customer_id?: string | null;
  stripe_connect_account_id?: string | null;
  stripe_connect_status?: string;
  stripe_connect_charges_enabled?: boolean;
  stripe_connect_payouts_enabled?: boolean;
  [key: string]: any;
} | null;

type CreditBalance = {
  monthly_allocation: number;
  purchased_credits: number;
  used_this_month: number;
} | null;

type StudioMembership = {
  studio_id: string;
  role: string;
} | null;

export function SettingsPageClient({
  user,
  profile,
  creditBalance,
  membership,
}: {
  user: UserData;
  profile: ProfileData;
  creditBalance: CreditBalance;
  membership: StudioMembership;
}) {
  const dashboardUser = useDashboardUser();
  const [activeTab, setActiveTab] = useState("profile");
  const [isPending, startTransition] = useTransition();
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(user.user_metadata?.avatar_url || "");
  const { toast } = useToast();

  // Profile form state
  const [firstName, setFirstName] = useState(
    user.user_metadata?.first_name || 
    user.user_metadata?.full_name?.split(" ")[0] || 
    ""
  );
  const [lastName, setLastName] = useState(
    user.user_metadata?.last_name || 
    user.user_metadata?.full_name?.split(" ").slice(1).join(" ") || 
    ""
  );
  const [bio, setBio] = useState(user.user_metadata?.bio || "");

  // Extract user name from metadata or email
  const userEmail = user.email || profile?.email || "";
  const userName = user.user_metadata?.full_name || user.user_metadata?.name || "";

  // Get initials for avatar
  const initials = userName
    ? userName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : userEmail.charAt(0).toUpperCase();

  // Handle profile update
  const handleProfileUpdate = () => {
    if (!firstName.trim()) {
      toast({
        title: "Error",
        description: "First name is required",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      const result = await updateProfileAction({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        bio: bio.trim(),
      });

      if (result.success) {
        toast({
          title: "Success!",
          description: "Your profile has been updated successfully.",
        });
      } else {
        const errorMessage = "error" in result ? result.error : undefined;
        toast({
          title: "Error",
          description: errorMessage || "Failed to update profile",
          variant: "destructive",
        });
      }
    });
  };

  // Handle avatar upload (client-side to bypass Server Action body limit)
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingAvatar(true);

    try {
      // Upload directly to Supabase Storage from client
      const { createClient } = await import("@/app/_lib/supabase/client");
      const supabase = createClient();

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to upload an avatar",
          variant: "destructive",
        });
        return;
      }

      // Upload to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("user-assets")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.error("Error uploading avatar:", uploadError);
        toast({
          title: "Error",
          description: uploadError.message || "Failed to upload avatar",
          variant: "destructive",
        });
        return;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("user-assets").getPublicUrl(filePath);

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          avatar_url: publicUrl,
        },
      });

      if (updateError) {
        console.error("Error updating user avatar URL:", updateError);
        toast({
          title: "Error",
          description: updateError.message || "Failed to update avatar",
          variant: "destructive",
        });
        return;
      }

      setAvatarUrl(publicUrl);
      toast({
        title: "Success!",
        description: "Your avatar has been updated successfully.",
      });

      // Refresh the page to update avatar everywhere
      window.location.reload();
    } catch (error) {
      console.error("Error in avatar upload:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Handle email change
  const handleEmailChange = async () => {
    if (!newEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter a new email address",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsChangingEmail(true);

    try {
      const result = await changeEmailAction(newEmail);

      if (result.success) {
        toast({
          title: "Verification Email Sent!",
          description: "Please check your new email address and click the verification link to complete the change.",
        });
        setNewEmail("");
      } else {
        const errorMessage = "error" in result ? result.error : undefined;
        toast({
          title: "Error",
          description: errorMessage || "Failed to change email",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsChangingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageGreetingHeader page="settings" viewer={dashboardUser} />

      {/* Info Alert - Only show for non-profile features */}
      {activeTab !== "profile" && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Some settings are currently view-only. Full management features coming soon.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="h-4 w-4 mr-2" />
            Billing & Subscription
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="Avatar"
                    width={80}
                    height={80}
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-semibold">
                    {initials}
                  </div>
                )}
                <div className="space-y-2">
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={isUploadingAvatar}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("avatar-upload")?.click()}
                    disabled={isUploadingAvatar}
                  >
                    {isUploadingAvatar ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      "Change Avatar"
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG or GIF (max 5MB)
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter your first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter your last name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Current Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={userEmail}
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newEmail">Change Email Address</Label>
                <div className="flex gap-2">
                  <Input
                    id="newEmail"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter new email address"
                  />
                  <Button
                    variant="outline"
                    onClick={handleEmailChange}
                    disabled={isChangingEmail || !newEmail.trim()}
                  >
                    {isChangingEmail ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Change Email"
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  You'll receive a verification email at the new address. Click the link to confirm the change.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself..."
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>

              <Button 
                onClick={handleProfileUpdate} 
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Appearance Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Theme</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose your preferred color scheme
                  </p>
                </div>
                <ThemeToggle />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                {
                  label: "Project Updates",
                  description: "Get notified when a project status changes",
                },
                {
                  label: "New Tasks",
                  description: "Receive alerts for new task assignments",
                },
                {
                  label: "Client Messages",
                  description: "Email notifications for client communications",
                },
                {
                  label: "Payment Reminders",
                  description: "Reminders for upcoming and overdue payments",
                },
                {
                  label: "Team Activity",
                  description: "Updates on team member activities",
                },
                {
                  label: "Weekly Reports",
                  description: "Summary of your weekly performance",
                },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{item.label}</Label>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <Switch defaultChecked={i < 3} disabled />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  disabled
                />
              </div>
              <Button disabled>Update Password (Coming Soon)</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security to your account by enabling
                two-factor authentication.
              </p>
              <Button variant="outline" disabled>
                Enable 2FA (Coming Soon)
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {[
                  {
                    device: "Current Device",
                    location: "Your Location",
                    lastActive: "Active now",
                  },
                ].map((session, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{session.device}</p>
                      <p className="text-sm text-muted-foreground">
                        {session.location} · {session.lastActive}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing & Subscription Tab */}
        <TabsContent value="billing" className="space-y-6 mt-6">
          {/* Salt Core Subscription */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>Salt Core Subscription</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Current plan and billing status
                </p>
              </div>
              <div className="px-3 py-1 text-xs font-semibold rounded-full bg-muted">
                {profile?.saas_tier === "none" ? "Free" : (profile?.saas_tier || "Free")}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Current Plan</span>
                  <span className="font-semibold">{profile?.saas_tier === "none" ? "Free" : (profile?.saas_tier || "Free")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className="capitalize">{profile?.saas_subscription_status?.replace("_", " ") || "None"}</span>
                </div>
              </div>
              <Button className="w-full" disabled>
                Upgrade to Pro
              </Button>
            </CardContent>
          </Card>

          {/* AI Credits */}
          <Card>
            <CardHeader>
              <CardTitle>AI Credits</CardTitle>
              <p className="text-sm text-muted-foreground">
                Credits are used for AI-powered features like code generation and analysis
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Out of Credits Warning */}
              {(creditBalance?.monthly_allocation || 0) + (creditBalance?.purchased_credits || 0) - (creditBalance?.used_this_month || 0) <= 0 && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-destructive">
                    <strong>Out of Credits</strong>
                    <br />
                    You've used all your credits for this month. Purchase a credit pack to continue using AI features.
                  </AlertDescription>
                </Alert>
              )}

              {/* Credit Balance */}
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-3xl font-bold">
                    {((creditBalance?.monthly_allocation || 0) + (creditBalance?.purchased_credits || 0) - (creditBalance?.used_this_month || 0)).toLocaleString()}
                  </span>
                  <span className="text-sm text-muted-foreground">credits remaining</span>
                </div>

                {/* Breakdown */}
                <div className="grid grid-cols-3 gap-4 text-sm mt-4">
                  <div>
                    <p className="text-muted-foreground">Monthly</p>
                    <p className="font-semibold">{creditBalance?.monthly_allocation || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Purchased</p>
                    <p className="font-semibold">{creditBalance?.purchased_credits || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Used</p>
                    <p className="font-semibold">{creditBalance?.used_this_month || 0}</p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-3">
                  Monthly credits reset on the 1st of each month. Purchased credits never expire.
                </p>
              </div>

              {/* Credit Packs */}
              <div>
                <h3 className="font-semibold mb-3">Purchase Credit Packs</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { credits: 1000, price: 10, label: "Starter" },
                    { credits: 3000, price: 25, label: "Pro", popular: true },
                    { credits: 10000, price: 75, label: "Studio" },
                  ].map((pack) => (
                    <div
                      key={pack.credits}
                      className={`relative border rounded-lg p-4 ${
                        pack.popular ? "border-primary" : ""
                      }`}
                    >
                      {pack.popular && (
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                          <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-primary text-primary-foreground">
                            Popular
                          </span>
                        </div>
                      )}

                      <div className="text-center mb-3">
                        <p className="text-sm text-muted-foreground">{pack.label}</p>
                        <p className="text-2xl font-bold mt-1">{pack.credits.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">credits</p>
                      </div>

                      <Button className="w-full" size="sm" disabled>
                        ${pack.price}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stripe Connect for Client Billing */}
          {membership && (
            <Card>
              <CardHeader>
                <CardTitle>Client Billing Setup</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Connect your Stripe account to bill clients through The Bridge
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <span className="capitalize">{profile?.stripe_connect_status?.replace("_", " ") || "Not Connected"}</span>
                  </div>
                  {profile?.stripe_connect_account_id && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Charges Enabled</span>
                        <span>{profile.stripe_connect_charges_enabled ? "Yes" : "No"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Payouts Enabled</span>
                        <span>{profile.stripe_connect_payouts_enabled ? "Yes" : "No"}</span>
                      </div>
                    </>
                  )}
                </div>
                <Button className="w-full mt-4" variant="outline" disabled>
                  {profile?.stripe_connect_account_id ? "Manage Connect Account" : "Connect Stripe"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Help Section */}
          <Card>
            <CardContent className="py-6">
              <h3 className="font-semibold mb-2">Need Help?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Questions about billing, invoices, or your subscription? We're here to help.
              </p>
              <a
                href="mailto:support@salt.studio"
                className="text-sm font-medium text-primary hover:underline"
              >
                Contact Support →
              </a>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

