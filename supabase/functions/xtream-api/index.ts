import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface XtreamUser {
  username: string;
  password: string;
  message: string;
  auth: number;
  status: string;
  exp_date: string;
  is_trial: string;
  active_cons: string;
  created_at: string;
  max_connections: string;
  allowed_output_formats: string[];
}

interface XtreamChannel {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  epg_channel_id: string;
  added: string;
  category_id: string;
  custom_sid: string;
  tv_archive: number;
  direct_source: string;
  tv_archive_duration: number;
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

    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const username = url.searchParams.get('username');
    const password = url.searchParams.get('password');

    console.log(`Xtream API request: action=${action}, username=${username}`);

    // Authenticate user for all actions except player_api without action
    let user = null;
    if (username && password) {
      // Find user by username in profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, username, email, status')
        .eq('username', username)
        .single();

      if (profileError || !profileData) {
        console.log('Profile not found:', profileError);
        return new Response(JSON.stringify({
          user_info: {
            username: username,
            password: password,
            message: "Invalid username or password",
            auth: 0,
            status: "Disabled",
            exp_date: "",
            is_trial: "0",
            active_cons: "0",
            created_at: "",
            max_connections: "0",
            allowed_output_formats: ["m3u8"]
          }
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check if user has active subscription
      const { data: subscriptionData, error: subError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          packages(name, concurrent_limit)
        `)
        .eq('user_id', profileData.user_id)
        .eq('status', 'active')
        .gte('end_date', new Date().toISOString())
        .single();

      if (subError || !subscriptionData) {
        console.log('No active subscription:', subError);
        return new Response(JSON.stringify({
          user_info: {
            username: username,
            password: password,
            message: "Your subscription has expired",
            auth: 0,
            status: "Expired",
            exp_date: "",
            is_trial: "0",
            active_cons: "0",
            created_at: profileData.created_at,
            max_connections: "0",
            allowed_output_formats: ["m3u8"]
          }
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      user = {
        profile: profileData,
        subscription: subscriptionData
      };
    }

    // Handle different Xtream Codes API actions
    switch (action) {
      case null:
      case undefined:
        // Player API authentication
        if (!user) {
          return new Response(JSON.stringify({
            user_info: {
              username: username || "",
              password: password || "",
              message: "Invalid credentials",
              auth: 0,
              status: "Disabled",
              exp_date: "",
              is_trial: "0",
              active_cons: "0",
              created_at: "",
              max_connections: "0",
              allowed_output_formats: ["m3u8"]
            }
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const userInfo: XtreamUser = {
          username: user.profile.username,
          password: password,
          message: "Welcome to Dragon Shield IPTV",
          auth: 1,
          status: "Active",
          exp_date: Math.floor(new Date(user.subscription.end_date).getTime() / 1000).toString(),
          is_trial: "0",
          active_cons: "0",
          created_at: Math.floor(new Date(user.subscription.created_at).getTime() / 1000).toString(),
          max_connections: user.subscription.packages.concurrent_limit.toString(),
          allowed_output_formats: ["m3u8", "ts", "rtmp"]
        };

        return new Response(JSON.stringify({ user_info: userInfo }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'get_live_categories':
        // Return live stream categories
        const { data: categories } = await supabase
          .from('channels')
          .select('category')
          .eq('active', true);

        const uniqueCategories = [...new Set(categories?.map(c => c.category).filter(Boolean))];
        const categoryList = uniqueCategories.map((category, index) => ({
          category_id: (index + 1).toString(),
          category_name: category || 'General',
          parent_id: 0
        }));

        return new Response(JSON.stringify(categoryList), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'get_live_streams':
        // Return live streams
        const { data: channels, error: channelsError } = await supabase
          .from('channels')
          .select('*')
          .eq('active', true);

        if (channelsError) {
          console.error('Error fetching channels:', channelsError);
          return new Response(JSON.stringify([]), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const liveStreams: XtreamChannel[] = channels?.map((channel, index) => ({
          num: index + 1,
          name: channel.name,
          stream_type: 'live',
          stream_id: parseInt(channel.id.replace(/-/g, '').substring(0, 8), 16),
          stream_icon: channel.logo_url || '',
          epg_channel_id: channel.epg_id || '',
          added: Math.floor(new Date(channel.created_at).getTime() / 1000).toString(),
          category_id: '1',
          custom_sid: '',
          tv_archive: 0,
          direct_source: '',
          tv_archive_duration: 0
        })) || [];

        return new Response(JSON.stringify(liveStreams), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'get_vod_categories':
        // Return VOD categories (placeholder)
        return new Response(JSON.stringify([
          {
            category_id: "1",
            category_name: "Movies",
            parent_id: 0
          },
          {
            category_id: "2", 
            category_name: "TV Shows",
            parent_id: 0
          }
        ]), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'get_vod_streams':
        // Return VOD streams (placeholder)
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'get_series_categories':
        // Return series categories (placeholder)
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'get_series':
        // Return series (placeholder)
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'get_short_epg':
      case 'get_simple_data_table':
        const streamId = url.searchParams.get('stream_id');
        const limitParam = url.searchParams.get('limit');
        const limit = limitParam ? parseInt(limitParam) : 10;

        if (!streamId) {
          return new Response(JSON.stringify({ epg_listings: [] }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Convert stream_id back to channel UUID (simplified approach)
        const { data: epgData } = await supabase
          .from('epg')
          .select('*')
          .gte('end_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(limit);

        const epgListings = epgData?.map(program => ({
          id: program.id,
          epg_id: program.program_id || program.id,
          title: program.title,
          lang: 'en',
          start: Math.floor(new Date(program.start_time).getTime() / 1000).toString(),
          end: Math.floor(new Date(program.end_time).getTime() / 1000).toString(),
          description: program.description || '',
          channel_id: streamId,
          start_timestamp: Math.floor(new Date(program.start_time).getTime() / 1000),
          stop_timestamp: Math.floor(new Date(program.end_time).getTime() / 1000)
        })) || [];

        return new Response(JSON.stringify({ epg_listings: epgListings }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

  } catch (error) {
    console.error('Xtream API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});