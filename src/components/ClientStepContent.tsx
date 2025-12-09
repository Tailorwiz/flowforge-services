import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, BarChart3, FileText, FolderPlus, MessageSquareText, CheckCircle, ArrowRight, AlertCircle } from "lucide-react";

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
    title: "New Client Worksheet",
    description: "Tell us about yourself, your career history, and your goals. This foundational information helps us understand your unique story.",
    completedTitle: "New Client Worksheet Completed",
    completedDescription: "Thank you! We have your background information. You can update your responses anytime.",
    actionLabel: "Start Worksheet",
    updateLabel: "Update Worksheet",
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/20"
  },
  2: {
    icon: BarChart3,
    title: "Quantifications & Metrics Worksheet",
    description: "Share your accomplishments with numbers - revenue generated, team sizes, cost savings, and measurable impacts from your career.",
    completedTitle: "Metrics Worksheet Completed",
    completedDescription: "Great! Your quantifiable achievements are recorded. Add more anytime.",
    actionLabel: "Start Worksheet",
    updateLabel: "Update Metrics",
    color: "text-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-950/20"
  },
  3: {
    icon: FileText,
    title: "Resume(s)",
    description: "Upload your current resume(s) so we can review them and create improved versions tailored to your goals.",
    completedTitle: "Resume(s) Uploaded",
    completedDescription: "We've received your resume(s) and are reviewing them. You can upload additional versions if needed.",
    actionLabel: "Upload Resume",
    updateLabel: "Upload More",
    color: "text-green-500",
    bgColor: "bg-green-50 dark:bg-green-950/20"
  },
  4: {
    icon: FolderPlus,
    title: "Additional Documents",
    description: "Upload any supporting documents - job descriptions, cover letters, LinkedIn exports, performance reviews, or other relevant materials.",
    completedTitle: "Additional Documents Uploaded",
    completedDescription: "Documents received! You can continue adding more files as needed.",
    actionLabel: "Upload Documents",
    updateLabel: "Upload More",
    color: "text-orange-500",
    bgColor: "bg-orange-50 dark:bg-orange-950/20"
  },
  5: {
    icon: MessageSquareText,
    title: "Special Requests & Notes",
    description: "Share any special requests, notes, or additional context for the RDR team. Let us know anything that will help us serve you better.",
    completedTitle: "Notes Submitted",
    completedDescription: "Your notes have been received. Feel free to add more anytime.",
    actionLabel: "Add Notes",
    updateLabel: "Update Notes",
    color: "text-teal-500",
    bgColor: "bg-teal-50 dark:bg-teal-950/20"
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
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs">
                  Step {stepId} of 5
                </Badge>
                {isCompleted && (
                  <Badge className="bg-green-500 text-white text-xs">
                    Completed
                  </Badge>
                )}
              </div>
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

        {/* Status Message for Step 4 */}
        {stepId === 4 && !isCompleted && (
          <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent" />
                <div>
                  <h3 className="font-semibold">Work in Progress</h3>
                  <p className="text-sm text-muted-foreground">
                    Our team is carefully crafting your documents. You'll receive an email notification when they're ready.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
