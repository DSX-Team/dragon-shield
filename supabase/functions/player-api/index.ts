import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    
    // Extract username and password from query params (standard Xtream Codes format)
    const username = url.searchParams.get('username');
    const password = url.searchParams.get('password');
    const action = url.searchParams.get('action') || '';

    console.log(`Player API request - Action: ${action}, User: ${username}`);

    // This is the main player_api.php endpoint that Xtream Codes uses
    // It's identical to the xtream-api but with the traditional endpoint name
    
    if (!username || !password) {
      return new Response(JSON.stringify({
        user_info: { auth: 0, message: "Authentication required" }
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Authenticate user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, user_id, status, username')
      .eq('username', username)
      .single();

    if (profileError || !profile) {
      console.log('User not found:', username);
      return new Response(JSON.stringify({
        user_info: { auth: 0, message: "Invalid credentials" }
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (profile.status !== 'active') {
      return new Response(JSON.stringify({
        user_info: { auth: 0, message: "Account suspended" }
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check active subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select(`
        id,
        status,
        end_date,
        package_id,
        packages (
          id,
          name,
          features
        )
      `)
      .eq('user_id', profile.user_id)
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString())
      .single();

    if (subError || !subscription) {
      console.log('No active subscription found for user:', username);
      return new Response(JSON.stringify({
        user_info: { auth: 0, message: "No active subscription" }
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get unique categories for live streams
    const { data: allCategories } = await supabase
      .from('channels')
      .select('category')
      .eq('active', true)
      .not('category', 'is', null);
    
    const uniqueLiveCategories = [...new Set(allCategories?.map(c => c.category).filter(Boolean))];

    let output: any = {};

    // Handle different Xtream Codes API actions
    switch (action) {
      case 'get_live_categories':
        output = uniqueLiveCategories.map((category, index) => ({
          category_id: (index + 1).toString(),
          category_name: category || 'General',
          parent_id: 0
        }));
        break;

      case 'get_vod_categories':
        // VOD categories - can be extended later
        output = [
          { category_id: "1", category_name: "Movies", parent_id: 0 },
          { category_id: "2", category_name: "TV Series", parent_id: 0 }
        ];
        break;

      case 'get_live_streams':
        const categoryId = url.searchParams.get('category_id');
        let channelsQuery = supabase
          .from('channels')
          .select('id, name, category, logo_url, epg_id, upstream_sources, created_at')
          .eq('active', true);
        
        if (categoryId && parseInt(categoryId) > 0) {
          const categoryName = uniqueLiveCategories[parseInt(categoryId) - 1];
          if (categoryName) {
            channelsQuery = channelsQuery.eq('category', categoryName);
          }
        }

        const { data: channels } = await channelsQuery.order('name');
        
        // Convert channels to Xtream format with stream URLs
        output = [];
        for (const channel of channels || []) {
          const streamId = parseInt(channel.id.replace(/-/g, '').substring(0, 8), 16);
          const streamUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/stream-control/live/${channel.id}.m3u8?username=${username}&password=${password}`;
          
          output.push({
            num: output.length + 1,
            name: channel.name,
            stream_type: "live",
            stream_id: streamId,
            stream_icon: channel.logo_url || "",
            epg_channel_id: channel.epg_id || "",
            added: Math.floor(new Date(channel.created_at).getTime() / 1000).toString(),
            category_id: (uniqueLiveCategories.indexOf(channel.category) + 1).toString(),
            tv_archive: 0,
            direct_source: streamUrl,
            tv_archive_duration: 0
          });
        }
        break;

      case 'get_vod_streams':
        // VOD streams - placeholder for future implementation
        output = [];
        break;

      case 'get_short_epg':
      case 'get_simple_data_table':
        const streamId = url.searchParams.get('stream_id');
        const limit = parseInt(url.searchParams.get('limit') || '4');

        if (streamId) {
          // For now, return sample EPG data since we need to implement EPG properly
          const epgListings = [
            {
              id: "1",
              epg_id: streamId,
              title: btoa("Current Program"),
              lang: "en",
              description: btoa("Live streaming content"),
              category: "General",
              rating: "",
              start_timestamp: Math.floor(Date.now() / 1000 - 3600).toString(),
              stop_timestamp: Math.floor(Date.now() / 1000 + 3600).toString(),
              start: new Date(Date.now() - 3600000).toISOString().slice(0, 19).replace('T', ' '),
              end: new Date(Date.now() + 3600000).toISOString().slice(0, 19).replace('T', ' '),
              ...(action === 'get_simple_data_table' && {
                now_playing: 1,
                has_archive: 0
              })
            }
          ];

          return new Response(JSON.stringify({ epg_listings: epgListings }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        return new Response(JSON.stringify({ epg_listings: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'get_vod_info':
        const vodId = url.searchParams.get('vod_id');
        // VOD info placeholder - can be extended when VOD is implemented
        output = {
          info: {
            name: "Sample Movie",
            description: "Sample movie description",
            genre: "Action",
            director: "Unknown",
            cast: "Unknown",
            rating: "0",
            duration: "0",
            releasedate: new Date().toISOString().split('T')[0],
            movie_image: "",
            plot: "Sample plot description"
          },
          movie_data: {
            stream_id: vodId || "0",
            name: "Sample Movie",
            container_extension: "mp4",
            added: Math.floor(Date.now() / 1000).toString(),
            category_id: "1"
          }
        };
        break;

      default:
        // Default action returns user info and server info (authentication response)
        const serverUrl = Deno.env.get('SUPABASE_URL')?.replace('https://', '').replace('.supabase.co/functions/v1', '.supabase.co') || 'localhost';
        
        output = {
          user_info: {
            username: profile.username,
            password: password,
            message: "",
            auth: 1,
            status: "Active",
            exp_date: subscription ? Math.floor(new Date(subscription.end_date).getTime() / 1000).toString() : null,
            is_trial: "0",
            active_cons: "0",
            created_at: Math.floor(new Date().getTime() / 1000).toString(),
            max_connections: "1",
            allowed_output_formats: ["m3u8", "ts", "rtmp"]
          },
          server_info: {
            url: serverUrl,
            port: "443",
            server_protocol: "https",
            timezone: "UTC",
            timestamp_now: Math.floor(Date.now() / 1000),
            time_now: new Date().toISOString().slice(0, 19).replace('T', ' '),
            rtmp_port: "",
            https_port: "443"
          }
        };
    }

    return new Response(JSON.stringify(output), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Player API error:', error);
    return new Response(JSON.stringify({
      user_info: { auth: 0, message: "Server error" }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});