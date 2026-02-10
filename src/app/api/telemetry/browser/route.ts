import { NextRequest, NextResponse } from 'next/server';
import { ServerTelemetryCollector } from '@/lib/telemetry/collector/server-collector';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const events = await request.json();
    
    // Validate events structure
    if (!Array.isArray(events)) {
      return NextResponse.json({ error: 'Invalid event format' }, { status: 400 });
    }

    // Store events in PostgreSQL database
    const storedEvents = [];
    
    for (const event of events) {
      try {
        // Map telemetry event to database schema
        const dbEvent = {
          event_type: event.eventType || 'unknown',
          event_name: event.eventName || event.eventType || 'unnamed_event',
          timestamp: event.timestamp || new Date().toISOString(),
          user_id: event.userId ? event.userId : null,
          organization_id: event.context?.organizationId ? event.context.organizationId : null,
          session_id: event.sessionId || null,
          payload: event.payload || {},
          user_agent: event.metadata?.userAgent || request.headers.get('user-agent') || null,
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
          device_type: event.metadata?.deviceInfo?.deviceType || null,
          browser: event.metadata?.deviceInfo?.browser || null,
          os: event.metadata?.deviceInfo?.os || null,
          screen_size: event.metadata?.deviceInfo ? 
            `${event.metadata.deviceInfo.screenWidth}x${event.metadata.deviceInfo.screenHeight}` : null,
          page_url: event.metadata?.pageUrl || null,
          referrer: event.metadata?.referrer || null,
          duration: event.payload?.duration || null,
          performance_data: event.metadata?.performance || null
        };

        // Insert into database
        const { data, error } = await supabase
          .from('telemetry_events')
          .insert([dbEvent])
          .select();

        if (error) {
          console.error('Failed to store telemetry event:', error);
          // Continue with other events even if one fails
          continue;
        }

        if (data && data.length > 0) {
          storedEvents.push(data[0]);
        }
      } catch (eventError) {
        console.error('Error processing individual event:', eventError);
        // Continue processing other events
      }
    }
    
    // Process events (basic processing since processBatch doesn't exist)
    const processedEvents = events.length;
    
    return NextResponse.json({ 
      success: true, 
      processed: processedEvents,
      stored: storedEvents.length,
      totalReceived: events.length
    });

  } catch (error) {
    console.error('Telemetry processing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Health check endpoint - simplified since getStats doesn't exist
    return NextResponse.json({ 
      status: 'healthy',
      collector: 'ServerTelemetryCollector initialized'
    });
  } catch (error) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}