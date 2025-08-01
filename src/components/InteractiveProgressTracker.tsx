import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { 
  FileText, 
  Upload, 
  Calendar, 
  Clock, 
  Download, 
  CheckCircle, 
  ExternalLink,
  X
} from 'lucide-react';

interface ProgressStep {
  id: string;
  step_number: number;
  step_name: string;
  status: 'pending' | 'in_progress' | 'completed';
  completed_at?: string;
  metadata: any;
}

interface InteractiveProgressTrackerProps {
  clientId: string;
  onProgressUpdate?: () => void;
}

const STEP_CONFIG = {
  1: {
    title: "Intake Form",
    description: "Complete your intake questionnaire",
    icon: FileText,
    action: "intake_form"
  },
  2: {
    title: "Upload Resume",
    description: "Upload your current resume",
    icon: Upload,
    action: "upload_resume"
  },
  3: {
    title: "Book Session",
    description: "Schedule your consultation",
    icon: Calendar,
    action: "book_session"
  },
  4: {
    title: "In Progress",
    description: "We're working on your documents",
    icon: Clock,
    action: "in_progress"
  },
  5: {
    title: "Review & Download",
    description: "Review and download your completed documents",
    icon: Download,
    action: "review_download"
  }
};

const InteractiveProgressTracker: React.FC<InteractiveProgressTrackerProps> = ({ 
  clientId, 
  onProgressUpdate 
}) => {
  const [steps, setSteps] = useState<ProgressStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCalendly, setShowCalendly] = useState(false);

  useEffect(() => {
    if (clientId) {
      fetchProgress();
    }
  }, [clientId]);

  const fetchProgress = async () => {
    try {
      const { data, error } = await supabase
        .from('client_progress')
        .select('*')
        .eq('client_id', clientId)
        .order('step_number', { ascending: true });

      if (error) throw error;
      setSteps((data || []) as ProgressStep[]);
    } catch (error) {
      console.error('Error fetching progress:', error);
      toast({
        title: "Error",
        description: "Failed to load progress data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStepStatus = async (stepNumber: number, status: 'in_progress' | 'completed', metadata = {}) => {
    try {
      const updateData: any = { 
        status,
        metadata: { ...metadata, updated_by_client: true }
      };
      
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('client_progress')
        .update(updateData)
        .eq('client_id', clientId)
        .eq('step_number', stepNumber);

      if (error) throw error;

      // Auto-advance next step if current is completed
      if (status === 'completed' && stepNumber < 5) {
        const nextStep = stepNumber + 1;
        
        // Special logic for step 4 (In Progress) - only auto-advance if all previous steps are done
        if (nextStep === 4) {
          const allPreviousCompleted = steps
            .filter(s => s.step_number < 4)
            .every(s => s.status === 'completed');
          
          if (allPreviousCompleted) {
            await supabase
              .from('client_progress')
              .update({ 
                status: 'in_progress',
                metadata: { auto_advanced: true }
              })
              .eq('client_id', clientId)
              .eq('step_number', nextStep);
          }
        }
      }

      // Also update the clients table flags
      if (stepNumber === 1 && status === 'completed') {
        await supabase
          .from('clients')
          .update({ intake_form_submitted: true })
          .eq('id', clientId);
      } else if (stepNumber === 2 && status === 'completed') {
        await supabase
          .from('clients')
          .update({ resume_uploaded: true })
          .eq('id', clientId);
      } else if (stepNumber === 3 && status === 'completed') {
        await supabase
          .from('clients')
          .update({ session_booked: true })
          .eq('id', clientId);
      }

      await fetchProgress();
      onProgressUpdate?.();
      
      toast({
        title: "Progress Updated",
        description: `${STEP_CONFIG[stepNumber as keyof typeof STEP_CONFIG]?.title} marked as ${status === 'completed' ? 'complete' : 'in progress'}`,
      });
    } catch (error) {
      console.error('Error updating progress:', error);
      toast({
        title: "Error",
        description: "Failed to update progress",
        variant: "destructive"
      });
    }
  };

  const handleStepClick = async (step: ProgressStep) => {
    const config = STEP_CONFIG[step.step_number as keyof typeof STEP_CONFIG];
    
    // Don't allow clicking on future steps that aren't unlocked
    const previousSteps = steps.filter(s => s.step_number < step.step_number);
    const canAccess = step.status !== 'pending' || previousSteps.every(s => s.status === 'completed');
    
    if (!canAccess) {
      toast({
        title: "Step Locked",
        description: "Complete previous steps first",
        variant: "destructive"
      });
      return;
    }

    switch (config.action) {
      case 'intake_form':
        // Open intake form - for now, just mark as in progress
        if (step.status === 'pending') {
          await updateStepStatus(step.step_number, 'in_progress');
        }
        // In a real implementation, you'd open the actual intake form
        toast({
          title: "Intake Form",
          description: "Opening intake form... (This would open the actual form)",
        });
        break;
        
      case 'upload_resume':
        // Open upload widget - for now, just mark as in progress
        if (step.status === 'pending') {
          await updateStepStatus(step.step_number, 'in_progress');
        }
        // In a real implementation, you'd open the actual upload widget
        toast({
          title: "Resume Upload",
          description: "Opening upload widget... (This would open the actual uploader)",
        });
        break;
        
      case 'book_session':
        // Open Calendly
        setShowCalendly(true);
        if (step.status === 'pending') {
          await updateStepStatus(step.step_number, 'in_progress');
        }
        break;
        
      case 'review_download':
        // Navigate to deliveries page
        toast({
          title: "Deliveries",
          description: "Redirecting to your deliveries...",
        });
        // In a real implementation, you'd navigate to the deliveries tab
        break;
        
      default:
        // For "In Progress" step, no action needed
        break;
    }
  };

  const getProgressPercentage = () => {
    const completedSteps = steps.filter(s => s.status === 'completed').length;
    return (completedSteps / steps.length) * 100;
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-slate-200 rounded mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-slate-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium">Overall Progress</span>
          <span className="text-primary font-semibold">{Math.round(getProgressPercentage())}% Complete</span>
        </div>
        <Progress value={getProgressPercentage()} className="h-3" />
      </div>
      
      {/* Progress Steps */}
      <div className="grid gap-4">
        {steps.map((step) => {
          const config = STEP_CONFIG[step.step_number as keyof typeof STEP_CONFIG];
          const isCompleted = step.status === 'completed';
          const isCurrent = step.status === 'in_progress';
          const isPending = step.status === 'pending';
          
          // Check if step can be accessed
          const previousSteps = steps.filter(s => s.step_number < step.step_number);
          const canAccess = !isPending || previousSteps.every(s => s.status === 'completed');
          const isClickable = canAccess && config.action !== 'in_progress';
          
          const IconComponent = config.icon;
          
          return (
            <div 
              key={step.id} 
              className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                isCompleted ? 'bg-green-50 border-green-200' :
                isCurrent ? 'bg-primary/5 border-primary/20' :
                canAccess ? 'bg-slate-50 border-slate-200 hover:bg-slate-100' :
                'bg-slate-50 border-slate-200 opacity-60'
              } ${isClickable ? 'cursor-pointer' : ''}`}
              onClick={() => isClickable ? handleStepClick(step) : undefined}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isCompleted ? 'bg-green-500 text-white' :
                isCurrent ? 'bg-primary text-white' :
                canAccess ? 'bg-slate-300 text-slate-600' :
                'bg-slate-200 text-slate-400'
              }`}>
                {isCompleted ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <IconComponent className="w-5 h-5" />
                )}
              </div>
              
              <div className="flex-1">
                <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                  {config.title}
                  {isClickable && canAccess && (
                    <ExternalLink className="w-4 h-4 text-slate-400" />
                  )}
                </h4>
                <p className="text-sm text-slate-600">{config.description}</p>
                {step.completed_at && (
                  <p className="text-xs text-green-600 mt-1">
                    Completed on {new Date(step.completed_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              
              <div className="flex flex-col gap-2">
                {isCompleted && (
                  <Badge variant="default" className="bg-green-500">
                    Complete
                  </Badge>
                )}
                {isCurrent && (
                  <Badge variant="default">
                    In Progress
                  </Badge>
                )}
                {isPending && !canAccess && (
                  <Badge variant="secondary">
                    Locked
                  </Badge>
                )}
                
                {/* Action buttons for specific steps */}
                {canAccess && step.step_number === 1 && !isCompleted && (
                  <Button 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStepClick(step);
                    }}
                  >
                    Start Form
                  </Button>
                )}
                {canAccess && step.step_number === 2 && !isCompleted && (
                  <Button 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStepClick(step);
                    }}
                  >
                    Upload Resume
                  </Button>
                )}
                {canAccess && step.step_number === 3 && !isCompleted && (
                  <Button 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStepClick(step);
                    }}
                  >
                    Book Session
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Calendly Modal */}
      <Dialog open={showCalendly} onOpenChange={setShowCalendly}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Schedule Your Consultation</DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCalendly(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="w-full h-[600px]">
            <iframe
              src="https://calendly.com/resultsdrivenresumes/resume-clarity-research-review-interview-session"
              width="100%"
              height="100%"
              frameBorder="0"
              title="Schedule Consultation"
            />
          </div>
          <div className="flex justify-between items-center pt-4">
            <p className="text-sm text-slate-600">
              Once you book your session, this step will be marked as complete.
            </p>
            <Button 
              onClick={() => {
                updateStepStatus(3, 'completed');
                setShowCalendly(false);
              }}
            >
              I've Booked My Session
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InteractiveProgressTracker;