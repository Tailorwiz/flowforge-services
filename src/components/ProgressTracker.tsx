import React, { useEffect, useState } from 'react';
import { Check, Clock, Upload, Calendar, Eye, FileText, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthProvider';
import { Button } from './ui/button';
import { toast } from '@/hooks/use-toast';

interface Step {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'completed' | 'current' | 'upcoming';
  action?: () => void;
  actionText?: string;
}

interface ClientData {
  id: string;
  status: string;
  // Using mock progress state since actual columns don't exist
  progressStep?: number;
}

interface ProgressTrackerProps {
  clientId?: string;
  className?: string;
  onProgressUpdate?: (newStep: number) => void;
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({ 
  clientId, 
  className = "", 
  onProgressUpdate 
}) => {
  const { user } = useAuth();
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  // Local storage for demo progress tracking
  const [localProgress, setLocalProgress] = useState<Record<number, boolean>>({});

  // Fetch client data from database
  useEffect(() => {
    if (user) {
      fetchClientData();
      loadLocalProgress();
    }
  }, [user, clientId]);

  const loadLocalProgress = () => {
    const saved = localStorage.getItem(`progress_${user?.id}`);
    if (saved) {
      setLocalProgress(JSON.parse(saved));
    }
  };

  const saveLocalProgress = (progress: Record<number, boolean>) => {
    localStorage.setItem(`progress_${user?.id}`, JSON.stringify(progress));
    setLocalProgress(progress);
  };

  const fetchClientData = async () => {
    try {
      setLoading(true);
      
      // Find client by user ID or use provided clientId
      let query = supabase.from('clients').select('id, status');
      
      if (clientId) {
        query = query.eq('id', clientId);
      } else {
        query = query.eq('user_id', user?.id);
      }
      
      const { data, error } = await query.maybeSingle();

      if (error) throw error;

      if (data) {
        setClientData(data);
        // Calculate current step based on local progress
        const completedSteps = Object.values(localProgress).filter(Boolean).length;
        setCurrentStep(completedSteps + 1);
      }
    } catch (error) {
      console.error('Error fetching client data:', error);
      // For demo purposes, set a default client if none found
      setClientData({ id: 'demo', status: 'active' });
    } finally {
      setLoading(false);
    }
  };

  const handleStepClick = async (stepId: number) => {
    console.log('Progress Tracker: Step clicked:', stepId);
    const step = steps.find(s => s.id === stepId);
    console.log('Progress Tracker: Step found:', step);
    console.log('Progress Tracker: Step action available:', !!step?.action);
    
    if (step?.action) {
      console.log('Progress Tracker: Executing step action');
      step.action();
    } else {
      console.log('Progress Tracker: No action available for step');
    }
  };

  const markStepCompleted = async (stepNumber: number) => {
    try {
      const newProgress = { ...localProgress, [stepNumber]: true };
      saveLocalProgress(newProgress);
      
      const completedSteps = Object.values(newProgress).filter(Boolean).length;
      setCurrentStep(completedSteps + 1);
      
      // Notify parent component
      if (onProgressUpdate) {
        onProgressUpdate(completedSteps + 1);
      }

      toast({
        title: "Progress Updated",
        description: `Step ${stepNumber} marked as completed!`,
      });
    } catch (error) {
      console.error('Error updating progress:', error);
      toast({
        title: "Error",
        description: "Failed to update progress. Please try again.",
        variant: "destructive",
      });
    }
  };

  const openIntakeForm = () => {
    console.log('Opening intake form...');
    if (clientData?.id) {
      const intakeFormUrl = `/intake-form?client=${clientData.id}`;
      const popup = window.open(intakeFormUrl, 'intakeForm', 'width=800,height=900,scrollbars=yes,resizable=yes');
      
      if (!popup) {
        // Fallback if popup is blocked
        window.location.href = intakeFormUrl;
      } else {
        // Listen for the popup to close and refresh data
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            window.location.reload(); // Refresh to update progress
          }
        }, 1000);
      }
    } else {
      toast({
        title: "Error",
        description: "Client information not loaded. Please refresh the page.",
        variant: "destructive",
      });
    }
  };

  const openResumeUpload = () => {
    toast({
      title: "Resume Upload",
      description: "Opening resume upload dialog...",
    });
    
    // Simulate upload completion
    setTimeout(() => {
      markStepCompleted(2);
    }, 1500);
  };

  const openSessionBooking = () => {
    toast({
      title: "Session Booking",
      description: "Opening consultation booking system...",
    });
    
    // Simulate booking completion
    setTimeout(() => {
      markStepCompleted(3);
    }, 1000);
  };

  const openDocumentReview = () => {
    toast({
      title: "Document Review",
      description: "Opening document review portal...",
    });
    
    // Simulate review completion
    setTimeout(() => {
      markStepCompleted(5);
    }, 1000);
  };

  const getStepStatus = (stepId: number): 'completed' | 'current' | 'upcoming' => {
    if (localProgress[stepId]) return 'completed';
    if (currentStep === stepId) return 'current';
    return 'upcoming';
  };

  const steps: Step[] = [
    {
      id: 1,
      title: "Intake Form",
      description: "Complete your intake questionnaire",
      icon: <FileText className="w-4 h-4" />,
      status: getStepStatus(1),
      action: openIntakeForm,
      actionText: "Start Questionnaire"
    },
    {
      id: 2,
      title: "Upload Resume",
      description: "Upload your current resume",
      icon: <Upload className="w-4 h-4" />,
      status: getStepStatus(2),
      action: openResumeUpload,
      actionText: "Upload Resume"
    },
    {
      id: 3,
      title: "Book Session",
      description: "Schedule your consultation",
      icon: <Calendar className="w-4 h-4" />,
      status: getStepStatus(3),
      action: openSessionBooking,
      actionText: "Book Session"
    },
    {
      id: 4,
      title: "In Progress",
      description: "We're working on your documents",
      icon: <Clock className="w-4 h-4" />,
      status: getStepStatus(4)
    },
    {
      id: 5,
      title: "Review Documents",
      description: "Review and download your completed documents",
      icon: <Eye className="w-4 h-4" />,
      status: getStepStatus(5),
      action: openDocumentReview,
      actionText: "Review Documents"
    }
  ];

  if (loading) {
    return (
      <div className={`bg-white rounded-xl p-6 shadow-lg border border-border ${className}`}>
        <h3 className="text-lg font-semibold text-rdr-navy mb-6 font-heading">Project Progress</h3>
        <div className="animate-pulse space-y-6">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-gray-200"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl p-6 shadow-lg border border-border ${className}`}>
      <h3 className="text-lg font-semibold text-rdr-navy mb-6 font-heading">Project Progress</h3>
      
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-border"></div>
        <div 
          className="absolute left-6 top-8 w-0.5 bg-rdr-gold transition-all duration-500"
          style={{ height: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        ></div>
        
        {/* Steps */}
        <div className="space-y-6">
          {steps.map((step) => {
            const isClickable = step.action && (step.status === 'current' || (step.status === 'upcoming' && step.id <= currentStep));
            console.log(`Progress Tracker: Step ${step.id} - Status: ${step.status}, Current Step: ${currentStep}, Clickable: ${isClickable}`);
            
            return (
              <div 
                key={step.id} 
                className={`relative flex items-center group ${
                  isClickable ? 'cursor-pointer border-2 border-dashed border-blue-300 p-2 rounded-lg' : ''
                }`}
                onClick={(e) => {
                  console.log('Progress Tracker: Div clicked for step:', step.id);
                  e.preventDefault();
                  e.stopPropagation();
                  if (isClickable) {
                    handleStepClick(step.id);
                  } else {
                    console.log('Progress Tracker: Step not clickable');
                  }
                }}
              >
                {/* Step Icon */}
                <div className={`
                  relative z-10 w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300
                  ${step.status === 'completed' 
                    ? 'bg-rdr-gold border-rdr-gold text-rdr-navy' 
                    : step.status === 'current'
                    ? 'bg-rdr-navy border-rdr-navy text-white'
                    : 'bg-white border-border text-rdr-medium-gray'
                  }
                  ${isClickable ? 'group-hover:scale-110 group-hover:shadow-lg' : ''}
                `}>
                  {step.status === 'completed' ? <Check className="w-5 h-5" /> : step.icon}
                </div>
                
                {/* Step Content */}
                <div className="ml-4 flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className={`
                        font-medium transition-colors duration-300
                        ${step.status === 'completed' || step.status === 'current' 
                          ? 'text-rdr-navy' 
                          : 'text-rdr-medium-gray'
                        }
                      `}>
                        {step.title}
                      </h4>
                      <p className="text-sm text-rdr-medium-gray">{step.description}</p>
                      
                      {step.status === 'completed' && (
                        <span className="text-sm text-rdr-gold font-medium">✓ Complete</span>
                      )}
                      {step.status === 'current' && (
                        <span className="text-sm text-rdr-navy font-medium">Ready to start</span>
                      )}
                    </div>
                    
                    {/* Action Button */}
                    {isClickable && step.actionText && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="ml-4 opacity-100 bg-blue-500 text-white hover:bg-blue-600"
                        onClick={(e) => {
                          console.log('Progress Tracker: Button clicked for step:', step.id);
                          e.preventDefault();
                          e.stopPropagation();
                          handleStepClick(step.id);
                        }}
                      >
                        {step.actionText}
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ProgressTracker;