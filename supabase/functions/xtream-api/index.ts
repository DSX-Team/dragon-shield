import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface XtreamUserProfile {
  id: string;
  user_id: string;
  status: string;
  username: string;
  api_password?: string;
  max_connections: number;
  created_at: string;
  last_login?: string;
  is_trial: boolean;
  trial_expires_at?: string;
  roles: string[];
}

interface XtreamSubscription {
  id: string;
  status: string;
  end_date: string;
  start_date: string;
  package_id: string;
  packages: {
    id: string;
    name: string;
    features: any;
    concurrent_limit: number;
  }[];
}

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
    
    console.log(`Xtream API Request: ${req.method} ${path}`);
    
    // Handle different endpoint formats
    if (path.includes('/live/') && (path.endsWith('.m3u8') || path.endsWith('.ts'))) {
      return handleStreamRequest(url, supabase);
    }
    
    if (path.includes('/series/') || path.includes('/movie/')) {
      return handleVodStreamRequest(url, supabase);
    }
    
    if (path.includes('/xmltv') || path.includes('xmltv.php')) {
      return handleXmltvRequest(url, supabase);
    }

    if (path.includes('/timeshift/')) {
      return handleTimeshiftRequest(url, supabase);
    }
    
    // Extract authentication from query params or form data
    let username: string | null = null;
    let password: string | null = null;
    let action: string = '';

    if (req.method === 'GET') {
      username = url.searchParams.get('username');
      password = url.searchParams.get('password');
      action = url.searchParams.get('action') || '';
    } else if (req.method === 'POST') {
      const formData = await req.formData();
      username = formData.get('username')?.toString() || url.searchParams.get('username');
      password = formData.get('password')?.toString() || url.searchParams.get('password');
      action = formData.get('action')?.toString() || url.searchParams.get('action') || '';
    }

    console.log(`Xtream API request - Action: ${action}, User: ${username}`);

    if (!username || !password) {
      return createErrorResponse('Authentication required', 401);
    }

    // Authenticate user with both username/password and api_password support
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id, user_id, status, username, api_password, max_connections, 
        created_at, last_login, is_trial, trial_expires_at, roles
      `)
      .eq('username', username)
      .single();

    if (profileError || !profile) {
      console.log('User not found:', username);
      return createErrorResponse('Invalid credentials', 401);
    }

    // Verify password (either regular password or API password)
    const isValidPassword = profile.api_password === password;
    
    if (!isValidPassword) {
      console.log('Invalid password for user:', username);
      return createErrorResponse('Invalid credentials', 401);
    }

    if (profile.status !== 'active') {
      return createErrorResponse('Account suspended', 403);
    }

    // Check active subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select(`
        id, status, end_date, start_date, package_id,
        packages (
          id, name, features, concurrent_limit
        )
      `)
      .eq('user_id', profile.user_id)
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString())
      .single();

    if (subError || !subscription) {
      console.log('No active subscription found for user:', username);
      return createErrorResponse('No active subscription', 403);
    }

    // Update last login
    await supabase
      .from('profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('id', profile.id);

    // Handle different Xtream Codes API actions
    const output = await handleXtreamAction(action, url, supabase, profile, subscription);
    
    return new Response(JSON.stringify(output), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Xtream API error:', error);
    return createErrorResponse('Server error', 500);
  }
});

function createErrorResponse(message: string, status: number) {
  return new Response(JSON.stringify({
    user_info: { auth: 0, message }
  }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleXtreamAction(
  action: string, 
  url: URL, 
  supabase: any, 
  profile: XtreamUserProfile, 
  subscription: XtreamSubscription
): Promise<any> {
  
  switch (action) {
    case 'get_live_categories':
      return getLiveCategories(supabase);
      
    case 'get_live_streams':
      return getLiveStreams(url, supabase);
      
    case 'get_vod_categories':
      return getVodCategories(supabase);
      
    case 'get_vod_streams':
      return getVodStreams(url, supabase);
      
    case 'get_series_categories':
      return getSeriesCategories(supabase);
      
    case 'get_series':
      return getSeries(url, supabase);
      
    case 'get_series_info':
      return getSeriesInfo(url, supabase);
      
    case 'get_short_epg':
    case 'get_simple_data_table':
      return getEpgData(url, supabase, action);
      
    case 'get_vod_info':
      return getVodInfo(url, supabase);
      
    case 'get_all_channels':
      return getAllChannels(supabase);
      
    case 'get_bouquets':
      return getBouquets(supabase);
      
    case 'get_channel_categories':
      return getChannelCategories(supabase);
      
    default:
      return getAuthenticationResponse(profile, subscription);
  }
}

async function getLiveCategories(supabase: any) {
  const { data: categories } = await supabase
    .from('channels')
    .select('category')
    .eq('active', true)
    .not('category', 'is', null);
    
  const uniqueCategories = [...new Set(categories?.map((c: any) => c.category).filter(Boolean))] as string[];
  
  return uniqueCategories.map((category: string, index: number) => ({
    category_id: (index + 1).toString(),
    category_name: category,
    parent_id: 0
  }));
}

async function getLiveStreams(url: URL, supabase: any) {
  const categoryId = url.searchParams.get('category_id');
  
  // Get categories for ID mapping
  const { data: allCategories } = await supabase
    .from('channels')
    .select('category')
    .eq('active', true)
    .not('category', 'is', null);
    
  const uniqueCategories = [...new Set(allCategories?.map((c: any) => c.category).filter(Boolean))] as string[];
  
  let channelsQuery = supabase
    .from('channels')
    .select('id, name, category, logo_url, epg_id, upstream_sources, created_at')
    .eq('active', true);
  
  if (categoryId && parseInt(categoryId) > 0) {
    const categoryName = uniqueCategories[parseInt(categoryId) - 1];
    if (categoryName) {
      channelsQuery = channelsQuery.eq('category', categoryName);
    }
  }

  const { data: channels } = await channelsQuery.order('name');
  
  return channels?.map((channel: any, index: number) => ({
    num: index + 1,
    name: channel.name,
    stream_type: "live",
    stream_id: convertUuidToStreamId(channel.id),
    stream_icon: channel.logo_url || "",
    epg_channel_id: channel.epg_id || channel.id,
    added: Math.floor(new Date(channel.created_at).getTime() / 1000).toString(),
    category_id: (uniqueCategories.indexOf(channel.category) + 1).toString(),
    tv_archive: 0,
    direct_source: "",
    tv_archive_duration: 0,
    custom_sid: "",
    is_adult: "0"
  })) || [];
}

async function getVodCategories(supabase: any) {
  // VOD categories - can be extended with real VOD categories
  return [
    { category_id: "1", category_name: "Movies", parent_id: 0 },
    { category_id: "2", category_name: "Documentaries", parent_id: 0 },
    { category_id: "3", category_name: "Kids", parent_id: 0 },
    { category_id: "4", category_name: "Sports", parent_id: 0 }
  ];
}

async function getVodStreams(url: URL, supabase: any) {
  const categoryId = url.searchParams.get('category_id');
  
  // Sample VOD streams - extend with real VOD content
  return [
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
      category_id: categoryId || "1",
      container_extension: "mp4",
      added: Math.floor(Date.now() / 1000).toString(),
      is_adult: "0",
      duration_secs: 7200,
      duration: "02:00:00"
    }
  ];
}

async function getSeriesCategories(supabase: any) {
  return [
    { category_id: "1", category_name: "Drama", parent_id: 0 },
    { category_id: "2", category_name: "Comedy", parent_id: 0 },
    { category_id: "3", category_name: "Action", parent_id: 0 },
    { category_id: "4", category_name: "Thriller", parent_id: 0 },
    { category_id: "5", category_name: "Documentary", parent_id: 0 }
  ];
}

async function getSeries(url: URL, supabase: any) {
  const categoryId = url.searchParams.get('category_id');
  
  return [
    {
      num: 1,
      name: "Sample Series",
      series_id: 2001,
      cover: "",
      plot: "Sample series description with multiple seasons and episodes",
      cast: "Lead Actor 1, Lead Actor 2, Supporting Cast",
      director: "Director Name",
      genre: "Drama",
      releaseDate: "2023-01-01",
      last_modified: Math.floor(Date.now() / 1000).toString(),
      rating: "9.0",
      rating_5based: 4.5,
      category_id: categoryId || "1",
      backdrop_path: [""],
      youtube_trailer: "",
      episode_run_time: "45",
      is_adult: "0"
    }
  ];
}

async function getSeriesInfo(url: URL, supabase: any) {
  const seriesId = url.searchParams.get('series_id');
  
  // Sample series info with seasons and episodes
  return {
    seasons: [
      {
        air_date: "2023-01-01",
        episode_count: 10,
        id: 1,
        name: "Season 1",
        overview: "First season description",
        poster_path: "",
        season_number: 1
      }
    ],
    info: {
      name: "Sample Series",
      cover: "",
      plot: "Detailed series description",
      cast: "Full cast list",
      director: "Director Name",
      genre: "Drama",
      releaseDate: "2023-01-01",
      rating: "9.0",
      duration: "45 min",
      video: "",
      audio: ""
    },
    episodes: {
      "1": [
        {
          id: "1.1",
          episode_num: 1,
          title: "Episode 1",
          container_extension: "mp4",
          info: {
            air_date: "2023-01-01",
            crew: "Episode crew",
            overview: "Episode 1 description",
            vote_average: 8.5,
            vote_count: 100,
            duration_secs: 2700,
            duration: "45:00"
          },
          custom_sid: "",
          added: Math.floor(Date.now() / 1000).toString(),
          season: 1,
          direct_source: ""
        }
      ]
    }
  };
}

async function getEpgData(url: URL, supabase: any, action: string) {
  const streamId = url.searchParams.get('stream_id');
  const limit = parseInt(url.searchParams.get('limit') || '4');
  
  if (!streamId) {
    return { epg_listings: [] };
  }
  
  // Find channel by stream ID
  const { data: channels } = await supabase
    .from('channels')
    .select('id, epg_id')
    .eq('active', true);
    
  const channel = channels?.find((c: any) => convertUuidToStreamId(c.id).toString() === streamId);
  
  if (!channel) {
    return { epg_listings: [] };
  }
  
  const { data: epgData } = await supabase
    .from('epg')
    .select('*')
    .eq('channel_id', channel.id)
    .gte('end_time', new Date().toISOString())
    .order('start_time')
    .limit(limit);

  const epgListings = epgData?.map((epg: any, index: number) => ({
    id: epg.id,
    epg_id: epg.program_id || "",
    title: epg.title || "",
    lang: "en",
    description: epg.description || "",
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

  return { epg_listings: epgListings };
}

async function getVodInfo(url: URL, supabase: any) {
  const vodId = url.searchParams.get('vod_id');
  
  return {
    info: {
      tmdb_id: "",
      name: "Sample Movie",
      o_name: "Sample Movie Original",
      cover_big: "",
      movie_image: "",
      releasedate: "2023-01-01",
      episode_run_time: "120",
      youtube_trailer: "",
      director: "Director Name",
      actors: "Actor 1, Actor 2",
      cast: "Full Cast List",
      description: "Detailed movie description",
      plot: "Movie plot",
      age: "PG-13",
      country: "USA",
      genre: "Action, Drama",
      backdrop_path: [""],
      duration_secs: 7200,
      duration: "02:00:00",
      video: "",
      audio: "",
      rating: "8.5",
      is_adult: 0
    },
    movie_data: {
      stream_id: vodId || "0",
      name: "Sample Movie",
      added: Math.floor(Date.now() / 1000).toString(),
      category_id: "1",
      container_extension: "mp4",
      custom_sid: "",
      direct_source: ""
    }
  };
}

async function getAllChannels(supabase: any) {
  const { data: channels } = await supabase
    .from('channels')
    .select('id, name, category, logo_url, epg_id, created_at')
    .eq('active', true)
    .order('name');
    
  return channels?.map((channel: any, index: number) => ({
    num: index + 1,
    name: channel.name,
    stream_id: convertUuidToStreamId(channel.id),
    stream_icon: channel.logo_url || "",
    epg_channel_id: channel.epg_id || channel.id,
    added: Math.floor(new Date(channel.created_at).getTime() / 1000).toString()
  })) || [];
}

async function getBouquets(supabase: any) {
  const { data: bouquets } = await supabase
    .from('bouquets')
    .select('id, name, description, channel_ids')
    .order('sort_order');
    
  return bouquets?.map((bouquet: any, index: number) => ({
    bouquet_id: index + 1,
    bouquet_name: bouquet.name,
    channel_count: bouquet.channel_ids?.length || 0
  })) || [];
}

async function getChannelCategories(supabase: any) {
  return getLiveCategories(supabase);
}

function getAuthenticationResponse(profile: XtreamUserProfile, subscription: XtreamSubscription) {
  const serverUrl = Deno.env.get('SUPABASE_URL')?.replace('https://', '').replace('.supabase.co', '.supabase.co') || 'localhost';
  
  return {
    user_info: {
      username: profile.username,
      password: profile.api_password || "",
      message: "",
      auth: 1,
      status: "Active",
      exp_date: Math.floor(new Date(subscription.end_date).getTime() / 1000).toString(),
      is_trial: profile.is_trial ? "1" : "0",
      active_cons: "0",
      created_at: Math.floor(new Date(profile.created_at).getTime() / 1000).toString(),
      max_connections: profile.max_connections.toString(),
      allowed_output_formats: ["m3u8", "ts", "rtmp"],
      package: subscription.packages[0]?.name || "Default Package"
    },
    server_info: {
      url: serverUrl,
      port: "443",
      server_protocol: "https",
      timezone: "UTC",
      timestamp_now: Math.floor(Date.now() / 1000),
      time_now: new Date().toISOString().slice(0, 19).replace('T', ' '),
      rtmp_port: "1935",
      https_port: "443",
      server_name: "Dragon Shield IPTV",
      version: "1.0.0"
    }
  };
}

function convertUuidToStreamId(uuid: string): number {
  return parseInt(uuid.replace(/-/g, '').substring(0, 8), 16);
}

function convertStreamIdToUuid(streamId: string, channels: any[]): string | null {
  const channel = channels.find((c: any) => convertUuidToStreamId(c.id).toString() === streamId);
  return channel?.id || null;
}

// Handle direct stream requests
async function handleStreamRequest(url: URL, supabase: any) {
  console.log('Handling stream request:', url.pathname);
  
  const username = url.searchParams.get('username');
  const password = url.searchParams.get('password');
  
  if (!username || !password) {
    return new Response('Authentication required', { 
      status: 401,
      headers: corsHeaders 
    });
  }
  
  // Authenticate user first
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, user_id, status, api_password')
    .eq('username', username)
    .single();

  if (!profile || profile.api_password !== password || profile.status !== 'active') {
    return new Response('Invalid credentials', { 
      status: 401,
      headers: corsHeaders 
    });
  }
  
  // Extract stream ID from path like /live/12345.m3u8 or /live/12345.ts
  const pathParts = url.pathname.split('/');
  const streamFile = pathParts[pathParts.length - 1];
  const streamId = streamFile.replace(/\.(m3u8|ts)$/, '');
  
  console.log('Looking for stream ID:', streamId);
  
  // Find channel by converted stream ID
  const { data: channels } = await supabase
    .from('channels')
    .select('id, name, upstream_sources')
    .eq('active', true);
    
  const channel = channels?.find((c: any) => {
    const convertedId = convertUuidToStreamId(c.id);
    return convertedId.toString() === streamId;
  });
  
  if (!channel || !channel.upstream_sources?.[0]) {
    console.log('Stream not found for ID:', streamId);
    return new Response('Stream not found', { 
      status: 404,
      headers: corsHeaders 
    });
  }

  console.log('Found channel:', channel.name, 'URL:', channel.upstream_sources[0].url);
  
  // Log user session
  await supabase
    .from('sessions')
    .insert({
      user_id: profile.user_id,
      stream_id: channel.id,
      client_ip: getClientIP(url),
      user_agent: 'Xtream Client',
      device_info: { type: 'xtream_api' }
    });
  
  // Handle different stream formats
  if (streamFile.endsWith('.m3u8')) {
    // Return M3U8 playlist
    const upstreamUrl = channel.upstream_sources[0].url;
    
    // If upstream is already M3U8, redirect or proxy
    if (upstreamUrl.includes('.m3u8')) {
      return Response.redirect(upstreamUrl, 302);
    }
    
    // Create M3U8 wrapper for other formats
    const m3u8Content = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:EVENT
#EXTINF:10.0,
${upstreamUrl}
#EXT-X-ENDLIST
`;
    
    return new Response(m3u8Content, {
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } else if (streamFile.endsWith('.ts')) {
    // Redirect to upstream TS stream
    return Response.redirect(channel.upstream_sources[0].url, 302);
  }
  
  return new Response('Invalid stream format', { 
    status: 400,
    headers: corsHeaders 
  });
}

