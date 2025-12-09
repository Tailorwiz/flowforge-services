import { Check, ClipboardList, BarChart3, FileText, FolderPlus, MessageSquareText, MessageCircle, User, LogOut, HelpCircle, BookOpen, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ProgressStep {
  id: number;
  title: string;
  description: string;
  isCompleted: boolean;
  isActive: boolean;
  isLocked: boolean;
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
        {/* Section 1: Send Us Your Documents */}
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 px-2">
          Send Us Your Documents
        </p>
        
        <div className="space-y-1 mb-4">
          {steps.slice(0, 5).map((step, index) => {
            const Icon = STEP_ICONS[index] || ClipboardList;
            const isSelected = currentStep === step.id;
            
            return (
              <button
                key={step.id}
                onClick={() => !step.isLocked && onStepSelect(step.id)}
                disabled={step.isLocked}
                className={cn(
                  "w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all",
                  isSelected && "bg-primary/10 border border-primary/20",
                  !isSelected && !step.isLocked && "hover:bg-muted/50",
                  step.isLocked && "opacity-50 cursor-not-allowed"
                )}
              >
                {/* Status Indicator */}
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                  step.isCompleted && "bg-green-500 text-white",
                  !step.isCompleted && isSelected && "bg-primary text-primary-foreground",
                  !step.isCompleted && !isSelected && "bg-muted text-muted-foreground"
                )}>
                  {step.isCompleted ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                </div>
                
                {/* Step Info */}
                <span className={cn(
                  "text-sm",
                  isSelected && "text-primary font-medium",
                  step.isLocked && "text-muted-foreground"
                )}>
                  {step.title}
                </span>
              </button>
            );
          })}
        </div>

        {/* Section 2: Book Your Clarity Call */}
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 px-2">
          Book Your Clarity Call
        </p>
        
        <div className="space-y-1">
          {steps.slice(5, 6).map((step) => {
            const isSelected = currentStep === step.id;
            
            return (
              <button
                key={step.id}
                onClick={() => !step.isLocked && onStepSelect(step.id)}
                disabled={step.isLocked}
                className={cn(
                  "w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all",
                  isSelected && "bg-primary/10 border border-primary/20",
                  !isSelected && !step.isLocked && "hover:bg-muted/50",
                  step.isLocked && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                  step.isCompleted && "bg-green-500 text-white",
                  !step.isCompleted && isSelected && "bg-primary text-primary-foreground",
                  !step.isCompleted && !isSelected && "bg-muted text-muted-foreground"
                )}>
                  {step.isCompleted ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Calendar className="h-3.5 w-3.5" />
                  )}
                </div>
                <span className={cn(
                  "text-sm",
                  isSelected && "text-primary font-medium"
                )}>
                  {step.title}
                </span>
              </button>
            );
          })}
        </div>

        <Separator className="my-4" />

        {/* Quick Links */}
        <div className="space-y-1">
          <button
            onClick={() => onStepSelect(6)} // Messages
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-muted/50 transition-colors",
              currentStep === 6 && "bg-primary/10 border border-primary/20"
            )}
          >
            <MessageCircle className={cn("h-5 w-5", currentStep === 6 ? "text-primary" : "text-muted-foreground")} />
            <span className={cn("text-sm", currentStep === 6 && "text-primary font-medium")}>Messages</span>
          </button>
          
          <button
            onClick={() => onStepSelect(8)} // Training
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-muted/50 transition-colors",
              currentStep === 8 && "bg-primary/10 border border-primary/20"
            )}
          >
            <BookOpen className={cn("h-5 w-5", currentStep === 8 ? "text-primary" : "text-muted-foreground")} />
            <span className={cn("text-sm", currentStep === 8 && "text-primary font-medium")}>Training Materials</span>
          </button>
          
          <button
            onClick={() => onStepSelect(7)} // Profile
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-muted/50 transition-colors",
              currentStep === 7 && "bg-primary/10 border border-primary/20"
            )}
          >
            <User className={cn("h-5 w-5", currentStep === 7 ? "text-primary" : "text-muted-foreground")} />
            <span className={cn("text-sm", currentStep === 7 && "text-primary font-medium")}>My Profile</span>
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
