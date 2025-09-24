import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface StreamRequest {
  action: 'start' | 'stop' | 'status';
  channel_id: string;
  user_id?: string;
  quality?: string;
  client_ip?: string;
  user_agent?: string;
}

interface StreamResponse {
  success: boolean;
  message: string;
  stream_id?: string;
  stream_url?: string;
  data?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Missing or invalid authorization header' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify the JWT and get user
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Invalid or expired token' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body: StreamRequest = await req.json();
    console.log(`Stream control request: ${body.action} for channel ${body.channel_id} by user ${user.id}`);

    // Verify user has active subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        packages(concurrent_limit)
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString())
      .single();

    if (subError || !subscription) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'No active subscription found' 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify channel exists and is active
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('*')
      .eq('id', body.channel_id)
      .eq('active', true)
      .single();

    if (channelError || !channel) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Channel not found or inactive' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    switch (body.action) {
      case 'start':
        // Check concurrent connection limits
        const { data: activeStreams, error: streamsError } = await supabase
          .from('streams')
          .select('id')
          .eq('user_id', user.id)
          .in('state', ['starting', 'running']);

        if (streamsError) {
          console.error('Error checking active streams:', streamsError);
          return new Response(JSON.stringify({ 
            success: false, 
            message: 'Error checking concurrent streams' 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (activeStreams && activeStreams.length >= subscription.packages.concurrent_limit) {
          return new Response(JSON.stringify({ 
            success: false, 
            message: `Concurrent stream limit exceeded (${subscription.packages.concurrent_limit})` 
          }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Create new stream record
        const { data: newStream, error: createError } = await supabase
          .from('streams')
          .insert({
            channel_id: body.channel_id,
            user_id: user.id,
            state: 'starting',
            edge_server_id: 'default-server',
            clients_count: 1,
            stream_url: `https://your-cdn.com/hls/${body.channel_id}/playlist.m3u8`
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating stream:', createError);
          return new Response(JSON.stringify({ 
            success: false, 
            message: 'Failed to create stream' 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Create session record
        const { error: sessionError } = await supabase
          .from('sessions')
          .insert({
            user_id: user.id,
            stream_id: newStream.id,
            client_ip: body.client_ip || '0.0.0.0',
            user_agent: body.user_agent || 'Unknown',
            device_info: { quality: body.quality || 'auto' }
          });

        if (sessionError) {
          console.error('Error creating session:', sessionError);
        }

        // TODO: In a real implementation, this would:
        // 1. Spawn FFMPEG process for transcoding
        // 2. Update stream state to 'running'
        // 3. Return actual HLS playlist URL

        // Update stream to running state (simulation)
        await supabase
          .from('streams')
          .update({ state: 'running' })
          .eq('id', newStream.id);

        const response: StreamResponse = {
          success: true,
          message: 'Stream started successfully',
          stream_id: newStream.id,
          stream_url: newStream.stream_url
        };

        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'stop':
        // Find active stream for this user and channel
        const { data: streamToStop, error: findError } = await supabase
          .from('streams')
          .select('*')
          .eq('user_id', user.id)
          .eq('channel_id', body.channel_id)
          .in('state', ['starting', 'running'])
          .single();

        if (findError || !streamToStop) {
          return new Response(JSON.stringify({ 
            success: false, 
            message: 'No active stream found for this channel' 
          }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Update stream to stopped state
        const { error: stopError } = await supabase
          .from('streams')
          .update({ 
            state: 'stopped',
            end_timestamp: new Date().toISOString()
          })
          .eq('id', streamToStop.id);

        if (stopError) {
          console.error('Error stopping stream:', stopError);
          return new Response(JSON.stringify({ 
            success: false, 
            message: 'Failed to stop stream' 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Close any active sessions
        await supabase
          .from('sessions')
          .update({ end_time: new Date().toISOString() })
          .eq('stream_id', streamToStop.id)
          .is('end_time', null);

        // TODO: In a real implementation, this would kill the FFMPEG process

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Stream stopped successfully' 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'status':
        // Get stream status for this user and channel
        const { data: streamStatus, error: statusError } = await supabase
          .from('streams')
          .select(`
            *,
            channels(name),
            sessions(id, start_time, device_info)
          `)
          .eq('user_id', user.id)
          .eq('channel_id', body.channel_id)
          .in('state', ['starting', 'running'])
          .single();

        if (statusError || !streamStatus) {
          return new Response(JSON.stringify({ 
            success: true, 
            message: 'No active stream',
            data: { active: false }
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Stream is active',
          data: {
            active: true,
            stream_id: streamStatus.id,
            state: streamStatus.state,
            channel_name: streamStatus.channels.name,
            start_time: streamStatus.start_timestamp,
            stream_url: streamStatus.stream_url,
            clients_count: streamStatus.clients_count
          }
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      default:
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Invalid action' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

  } catch (error) {
    console.error('Stream control error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});