// Handle VOD stream requests
async function handleVodStreamRequest(url: URL, supabase: any) {
  const username = url.searchParams.get('username');
  const password = url.searchParams.get('password');
  
  if (!username || !password) {
    return new Response('Authentication required', { status: 401 });
  }
  
  // Authenticate user
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, user_id, status, api_password')
    .eq('username', username)
    .single();

  if (!profile || profile.api_password !== password) {
    return new Response('Invalid credentials', { status: 401 });
  }
  
  const pathParts = url.pathname.split('/');
  
  if (pathParts.includes('movie')) {
    const movieId = pathParts[pathParts.length - 1].replace(/\.(mp4|mkv|avi)$/, '');
    console.log('VOD Movie request for ID:', movieId);
    
    // Return sample VOD stream - extend with real VOD implementation
    return new Response('VOD Movie stream not implemented yet', { 
      status: 501,
      headers: corsHeaders 
    });
  }
  
  if (pathParts.includes('series')) {
    const seriesFile = pathParts[pathParts.length - 1];
    console.log('Series episode request:', seriesFile);
    
    // Return sample series stream - extend with real series implementation
    return new Response('Series stream not implemented yet', { 
      status: 501,
      headers: corsHeaders 
    });
  }
  
  return new Response('Invalid VOD request', { 
    status: 400,
    headers: corsHeaders 
  });
}

