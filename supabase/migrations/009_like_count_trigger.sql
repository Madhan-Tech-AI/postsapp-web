-- =============================================================
-- Migration 009: Database trigger maintenance of articles.like_count
-- Implements Phase 8 requirement:
-- Database trigger maintenance of articles.like_count on insert/delete of article_likes
-- =============================================================

CREATE OR REPLACE FUNCTION public.maintain_article_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.articles
    SET like_count = like_count + 1
    WHERE id = NEW.article_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.articles
    SET like_count = GREATEST(0, like_count - 1)
    WHERE id = OLD.article_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS article_likes_maintain_count_trigger ON public.article_likes;

CREATE TRIGGER article_likes_maintain_count_trigger
  AFTER INSERT OR DELETE ON public.article_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.maintain_article_like_count();
