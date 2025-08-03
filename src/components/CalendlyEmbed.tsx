import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CalendlyEmbedProps {
  calendlyUrl?: string;
  onBookingComplete?: () => void;
  onClose?: () => void;
}

export default function CalendlyEmbed({ 
  calendlyUrl = "https://calendly.com/resultsdrivenresumes/resume-clarity-research-review-interview-session",
  onBookingComplete, 
  onClose 
}: CalendlyEmbedProps) {
  const calendlyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load Calendly widget script
    const script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.Calendly && calendlyRef.current) {
        // Initialize Calendly widget
        window.Calendly.initInlineWidget({
          url: calendlyUrl,
          parentElement: calendlyRef.current,
          prefill: {},
          utm: {}
        });

        // Listen for booking events
        window.Calendly.initEventListener({
          onEventScheduled: (e: any) => {
            console.log('Calendly event scheduled:', e);
            toast({
              title: "Session Booked!",
              description: "Your consultation has been scheduled successfully. You'll receive a confirmation email shortly.",
            });
            
            // Mark step as complete after a short delay
            setTimeout(() => {
              onBookingComplete?.();
            }, 2000);
          }
        });
      }
    };

    return () => {
      // Cleanup
      document.body.removeChild(script);
    };
  }, [calendlyUrl, onBookingComplete]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="shadow-xl border-0">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span>Schedule Your Consultation</span>
            </div>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Book a consultation call to discuss your career goals and project requirements.
          </p>
        </CardHeader>
        <CardContent>
          <div 
            ref={calendlyRef}
            className="w-full"
            style={{ minHeight: '700px', height: '100%' }}
          />
          
          {/* Fallback link in case embed doesn't work */}
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">
              Having trouble with the booking widget?
            </p>
            <Button 
              variant="outline" 
              onClick={() => window.open(calendlyUrl, '_blank')}
              className="w-full"
            >
              Open Calendly in New Tab
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Extend window interface for Calendly
declare global {
  interface Window {
    Calendly: {
      initInlineWidget: (options: {
        url: string;
        parentElement: HTMLElement;
        prefill?: Record<string, any>;
        utm?: Record<string, any>;
      }) => void;
      initEventListener: (options: {
        onEventScheduled?: (event: any) => void;
        onDateAndTimeSelected?: (event: any) => void;
        onEventTypeViewed?: (event: any) => void;
      }) => void;
    };
  }
}