import React from 'react';
import { Check, Clock, Upload, Calendar, Eye } from 'lucide-react';

interface Step {
  id: number;
  title: string;
  icon: React.ReactNode;
  status: 'completed' | 'current' | 'upcoming';
}

interface ProgressTrackerProps {
  currentStep?: number;
  className?: string;
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({ currentStep = 4, className = "" }) => {
  const steps: Step[] = [
    {
      id: 1,
      title: "Intake Form",
      icon: <Check className="w-4 h-4" />,
      status: currentStep > 1 ? 'completed' : currentStep === 1 ? 'current' : 'upcoming'
    },
    {
      id: 2,
      title: "Upload Resume",
      icon: <Upload className="w-4 h-4" />,
      status: currentStep > 2 ? 'completed' : currentStep === 2 ? 'current' : 'upcoming'
    },
    {
      id: 3,
      title: "Book Session",
      icon: <Calendar className="w-4 h-4" />,
      status: currentStep > 3 ? 'completed' : currentStep === 3 ? 'current' : 'upcoming'
    },
    {
      id: 4,
      title: "In Progress",
      icon: <Clock className="w-4 h-4" />,
      status: currentStep > 4 ? 'completed' : currentStep === 4 ? 'current' : 'upcoming'
    },
    {
      id: 5,
      title: "Review Documents",
      icon: <Eye className="w-4 h-4" />,
      status: currentStep > 5 ? 'completed' : currentStep === 5 ? 'current' : 'upcoming'
    }
  ];

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
          {steps.map((step) => (
            <div key={step.id} className="relative flex items-center">
              {/* Step Icon */}
              <div className={`
                relative z-10 w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300
                ${step.status === 'completed' 
                  ? 'bg-rdr-gold border-rdr-gold text-rdr-navy' 
                  : step.status === 'current'
                  ? 'bg-rdr-navy border-rdr-navy text-white'
                  : 'bg-white border-border text-rdr-medium-gray'
                }
              `}>
                {step.status === 'completed' ? <Check className="w-5 h-5" /> : step.icon}
              </div>
              
              {/* Step Content */}
              <div className="ml-4">
                <h4 className={`
                  font-medium transition-colors duration-300
                  ${step.status === 'completed' || step.status === 'current' 
                    ? 'text-rdr-navy' 
                    : 'text-rdr-medium-gray'
                  }
                `}>
                  {step.title}
                </h4>
                {step.status === 'completed' && (
                  <span className="text-sm text-rdr-gold font-medium">✓ Complete</span>
                )}
                {step.status === 'current' && (
                  <span className="text-sm text-rdr-navy font-medium">In Progress</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProgressTracker;