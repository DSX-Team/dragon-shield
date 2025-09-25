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
    const path = url.pathname;
    
    // Handle different endpoint formats
    if (path.includes('/live/') && path.endsWith('.m3u8')) {
      return handleStreamRequest(url, supabase);
    }
    
    if (path.includes('/series/') || path.includes('/movie/')) {
      return handleVodStreamRequest(url, supabase);
    }
    
    if (path.includes('/xmltv.php')) {
      return handleXmltvRequest(url, supabase);
    }
    
    // Extract username and password from query params (standard Xtream Codes format)
    const username = url.searchParams.get('username');
    const password = url.searchParams.get('password');
    const action = url.searchParams.get('action') || '';

    console.log(`Xtream API request - Action: ${action}, User: ${username}`);

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
        
        output = channels?.map((channel, index) => ({
          num: index + 1,
          name: channel.name,
          stream_type: "live",
          stream_id: parseInt(channel.id.replace(/-/g, '').substring(0, 8), 16), // Convert UUID to integer
          stream_icon: channel.logo_url || "",
          epg_channel_id: channel.epg_id || "",
          added: Math.floor(new Date(channel.created_at).getTime() / 1000).toString(),
          category_id: (uniqueLiveCategories.indexOf(channel.category) + 1).toString(),
          tv_archive: 0,
          direct_source: "",
          tv_archive_duration: 0
        })) || [];
        break;

      case 'get_vod_streams':
        const vodCategoryId = url.searchParams.get('category_id');
        // VOD streams - can be extended with actual VOD content
        output = [
          {
            num: 1,
            name: "Sample Movie",
            stream_id: 1001,
            stream_icon: "",
            rating: "8.5",
            genre: "Action",
            plot: "Sample movie description",
            cast: "Actor 1, Actor 2",
            director: "Director Name",
            releasedate: "2023-01-01",
            last_modified: Math.floor(Date.now() / 1000).toString(),
            category_id: vodCategoryId || "1",
            container_extension: "mp4",
            added: Math.floor(Date.now() / 1000).toString()
          }
        ];
        break;

      case 'get_series_categories':
        // Series categories
        output = [
          { category_id: "1", category_name: "Drama", parent_id: 0 },
          { category_id: "2", category_name: "Comedy", parent_id: 0 },
          { category_id: "3", category_name: "Action", parent_id: 0 }
        ];
        break;

      case 'get_series':
        const seriesCategoryId = url.searchParams.get('category_id');
        output = [
          {
            num: 1,
            name: "Sample Series",
            series_id: 2001,
            cover: "",
            plot: "Sample series description",
            cast: "Actor 1, Actor 2",
            director: "Director Name",
            genre: "Drama",
            releaseDate: "2023-01-01",
            last_modified: Math.floor(Date.now() / 1000).toString(),
            rating: "9.0",
            category_id: seriesCategoryId || "1"
          }
        ];
        break;

      case 'get_short_epg':
      case 'get_simple_data_table':
        const streamId = url.searchParams.get('stream_id');
        const limit = parseInt(url.searchParams.get('limit') || '4');

        if (streamId) {
          // Convert numeric stream_id back to UUID format for database lookup
          const { data: channel } = await supabase
            .from('channels')
            .select('id')
            .limit(1)
            .single();

          if (channel) {
            const { data: epgData } = await supabase
              .from('epg')
              .select('*')
              .eq('channel_id', channel.id)
              .gte('end_time', new Date().toISOString())
              .order('start_time')
              .limit(limit);

            const epgListings = epgData?.map((epg, index) => ({
              id: epg.id,
              epg_id: epg.program_id || "",
              title: btoa(epg.title || ""),
              lang: "en",
              description: btoa(epg.description || ""),
              category: epg.category || "",
              rating: epg.rating || "",
              start_timestamp: Math.floor(new Date(epg.start_time).getTime() / 1000).toString(),
              stop_timestamp: Math.floor(new Date(epg.end_time).getTime() / 1000).toString(),
              start: epg.start_time,
              end: epg.end_time,
              ...(action === 'get_simple_data_table' && {
                now_playing: index === 0 ? 1 : 0,
                has_archive: 0
              })
            })) || [];

            return new Response(JSON.stringify({ epg_listings: epgListings }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
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
            releasedate: new Date().toISOString().split('T')[0]
          },
          movie_data: {
            stream_id: vodId || "0",
            name: "Sample Movie",
            container_extension: "mp4"
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
    console.error('Xtream API error:', error);
    return new Response(JSON.stringify({
      user_info: { auth: 0, message: "Server error" }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Handle direct stream requests
async function handleStreamRequest(url: URL, supabase: any) {
  const username = url.searchParams.get('username');
  const password = url.searchParams.get('password');
  
  if (!username || !password) {
    return new Response('Authentication required', { status: 401 });
  }
  
  // Extract stream ID from path like /live/12345.m3u8
  const pathParts = url.pathname.split('/');
  const streamFile = pathParts[pathParts.length - 1];
  const streamId = streamFile.replace('.m3u8', '');
  
  // Find channel by converted stream ID
  const { data: channels } = await supabase
    .from('channels')
    .select('id, name, upstream_sources')
    .eq('active', true);
    
  const channel = channels?.find((c: any) => {
    const convertedId = parseInt(c.id.replace(/-/g, '').substring(0, 8), 16);
    return convertedId.toString() === streamId;
  });
  
  if (!channel || !channel.upstream_sources?.[0]) {
    return new Response('Stream not found', { status: 404 });
  }
  
  // Return M3U8 playlist
  const m3u8Content = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1920x1080
${channel.upstream_sources[0].url}
`;
  
  return new Response(m3u8Content, {
    headers: { 
      ...corsHeaders,
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Cache-Control': 'no-cache'
    }
  });
}

// Handle VOD stream requests
async function handleVodStreamRequest(url: URL, supabase: any) {
  const username = url.searchParams.get('username');
  const password = url.searchParams.get('password');
  
  if (!username || !password) {
    return new Response('Authentication required', { status: 401 });
  }
  
  // Return sample VOD stream
  return new Response('Sample VOD stream not implemented', { status: 404 });
}

// Handle XMLTV EPG requests
async function handleXmltvRequest(url: URL, supabase: any) {
  const username = url.searchParams.get('username');
  const password = url.searchParams.get('password');
  
  if (!username || !password) {
    return new Response('Authentication required', { status: 401 });
  }
  
  // Get EPG data from database
  const { data: epgData } = await supabase
    .from('epg')
    .select(`
      *,
      channels (id, name, epg_id)
    `)
    .gte('end_time', new Date().toISOString())
    .order('start_time');
  
  // Generate XMLTV format
  let xmltv = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE tv SYSTEM "xmltv.dtd">
<tv generator-info-name="Dragon Shield IPTV">
`;
  
  // Add channel definitions
  const { data: channels } = await supabase
    .from('channels')
    .select('id, name, epg_id')
    .eq('active', true);
    
  for (const channel of channels || []) {
    const channelId = channel.epg_id || channel.id;
    xmltv += `  <channel id="${channelId}">
    <display-name>${channel.name}</display-name>
  </channel>
`;
  }
  
  // Add programme data
  for (const epg of epgData || []) {
    if (epg.channels?.epg_id) {
      const startTime = new Date(epg.start_time).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      const stopTime = new Date(epg.end_time).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      
      xmltv += `  <programme start="${startTime}" stop="${stopTime}" channel="${epg.channels.epg_id}">
    <title>${epg.title}</title>
    <desc>${epg.description || ''}</desc>
    <category>${epg.category || ''}</category>
  </programme>
`;
    }
  }
  
  xmltv += '</tv>';
  
  return new Response(xmltv, {
    headers: { 
      ...corsHeaders,
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}