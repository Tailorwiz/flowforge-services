import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Calendar, Clock, FolderOpen, CheckCircle, ArrowRight, AlertCircle } from "lucide-react";

interface ClientStepContentProps {
  stepId: number;
  isCompleted: boolean;
  isLocked: boolean;
  onAction: () => void;
  children?: React.ReactNode;
}

const STEP_CONFIG = {
  1: {
    icon: FileText,
    title: "Complete Your Intake Form",
    description: "Tell us about your career goals, experience, and what you're looking for. This helps us create the perfect documents for you.",
    completedTitle: "Intake Form Completed",
    completedDescription: "Great job! We have all the information we need. You can update your responses anytime.",
    actionLabel: "Start Form",
    updateLabel: "Update Responses",
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/20"
  },
  2: {
    icon: Upload,
    title: "Upload Your Resume",
    description: "Share your current resume so we can review it and create an improved version tailored to your goals.",
    completedTitle: "Resume Uploaded",
    completedDescription: "We've received your resume and are reviewing it. You can upload additional documents if needed.",
    actionLabel: "Upload Resume",
    updateLabel: "Upload More",
    color: "text-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-950/20"
  },
  3: {
    icon: Calendar,
    title: "Book Your Consultation",
    description: "Schedule a call with our team to discuss your career goals and document strategy.",
    completedTitle: "Session Booked",
    completedDescription: "Your consultation is scheduled. Check your email for details.",
    actionLabel: "Book Session",
    updateLabel: "Reschedule",
    color: "text-green-500",
    bgColor: "bg-green-50 dark:bg-green-950/20"
  },
  4: {
    icon: Clock,
    title: "We're Working on Your Documents",
    description: "Our team is crafting your personalized career documents. We'll notify you when they're ready for review.",
    completedTitle: "Documents Ready!",
    completedDescription: "Your documents are complete! Head to the next step to review and download them.",
    actionLabel: null,
    updateLabel: null,
    color: "text-orange-500",
    bgColor: "bg-orange-50 dark:bg-orange-950/20"
  },
  5: {
    icon: FolderOpen,
    title: "Review & Download Your Documents",
    description: "Your completed documents are ready! Review each one and download when you're satisfied.",
    completedTitle: "All Documents Approved",
    completedDescription: "Congratulations! You've approved all your documents. Download them anytime.",
    actionLabel: "View Documents",
    updateLabel: "View Documents",
    color: "text-emerald-500",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/20"
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
