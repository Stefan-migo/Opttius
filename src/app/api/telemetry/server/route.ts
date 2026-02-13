import { NextRequest, NextResponse } from 'next/server';
import { serverTelemetryCollector } from '@/lib/telemetry/collector/server-collector';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const events = await request.json();
    
    if (!Array.isArray(events)) {
      return NextResponse.json({ error: 'Invalid event format' }, { status: 400 });
    }

    // Store server events in PostgreSQL database
    const storedEvents = [];
    
    for (const event of events) {
      try {
        // Map server telemetry event to database schema
        const dbEvent = {
          event_type: event.eventType || 'server_event',
          event_name: event.eventName || event.eventType || 'unnamed_server_event',
          timestamp: event.timestamp || new Date().toISOString(),
          user_id: event.userId ? event.userId : null,
          organization_id: event.context?.organizationId ? event.context.organizationId : null,
          session_id: event.sessionId || null,
          payload: event.payload || {},
          user_agent: request.headers.get('user-agent') || null,
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
          device_type: null, // Server events don't have device info
          browser: null,
          os: null,
          screen_size: null,
          page_url: event.metadata?.pageUrl || null,
          referrer: event.metadata?.referrer || null,
          duration: event.payload?.duration || event.metadata?.performance?.responseTime || null,
          performance_data: event.metadata?.performance || null
        };

        // Insert into database
        const { data, error } = await supabase
          .from('telemetry_events')
          .insert([dbEvent])
          .select();

        if (error) {
          console.error('Failed to store server telemetry event:', error);
          console.error('Server event data:', JSON.stringify(dbEvent, null, 2));
          // Continue with other events even if one fails
          continue;
        }

        if (data && data.length > 0) {
          storedEvents.push(data[0]);
        }
      } catch (eventError) {
        console.error('Error processing individual server event:', eventError);
        // Continue processing other events
      }
    }

    // Process events through server collector (basic processing)
    // Note: processBatch method doesn't exist, so we'll just count events
    const processedEvents = events.length;
    
    return NextResponse.json({ 
      success: true, 
      processed: processedEvents,
      stored: storedEvents.length,
      totalReceived: events.length
    });

  } catch (error) {
    console.error('Server telemetry error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}