import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CalendlyEvent {
  uri: string;
  name: string;
  status: string;
  start_time: string;
  end_time: string;
  event_type: string;
  location?: {
    type?: string;
    join_url?: string;
    phone_number?: string;
  };
  invitees_counter: {
    total: number;
    active: number;
  };
  created_at: string;
  updated_at: string;
}

interface CalendlyInvitee {
  uri: string;
  name: string;
  email: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface CalendlyApiResponse {
  collection: CalendlyEvent[];
  pagination: {
    count: number;
    next_page?: string;
    previous_page?: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const calendlyToken = Deno.env.get('CALENDLY_ACCESS_TOKEN');
    if (!calendlyToken) {
      console.error('CALENDLY_ACCESS_TOKEN not found');
      return new Response(
        JSON.stringify({ error: 'Calendly access token not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Fetching Calendly user profile...');
    
    // First, get the current user's profile to get organization info
    const userResponse = await fetch('https://api.calendly.com/users/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${calendlyToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!userResponse.ok) {
      console.error('Failed to fetch Calendly user profile:', userResponse.status, userResponse.statusText);
      const errorText = await userResponse.text();
      console.error('Error response:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate with Calendly API' }),
        { 
          status: userResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const userData = await userResponse.json();
    const userUri = userData.resource.uri;
    console.log('Calendly user URI:', userUri);

    // Get upcoming scheduled events for the user
    const now = new Date().toISOString();
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days from now
    
    const eventsUrl = `https://api.calendly.com/scheduled_events?user=${encodeURIComponent(userUri)}&min_start_time=${encodeURIComponent(now)}&max_start_time=${encodeURIComponent(futureDate)}&status=active&sort=start_time:asc`;
    
    console.log('Fetching events from:', eventsUrl);

    const eventsResponse = await fetch(eventsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${calendlyToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!eventsResponse.ok) {
      console.error('Failed to fetch Calendly events:', eventsResponse.status, eventsResponse.statusText);
      const errorText = await eventsResponse.text();
      console.error('Error response:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch events from Calendly' }),
        { 
          status: eventsResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const eventsData: CalendlyApiResponse = await eventsResponse.json();
    console.log(`Found ${eventsData.collection.length} events`);

    // Fetch event types to get better event information
    const eventTypesResponse = await fetch(`https://api.calendly.com/event_types?user=${encodeURIComponent(userUri)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${calendlyToken}`,
        'Content-Type': 'application/json',
      },
    });

    const eventTypesData = eventTypesResponse.ok ? await eventTypesResponse.json() : { collection: [] };
    const eventTypesMap = new Map(eventTypesData.collection.map((et: any) => [et.uri, et]));

    // Process events and get invitee information
    const processedEvents = await Promise.all(
      eventsData.collection.map(async (event: CalendlyEvent) => {
        // Get invitees for this event
        const inviteesResponse = await fetch(`https://api.calendly.com/scheduled_events/${event.uri.split('/').pop()}/invitees`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${calendlyToken}`,
            'Content-Type': 'application/json',
          },
        });

        let invitees: CalendlyInvitee[] = [];
        if (inviteesResponse.ok) {
          const inviteesData = await inviteesResponse.json();
          invitees = inviteesData.collection || [];
        }

        // Get event type details
        const eventType = eventTypesMap.get(event.event_type);

        return {
          id: event.uri.split('/').pop(),
          name: eventType?.name || event.name || 'Meeting',
          status: event.status,
          start_time: event.start_time,
          end_time: event.end_time,
          event_type: eventType?.name || 'Meeting',
          location: event.location || { type: 'online' },
          invitees: invitees.map(invitee => ({
            name: invitee.name,
            email: invitee.email,
            status: invitee.status
          }))
        };
      })
    );

    console.log(`Processed ${processedEvents.length} events successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        appointments: processedEvents,
        total: eventsData.pagination.count 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in fetch-calendly-appointments function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});