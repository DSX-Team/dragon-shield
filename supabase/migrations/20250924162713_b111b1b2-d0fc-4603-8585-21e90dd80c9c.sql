-- Insert sample packages
INSERT INTO public.packages (name, description, price, duration_days, concurrent_limit, active, features)
VALUES 
  ('Basic Package', 'Essential streaming package with 50+ channels', 19.99, 30, 1, true, '{"channels": 50, "quality": "HD"}'),
  ('Premium Package', 'Premium streaming with 200+ channels and 4K support', 39.99, 30, 2, true, '{"channels": 200, "quality": "4K", "multiscreen": true}'),
  ('Family Package', 'Complete family entertainment package', 29.99, 30, 3, true, '{"channels": 150, "quality": "HD", "kids_content": true}');

-- Insert sample channels
INSERT INTO public.channels (name, category, logo_url, upstream_sources, epg_id, active, package_ids)
VALUES 
  ('CNN International', 'News', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/CNN_International_logo.svg/200px-CNN_International_logo.svg.png', '[{"url": "https://cnn-cnninternational-1-gb.samsung.wurl.com/manifest/playlist.m3u8", "type": "m3u8"}]', 'cnn-intl', true, ARRAY(SELECT id FROM public.packages WHERE active = true)),
  
  ('BBC World Service', 'News', 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/BBC_News_2019.svg/200px-BBC_News_2019.svg.png', '[{"url": "https://vs-cmaf-pushb-ww-live.akamaized.net/x=3/i=urn:bbc:pips:service:bbc_world_service/iptv_hd_abr_v1.mpd", "type": "dash"}]', 'bbc-world', true, ARRAY(SELECT id FROM public.packages WHERE active = true)),
  
  ('Al Jazeera English', 'News', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Aljazeera_eng.svg/200px-Aljazeera_eng.svg.png', '[{"url": "https://live-hls-web-aje.getaj.net/AJE/02.m3u8", "type": "m3u8"}]', 'aljazeera-en', true, ARRAY(SELECT id FROM public.packages WHERE active = true)),
  
  ('France 24 English', 'News', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/France24.png/200px-France24.png', '[{"url": "https://static.france24.com/live/F24_EN_LO_HLS/live_web.m3u8", "type": "m3u8"}]', 'france24-en', true, ARRAY(SELECT id FROM public.packages WHERE active = true)),
  
  ('RT International', 'News', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Russia-today-logo.svg/200px-Russia-today-logo.svg.png', '[{"url": "https://rt-glb.rttv.com/live/rtnews/playlist.m3u8", "type": "m3u8"}]', 'rt-intl', true, ARRAY(SELECT id FROM public.packages WHERE active = true)),
  
  ('Euronews', 'News', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Euronews_2016_logo.svg/200px-Euronews_2016_logo.svg.png', '[{"url": "https://rakuten-euronews-1-gb.samsung.wurl.com/manifest/playlist.m3u8", "type": "m3u8"}]', 'euronews', true, ARRAY(SELECT id FROM public.packages WHERE active = true));

-- Insert sample EPG data for the next 24 hours
INSERT INTO public.epg (channel_id, program_id, title, description, category, start_time, end_time)
SELECT 
  c.id as channel_id,
  'prog_' || c.id || '_' || generate_series as program_id,
  CASE 
    WHEN c.category = 'News' THEN 
      (ARRAY['Breaking News', 'World Report', 'Business Today', 'Weather Update', 'Sports Roundup'])[1 + (generate_series % 5)]
    ELSE 'General Programming'
  END as title,
  CASE 
    WHEN c.category = 'News' THEN 'Latest news and current affairs coverage'
    ELSE 'Entertainment programming'
  END as description,
  c.category,
  NOW() + (generate_series * interval '30 minutes') as start_time,
  NOW() + ((generate_series + 1) * interval '30 minutes') as end_time
FROM public.channels c
CROSS JOIN generate_series(0, 47) -- 48 programs = 24 hours of 30-minute programs
WHERE c.active = true;