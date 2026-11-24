-- =============================================================
-- PostsApp V1.0 — Migration 007: Seed data
-- 10 categories × 2 languages = 20 rows
-- Site settings defaults
-- =============================================================

SET search_path TO public;

-- =============================================================
-- Categories (10 group_keys × EN + TA)
-- =============================================================
INSERT INTO public.categories (group_key, language, name, slug, sort_order) VALUES
  -- English
  ('national',       'en', 'National',       'national',       1),
  ('international',  'en', 'International',  'international',  2),
  ('politics',       'en', 'Politics',       'politics',       3),
  ('technology',     'en', 'Technology',     'technology',     4),
  ('business',       'en', 'Business',       'business',       5),
  ('education',      'en', 'Education',      'education',      6),
  ('sports',         'en', 'Sports',         'sports',         7),
  ('entertainment',  'en', 'Entertainment',  'entertainment',  8),
  ('science',        'en', 'Science',        'science',        9),
  ('lifestyle',      'en', 'Lifestyle',      'lifestyle',      10),
  -- Tamil
  ('national',       'ta', 'தேசியம்',         'theciyam',       1),
  ('international',  'ta', 'சர்வதேசம்',       'carvathecam',    2),
  ('politics',       'ta', 'அரசியல்',         'araciiyal',      3),
  ('technology',     'ta', 'தொழில்நுட்பம்',   'thozhilnudpam',  4),
  ('business',       'ta', 'வணிகம்',          'vanikam',        5),
  ('education',      'ta', 'கல்வி',           'kalvi',          6),
  ('sports',         'ta', 'விளையாட்டு',      'vilaiyaattu',    7),
  ('entertainment',  'ta', 'பொழுதுபோக்கு',   'pozhudhupokku',  8),
  ('science',        'ta', 'அறிவியல்',        'ariviyal',       9),
  ('lifestyle',      'ta', 'வாழ்க்கை முறை',  'vaazhkkai-murai', 10)
ON CONFLICT (group_key, language) DO NOTHING;

-- =============================================================
-- Default site settings
-- =============================================================
INSERT INTO public.site_settings (key, value, description) VALUES
  ('site_name',           '"PostsApp"',              'Display name of the site'),
  ('site_tagline',        '"Your News, Your Language"', 'Tagline shown in header/footer'),
  ('default_language',    '"en"',                    'Default language for new visitors'),
  ('breaking_news',       '{"enabled": false, "text_en": "", "text_ta": ""}', 'Breaking news strip settings'),
  ('featured_article_ids','[]',                      'Array of article UUIDs to feature on homepage'),
  ('social_links',        '{"twitter": "", "facebook": "", "instagram": "", "youtube": ""}', 'Social media links'),
  ('logo_path',           '""',                      'Path in site-assets bucket for the logo'),
  ('canonical_base_url',  '"https://postsapp.in"',   'Canonical base URL for SEO (no trailing slash)'),
  ('contact_email',       '"contact@postsapp.in"',   'Public contact email'),
  ('articles_per_page',   '20',                      'Default pagination size for article lists'),
  ('trending_window_hours','24',                     'Rolling window (hours) for trending calculation'),
  ('most_read_window_days','7',                      'Rolling window (days) for most-read calculation')
ON CONFLICT (key) DO NOTHING;
