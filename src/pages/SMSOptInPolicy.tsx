import { ArrowLeft, Mail, Phone, Shield, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import RDRLogo from "@/components/RDRLogo";

const SMSOptInPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <RDRLogo />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Title Section */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              SMS Consent & Opt-In Policy
            </h1>
            <p className="text-muted-foreground">
              Twilio Compliance for RDR Project Portal
            </p>
          </div>

          {/* Purpose Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Purpose
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                The RDR Project Portal uses Twilio to send SMS messages to communicate with clients regarding resume writing services, career coaching updates, onboarding progress, appointment reminders, and important account-related information.
              </p>
            </CardContent>
          </Card>

          {/* Opt-In Language Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Opt-In Language
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                By entering your phone number and checking the opt-in box during signup, you consent to receive SMS messages from Results Driven Resumes related to the RDR Project Portal. Message frequency varies based on your service plan and activity.
              </p>
            </CardContent>
          </Card>

          {/* Message Types Card */}
          <Card>
            <CardHeader>
              <CardTitle>Message Types Include</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  Appointment confirmations and reminders
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  Onboarding instructions and next-step alerts
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  Project updates and milestone notifications
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  Document upload confirmations
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  Coaching session scheduling
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  Payment reminders and invoices
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Message & Data Rates Card */}
          <Card>
            <CardHeader>
              <CardTitle>Message & Data Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Standard message and data rates may apply depending on your mobile plan.
              </p>
            </CardContent>
          </Card>

          {/* Opt-Out Card */}
          <Card>
            <CardHeader>
              <CardTitle>How to Opt-Out</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                You can reply <strong>"STOP"</strong> to any SMS message at any time to opt out of all future messaging. You may also contact us directly to remove your number from our system.
              </p>
            </CardContent>
          </Card>

          {/* Support/Help Card */}
          <Card>
            <CardHeader>
              <CardTitle>Support/Help</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-muted-foreground">
                  Reply <strong>"HELP"</strong> to any message to receive support instructions or contact us at:
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>support@resultsdrivenresumes.com</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>(Business phone number)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Privacy Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Privacy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We do not sell or share your phone number or personal information. All data is protected in accordance with our Privacy Policy and is used strictly for client communication within the RDR Project Portal system.
              </p>
            </CardContent>
          </Card>

          {/* Footer Actions */}
          <div className="text-center pt-6">
            <Button onClick={() => navigate("/")} className="min-w-32">
              Go Back
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SMSOptInPolicy;