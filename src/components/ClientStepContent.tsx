import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, BarChart3, FileText, FolderPlus, MessageSquareText, Calendar, CheckCircle, ArrowRight, AlertCircle } from "lucide-react";

interface ClientStepContentProps {
  stepId: number;
  isCompleted: boolean;
  isLocked: boolean;
  onAction: () => void;
  children?: React.ReactNode;
}

const STEP_CONFIG = {
  1: {
    icon: ClipboardList,
    title: "Client Worksheet",
    description: "Tell us about yourself, your career history, and your goals.",
    completedTitle: "Client Worksheet Completed",
    completedDescription: "Thank you! We have your background information.",
    actionLabel: "Start Worksheet",
    updateLabel: "Update",
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/20"
  },
  2: {
    icon: BarChart3,
    title: "Metrics Worksheet",
    description: "Share your accomplishments with numbers - revenue, team sizes, cost savings, and measurable impacts.",
    completedTitle: "Metrics Worksheet Completed",
    completedDescription: "Great! Your achievements are recorded.",
    actionLabel: "Start Worksheet",
    updateLabel: "Update",
    color: "text-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-950/20"
  },
  3: {
    icon: FileText,
    title: "Resume(s)",
    description: "Upload your current resume(s) so we can review and improve them.",
    completedTitle: "Resume(s) Uploaded",
    completedDescription: "We've received your resume(s). Upload more if needed.",
    actionLabel: "Upload Resume",
    updateLabel: "Upload More",
    color: "text-green-500",
    bgColor: "bg-green-50 dark:bg-green-950/20"
  },
  4: {
    icon: FolderPlus,
    title: "Other Documents",
    description: "Upload supporting documents - job descriptions, cover letters, LinkedIn exports, etc.",
    completedTitle: "Documents Uploaded",
    completedDescription: "Documents received! Add more as needed.",
    actionLabel: "Upload",
    updateLabel: "Upload More",
    color: "text-orange-500",
    bgColor: "bg-orange-50 dark:bg-orange-950/20"
  },
  5: {
    icon: MessageSquareText,
    title: "Notes for Us",
    description: "Share any special requests or additional context to help us serve you better.",
    completedTitle: "Notes Submitted",
    completedDescription: "Your notes have been received.",
    actionLabel: "Add Notes",
    updateLabel: "Update Notes",
    color: "text-teal-500",
    bgColor: "bg-teal-50 dark:bg-teal-950/20"
  },
  6: {
    icon: Calendar,
    title: "Schedule Clarity Call",
    description: "Book a call with our team to discuss your career goals and document strategy.",
    completedTitle: "Clarity Call Booked!",
    completedDescription: "Your call is scheduled. Check your email for details.",
    actionLabel: "Book Call",
    updateLabel: "Reschedule",
    color: "text-indigo-500",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/20"
  }
};

export function ClientStepContent({ stepId, isCompleted, isLocked, onAction, children }: ClientStepContentProps) {
  const config = STEP_CONFIG[stepId as keyof typeof STEP_CONFIG];
  
  if (!config) return null;

  const Icon = config.icon;

  if (isLocked) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="max-w-md text-center">
          <CardContent className="pt-8 pb-6">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Step Locked</h3>
            <p className="text-muted-foreground text-sm">
              Please complete the previous steps to unlock this section.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Step Header */}
        <div className={`rounded-xl p-6 ${config.bgColor}`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-full bg-white dark:bg-background flex items-center justify-center shadow-sm`}>
              {isCompleted ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <Icon className={`h-6 w-6 ${config.color}`} />
              )}
            </div>
            <div className="flex-1">
              {isCompleted && (
                <Badge className="bg-green-500 text-white text-xs mb-2">
                  Completed
                </Badge>
              )}
              <h1 className="text-xl font-bold mb-1">
                {isCompleted ? config.completedTitle : config.title}
              </h1>
              <p className="text-muted-foreground text-sm">
                {isCompleted ? config.completedDescription : config.description}
              </p>
              
              {/* Action Button */}
              {(config.actionLabel || (isCompleted && config.updateLabel)) && (
                <Button 
                  onClick={onAction}
                  className="mt-4"
                  variant={isCompleted ? "outline" : "default"}
                >
                  {isCompleted ? config.updateLabel : config.actionLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Step-specific Content */}
        {children && (
          <Card>
            <CardContent className="p-6">
              {children}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
