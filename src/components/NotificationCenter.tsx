import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { 
  Bell, 
  BellRing, 
  FileUp, 
  MessageSquare, 
  Calendar, 
  AlertTriangle,
  Clock,
  Settings,
  Smartphone,
  Mail,
  Zap
} from "lucide-react";

interface NotificationRule {
  id: string;
  rule_type: string;
  is_enabled: boolean;
  conditions: any;
  actions: any;
  priority: number;
}

interface ClientActivity {
  id: string;
  action_type: string;
  description: string;
  client_id: string;
  created_at: string;
  metadata?: any;
  clients?: {
    name: string;
    email: string;
    is_rush: boolean;
  };
}

export function NotificationCenter() {
  const { user } = useAuth();
  const [recentActivities, setRecentActivities] = useState<ClientActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Notification preferences (will be stored in database later)
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [rushPriority, setRushPriority] = useState(true);
  const [digestTime, setDigestTime] = useState("08:00");
  const [reminderDelay, setReminderDelay] = useState(48);
  const [fileUploadAlerts, setFileUploadAlerts] = useState(true);
  const [messageAlerts, setMessageAlerts] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);
  const [intakeReminders, setIntakeReminders] = useState(true);

  useEffect(() => {
    if (user) {
      initializeNotificationSystem();
      setupRealtimeSubscriptions();
    }
  }, [user]);

  const initializeNotificationSystem = async () => {
    try {
      setLoading(true);
      await fetchRecentActivities();
    } catch (error) {
      console.error("Error initializing notification system:", error);
      toast({
        title: "Error",
        description: "Failed to initialize notification system",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const { data, error } = await supabase
        .from("client_history")
        .select(`
          *,
          clients (
            name,
            email,
            is_rush
          )
        `)
        .in("action_type", ["file_uploaded", "message_received", "client_created_via_upload", "onboarding_triggered"])
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error fetching activities:", error);
        return;
      }

      setRecentActivities(data || []);
      // Count unread activities from last 24 hours
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      const recentCount = (data || []).filter(activity => 
        new Date(activity.created_at) > oneDayAgo
      ).length;
      setUnreadCount(recentCount);

    } catch (error) {
      console.error("Error fetching recent activities:", error);
    }
  };

  const setupRealtimeSubscriptions = () => {
    console.log("Setting up real-time subscriptions...");

    // Subscribe to client file uploads and activities
    const activitiesChannel = supabase
      .channel("client_activities")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "client_history"
        },
        (payload) => {
          handleNewActivity(payload.new);
        }
      )
      .subscribe();

    // Subscribe to new clients for intake tracking
    const clientChannel = supabase
      .channel("new_clients")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "clients"
        },
        (payload) => {
          scheduleIntakeReminder(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(activitiesChannel);
      supabase.removeChannel(clientChannel);
    };
  };

  const handleNewActivity = async (activity: any) => {
    try {
      // Get client info if not included
      let clientData = null;
      if (activity.client_id) {
        const { data: client } = await supabase
          .from("clients")
          .select("name, email, is_rush")
          .eq("id", activity.client_id)
          .single();
        clientData = client;
      }

      const activityWithClient = {
        ...activity,
        clients: clientData
      };

      // Add to recent activities
      setRecentActivities(prev => [activityWithClient, ...prev.slice(0, 19)]);
      setUnreadCount(prev => prev + 1);

      // Show notification based on activity type
      if (activity.action_type === "file_uploaded" && fileUploadAlerts) {
        toast({
          title: clientData?.is_rush ? "🚨 RUSH: New File Upload" : "📁 New File Upload",
          description: `${clientData?.name || 'A client'} uploaded a file`,
          duration: clientData?.is_rush ? 10000 : 5000
        });
      } else if (activity.action_type === "message_received" && messageAlerts) {
        toast({
          title: clientData?.is_rush ? "🚨 RUSH: New Message" : "💬 New Message",
          description: `${clientData?.name || 'A client'} sent you a message`,
          duration: clientData?.is_rush ? 10000 : 5000
        });
      }

      // Send email/SMS if enabled and for rush clients
      if ((emailNotifications || (smsNotifications && clientData?.is_rush)) && activity.action_type !== "onboarding_triggered") {
        await sendAdminNotification(activity, clientData);
      }

    } catch (error) {
      console.error("Error handling new activity:", error);
    }
  };

  const scheduleIntakeReminder = async (client: any) => {
    if (!intakeReminders) return;

    console.log(`Scheduling intake reminder for ${client.name} in ${reminderDelay} hours`);
    
    // This would typically call an edge function to schedule the reminder
    try {
      await supabase.functions.invoke("schedule-intake-reminder", {
        body: {
          clientId: client.id,
          clientName: client.name,
          clientEmail: client.email,
          delayHours: reminderDelay,
          isRush: client.is_rush
        }
      });
    } catch (error) {
      console.error("Error scheduling intake reminder:", error);
    }
  };

  const sendAdminNotification = async (activity: any, client: any) => {
    try {
      await supabase.functions.invoke("send-admin-notification", {
        body: {
          activity,
          client,
          preferences: {
            email: emailNotifications,
            sms: smsNotifications && client?.is_rush,
            rush_priority: rushPriority
          }
        }
      });
    } catch (error) {
      console.error("Error sending admin notification:", error);
    }
  };

  const triggerTestDigest = async () => {
    try {
      await supabase.functions.invoke("send-daily-digest", {
        body: {
          userEmail: user?.email,
          testMode: true
        }
      });

      toast({
        title: "Test Digest Sent",
        description: "Check your email for the daily digest"
      });
    } catch (error) {
      console.error("Error sending test digest:", error);
      toast({
        title: "Error",
        description: "Failed to send test digest",
        variant: "destructive"
      });
    }
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case "file_uploaded":
        return <FileUp className="w-4 h-4" />;
      case "message_received":
        return <MessageSquare className="w-4 h-4" />;
      case "client_created_via_upload":
        return <FileUp className="w-4 h-4" />;
      case "onboarding_triggered":
        return <Bell className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getActivityTitle = (activity: ClientActivity) => {
    switch (activity.action_type) {
      case "file_uploaded":
        return "File Uploaded";
      case "message_received":
        return "Message Received";
      case "client_created_via_upload":
        return "New Client Added";
      case "onboarding_triggered":
        return "Onboarding Started";
      default:
        return "Client Activity";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading notification center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">RDR Project Portal - Notification Center</h2>
          <p className="text-muted-foreground">
            Manage your alerts and stay informed about client activities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={unreadCount > 0 ? "destructive" : "secondary"}>
            <Bell className="w-4 h-4 mr-1" />
            {unreadCount} recent
          </Badge>
        </div>
      </div>

      {/* Notification Rules */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Notification Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Upload Alerts */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <FileUp className="w-4 h-4" />
                  File Upload Alerts
                </Label>
                <Switch
                  checked={fileUploadAlerts}
                  onCheckedChange={setFileUploadAlerts}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Get notified when clients upload new files
              </p>
            </div>

            <Separator />

            {/* Message Alerts */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Unread Message Alerts
                </Label>
                <Switch
                  checked={messageAlerts}
                  onCheckedChange={setMessageAlerts}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Alert when clients send messages you haven't opened
              </p>
            </div>

            <Separator />

            {/* Daily Digest */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Morning Digest
                </Label>
                <Switch
                  checked={dailyDigest}
                  onCheckedChange={setDailyDigest}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Send at:</Label>
                <Input
                  type="time"
                  value={digestTime}
                  onChange={(e) => setDigestTime(e.target.value)}
                  className="w-24"
                />
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={triggerTestDigest}
                >
                  Test
                </Button>
              </div>
            </div>

            <Separator />

            {/* Auto Reminders */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Auto-Intake Reminders
                </Label>
                <Switch
                  checked={intakeReminders}
                  onCheckedChange={setIntakeReminders}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Remind after:</Label>
                <Input
                  type="number"
                  value={reminderDelay}
                  onChange={(e) => setReminderDelay(Number(e.target.value))}
                  className="w-20"
                  min="1"
                  max="168"
                />
                <span className="text-sm">hours</span>
              </div>
            </div>

            <Separator />

            {/* RUSH Priority */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-red-500" />
                  RUSH Priority Alerts
                </Label>
                <Switch
                  checked={rushPriority}
                  onCheckedChange={setRushPriority}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Prioritize all notifications from RUSH clients
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="w-5 h-5" />
              Delivery Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Notifications
                </Label>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Receive notifications via email
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  SMS for RUSH Clients
                </Label>
                <Switch
                  checked={smsNotifications}
                  onCheckedChange={setSmsNotifications}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Get SMS alerts for urgent RUSH client activities
              </p>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">💡 Pro Tips</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• RUSH clients get priority notifications</li>
                <li>• Auto-reminders help with client follow-up</li>
                <li>• Morning digest keeps you organized</li>
                <li>• Test your settings to ensure delivery</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Client Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivities.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No recent activities. They'll appear here when clients interact with your portal.
              </p>
            ) : (
              recentActivities.map((activity) => (
                <div 
                  key={activity.id}
                  className={`p-4 rounded-lg border ${
                    activity.clients?.is_rush ? 'border-red-200 bg-red-50/50' : 'bg-background'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getActivityIcon(activity.action_type)}
                        <p className="font-medium">
                          {activity.clients?.is_rush && "🚨 "}{getActivityTitle(activity)}
                        </p>
                        {new Date(activity.created_at) > new Date(Date.now() - 24*60*60*1000) && (
                          <Badge variant="secondary" className="text-xs">New</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {activity.clients?.name ? `${activity.clients.name}: ` : ""}{activity.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Implementation Note */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Notification System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>🔔 Real-time file upload alerts</span>
              <Badge variant="outline" className="text-green-600">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>📧 Daily digest system</span>
              <Badge variant="outline" className="text-green-600">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>🚨 RUSH priority system</span>
              <Badge variant="outline" className="text-green-600">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>⏰ Auto-intake reminders</span>
              <Badge variant="outline" className="text-amber-600">Requires edge function</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>📱 SMS notifications</span>
              <Badge variant="outline" className="text-amber-600">Requires edge function</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}