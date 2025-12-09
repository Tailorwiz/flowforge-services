import { useState } from "react";
import { Check, ClipboardList, BarChart3, FileText, FolderPlus, MessageSquareText, MessageCircle, User, LogOut, HelpCircle, BookOpen, Calendar, ChevronDown, ChevronRight, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProgressStep {
  id: number;
  title: string;
  description: string;
  isCompleted: boolean;
  isActive: boolean;
  isLocked: boolean;
  isOptional?: boolean;
}

interface ClientProgressSidebarProps {
  steps: ProgressStep[];
  currentStep: number;
  onStepSelect: (stepId: number) => void;
  clientName: string;
  clientEmail: string;
  avatarUrl?: string;
  serviceType: string;
  overallProgress: number;
  onSignOut: () => void;
  onHelp: () => void;
}

const STEP_ICONS = [ClipboardList, BarChart3, FileText, FolderPlus, MessageSquareText];

export function ClientProgressSidebar({
  steps,
  currentStep,
  onStepSelect,
  clientName,
  clientEmail,
  avatarUrl,
  serviceType,
  overallProgress,
  onSignOut,
  onHelp
}: ClientProgressSidebarProps) {
  const [step1Expanded, setStep1Expanded] = useState(true);
  
  // Check if current step is within Step 1 sub-items (1-5)
  const isStep1Active = currentStep >= 1 && currentStep <= 5;
  const step1Completed = steps.slice(0, 3).every(s => s.isCompleted); // Required items completed

  return (
    <div className="w-72 bg-card border-r flex flex-col h-screen sticky top-0">
      {/* Client Info Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {clientName?.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{clientName}</p>
            <p className="text-xs text-muted-foreground truncate">{serviceType}</p>
          </div>
        </div>
        
        {/* Overall Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>
      </div>

      {/* Steps List */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Step 1: Send Us Your Documents (Collapsible) */}
        <button
          onClick={() => setStep1Expanded(!step1Expanded)}
          className={cn(
            "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all mb-1",
            isStep1Active && "bg-primary/10 border border-primary/20",
            !isStep1Active && "hover:bg-muted/50"
          )}
        >
          <div className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold",
            step1Completed && "bg-green-500 text-white",
            !step1Completed && isStep1Active && "bg-primary text-primary-foreground",
            !step1Completed && !isStep1Active && "bg-muted text-muted-foreground"
          )}>
            {step1Completed ? <Check className="h-4 w-4" /> : "1"}
          </div>
          <div className="flex-1">
            <span className={cn(
              "text-sm font-medium",
              isStep1Active && "text-primary"
            )}>
              Send Us Your Documents
            </span>
          </div>
          {step1Expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        
        {/* Step 1 Sub-items */}
        {step1Expanded && (
          <div className="ml-4 pl-3 border-l border-muted space-y-1 mb-4">
            {steps.slice(0, 5).map((step, index) => {
              const Icon = STEP_ICONS[index] || ClipboardList;
              const isSelected = currentStep === step.id;
              const isOptional = step.id === 4 || step.id === 5;
              
              return (
                <button
                  key={step.id}
                  onClick={() => !step.isLocked && onStepSelect(step.id)}
                  disabled={step.isLocked}
                  className={cn(
                    "w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-all",
                    isSelected && "bg-primary/10",
                    !isSelected && !step.isLocked && "hover:bg-muted/50",
                    step.isLocked && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                    step.isCompleted && "bg-green-500 text-white",
                    !step.isCompleted && isSelected && "bg-primary text-primary-foreground",
                    !step.isCompleted && !isSelected && "bg-muted text-muted-foreground"
                  )}>
                    {step.isCompleted ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Icon className="h-3 w-3" />
                    )}
                  </div>
                  
                  <span className={cn(
                    "text-sm flex-1",
                    isSelected && "text-primary font-medium",
                    step.isLocked && "text-muted-foreground"
                  )}>
                    {step.title}
                  </span>
                  
                  {isOptional && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                      Optional
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Step 2: Book Your Clarity Call */}
        {steps.length > 5 && (
          <button
            onClick={() => !steps[5].isLocked && onStepSelect(steps[5].id)}
            disabled={steps[5].isLocked}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all",
              currentStep === 6 && "bg-primary/10 border border-primary/20",
              currentStep !== 6 && !steps[5].isLocked && "hover:bg-muted/50",
              steps[5].isLocked && "opacity-50 cursor-not-allowed"
            )}
          >
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold",
              steps[5].isCompleted && "bg-green-500 text-white",
              !steps[5].isCompleted && currentStep === 6 && "bg-primary text-primary-foreground",
              !steps[5].isCompleted && currentStep !== 6 && "bg-muted text-muted-foreground"
            )}>
              {steps[5].isCompleted ? <Check className="h-4 w-4" /> : "2"}
            </div>
            <div className="flex-1">
              <span className={cn(
                "text-sm font-medium",
                currentStep === 6 && "text-primary"
              )}>
                Book Your Clarity Call
              </span>
            </div>
            <Calendar className={cn(
              "h-4 w-4",
              steps[5].isCompleted && "text-green-500",
              !steps[5].isCompleted && currentStep === 6 && "text-primary",
              !steps[5].isCompleted && currentStep !== 6 && "text-muted-foreground"
            )} />
          </button>
        )}

        <Separator className="my-4" />

        {/* Quick Links */}
        <div className="space-y-1">
          <button
            onClick={() => onStepSelect(7)}
            className={cn(
              "w-full flex items-center gap-3 p-2.5 rounded-lg text-left hover:bg-muted/50 transition-colors",
              currentStep === 7 && "bg-primary/10 border border-primary/20"
            )}
          >
            <MessageCircle className={cn("h-4 w-4", currentStep === 7 ? "text-primary" : "text-muted-foreground")} />
            <span className={cn("text-sm", currentStep === 7 && "text-primary font-medium")}>Messages</span>
          </button>
          
          <button
            onClick={() => onStepSelect(8)}
            className={cn(
              "w-full flex items-center gap-3 p-2.5 rounded-lg text-left hover:bg-muted/50 transition-colors",
              currentStep === 8 && "bg-primary/10 border border-primary/20"
            )}
          >
            <BookOpen className={cn("h-4 w-4", currentStep === 8 ? "text-primary" : "text-muted-foreground")} />
            <span className={cn("text-sm", currentStep === 8 && "text-primary font-medium")}>Training Materials</span>
          </button>
          
          <button
            onClick={() => onStepSelect(9)}
            className={cn(
              "w-full flex items-center gap-3 p-2.5 rounded-lg text-left hover:bg-muted/50 transition-colors",
              currentStep === 9 && "bg-primary/10 border border-primary/20"
            )}
          >
            <User className={cn("h-4 w-4", currentStep === 9 ? "text-primary" : "text-muted-foreground")} />
            <span className={cn("text-sm", currentStep === 9 && "text-primary font-medium")}>My Profile</span>
          </button>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t space-y-1">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={onHelp}
        >
          <HelpCircle className="h-4 w-4" />
          Get Help
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
          onClick={onSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
