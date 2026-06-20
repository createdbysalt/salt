-- ============================================================================
-- BLOG NEWSLETTER SUBSCRIBERS
-- Sidebar signups from /blog/* articles. Service-role writes only.
-- Resend audience sync via subscribeBlogNewsletterAction.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.blog_newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  normalized_email text NOT NULL,
  country_code text NOT NULL DEFAULT 'US',
  marketing_consent boolean NOT NULL DEFAULT false,
  article_slug text,
  source text NOT NULL DEFAULT 'blog-sidebar',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT blog_newsletter_subscribers_email_not_blank
    CHECK (length(trim(email)) > 0),
  CONSTRAINT blog_newsletter_subscribers_normalized_email_not_blank
    CHECK (length(trim(normalized_email)) > 0),
  CONSTRAINT blog_newsletter_subscribers_source_not_blank
    CHECK (length(trim(source)) > 0),
  CONSTRAINT blog_newsletter_subscribers_normalized_email_unique
    UNIQUE (normalized_email)
);

CREATE INDEX IF NOT EXISTS blog_newsletter_subscribers_created_at_idx
  ON public.blog_newsletter_subscribers (created_at DESC);

CREATE INDEX IF NOT EXISTS blog_newsletter_subscribers_article_slug_idx
  ON public.blog_newsletter_subscribers (article_slug)
  WHERE article_slug IS NOT NULL;

ALTER TABLE public.blog_newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_manage_blog_newsletter_subscribers"
  ON public.blog_newsletter_subscribers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT ALL ON TABLE public.blog_newsletter_subscribers TO service_role;

CREATE OR REPLACE FUNCTION public.update_blog_newsletter_subscribers_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER blog_newsletter_subscribers_updated_at
  BEFORE UPDATE ON public.blog_newsletter_subscribers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_blog_newsletter_subscribers_updated_at();

COMMENT ON TABLE public.blog_newsletter_subscribers IS
  'Blog sidebar newsletter signups. Synced to Resend blog audience on subscribe.';
