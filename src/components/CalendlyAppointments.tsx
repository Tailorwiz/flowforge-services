import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, ExternalLink, User, Video, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CalendlyEvent {
  id: string;
  name: string;
  status: string;
  start_time: string;
  end_time: string;
  event_type: string;
  location: {
    type: string;
    join_url?: string;
    phone_number?: string;
  };
  invitees: {
    name: string;
    email: string;
  }[];
}

interface CalendlyAppointmentsProps {
  showInDigest?: boolean;
  maxItems?: number;
}

export default function CalendlyAppointments({ showInDigest = false, maxItems }: CalendlyAppointmentsProps) {
  const [appointments, setAppointments] = useState<CalendlyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // For now, we'll use mock data since Calendly API requires authentication setup
  // In production, you would fetch from Calendly API
  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      // Mock data for demonstration
      // In production, you would call Calendly API:
      // const response = await fetch('https://api.calendly.com/scheduled_events', {
      //   headers: { 'Authorization': 'Bearer YOUR_ACCESS_TOKEN' }
      // });
      
      const mockEvents: CalendlyEvent[] = [
        {
          id: '1',
          name: 'Resume Consultation',
          status: 'active',
          start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
          end_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
          event_type: 'Resume Clarity Research & Review Interview Session',
          location: {
            type: 'zoom',
            join_url: 'https://zoom.us/j/123456789'
          },
          invitees: [{
            name: 'John Smith',
            email: 'john@example.com'
          }]
        },
        {
          id: '2',
          name: 'Career Strategy Call',
          status: 'active',
          start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // tomorrow
          end_time: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
          event_type: 'Career Strategy Session',
          location: {
            type: 'phone',
            phone_number: '+1-555-0123'
          },
          invitees: [{
            name: 'Sarah Johnson',
            email: 'sarah@example.com'
          }]
        },
        {
          id: '3',
          name: 'LinkedIn Optimization Review',
          status: 'active',
          start_time: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // day after tomorrow
          end_time: new Date(Date.now() + 49 * 60 * 60 * 1000).toISOString(),
          event_type: 'LinkedIn Profile Review',
          location: {
            type: 'zoom',
            join_url: 'https://zoom.us/j/987654321'
          },
          invitees: [{
            name: 'Mike Wilson',
            email: 'mike@example.com'
          }]
        }
      ];

      // Filter upcoming appointments and limit if needed
      const upcomingEvents = mockEvents
        .filter(event => new Date(event.start_time) > new Date())
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

      setAppointments(maxItems ? upcomingEvents.slice(0, maxItems) : upcomingEvents);
      
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: "Error loading appointments",
        description: "Failed to load Calendly appointments. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'zoom':
        return <Video className="w-4 h-4" />;
      case 'phone':
        return <Phone className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  const getTimeUntilAppointment = (startTime: string) => {
    const now = new Date();
    const appointmentTime = new Date(startTime);
    const diffMs = appointmentTime.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else {
      return 'soon';
    }
  };

  if (loading) {
    return (
      <Card className={showInDigest ? "border-blue-200" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {showInDigest ? "Upcoming Appointments" : "Calendly Appointments"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 bg-muted rounded">
                <div className="h-4 bg-muted-foreground/20 rounded mb-2"></div>
                <div className="h-3 bg-muted-foreground/20 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (appointments.length === 0) {
    return showInDigest ? null : (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Calendly Appointments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No upcoming appointments</h3>
            <p className="text-muted-foreground mb-4">
              You don't have any scheduled appointments at the moment.
            </p>
            <Button 
              onClick={() => window.open('https://calendly.com/resultsdrivenresumes', '_blank')}
              variant="outline"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Calendly
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={showInDigest ? "border-blue-200" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {showInDigest ? `Upcoming Appointments (${appointments.length})` : "Calendly Appointments"}
          </div>
          {!showInDigest && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open('https://calendly.com/resultsdrivenresumes', '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Calendly
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {appointments.map((appointment) => {
            const isToday = new Date(appointment.start_time).toDateString() === new Date().toDateString();
            const isTomorrow = new Date(appointment.start_time).toDateString() === new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString();
            
            return (
              <div 
                key={appointment.id} 
                className={`p-4 rounded-lg border ${
                  isToday ? 'bg-orange-50 border-orange-200' : 
                  isTomorrow ? 'bg-blue-50 border-blue-200' : 
                  'bg-muted/50 border-border'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">{appointment.event_type}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <User className="w-3 h-3" />
                      <span>{appointment.invitees[0]?.name || 'Guest'}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {isToday && <Badge variant="default" className="bg-orange-500">Today</Badge>}
                    {isTomorrow && <Badge variant="outline" className="border-blue-500 text-blue-700">Tomorrow</Badge>}
                    <span className="text-xs text-muted-foreground">
                      {getTimeUntilAppointment(appointment.start_time)}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>
                        {new Date(appointment.start_time).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {getLocationIcon(appointment.location.type)}
                      <span className="capitalize">{appointment.location.type}</span>
                    </div>
                  </div>
                  
                  {appointment.location.join_url && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open(appointment.location.join_url, '_blank')}
                    >
                      Join
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {showInDigest && appointments.length > 0 && (
          <div className="mt-4 pt-3 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => window.open('https://calendly.com/resultsdrivenresumes', '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View All Appointments
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}