-- Optional cleanup: strip "?si=..." tracking junk from YouTube IDs that were
-- pasted as share-link fragments (e.g. "AWP6jl-VauY?si=roO4L0-N1r-9vDfA").
-- The app now parses these defensively at render time, so this just tidies
-- the stored data. Run in the Supabase SQL editor.

update public.pack_videos
   set youtube_id = substring(youtube_id from '^([A-Za-z0-9_-]{11})')
 where youtube_id ~ '^[A-Za-z0-9_-]{11}[?&#/]';

update public.theory_videos
   set youtube_id = substring(youtube_id from '^([A-Za-z0-9_-]{11})')
 where youtube_id ~ '^[A-Za-z0-9_-]{11}[?&#/]';

-- Also normalise any full URLs that slipped through older admin versions.
update public.pack_videos
   set youtube_id = substring(youtube_id from '(?:youtu\.be/|v=|embed/|shorts/|live/)([A-Za-z0-9_-]{11})')
 where youtube_id ~ '(youtu\.be/|v=|embed/|shorts/|live/)';

update public.theory_videos
   set youtube_id = substring(youtube_id from '(?:youtu\.be/|v=|embed/|shorts/|live/)([A-Za-z0-9_-]{11})')
 where youtube_id ~ '(youtu\.be/|v=|embed/|shorts/|live/)';
