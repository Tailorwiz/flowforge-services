import React, { useEffect, useState } from 'react';
import { Check, Clock, Upload, Calendar, Eye, FileText, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthProvider';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { toast } from '@/hooks/use-toast';
import ResumeUpload from './ResumeUpload';
import CalendlyEmbed from './CalendlyEmbed';

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
  
  // Component state
  const [showIntakeForm, setShowIntakeForm] = useState(false);
  const [showResumeUpload, setShowResumeUpload] = useState(false);
  const [showCalendlyBooking, setShowCalendlyBooking] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    currentJobTitle: '',
    targetJobTitle: '',
    industry: '',
    experience: '',
    careerGoals: '',
    challenges: '',
    additionalInfo: ''
  });

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
      let query = supabase.from('clients').select('id, status, intake_form_submitted, resume_uploaded, session_booked');
      
      if (clientId) {
        query = query.eq('id', clientId);
      } else {
        query = query.eq('user_id', user?.id);
      }
      
      const { data, error } = await query.maybeSingle();

      if (error) throw error;

      if (data) {
        setClientData(data);
        
        // Sync local progress with database
        const dbProgress: Record<number, boolean> = {
          1: data.intake_form_submitted || false,
          2: data.resume_uploaded || false,
          3: data.session_booked || false,
          4: false, // In progress - set manually by admin
          5: false  // Review complete - set manually by admin
        };
        
        // Merge with local progress (prioritize database for steps 1-3)
        const mergedProgress = { ...localProgress };
        mergedProgress[1] = dbProgress[1] || localProgress[1] || false;
        mergedProgress[2] = dbProgress[2] || localProgress[2] || false;
        mergedProgress[3] = dbProgress[3] || localProgress[3] || false;
        
        saveLocalProgress(mergedProgress);
        
        // Calculate current step
        const completedSteps = Object.values(mergedProgress).filter(Boolean).length;
        setCurrentStep(Math.min(completedSteps + 1, 5));
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
    console.log('*** STEP CLICK DEBUG ***');
    console.log('Step clicked:', stepId);
    console.log('Current states - showIntakeForm:', showIntakeForm, 'showResumeUpload:', showResumeUpload);
    
    // Force close all modals first
    setShowIntakeForm(false);
    setShowResumeUpload(false);
    setShowCalendlyBooking(false);
    
    // Wait a moment for state to update
    setTimeout(() => {
      switch (stepId) {
        case 1:
          console.log('*** EXECUTING CASE 1 - OPENING INTAKE FORM ***');
          setShowIntakeForm(true);
          break;
        case 2:
          console.log('*** EXECUTING CASE 2 - OPENING RESUME UPLOAD ***');
          setShowResumeUpload(true);
          break;
        case 3:
          console.log('*** EXECUTING CASE 3 - OPENING SESSION BOOKING ***');
          setShowCalendlyBooking(true);
          break;
        default:
          console.log('*** NO MATCHING CASE FOR STEP ***', stepId);
      }
    }, 100);
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
    setShowIntakeForm(true);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      console.log('=== INTAKE FORM SUBMISSION DEBUG ===');
      console.log('Form data:', formData);
      console.log('Client ID:', clientData?.id);
      console.log('User ID:', user?.id);

      if (!clientData?.id) {
        throw new Error('Client information not loaded');
      }

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Save intake form data to client history
      const { data: historyData, error: historyError } = await supabase
        .from('client_history')
        .insert({
          client_id: clientData.id,
          action_type: 'intake_form_completed',
          description: 'Client completed intake questionnaire',
          metadata: formData,
          created_by: user.id
        })
        .select();

      if (historyError) {
        console.error('History insert error:', historyError);
        throw historyError;
      }

      // Update client progress
      const { error: updateError } = await supabase
        .from('clients')
        .update({ 
          intake_form_submitted: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientData.id);

      if (updateError) {
        console.error('Client update error:', updateError);
        throw updateError;
      }

      // Mark step as completed
      markStepCompleted(1);
      setShowIntakeForm(false);
      
      toast({
        title: "Intake Form Submitted!",
        description: "Thank you for completing your intake questionnaire. We'll review your information and get started on your project.",
      });

      // Reset form
      setFormData({
        currentJobTitle: '',
        targetJobTitle: '',
        industry: '',
        experience: '',
        careerGoals: '',
        challenges: '',
        additionalInfo: ''
      });

    } catch (error: any) {
      console.error('Error submitting intake form:', error);
      toast({
        title: "Error",
        description: `Failed to submit intake form: ${error.message || 'Please try again.'}`,
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const openResumeUpload = () => {
    console.log('*** OPENING RESUME UPLOAD ***');
    console.log('Current showIntakeForm state:', showIntakeForm);
    console.log('Current showResumeUpload state:', showResumeUpload);
    setShowResumeUpload(true);
    setShowIntakeForm(false); // Ensure intake form is closed
    console.log('*** Resume upload should now be visible ***');
  };

  const handleResumeUploadComplete = () => {
    setShowResumeUpload(false);
    markStepCompleted(2);
    
    toast({
      title: "Documents Uploaded!",
      description: "Your resume and documents have been uploaded successfully.",
    });
  };

  const openSessionBooking = () => {
    setShowCalendlyBooking(true);
  };

  const handleBookingComplete = () => {
    setShowCalendlyBooking(false);
    markStepCompleted(3);
    
    toast({
      title: "Session Booked!",
      description: "Your consultation has been scheduled successfully.",
    });
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
            const isClickable = step.action && step.status === 'current';
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
                  
                  {/* Intake Form Collapsible */}
                  {step.id === 1 && showIntakeForm && (
                    <Collapsible open={showIntakeForm} onOpenChange={(open) => {
                      console.log('*** INTAKE FORM COLLAPSIBLE CHANGE ***', open);
                      setShowIntakeForm(open);
                    }}>
                      <CollapsibleContent className="mt-4">
                        <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                          <h4 className="text-lg font-semibold text-rdr-navy mb-4">Intake Questionnaire</h4>
                          <form onSubmit={handleIntakeSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="currentJobTitle">Current Job Title</Label>
                                <Input
                                  id="currentJobTitle"
                                  value={formData.currentJobTitle}
                                  onChange={(e) => handleInputChange('currentJobTitle', e.target.value)}
                                  placeholder="e.g., Senior Software Engineer"
                                  required
                                />
                              </div>
                              <div>
                                <Label htmlFor="targetJobTitle">Target Job Title</Label>
                                <Input
                                  id="targetJobTitle"
                                  value={formData.targetJobTitle}
                                  onChange={(e) => handleInputChange('targetJobTitle', e.target.value)}
                                  placeholder="e.g., Lead Software Engineer"
                                  required
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="industry">Industry</Label>
                                <Input
                                  id="industry"
                                  value={formData.industry}
                                  onChange={(e) => handleInputChange('industry', e.target.value)}
                                  placeholder="e.g., Technology, Healthcare, Finance"
                                  required
                                />
                              </div>
                              <div>
                                <Label htmlFor="experience">Years of Experience</Label>
                                <Input
                                  id="experience"
                                  value={formData.experience}
                                  onChange={(e) => handleInputChange('experience', e.target.value)}
                                  placeholder="e.g., 5-7 years"
                                  required
                                />
                              </div>
                            </div>

                            <div>
                              <Label htmlFor="careerGoals">Career Goals</Label>
                              <Textarea
                                id="careerGoals"
                                value={formData.careerGoals}
                                onChange={(e) => handleInputChange('careerGoals', e.target.value)}
                                placeholder="What are your short-term and long-term career goals?"
                                rows={3}
                                required
                              />
                            </div>

                            <div>
                              <Label htmlFor="challenges">Current Challenges</Label>
                              <Textarea
                                id="challenges"
                                value={formData.challenges}
                                onChange={(e) => handleInputChange('challenges', e.target.value)}
                                placeholder="What challenges are you facing in your job search or career?"
                                rows={3}
                              />
                            </div>

                            <div>
                              <Label htmlFor="additionalInfo">Additional Information</Label>
                              <Textarea
                                id="additionalInfo"
                                value={formData.additionalInfo}
                                onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                                placeholder="Any additional information you'd like us to know?"
                                rows={2}
                              />
                            </div>

                            <div className="flex gap-4 pt-4">
                              <Button 
                                type="submit" 
                                disabled={formLoading}
                                className="flex-1"
                              >
                                {formLoading ? 'Submitting...' : 'Submit Intake Form'}
                              </Button>
                              <Button 
                                type="button" 
                                variant="outline"
                                onClick={() => setShowIntakeForm(false)}
                                disabled={formLoading}
                              >
                                Cancel
                              </Button>
                            </div>
                          </form>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resume Upload Modal */}
      {showResumeUpload && clientData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <ResumeUpload
              clientId={clientData.id}
              onUploadComplete={handleResumeUploadComplete}
              onClose={() => setShowResumeUpload(false)}
            />
          </div>
        </div>
      )}

      {/* Calendly Booking Modal */}
      {showCalendlyBooking && clientData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <CalendlyEmbed
              calendlyUrl="https://calendly.com/your-username/consultation" // Replace with your actual Calendly URL
              onBookingComplete={handleBookingComplete}
              onClose={() => setShowCalendlyBooking(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressTracker;