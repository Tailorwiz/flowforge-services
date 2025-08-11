import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, ExternalLink, User, Video, Phone, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  // Fetch real Calendly appointments
  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('fetch-calendly-appointments');
      
      if (error) {
        console.error('Error fetching appointments:', error);
        throw new Error(error.message || 'Failed to fetch appointments');
      }

      if (data?.success && data?.appointments) {
        // Filter upcoming appointments and limit if needed
        const upcomingEvents = data.appointments
          .filter((event: CalendlyEvent) => new Date(event.start_time) > new Date())
          .sort((a: CalendlyEvent, b: CalendlyEvent) => 
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
          );

        setAppointments(maxItems ? upcomingEvents.slice(0, maxItems) : upcomingEvents);
        
        if (isRefresh) {
          toast({
            title: "Appointments refreshed",
            description: `Found ${upcomingEvents.length} upcoming appointments`,
          });
        }
      } else {
        throw new Error('Invalid response from Calendly API');
      }
      
    } catch (error) {
      console.error('Error fetching appointments:', error);
      
      // Show user-friendly error message
      toast({
        title: "Error loading appointments",
        description: error instanceof Error ? error.message : "Failed to load Calendly appointments. Please try again.",
        variant: "destructive",
      });
      
      // Fallback to empty array instead of mock data
      setAppointments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchAppointments(true);
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
          <div className="flex gap-2">
            {!showInDigest && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
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
          </div>
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