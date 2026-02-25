-- Add voice spectrum columns to studio_brand_config
-- These replace the voice_tone array with more nuanced AI guidance

-- Only run if table exists (it's created in an earlier migration)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'studio_brand_config') THEN
    -- Add voice_spectrums column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'studio_brand_config' AND column_name = 'voice_spectrums') THEN
      ALTER TABLE studio_brand_config ADD COLUMN voice_spectrums jsonb DEFAULT '{"formality": 50, "complexity": 50, "warmth": 50, "brevity": 50}'::jsonb;
      COMMENT ON COLUMN studio_brand_config.voice_spectrums IS 'Voice spectrum values (0-100): formality, complexity, warmth, brevity';
    END IF;

    -- Add voice_archetype column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'studio_brand_config' AND column_name = 'voice_archetype') THEN
      ALTER TABLE studio_brand_config ADD COLUMN voice_archetype text;
      COMMENT ON COLUMN studio_brand_config.voice_archetype IS 'Selected voice archetype preset: expert, guide, partner, professional, creative';
    END IF;
  END IF;
END $$;
