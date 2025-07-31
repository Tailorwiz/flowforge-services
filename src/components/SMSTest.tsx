import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export function SMSTest() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("Hello! This is a test message from your RDR system.");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const sendTestSMS = async () => {
    if (!phoneNumber || !message) {
      toast({
        title: "Missing information",
        description: "Please enter both phone number and message",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: phoneNumber,
          message: message,
        },
      });

      if (error) throw error;

      toast({
        title: "SMS sent successfully!",
        description: `Test message sent to ${phoneNumber}`,
      });
      
      console.log("SMS sent:", data);
    } catch (error) {
      console.error("Error sending SMS:", error);
      toast({
        title: "Failed to send SMS",
        description: error.message || "An error occurred while sending the message",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Test SMS</CardTitle>
        <CardDescription>
          Send a test SMS to verify your Twilio integration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+1234567890"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Include country code (e.g., +1 for US)
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            placeholder="Enter your test message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
        </div>
        
        <Button 
          onClick={sendTestSMS} 
          disabled={loading || !phoneNumber || !message}
          className="w-full"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send Test SMS
        </Button>
      </CardContent>
    </Card>
  );
}