// Handle timeshift requests
async function handleTimeshiftRequest(url: URL, supabase: any) {
  const username = url.searchParams.get('username');
  const password = url.searchParams.get('password');
  
  if (!username || !password) {
    return new Response('Authentication required', { status: 401 });
  }
  
  // Timeshift not implemented yet
  return new Response('Timeshift not implemented', { 
    status: 501,
    headers: corsHeaders 
  });
}

// Handle XMLTV EPG requests
async function handleXmltvRequest(url: URL, supabase: any) {
  const username = url.searchParams.get('username');
  const password = url.searchParams.get('password');
  
  if (!username || !password) {
    return new Response('Authentication required', { 
      status: 401,
      headers: corsHeaders 
    });
  }
  
  // Authenticate user
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, user_id, status, api_password')
    .eq('username', username)
    .single();

  if (!profile || profile.api_password !== password) {
    return new Response('Invalid credentials', { 
      status: 401,
      headers: corsHeaders 
    });
  }
  
  console.log('Generating XMLTV for user:', username);
  
  // Get EPG data from database
  const { data: epgData } = await supabase
    .from('epg')
    .select(`
      id, title, description, start_time, end_time, category, rating, program_id,
      channels!inner (id, name, epg_id, active)
    `)
    .gte('end_time', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
    .lte('start_time', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()) // Next 7 days
    .eq('channels.active', true)
    .order('start_time');
  
  // Generate XMLTV format
  let xmltv = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE tv SYSTEM "xmltv.dtd">
<tv generator-info-name="Dragon Shield IPTV" generator-info-version="1.0">
`;
  
  // Get unique channels for channel definitions
  const uniqueChannels = new Map();
  epgData?.forEach((epg: any) => {
    if (epg.channels && !uniqueChannels.has(epg.channels.id)) {
      uniqueChannels.set(epg.channels.id, epg.channels);
    }
  });
  
  // Add channel definitions
  for (const [channelId, channel] of uniqueChannels) {
    const epgChannelId = channel.epg_id || convertUuidToStreamId(channel.id).toString();
    xmltv += `  <channel id="${epgChannelId}">
    <display-name>${escapeXml(channel.name)}</display-name>
  </channel>
`;
  }
  
  // Add programme data
  epgData?.forEach((epg: any) => {
    if (epg.channels) {
      const epgChannelId = epg.channels.epg_id || convertUuidToStreamId(epg.channels.id).toString();
      const startTime = new Date(epg.start_time).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, ' +0000');
      const stopTime = new Date(epg.end_time).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, ' +0000');
      
      xmltv += `  <programme start="${startTime}" stop="${stopTime}" channel="${epgChannelId}">
    <title lang="en">${escapeXml(epg.title || '')}</title>`;
      
      if (epg.description) {
        xmltv += `
    <desc lang="en">${escapeXml(epg.description)}</desc>`;
      }
      
      if (epg.category) {
        xmltv += `
    <category lang="en">${escapeXml(epg.category)}</category>`;
      }
      
      if (epg.rating) {
        xmltv += `
    <rating system="MPAA">
      <value>${escapeXml(epg.rating)}</value>
    </rating>`;
      }
      
      xmltv += `
  </programme>
`;
    }
  });
  
  xmltv += '</tv>';
  
  console.log(`Generated XMLTV with ${epgData?.length || 0} programs for ${uniqueChannels.size} channels`);
  
  return new Response(xmltv, {
    headers: { 
      ...corsHeaders,
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'Content-Disposition': 'attachment; filename="xmltv.xml"'
    }
  });
}

// Utility functions
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function getClientIP(url: URL): string {
  // In a real deployment, you'd extract this from headers
  // For now, return a placeholder
  return '127.0.0.1';
}