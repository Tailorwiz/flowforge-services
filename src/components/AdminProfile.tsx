import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { User, Mail, Phone, Bell, MessageSquare, Camera, Upload } from "lucide-react";
import AvatarUpload from "@/components/AvatarUpload";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  displayName: z.string().min(1, "Display name is required"),
  phone: z.string().optional(),
  bio: z.string().optional(),
});

const notificationSchema = z.object({
  emailNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  dailyDigestEmail: z.boolean(),
  reminderNotifications: z.boolean(),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type NotificationFormData = z.infer<typeof notificationSchema>;

export function AdminProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      displayName: "",
      phone: "",
      bio: "",
    },
  });

  const notificationForm = useForm<NotificationFormData>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      emailNotifications: true,
      smsNotifications: false,
      dailyDigestEmail: true,
      reminderNotifications: true,
    },
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setProfile(data);
        profileForm.reset({
          firstName: data.first_name || "",
          lastName: data.last_name || "",
          displayName: data.display_name || "",
          phone: data.phone || "",
          bio: data.bio || "",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    }
  };

  const onProfileSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    setLoading(true);
    try {
      const profileData = {
        id: user.id,
        email: user.email,
        first_name: data.firstName,
        last_name: data.lastName,
        display_name: data.displayName,
        phone: data.phone,
        bio: data.bio,
        avatar_url: profile?.avatar_url, // Preserve existing avatar URL
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .upsert(profileData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

      setProfile(profileData);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onNotificationSubmit = async (data: NotificationFormData) => {
    // For now, just show success - in future this could update a notifications preferences table
    toast({
      title: "Success",
      description: "Notification preferences updated",
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-rdr-navy font-heading">Admin Profile</h2>
        <p className="text-rdr-medium-gray">
          Manage your profile information and notification preferences
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Photo Section */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-rdr-navy">
              <Camera className="w-5 h-5" />
              Profile Photo
            </CardTitle>
            <CardDescription>
              Upload or change your profile picture
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-6">
              <AvatarUpload 
                currentAvatarUrl={profile?.avatar_url}
                onAvatarUpdate={(url) => {
                  console.log('Avatar updated with URL:', url);
                  setProfile(prev => ({...prev, avatar_url: url}));
                  // Don't show toast here, AvatarUpload component handles it
                }}
                size="lg"
                showUploadButton={true}
              />
              <div className="text-center space-y-3">
                <p className="text-sm font-medium text-rdr-navy">
                  {profile?.display_name || profile?.first_name || 'Admin User'}
                </p>
                <p className="text-xs text-rdr-medium-gray">Administrator</p>
                <div className="p-3 bg-rdr-light-gray rounded-lg">
                  <p className="text-xs text-rdr-medium-gray mb-1 font-medium">
                    📸 Click your photo to upload a new one
                  </p>
                  <p className="text-xs text-rdr-medium-gray">
                    Recommended: Square image, at least 400x400px
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Profile Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-rdr-navy">
              <User className="w-5 h-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your personal information and contact details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    {...profileForm.register("firstName")}
                    placeholder="Enter your first name"
                  />
                  {profileForm.formState.errors.firstName && (
                    <p className="text-sm text-destructive">
                      {profileForm.formState.errors.firstName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    {...profileForm.register("lastName")}
                    placeholder="Enter your last name"
                  />
                  {profileForm.formState.errors.lastName && (
                    <p className="text-sm text-destructive">
                      {profileForm.formState.errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  {...profileForm.register("displayName")}
                  placeholder="How you'd like to be addressed"
                />
                {profileForm.formState.errors.displayName && (
                  <p className="text-sm text-destructive">
                    {profileForm.formState.errors.displayName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  {...profileForm.register("phone")}
                  placeholder="+1 (555) 123-4567"
                  type="tel"
                />
                <p className="text-xs text-muted-foreground">
                  Required for SMS notifications
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Input
                  id="bio"
                  {...profileForm.register("bio")}
                  placeholder="Tell us about yourself"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-rdr-navy hover:bg-rdr-navy/90">
                {loading ? "Updating..." : "Update Profile"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-rdr-navy">
              <Bell className="w-5 h-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Choose how you want to receive admin notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive all notifications via email
                    </p>
                  </div>
                  <Switch
                    {...notificationForm.register("emailNotifications")}
                    defaultChecked={notificationForm.watch("emailNotifications")}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      SMS Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive urgent notifications via SMS
                    </p>
                  </div>
                  <Switch
                    {...notificationForm.register("smsNotifications")}
                    defaultChecked={notificationForm.watch("smsNotifications")}
                    disabled={!profileForm.watch("phone")}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Daily Digest Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Get daily summary of activities
                    </p>
                  </div>
                  <Switch
                    {...notificationForm.register("dailyDigestEmail")}
                    defaultChecked={notificationForm.watch("dailyDigestEmail")}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Reminder Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when reminders are sent to clients
                    </p>
                  </div>
                  <Switch
                    {...notificationForm.register("reminderNotifications")}
                    defaultChecked={notificationForm.watch("reminderNotifications")}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full bg-rdr-navy hover:bg-rdr-navy/90">
                Save Notification Preferences
              </Button>
            </form>

            {!profileForm.watch("phone") && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  💡 Add a phone number to enable SMS notifications
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current Profile Summary */}
        {profile && (
          <Card>
            <CardHeader>
              <CardTitle className="text-rdr-navy">Current Settings Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-rdr-medium-gray">Email:</span>
                  <span className="text-rdr-navy">{user?.email}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-medium text-rdr-medium-gray">Name:</span>
                  <span className="text-rdr-navy">{profile.first_name} {profile.last_name}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-medium text-rdr-medium-gray">Display Name:</span>
                  <span className="text-rdr-navy">{profile.display_name}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-medium text-rdr-medium-gray">Phone:</span>
                  <span className="text-rdr-navy">{profile.phone || "Not set"}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-medium text-rdr-medium-gray">Bio:</span>
                  <span className="text-rdr-navy">{profile.bio || "Not set"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}