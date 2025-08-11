import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Clock, Mail, Settings } from 'lucide-react';

interface DigestPreferences {
  id?: string;
  enabled: boolean;
  send_time: string;
  timezone: string;
  recipient_email: string;
  include_due_today: boolean;
  include_due_tomorrow: boolean;
  include_overdue: boolean;
  include_new_uploads: boolean;
  include_appointments: boolean;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

export const DailyDigestSettings = () => {
  const [preferences, setPreferences] = useState<DigestPreferences>({
    enabled: true,
    send_time: '08:00:00',
    timezone: 'America/New_York',
    recipient_email: 'admin@resultsdrivenresumes.com',
    include_due_today: true,
    include_due_tomorrow: true,
    include_overdue: true,
    include_new_uploads: true,
    include_appointments: true,
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_digest_preferences')
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('Error fetching preferences:', error);
        return;
      }

      if (data) {
        setPreferences({
          enabled: data.enabled ?? preferences.enabled,
          send_time: data.send_time ?? preferences.send_time,
          timezone: data.timezone ?? preferences.timezone,
          recipient_email: data.recipient_email ?? preferences.recipient_email,
          include_due_today: data.include_due_today ?? preferences.include_due_today,
          include_due_tomorrow: data.include_due_tomorrow ?? preferences.include_due_tomorrow,
          include_overdue: data.include_overdue ?? preferences.include_overdue,
          include_new_uploads: data.include_new_uploads ?? preferences.include_new_uploads,
          include_appointments: data.include_appointments ?? preferences.include_appointments,
          id: data.id,
          created_at: data.created_at,
          updated_at: data.updated_at,
          user_id: data.user_id,
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Only include the fields that are in the database
      const updateData = {
        user_id: user.id,
        enabled: preferences.enabled,
        send_time: preferences.send_time,
        timezone: preferences.timezone,
        recipient_email: preferences.recipient_email,
        include_due_today: preferences.include_due_today,
        include_due_tomorrow: preferences.include_due_tomorrow,
        include_overdue: preferences.include_overdue,
        include_new_uploads: preferences.include_new_uploads,
        include_appointments: preferences.include_appointments,
      };
      
      const { data, error } = await supabase
        .from('daily_digest_preferences')
        .upsert(updateData)
        .select()
        .single();

      if (error) throw error;

      // Update state with the returned data
      setPreferences(prev => ({ ...prev, ...data }));
      toast({
        title: "Settings saved",
        description: "Daily digest preferences have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const sendTestDigest = async () => {
    setTestSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-daily-digest', {
        body: { 
          force: true,
          userEmail: preferences.recipient_email 
        }
      });

      if (error) throw error;

      toast({
        title: "Test email sent",
        description: `A test daily digest has been sent to ${preferences.recipient_email}`,
      });
    } catch (error) {
      console.error('Error sending test digest:', error);
      toast({
        title: "Error",
        description: "Failed to send test digest. Please try again.",
        variant: "destructive",
      });
    } finally {
      setTestSending(false);
    }
  };

  const timezones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Phoenix',
    'Pacific/Honolulu',
    'UTC',
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Daily Digest Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="enabled">Enable Daily Digest</Label>
            <p className="text-sm text-muted-foreground">
              Send automated daily digest emails
            </p>
          </div>
          <Switch
            id="enabled"
            checked={preferences.enabled}
            onCheckedChange={(checked) => 
              setPreferences(prev => ({ ...prev, enabled: checked }))
            }
          />
        </div>

        {preferences.enabled && (
          <>
            {/* Email Settings */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4" />
                <Label className="text-base font-medium">Email Settings</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="recipient_email">Recipient Email</Label>
                <Input
                  id="recipient_email"
                  type="email"
                  value={preferences.recipient_email}
                  onChange={(e) => 
                    setPreferences(prev => ({ ...prev, recipient_email: e.target.value }))
                  }
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            {/* Schedule Settings */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4" />
                <Label className="text-base font-medium">Schedule Settings</Label>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="send_time">Send Time</Label>
                  <Input
                    id="send_time"
                    type="time"
                    value={preferences.send_time}
                    onChange={(e) => 
                      setPreferences(prev => ({ ...prev, send_time: e.target.value }))
                    }
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={preferences.timezone}
                    onValueChange={(value) => 
                      setPreferences(prev => ({ ...prev, timezone: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Content Settings */}
            <div className="space-y-4 pt-4 border-t">
              <Label className="text-base font-medium">Include in Digest</Label>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="include_overdue">Overdue Items</Label>
                  <Switch
                    id="include_overdue"
                    checked={preferences.include_overdue}
                    onCheckedChange={(checked) => 
                      setPreferences(prev => ({ ...prev, include_overdue: checked }))
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="include_due_today">Due Today</Label>
                  <Switch
                    id="include_due_today"
                    checked={preferences.include_due_today}
                    onCheckedChange={(checked) => 
                      setPreferences(prev => ({ ...prev, include_due_today: checked }))
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="include_due_tomorrow">Due Tomorrow</Label>
                  <Switch
                    id="include_due_tomorrow"
                    checked={preferences.include_due_tomorrow}
                    onCheckedChange={(checked) => 
                      setPreferences(prev => ({ ...prev, include_due_tomorrow: checked }))
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="include_new_uploads">New Uploads</Label>
                  <Switch
                    id="include_new_uploads"
                    checked={preferences.include_new_uploads}
                    onCheckedChange={(checked) => 
                      setPreferences(prev => ({ ...prev, include_new_uploads: checked }))
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="include_appointments">Upcoming Appointments</Label>
                  <Switch
                    id="include_appointments"
                    checked={preferences.include_appointments}
                    onCheckedChange={(checked) => 
                      setPreferences(prev => ({ ...prev, include_appointments: checked }))
                    }
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={savePreferences} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Settings
          </Button>
          
          {preferences.enabled && (
            <Button 
              variant="outline" 
              onClick={sendTestDigest} 
              disabled={testSending}
            >
              {testSending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send Test Email
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};