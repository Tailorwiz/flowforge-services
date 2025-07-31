import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { 
  Plus, 
  Clock, 
  Mail, 
  Settings, 
  Calendar,
  AlertCircle,
  CheckCircle,
  Edit,
  Trash2,
  Send
} from "lucide-react";

interface ReminderTemplate {
  id: string;
  name: string;
  subject_template: string;
  message_template: string;
  trigger_type: string;
  delay_hours: number;
  is_active: boolean;
}

interface ScheduledReminder {
  id: string;
  client_id: string;
  template_id: string;
  scheduled_for: string;
  sent_at: string | null;
  status: string;
  reminder_data: any;
  clients: {
    name: string;
    email: string;
  };
  reminder_templates: {
    name: string;
    subject_template: string;
  };
}

interface DigestPreferences {
  enabled: boolean;
  send_time: string;
  timezone: string;
  include_due_today: boolean;
  include_due_tomorrow: boolean;
  include_overdue: boolean;
  include_new_uploads: boolean;
}

export function ReminderManager() {
  const [templates, setTemplates] = useState<ReminderTemplate[]>([]);
  const [scheduledReminders, setScheduledReminders] = useState<ScheduledReminder[]>([]);
  const [digestPrefs, setDigestPrefs] = useState<DigestPreferences>({
    enabled: true,
    send_time: "08:00",
    timezone: "UTC",
    include_due_today: true,
    include_due_tomorrow: true,
    include_overdue: true,
    include_new_uploads: true
  });
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReminderTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    subject_template: "",
    message_template: "",
    trigger_type: "custom",
    delay_hours: 24
  });

  useEffect(() => {
    fetchTemplates();
    fetchScheduledReminders();
    fetchDigestPreferences();
  }, []);

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from("reminder_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching templates:", error);
    } else {
      setTemplates(data || []);
    }
  };

  const fetchScheduledReminders = async () => {
    const { data, error } = await supabase
      .from("scheduled_reminders")
      .select("*")
      .order("scheduled_for", { ascending: true })
      .limit(50);

    if (error) {
      console.error("Error fetching scheduled reminders:", error);
    } else {
      // For now, we'll mock the client and template data since foreign keys aren't set up yet
      const enrichedData = (data || []).map(reminder => ({
        ...reminder,
        clients: { name: "Sample Client", email: "sample@email.com" },
        reminder_templates: { name: "Sample Template", subject_template: "Sample Subject" }
      }));
      setScheduledReminders(enrichedData);
    }
  };

  const fetchDigestPreferences = async () => {
    const { data, error } = await supabase
      .from("daily_digest_preferences")
      .select("*")
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error("Error fetching digest preferences:", error);
    } else if (data) {
      setDigestPrefs({
        enabled: data.enabled,
        send_time: data.send_time,
        timezone: data.timezone,
        include_due_today: data.include_due_today,
        include_due_tomorrow: data.include_due_tomorrow,
        include_overdue: data.include_overdue,
        include_new_uploads: data.include_new_uploads
      });
    }
  };

  const saveTemplate = async () => {
    if (!newTemplate.name || !newTemplate.subject_template || !newTemplate.message_template) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("reminder_templates")
      .insert([newTemplate]);

    if (error) {
      toast({ title: "Error", description: "Failed to save template", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Reminder template saved" });
      setNewTemplate({
        name: "",
        subject_template: "",
        message_template: "",
        trigger_type: "custom",
        delay_hours: 24
      });
      setIsCreating(false);
      fetchTemplates();
    }
  };

  const updateTemplate = async () => {
    if (!editingTemplate) return;

    const { error } = await supabase
      .from("reminder_templates")
      .update({
        name: editingTemplate.name,
        subject_template: editingTemplate.subject_template,
        message_template: editingTemplate.message_template,
        trigger_type: editingTemplate.trigger_type,
        delay_hours: editingTemplate.delay_hours,
        is_active: editingTemplate.is_active
      })
      .eq("id", editingTemplate.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update template", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Template updated" });
      setEditingTemplate(null);
      fetchTemplates();
    }
  };

  const deleteTemplate = async (templateId: string) => {
    const { error } = await supabase
      .from("reminder_templates")
      .delete()
      .eq("id", templateId);

    if (error) {
      toast({ title: "Error", description: "Failed to delete template", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Template deleted" });
      fetchTemplates();
    }
  };

  const saveDigestPreferences = async () => {
    const { error } = await supabase
      .from("daily_digest_preferences")
      .upsert({
        user_id: "00000000-0000-0000-0000-000000000000", // Replace with actual user ID
        ...digestPrefs
      });

    if (error) {
      toast({ title: "Error", description: "Failed to save preferences", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Daily digest preferences saved" });
    }
  };

  const sendTestReminder = async (templateId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-reminder', {
        body: {
          templateId,
          clientEmail: "test@example.com",
          clientName: "Test Client",
          customData: { delivery_date: "2025-02-01" }
        }
      });

      if (error) throw error;

      toast({ title: "Success", description: "Test reminder sent" });
    } catch (error) {
      console.error("Error sending test reminder:", error);
      toast({ title: "Error", description: "Failed to send test reminder", variant: "destructive" });
    }
  };

  const triggerDailyDigest = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('send-daily-digest', {
        body: { force: true }
      });

      if (error) throw error;

      toast({ title: "Success", description: "Daily digest sent" });
    } catch (error) {
      console.error("Error sending daily digest:", error);
      toast({ title: "Error", description: "Failed to send daily digest", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent': return <Badge variant="default">Sent</Badge>;
      case 'pending': return <Badge variant="secondary">Pending</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
      case 'cancelled': return <Badge variant="outline">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTriggerTypeBadge = (triggerType: string) => {
    const colors: Record<string, string> = {
      'intake_form_pending': 'bg-orange-100 text-orange-800',
      'review_not_scheduled': 'bg-blue-100 text-blue-800',
      'awaiting_notes': 'bg-purple-100 text-purple-800',
      'project_due_soon': 'bg-red-100 text-red-800',
      'custom': 'bg-gray-100 text-gray-800'
    };

    return (
      <Badge variant="outline" className={colors[triggerType] || colors.custom}>
        {triggerType.replace(/_/g, ' ').toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">RDR Project Portal - Reminder & Automation System</h2>
        <div className="flex gap-2">
          <Button onClick={triggerDailyDigest} variant="outline">
            <Mail className="w-4 h-4 mr-2" />
            Send Test Digest
          </Button>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="digest">Daily Digest</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <div className="grid gap-4">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">{template.name}</h3>
                      <div className="flex items-center gap-2 mb-2">
                        {getTriggerTypeBadge(template.trigger_type)}
                        <Badge variant={template.is_active ? "default" : "secondary"}>
                          {template.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Delay: {template.delay_hours}h
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendTestReminder(template.id)}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingTemplate(template)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteTemplate(template.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-sm font-medium">Subject:</Label>
                      <p className="text-sm text-muted-foreground">{template.subject_template}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Message:</Label>
                      <p className="text-sm text-muted-foreground">{template.message_template}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Scheduled Tab */}
        <TabsContent value="scheduled">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Reminders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {scheduledReminders.map((reminder) => (
                  <div key={reminder.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{reminder.clients.name}</h4>
                        {getStatusBadge(reminder.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {reminder.reminder_templates.name} - {reminder.reminder_templates.subject_template}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Scheduled: {new Date(reminder.scheduled_for).toLocaleString()}
                        {reminder.sent_at && ` | Sent: ${new Date(reminder.sent_at).toLocaleString()}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        {new Date(reminder.scheduled_for) > new Date() ? 'Pending' : 'Past due'}
                      </span>
                    </div>
                  </div>
                ))}
                {scheduledReminders.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No scheduled reminders</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Daily Digest Tab */}
        <TabsContent value="digest">
          <Card>
            <CardHeader>
              <CardTitle>Daily Digest Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Enable Daily Digest</Label>
                <Switch
                  checked={digestPrefs.enabled}
                  onCheckedChange={(checked) => setDigestPrefs({ ...digestPrefs, enabled: checked })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Send Time</Label>
                  <Input
                    type="time"
                    value={digestPrefs.send_time}
                    onChange={(e) => setDigestPrefs({ ...digestPrefs, send_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Timezone</Label>
                  <Select value={digestPrefs.timezone} onValueChange={(value) => setDigestPrefs({ ...digestPrefs, timezone: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern</SelectItem>
                      <SelectItem value="America/Chicago">Central</SelectItem>
                      <SelectItem value="America/Denver">Mountain</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Include in Digest:</Label>
                <div className="space-y-2">
                  {[
                    { key: 'include_due_today', label: 'Due Today' },
                    { key: 'include_due_tomorrow', label: 'Due Tomorrow' },
                    { key: 'include_overdue', label: 'Overdue Items' },
                    { key: 'include_new_uploads', label: 'New Uploads' }
                  ].map((item) => (
                    <div key={item.key} className="flex items-center space-x-2">
                      <Switch
                        checked={digestPrefs[item.key as keyof DigestPreferences] as boolean}
                        onCheckedChange={(checked) => setDigestPrefs({ ...digestPrefs, [item.key]: checked })}
                      />
                      <Label>{item.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={saveDigestPreferences}>
                <Settings className="w-4 h-4 mr-2" />
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation">
          <Card>
            <CardHeader>
              <CardTitle>Automation Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Automatic Reminder Triggers</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• <strong>Intake Form Pending:</strong> Sent 24h after client onboarding if form not completed</li>
                    <li>• <strong>Review Not Scheduled:</strong> Sent 48h after project start if no review session booked</li>
                    <li>• <strong>Awaiting Notes:</strong> Sent 72h after sending materials for review</li>
                    <li>• <strong>Project Due Soon:</strong> Sent 24h before delivery date</li>
                  </ul>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Template Variables Available</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span><code>{"{{client_name}}"}</code> - Client's full name</span>
                    <span><code>{"{{client_email}}"}</code> - Client's email</span>
                    <span><code>{"{{service_name}}"}</code> - Service type name</span>
                    <span><code>{"{{delivery_date}}"}</code> - Estimated delivery date</span>
                    <span><code>{"{{project_status}}"}</code> - Current project status</span>
                    <span><code>{"{{days_remaining}}"}</code> - Days until delivery</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Template Modal */}
      {isCreating && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Create New Reminder Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Template Name</Label>
              <Input
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                placeholder="e.g., Follow-up Reminder"
              />
            </div>

            <div>
              <Label>Trigger Type</Label>
              <Select value={newTemplate.trigger_type} onValueChange={(value) => setNewTemplate({ ...newTemplate, trigger_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="intake_form_pending">Intake Form Pending</SelectItem>
                  <SelectItem value="review_not_scheduled">Review Not Scheduled</SelectItem>
                  <SelectItem value="awaiting_notes">Awaiting Notes</SelectItem>
                  <SelectItem value="project_due_soon">Project Due Soon</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Delay (Hours)</Label>
              <Input
                type="number"
                value={newTemplate.delay_hours}
                onChange={(e) => setNewTemplate({ ...newTemplate, delay_hours: parseInt(e.target.value) })}
                min="1"
              />
            </div>

            <div>
              <Label>Subject Template</Label>
              <Input
                value={newTemplate.subject_template}
                onChange={(e) => setNewTemplate({ ...newTemplate, subject_template: e.target.value })}
                placeholder="e.g., Hi {{client_name}}, we need your input"
              />
            </div>

            <div>
              <Label>Message Template</Label>
              <Textarea
                value={newTemplate.message_template}
                onChange={(e) => setNewTemplate({ ...newTemplate, message_template: e.target.value })}
                placeholder="Use {{client_name}}, {{delivery_date}}, etc. for personalization"
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={saveTemplate}>Create Template</Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Template Modal */}
      {editingTemplate && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Edit Template: {editingTemplate.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Template Name</Label>
              <Input
                value={editingTemplate.name}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={editingTemplate.is_active}
                onCheckedChange={(checked) => setEditingTemplate({ ...editingTemplate, is_active: checked })}
              />
              <Label>Active</Label>
            </div>

            <div>
              <Label>Subject Template</Label>
              <Input
                value={editingTemplate.subject_template}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, subject_template: e.target.value })}
              />
            </div>

            <div>
              <Label>Message Template</Label>
              <Textarea
                value={editingTemplate.message_template}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, message_template: e.target.value })}
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={updateTemplate}>Update Template</Button>
              <Button variant="outline" onClick={() => setEditingTemplate(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}