import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Channel {
  id: string;
  name: string;
  category?: string;
  logo_url?: string;
  epg_id?: string;
  upstream_sources: Array<{
    url: string;
    quality?: string;
  }>;
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
    const pathParts = url.pathname.split('/');
    
    // Extract username and password from URL path or query params
    let username = url.searchParams.get('username');
    let password = url.searchParams.get('password');
    const format = url.searchParams.get('format') || 'both'; // 'hls', 'mpegts', or 'both'
    
    // Also support path-based auth like /playlist/username/password
    if (pathParts.length >= 4) {
      username = pathParts[2];
      password = pathParts[3];
    }

    if (!username || !password) {
      return new Response('Authentication required', {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    console.log(`Playlist request for user: ${username}`);

    // Authenticate user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, user_id, status')
      .eq('username', username)
      .single();

    if (profileError || !profile) {
      console.log('User not found:', username);
      return new Response('Invalid credentials', {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    if (profile.status !== 'active') {
      return new Response('Account suspended', {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
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
      return new Response('No active subscription', {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    // Get all active channels
    const { data: channels, error: channelsError } = await supabase
      .from('channels')
      .select('id, name, category, logo_url, epg_id, upstream_sources')
      .eq('active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (channelsError) {
      console.error('Error fetching channels:', channelsError);
      return new Response('Server error', {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    // Generate M3U playlist
    let m3uContent = '#EXTM3U\n';
    
    for (const channel of channels || []) {
      const sources = channel.upstream_sources as Array<{url: string, quality?: string}>;
      
      if (!sources || sources.length === 0) continue;
      
      // Use the first source (primary stream)
      const primarySource = sources[0];
      const quality = primarySource.quality || 'HD';
      
      const tvgId = channel.epg_id || channel.name.replace(/\s+/g, '.');
      const groupTitle = channel.category || 'General';
      const logoUrl = channel.logo_url || '';
      
      // Add HLS stream if requested
      if (format === 'hls' || format === 'both') {
        const hlsStreamUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/stream-control/live/${channel.id}.m3u8?username=${username}&password=${password}&quality=${quality}&format=hls`;
        
        m3uContent += `#EXTINF:-1 tvg-id="${tvgId}" tvg-name="${channel.name}" tvg-logo="${logoUrl}" group-title="${groupTitle}",${channel.name}\n`;
        m3uContent += `${hlsStreamUrl}\n`;
      }
      
      // Add MPEGTS stream if requested
      if (format === 'mpegts' || format === 'both') {
        const mpegtsStreamUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/stream-control/live/${channel.id}.ts?username=${username}&password=${password}&quality=${quality}&format=mpegts`;
        
        const formatSuffix = format === 'both' ? ' (MPEGTS)' : '';
        m3uContent += `#EXTINF:-1 tvg-id="${tvgId}" tvg-name="${channel.name}${formatSuffix}" tvg-logo="${logoUrl}" group-title="${groupTitle}",${channel.name}${formatSuffix}\n`;
        m3uContent += `${mpegtsStreamUrl}\n`;
      }
    }

    console.log(`Generated M3U playlist for ${username} with ${channels?.length || 0} channels`);

    return new Response(m3uContent, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/x-mpegurl',
        'Content-Disposition': `attachment; filename="${username}_playlist.m3u"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });

  } catch (error) {
    console.error('Playlist generation error:', error);
    return new Response('Server error', {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
    });
  }
});