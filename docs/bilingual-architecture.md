# Bilingual Architecture — PostsApp V1.0

PostsApp V1.0 is engineered from the ground up as a native bilingual digital news publishing platform supporting **English (`en`)** and **Tamil (`ta`)**.

---

## 1. Core Principles

1. **First-Class Editorial Parity**: Both English and Tamil editions are treated as authoritative, first-class news products. Neither is a secondary machine-translation layer.
2. **Translation Groups**: A single real-world news event or story is represented by a shared `translation_group_id`.
3. **Independent Lifecycles**:
   - Each language version is an independent row in the `articles` table with its own content, slug, SEO metadata, reading time, and publication status.
   - Either language version may exist alone (e.g. breaking local Tamil news without an English counterpart, or vice versa).
   - Publishing, editing, archiving, or unpublishing one language version **never** affects the other.
   - Reader engagement metrics (`view_count`, `like_count`) and view events are tracked independently per language version.
4. **Explicit Mapping (`article_translations`)**:
   - Enforced by database table `article_translations` with unique constraint `UNIQUE (translation_group_id, language)`.

---

## 2. URL Structure & Slugs

- **Localized Route Prefixes**:
  - English: `https://postsapp.in/en/...`
  - Tamil: `https://postsapp.in/ta/...`
- **Slug Uniqueness Per Language**:
  - English slugs use Latin characters (e.g. `/en/article/chennai-tech-summit-2026`).
  - Tamil slugs use native Unicode Tamil script or transliteration (e.g. `/ta/article/சென்னை-தொழில்நுட்ப-மாநாடு-2026`).
  - Slugs are constrained by `UNIQUE (language, slug)`. The same slug may theoretically exist in different languages, but never within the same language.

---

## 3. SEO, Canonical URLs & `hreflang`

Every public article detail page dynamically calculates and injects bidirectional `hreflang` links:

```html
<link rel="canonical" href="https://postsapp.in/en/article/chennai-tech-summit-2026" />
<link rel="alternate" hreflang="en" href="https://postsapp.in/en/article/chennai-tech-summit-2026" />
<link rel="alternate" hreflang="ta" href="https://postsapp.in/ta/article/சென்னை-தொழில்நுட்ப-மாநாடு-2026" />
```

### Invalidation & Fallbacks
- If an article exists **only** in English, the `hreflang` for Tamil is omitted from metadata, and the reader language switcher gracefully falls back to the localized homepage or category feed.
- If both versions are published, reader pages display an interactive banner alerting the reader that the article is also available in the counterpart language.

---

## 4. Intelligent Language Switching

The `LanguageSwitcher` client component operates with context-awareness:

1. **On Article Pages**:
   - Checks if a published counterpart translation exists via `translationSlug`.
   - If counterpart exists: clicking the language toggle navigates directly to `/[targetLocale]/article/[translationSlug]`.
   - If no counterpart exists: switching language redirects to the localized section or home (`/[targetLocale]`), preventing 404 errors.
2. **On General Pages** (Home, Category, Static):
   - Swaps the URL prefix from `/en/...` to `/ta/...` preserving the section.

---

## 5. Seeded Bilingual Categories

All 10 seeded categories exist with paired English and Tamil names and slugs sharing a common `group_key`:

| Group Key | English Name | English Slug | Tamil Name | Tamil Slug |
|---|---|---|---|---|
| `national` | National | `national` | தேசிய செய்திகள் | `national` |
| `international` | International | `international` | சர்வதேசம் | `international` |
| `politics` | Politics | `politics` | அரசியல் | `politics` |
| `technology` | Technology | `technology` | தொழில்நுட்பம் | `technology` |
| `business` | Business | `business` | வணிகம் | `business` |
| `education` | Education | `education` | கல்வி | `education` |
| `sports` | Sports | `sports` | விளையாட்டு | `sports` |
| `entertainment` | Entertainment | `entertainment` | சினிமா & பொழுதுபோக்கு | `entertainment` |
| `science` | Science | `science` | அறிவியல் | `science` |
| `lifestyle` | Lifestyle | `lifestyle` | வாழ்க்கை முறை | `lifestyle` |

---

## 6. Typography & Tamil Script Rendering

- **Font Strategy**: Configured with Google Fonts via `next/font`:
  - `Noto Sans Tamil` for UI elements, chips, and body text.
  - `Noto Serif Tamil` for editorial headlines and long-form article rendering.
- **Line Height & Spacing**:
  - Tamil script features vowel markers above and below consonants. Line heights on headlines and body paragraphs are relaxed (`leading-relaxed` / `leading-snug` with custom line clamps) to prevent clipping or overlap.
