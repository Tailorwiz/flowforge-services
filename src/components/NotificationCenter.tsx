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

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  client_id?: string;
  client_name?: string;
  is_read: boolean;
  is_rush: boolean;
  created_at: string;
  metadata?: any;
}

export function NotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [rushPriority, setRushPriority] = useState(true);
  const [digestTime, setDigestTime] = useState("08:00");
  const [reminderDelay, setReminderDelay] = useState(48);

  useEffect(() => {
    if (user) {
      initializeNotificationSystem();
      setupRealtimeSubscriptions();
    }
  }, [user]);

  const initializeNotificationSystem = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchNotifications(),
        fetchNotificationRules(),
        setupDefaultRules()
      ]);
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

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from("admin_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching notifications:", error);
      return;
    }

    setNotifications(data || []);
    setUnreadCount((data || []).filter(n => !n.is_read).length);
  };

  const fetchNotificationRules = async () => {
    const { data, error } = await supabase
      .from("notification_rules")
      .select("*")
      .eq("user_id", user?.id)
      .order("priority", { ascending: false });

    if (error) {
      console.error("Error fetching notification rules:", error);
      return;
    }

    setRules(data || []);
  };

  const setupDefaultRules = async () => {
    const defaultRules = [
      {
        rule_type: "file_upload",
        is_enabled: true,
        conditions: { event: "file_uploaded" },
        actions: { 
          notify_admin: true, 
          send_email: emailNotifications,
          send_sms: smsNotifications 
        },
        priority: 8
      },
      {
        rule_type: "message_received",
        is_enabled: true,
        conditions: { event: "message_received", unread: true },
        actions: { 
          notify_admin: true, 
          send_email: emailNotifications,
          priority_if_rush: rushPriority 
        },
        priority: 7
      },
      {
        rule_type: "daily_digest",
        is_enabled: true,
        conditions: { schedule: "daily", time: digestTime },
        actions: { 
          send_digest: true, 
          include_due_today: true,
          include_due_tomorrow: true,
          include_overdue: true 
        },
        priority: 5
      },
      {
        rule_type: "intake_reminder",
        is_enabled: true,
        conditions: { 
          delay_hours: reminderDelay,
          status: "intake_pending" 
        },
        actions: { 
          send_email: true, 
          send_sms: true,
          auto_reminder: true 
        },
        priority: 6
      },
      {
        rule_type: "rush_priority",
        is_enabled: rushPriority,
        conditions: { client_is_rush: true },
        actions: { 
          priority_notification: true,
          immediate_alert: true 
        },
        priority: 10
      }
    ];

    // Check if rules already exist for this user
    for (const rule of defaultRules) {
      const { data: existing } = await supabase
        .from("notification_rules")
        .select("id")
        .eq("user_id", user?.id)
        .eq("rule_type", rule.rule_type)
        .single();

      if (!existing) {
        await supabase
          .from("notification_rules")
          .insert({
            ...rule,
            user_id: user?.id
          });
      }
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Subscribe to client file uploads
    const fileUploadChannel = supabase
      .channel("file_uploads")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "client_history",
          filter: "action_type=eq.file_uploaded"
        },
        (payload) => {
          handleFileUploadNotification(payload.new);
        }
      )
      .subscribe();

    // Subscribe to client messages
    const messageChannel = supabase
      .channel("client_messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "client_history",
          filter: "action_type=eq.message_received"
        },
        (payload) => {
          handleMessageNotification(payload.new);
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
      supabase.removeChannel(fileUploadChannel);
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(clientChannel);
    };
  };

  const handleFileUploadNotification = async (historyRecord: any) => {
    try {
      // Get client info
      const { data: client } = await supabase
        .from("clients")
        .select("name, is_rush")
        .eq("id", historyRecord.client_id)
        .single();

      const notification = {
        type: "file_upload",
        title: "New File Uploaded",
        message: `${client?.name || 'A client'} uploaded a new file`,
        client_id: historyRecord.client_id,
        client_name: client?.name,
        is_rush: client?.is_rush || false,
        metadata: {
          file_name: historyRecord.metadata?.fileName,
          upload_time: historyRecord.created_at
        }
      };

      await createNotification(notification);
      
      // Show toast for immediate feedback
      toast({
        title: client?.is_rush ? "🚨 RUSH: New File Upload" : "📁 New File Upload",
        description: `${client?.name} uploaded: ${historyRecord.metadata?.fileName || 'a file'}`,
        duration: client?.is_rush ? 10000 : 5000
      });

    } catch (error) {
      console.error("Error handling file upload notification:", error);
    }
  };

  const handleMessageNotification = async (historyRecord: any) => {
    try {
      const { data: client } = await supabase
        .from("clients")
        .select("name, is_rush")
        .eq("id", historyRecord.client_id)
        .single();

      const notification = {
        type: "message_received",
        title: "New Client Message",
        message: `${client?.name || 'A client'} sent you a message`,
        client_id: historyRecord.client_id,
        client_name: client?.name,
        is_rush: client?.is_rush || false,
        metadata: {
          message_preview: historyRecord.description.substring(0, 100),
          received_time: historyRecord.created_at
        }
      };

      await createNotification(notification);

      toast({
        title: client?.is_rush ? "🚨 RUSH: New Message" : "💬 New Message",
        description: `${client?.name}: ${historyRecord.description.substring(0, 50)}...`,
        duration: client?.is_rush ? 10000 : 5000
      });

    } catch (error) {
      console.error("Error handling message notification:", error);
    }
  };

  const scheduleIntakeReminder = async (client: any) => {
    // Schedule automated reminder for intake completion
    const reminderTime = new Date();
    reminderTime.setHours(reminderTime.getHours() + reminderDelay);

    try {
      await supabase.functions.invoke("schedule-intake-reminder", {
        body: {
          clientId: client.id,
          clientName: client.name,
          clientEmail: client.email,
          reminderTime: reminderTime.toISOString(),
          isRush: client.is_rush
        }
      });

      console.log(`Intake reminder scheduled for ${client.name} at ${reminderTime}`);
    } catch (error) {
      console.error("Error scheduling intake reminder:", error);
    }
  };

  const createNotification = async (notification: Omit<Notification, 'id' | 'is_read' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from("admin_notifications")
        .insert({
          ...notification,
          user_id: user?.id,
          is_read: false
        })
        .select()
        .single();

      if (error) throw error;

      setNotifications(prev => [data, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Send email/SMS if enabled
      if (emailNotifications || (smsNotifications && notification.is_rush)) {
        await supabase.functions.invoke("send-admin-notification", {
          body: {
            notification: data,
            preferences: {
              email: emailNotifications,
              sms: smsNotifications && notification.is_rush,
              rush_priority: rushPriority
            }
          }
        });
      }

    } catch (error) {
      console.error("Error creating notification:", error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from("admin_notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const updateNotificationRule = async (ruleType: string, updates: Partial<NotificationRule>) => {
    try {
      await supabase
        .from("notification_rules")
        .update(updates)
        .eq("user_id", user?.id)
        .eq("rule_type", ruleType);

      setRules(prev => 
        prev.map(rule => 
          rule.rule_type === ruleType ? { ...rule, ...updates } : rule
        )
      );

      toast({
        title: "Settings Updated",
        description: "Notification preferences saved successfully"
      });

    } catch (error) {
      console.error("Error updating notification rule:", error);
      toast({
        title: "Error",
        description: "Failed to update notification settings",
        variant: "destructive"
      });
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
            {unreadCount} unread
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
                  checked={rules.find(r => r.rule_type === 'file_upload')?.is_enabled || false}
                  onCheckedChange={(checked) => 
                    updateNotificationRule('file_upload', { is_enabled: checked })
                  }
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
                  checked={rules.find(r => r.rule_type === 'message_received')?.is_enabled || false}
                  onCheckedChange={(checked) => 
                    updateNotificationRule('message_received', { is_enabled: checked })
                  }
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
                  checked={rules.find(r => r.rule_type === 'daily_digest')?.is_enabled || false}
                  onCheckedChange={(checked) => 
                    updateNotificationRule('daily_digest', { is_enabled: checked })
                  }
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
                  checked={rules.find(r => r.rule_type === 'intake_reminder')?.is_enabled || false}
                  onCheckedChange={(checked) => 
                    updateNotificationRule('intake_reminder', { is_enabled: checked })
                  }
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

      {/* Recent Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No notifications yet. They'll appear here when clients interact with your portal.
              </p>
            ) : (
              notifications.slice(0, 10).map((notification) => (
                <div 
                  key={notification.id}
                  className={`p-4 rounded-lg border ${
                    notification.is_read ? 'bg-muted/50' : 'bg-background'
                  } ${notification.is_rush ? 'border-red-200 bg-red-50/50' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {notification.type === 'file_upload' && <FileUp className="w-4 h-4" />}
                        {notification.type === 'message_received' && <MessageSquare className="w-4 h-4" />}
                        <p className="font-medium">
                          {notification.is_rush && "🚨 "}{notification.title}
                        </p>
                        {!notification.is_read && (
                          <Badge variant="secondary" className="text-xs">New</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => markAsRead(notification.id)}
                      >
                        Mark Read
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}