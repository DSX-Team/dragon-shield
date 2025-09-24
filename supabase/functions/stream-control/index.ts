import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

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

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    
    // Handle streaming requests
    // Format: /live/{channel_id}.m3u8 or /live/{username}/{password}/{channel_id}.m3u8
    if (pathParts.includes('live')) {
      const liveIndex = pathParts.indexOf('live');
      
      let username, password, channelFile;
      
      if (pathParts.length === liveIndex + 4) {
        // Format: /live/{username}/{password}/{channel_id}.m3u8
        username = pathParts[liveIndex + 1];
        password = pathParts[liveIndex + 2];
        channelFile = pathParts[liveIndex + 3];
      } else if (pathParts.length === liveIndex + 2) {
        // Format: /live/{channel_id}.m3u8 - try to get auth from query params
        channelFile = pathParts[liveIndex + 1];
        username = url.searchParams.get('username');
        password = url.searchParams.get('password');
      } else {
        return new Response('Invalid stream URL format', { 
          status: 400,
          headers: corsHeaders 
        });
      }

      if (!channelFile || !channelFile.endsWith('.m3u8')) {
        return new Response('Invalid channel format', { 
          status: 400,
          headers: corsHeaders 
        });
      }

      const channelId = channelFile.replace('.m3u8', '');

      // Authenticate user if credentials provided
      if (username && password) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, username, status')
          .eq('username', username)
          .single();

        if (!profileData) {
          return new Response('Unauthorized', { 
            status: 401,
            headers: corsHeaders 
          });
        }

        // Check active subscription
        const { data: subscriptionData } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', profileData.user_id)
          .eq('status', 'active')
          .gte('end_date', new Date().toISOString())
          .single();

        if (!subscriptionData) {
          return new Response('Subscription expired', { 
            status: 403,
            headers: corsHeaders 
          });
        }

        // Log session start
        await supabase
          .from('sessions')
          .insert({
            user_id: profileData.user_id,
            client_ip: req.headers.get('x-forwarded-for') || 'unknown',
            user_agent: req.headers.get('user-agent') || '',
            device_info: { channel_id: channelId }
          });
      }

      // Get channel info and stream URL
      const { data: channelData, error } = await supabase
        .from('channels')
        .select('*')
        .eq('id', channelId)
        .eq('active', true)
        .single();

      if (error || !channelData) {
        return new Response('Channel not found or inactive', { 
          status: 404,
          headers: corsHeaders 
        });
      }

      // Get upstream source URL
      const upstreamSources = channelData.upstream_sources as any[];
      if (!upstreamSources || upstreamSources.length === 0) {
        return new Response('No upstream source configured', { 
          status: 404,
          headers: corsHeaders 
        });
      }

      const primarySource = upstreamSources[0];
      
      try {
        console.log(`Processing stream for channel ${channelId}, upstream URL: ${primarySource.url}`);
        
        // Check if this is a direct stream URL (.ts, .m3u, etc.) or M3U8 playlist
        const urlLower = primarySource.url.toLowerCase();
        
        if (urlLower.endsWith('.ts') || urlLower.includes('mpegts') || urlLower.includes('mpeg-ts')) {
          console.log('TS/MPEGTS stream detected, creating M3U8 playlist');
          
          // For TS streams, create a live M3U8 playlist
          const m3u8Content = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:EVENT
#EXTINF:10.0,
${primarySource.url}
#EXT-X-ENDLIST`;

          return new Response(m3u8Content, {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/vnd.apple.mpegurl',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
        }

        // Handle M3U playlists by fetching and parsing them
        if (urlLower.endsWith('.m3u') && !urlLower.endsWith('.m3u8')) {
          console.log('M3U playlist detected, fetching and parsing');
          
          const m3uResponse = await fetch(primarySource.url, {
            headers: {
              'User-Agent': 'Dragon Shield IPTV Server/1.0'
            }
          });

          if (!m3uResponse.ok) {
            throw new Error(`M3U fetch error: ${m3uResponse.status}`);
          }

          const m3uContent = await m3uResponse.text();
          
          // Parse M3U and find the first stream URL
          const lines = m3uContent.split('\n');
          let firstStreamUrl = '';
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#')) {
              firstStreamUrl = trimmedLine;
              break;
            }
          }
          
          if (firstStreamUrl) {
            // Convert M3U to M3U8 format with the found stream
            const m3u8Content = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:EVENT
#EXTINF:10.0,
${firstStreamUrl}
#EXT-X-ENDLIST`;

            return new Response(m3u8Content, {
              status: 200,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/vnd.apple.mpegurl',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
              }
            });
          } else {
            throw new Error('No valid stream URL found in M3U playlist');
          }
        }
        
        // Handle M3U8 playlist URLs
        if (primarySource.url.includes('.m3u8')) {
          console.log('M3U8 playlist detected, fetching and proxying');
          
          const upstreamResponse = await fetch(primarySource.url, {
            headers: {
              'User-Agent': 'Dragon Shield IPTV Server/1.0'
            }
          });

          if (!upstreamResponse.ok) {
            throw new Error(`Upstream server error: ${upstreamResponse.status}`);
          }

          const upstreamContent = await upstreamResponse.text();

          // Modify M3U8 content to proxy through our server if needed
          let modifiedContent = upstreamContent;

          // If the M3U8 contains relative URLs, make them absolute
          const baseUrl = primarySource.url.substring(0, primarySource.url.lastIndexOf('/'));
          modifiedContent = modifiedContent.replace(/^(?!https?:\/\/)([^\s]+\.ts)/gm, `${baseUrl}/$1`);

          return new Response(modifiedContent, {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/vnd.apple.mpegurl',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
        }
        
        // Fallback: treat as direct URL and create basic playlist
        console.log('Unknown stream type, creating basic M3U8 playlist');
        const fallbackM3u8 = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:10.0,
${primarySource.url}
#EXT-X-ENDLIST`;

        return new Response(fallbackM3u8, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/vnd.apple.mpegurl',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });

      } catch (error) {
        console.error('Error proxying stream:', error);
        return new Response(JSON.stringify({ 
          error: 'Stream unavailable',
          details: (error as any).message,
          upstream_url: primarySource.url 
        }), { 
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Handle EPG requests
    if (pathParts.includes('xmltv') || url.pathname.endsWith('.xml')) {
      const { data: epgData } = await supabase
        .from('epg')
        .select(`
          *,
          channels(name, epg_id)
        `)
        .gte('end_time', new Date().toISOString())
        .order('start_time', { ascending: true });

      // Generate XMLTV format
      let xmltv = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xmltv += '<!DOCTYPE tv SYSTEM "xmltv.dtd">\n';
      xmltv += '<tv>\n';

      // Add channels
      const channels = new Map();
      epgData?.forEach(item => {
        if (item.channels && !channels.has(item.channel_id)) {
          channels.set(item.channel_id, item.channels);
          xmltv += `  <channel id="${item.channels.epg_id || item.channel_id}">\n`;
          xmltv += `    <display-name>${item.channels.name}</display-name>\n`;
          xmltv += `  </channel>\n`;
        }
      });

      // Add programmes
      epgData?.forEach(program => {
        if (program.channels) {
          const startTime = new Date(program.start_time).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
          const endTime = new Date(program.end_time).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
          
          xmltv += `  <programme start="${startTime}" stop="${endTime}" channel="${program.channels.epg_id || program.channel_id}">\n`;
          xmltv += `    <title>${program.title}</title>\n`;
          if (program.description) {
            xmltv += `    <desc>${program.description}</desc>\n`;
          }
          if (program.category) {
            xmltv += `    <category>${program.category}</category>\n`;
          }
          xmltv += `  </programme>\n`;
        }
      });

      xmltv += '</tv>';

      return new Response(xmltv, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/xml',
          'Content-Disposition': 'attachment; filename="epg.xml"'
        }
      });
    }

    return new Response('Not Found', { 
      status: 404,
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('Stream control error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: (error as any).message || 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});