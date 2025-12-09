import { Check, FileText, Upload, Calendar, Clock, FolderOpen, MessageCircle, User, LogOut, HelpCircle, BookOpen } from "lucide-react";
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

const STEP_ICONS = [FileText, Upload, Calendar, Clock, FolderOpen];

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
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 px-2">
          Your Journey
        </p>
        
        <div className="space-y-1">
          {steps.map((step, index) => {
            const Icon = STEP_ICONS[index] || FileText;
            const isSelected = currentStep === step.id;
            
            return (
              <button
                key={step.id}
                onClick={() => !step.isLocked && onStepSelect(step.id)}
                disabled={step.isLocked}
                className={cn(
                  "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all",
                  isSelected && "bg-primary/10 border border-primary/20",
                  !isSelected && !step.isLocked && "hover:bg-muted/50",
                  step.isLocked && "opacity-50 cursor-not-allowed"
                )}
              >
                {/* Step Number/Check */}
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-medium",
                  step.isCompleted && "bg-green-500 text-white",
                  !step.isCompleted && isSelected && "bg-primary text-primary-foreground",
                  !step.isCompleted && !isSelected && "bg-muted text-muted-foreground"
                )}>
                  {step.isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    step.id
                  )}
                </div>
                
                {/* Step Info */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium text-sm",
                    isSelected && "text-primary",
                    step.isLocked && "text-muted-foreground"
                  )}>
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {step.isLocked ? "Complete previous steps" : step.description}
                  </p>
                </div>

                {/* Status Icon */}
                <Icon className={cn(
                  "h-4 w-4 flex-shrink-0 mt-1",
                  step.isCompleted && "text-green-500",
                  !step.isCompleted && isSelected && "text-primary",
                  !step.isCompleted && !isSelected && "text-muted-foreground"
                )} />
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
