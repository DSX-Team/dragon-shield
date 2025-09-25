import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
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
    const params = url.searchParams;

    // Handle M3U8 playlist requests
    if (path.endsWith('.m3u8')) {
      return handleM3u8Request(url, supabase, params);
    }

    // Handle TS segment requests
    if (path.endsWith('.ts')) {
      return handleTsRequest(url, supabase, params);
    }

    // Handle other stream formats
    if (path.includes('/live/') || path.includes('/movie/') || path.includes('/series/')) {
      return handleStreamRequest(url, supabase, params);
    }

    return new Response('Not found', { status: 404 });

  } catch (error) {
    console.error('Get API error:', error);
    return new Response('Server error', { 
      status: 500,
      headers: corsHeaders
    });
  }
});

async function handleM3u8Request(url: URL, supabase: any, params: URLSearchParams) {
  const username = params.get('username');
  const password = params.get('password');
  
  if (!username || !password) {
    return new Response('Authentication required', { 
      status: 401,
      headers: corsHeaders
    });
  }

  // Authenticate user
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id, status')
    .eq('username', username)
    .single();

  if (!profile || profile.status !== 'active') {
    return new Response('Invalid credentials', { 
      status: 401,
      headers: corsHeaders
    });
  }

  // Extract stream info from path
  const pathParts = url.pathname.split('/');
  const streamFile = pathParts[pathParts.length - 1];
  const streamId = streamFile.replace('.m3u8', '');

  // Find the channel
  const { data: channels } = await supabase
    .from('channels')
    .select('id, name, upstream_sources')
    .eq('active', true);

  const channel = channels?.find((c: any) => {
    const convertedId = parseInt(c.id.replace(/-/g, '').substring(0, 8), 16);
    return convertedId.toString() === streamId;
  });

  if (!channel || !channel.upstream_sources?.[0]) {
    return new Response('Stream not found', { 
      status: 404,
      headers: corsHeaders
    });
  }

  // Generate M3U8 playlist
  const baseUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/get`;
  const m3u8Content = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1920x1080,CODECS="avc1.64001f,mp4a.40.2"
${channel.upstream_sources[0].url}
#EXT-X-ENDLIST
`;

  return new Response(m3u8Content, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Cache-Control': 'no-cache'
    }
  });
}

async function handleTsRequest(url: URL, supabase: any, params: URLSearchParams) {
  // Proxy TS segments
  const username = params.get('username');
  const password = params.get('password');
  
  if (!username || !password) {
    return new Response('Authentication required', { status: 401 });
  }

  // For now, return a simple response - in production this would proxy actual TS segments
  return new Response('TS segment proxy not implemented', { 
    status: 404,
    headers: corsHeaders
  });
}

async function handleStreamRequest(url: URL, supabase: any, params: URLSearchParams) {
  const username = params.get('username');
  const password = params.get('password');
  
  if (!username || !password) {
    return new Response('Authentication required', { status: 401 });
  }

  // Handle direct stream access
  const pathParts = url.pathname.split('/');
  const streamType = pathParts[1]; // live, movie, series
  const streamId = pathParts[2];

  if (streamType === 'live') {
    // Find and redirect to live stream
    const { data: channels } = await supabase
      .from('channels')
      .select('upstream_sources')
      .eq('active', true);

    const channel = channels?.find((c: any) => {
      const convertedId = parseInt(c.id.replace(/-/g, '').substring(0, 8), 16);
      return convertedId.toString() === streamId;
    });

    if (channel?.upstream_sources?.[0]) {
      return Response.redirect(channel.upstream_sources[0].url, 302);
    }
  }

  return new Response('Stream not found', { 
    status: 404,
    headers: corsHeaders
  });
}