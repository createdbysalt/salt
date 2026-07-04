-- ============================================================================
-- REPAIR: ledger-lied tables (2026-07-03 environment convergence)
-- ============================================================================
--
-- Two migrations were RECORDED as applied on one project while their DDL
-- never ran there (the known "ledger lies" failure mode):
--   * 20260217000000 settings tables (contract_templates,
--     workspace_brand_config, workspace_email_templates) — missing on the
--     legacy production project (<project-ref>)
--   * 20260614140100 capture_sender_profiles (+ capture_sender_kind enum)
--     — missing on the schema-current project (<project-ref>)
--
-- DDL below is extracted from the live dumps of whichever project HAS each
-- object, made fully idempotent so this migration converges both databases
-- (and is a no-op on any future fresh database built from the full set).
-- ============================================================================


-- From STAGING dump (settings tables):
CREATE TABLE IF NOT EXISTS "public"."contract_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "category" "text",
    "content" "text" NOT NULL,
    "variables" "jsonb" DEFAULT '{}'::"jsonb",
    "is_default" boolean DEFAULT false,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "contract_templates_category_check" CHECK (("category" = ANY (ARRAY['msa'::"text", 'sow'::"text", 'nda'::"text", 'retainer'::"text", 'custom'::"text"])))
);

ALTER TABLE "public"."contract_templates" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."workspace_brand_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "color_primary" "text",
    "color_secondary" "text",
    "color_neutral" "text",
    "color_accent" "text",
    "font_heading" "text",
    "font_body" "text",
    "voice_tone" "text"[] DEFAULT '{}'::"text"[],
    "voice_style_guide" "text",
    "voice_terminology" "jsonb" DEFAULT '{"avoid": [], "preferred": []}'::"jsonb",
    "voice_sample_content" "text"[] DEFAULT '{}'::"text"[],
    "logo_light_url" "text",
    "logo_dark_url" "text",
    "logo_icon_url" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "voice_spectrums" "jsonb" DEFAULT '{"warmth": 50, "brevity": 50, "formality": 50, "complexity": 50}'::"jsonb",
    "voice_archetype" "text"
);

ALTER TABLE "public"."workspace_brand_config" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."workspace_email_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "trigger_type" "text" NOT NULL,
    "subject_template" "text" NOT NULL,
    "body_template" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "valid_trigger_type" CHECK (("trigger_type" = ANY (ARRAY['proposal_sent'::"text", 'proposal_accepted'::"text", 'invoice_sent'::"text", 'invoice_reminder'::"text", 'invoice_overdue'::"text", 'project_started'::"text", 'project_complete'::"text", 'milestone_complete'::"text", 'welcome_client'::"text", 'custom'::"text"])))
);

ALTER TABLE "public"."workspace_email_templates" OWNER TO "postgres";

DO $$ BEGIN
  EXECUTE 'ALTER TABLE ONLY "public"."contract_templates"
    ADD CONSTRAINT "contract_templates_pkey" PRIMARY KEY ("id")';
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE ONLY "public"."contract_templates"
    ADD CONSTRAINT "contract_templates_studio_id_name_key" UNIQUE ("workspace_id", "name")';
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE ONLY "public"."workspace_brand_config"
    ADD CONSTRAINT "studio_brand_config_pkey" PRIMARY KEY ("id")';
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE ONLY "public"."workspace_brand_config"
    ADD CONSTRAINT "studio_brand_config_studio_id_key" UNIQUE ("workspace_id")';
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE ONLY "public"."workspace_email_templates"
    ADD CONSTRAINT "studio_email_templates_pkey" PRIMARY KEY ("id")';
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE ONLY "public"."workspace_email_templates"
    ADD CONSTRAINT "studio_email_templates_studio_id_trigger_type_key" UNIQUE ("workspace_id", "trigger_type")';
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "idx_contract_templates_category" ON "public"."contract_templates" USING "btree" ("workspace_id", "category");

CREATE INDEX IF NOT EXISTS "idx_contract_templates_studio" ON "public"."contract_templates" USING "btree" ("workspace_id");

CREATE INDEX IF NOT EXISTS "idx_studio_brand_config_studio" ON "public"."workspace_brand_config" USING "btree" ("workspace_id");

CREATE INDEX IF NOT EXISTS "idx_studio_email_templates_studio" ON "public"."workspace_email_templates" USING "btree" ("workspace_id");

CREATE INDEX IF NOT EXISTS "idx_studio_email_templates_trigger" ON "public"."workspace_email_templates" USING "btree" ("workspace_id", "trigger_type");

DO $$ BEGIN
  EXECUTE 'ALTER TABLE ONLY "public"."contract_templates"
    ADD CONSTRAINT "contract_templates_studio_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE';
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE ONLY "public"."workspace_brand_config"
    ADD CONSTRAINT "studio_brand_config_studio_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE';
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE ONLY "public"."workspace_email_templates"
    ADD CONSTRAINT "studio_email_templates_studio_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE';
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

ALTER TABLE "public"."contract_templates" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "studio_admins_manage_brand_config" ON "public"."workspace_brand_config";

CREATE POLICY "studio_admins_manage_brand_config" ON "public"."workspace_brand_config" USING (("workspace_id" IN ( SELECT "workspace_members"."workspace_id" AS "studio_id"
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));

DROP POLICY IF EXISTS "studio_admins_manage_contracts" ON "public"."contract_templates";

CREATE POLICY "studio_admins_manage_contracts" ON "public"."contract_templates" USING (("workspace_id" IN ( SELECT "workspace_members"."workspace_id" AS "studio_id"
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));

DROP POLICY IF EXISTS "studio_admins_manage_email_templates" ON "public"."workspace_email_templates";

CREATE POLICY "studio_admins_manage_email_templates" ON "public"."workspace_email_templates" USING (("workspace_id" IN ( SELECT "workspace_members"."workspace_id" AS "studio_id"
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));

DROP POLICY IF EXISTS "studio_members_view_brand_config" ON "public"."workspace_brand_config";

CREATE POLICY "studio_members_view_brand_config" ON "public"."workspace_brand_config" FOR SELECT USING (("workspace_id" IN ( SELECT "workspace_members"."workspace_id" AS "studio_id"
   FROM "public"."workspace_members"
  WHERE ("workspace_members"."user_id" = "auth"."uid"()))));

DROP POLICY IF EXISTS "studio_members_view_contracts" ON "public"."contract_templates";

CREATE POLICY "studio_members_view_contracts" ON "public"."contract_templates" FOR SELECT USING (("workspace_id" IN ( SELECT "workspace_members"."workspace_id" AS "studio_id"
   FROM "public"."workspace_members"
  WHERE ("workspace_members"."user_id" = "auth"."uid"()))));

DROP POLICY IF EXISTS "studio_members_view_email_templates" ON "public"."workspace_email_templates";

CREATE POLICY "studio_members_view_email_templates" ON "public"."workspace_email_templates" FOR SELECT USING (("workspace_id" IN ( SELECT "workspace_members"."workspace_id" AS "studio_id"
   FROM "public"."workspace_members"
  WHERE ("workspace_members"."user_id" = "auth"."uid"()))));

ALTER TABLE "public"."workspace_brand_config" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."workspace_email_templates" ENABLE ROW LEVEL SECURITY;

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."contract_templates" TO "anon";

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."contract_templates" TO "authenticated";

GRANT ALL ON TABLE "public"."contract_templates" TO "service_role";

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."workspace_brand_config" TO "anon";

GRANT ALL ON TABLE "public"."workspace_brand_config" TO "authenticated";

GRANT ALL ON TABLE "public"."workspace_brand_config" TO "service_role";

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."workspace_email_templates" TO "anon";

GRANT ALL ON TABLE "public"."workspace_email_templates" TO "authenticated";

GRANT ALL ON TABLE "public"."workspace_email_templates" TO "service_role";

-- From OLD dump (sender profiles):
DO $$ BEGIN
  EXECUTE 'CREATE TYPE "public"."capture_sender_kind" AS ENUM (''client'', ''vendor_saas'', ''payment_rail'')';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "public"."capture_sender_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "sender_key" "text" NOT NULL,
    "sender_key_type" "text" NOT NULL,
    "kind" "public"."capture_sender_kind" NOT NULL,
    "vendor_name" "text",
    "source" "text" NOT NULL,
    "confidence" integer DEFAULT 80 NOT NULL,
    "evidence_count" integer DEFAULT 1 NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "capture_sender_profiles_confidence_check" CHECK ((("confidence" >= 0) AND ("confidence" <= 100))),
    CONSTRAINT "capture_sender_profiles_sender_key_type_check" CHECK (("sender_key_type" = ANY (ARRAY['email'::"text", 'domain'::"text"]))),
    CONSTRAINT "capture_sender_profiles_source_check" CHECK (("source" = ANY (ARRAY['user_dismiss'::"text", 'user_confirm'::"text", 'auto_receipt'::"text", 'auto_scan'::"text", 'manual'::"text"])))
);

ALTER TABLE "public"."capture_sender_profiles" OWNER TO "postgres";

DO $$ BEGIN
  EXECUTE 'ALTER TABLE ONLY "public"."capture_sender_profiles"
    ADD CONSTRAINT "capture_sender_profiles_pkey" PRIMARY KEY ("id")';
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE ONLY "public"."capture_sender_profiles"
    ADD CONSTRAINT "capture_sender_profiles_workspace_id_sender_key_type_sender_key" UNIQUE ("workspace_id", "sender_key_type", "sender_key")';
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "capture_sender_profiles_domain_lookup_idx" ON "public"."capture_sender_profiles" USING "btree" ("workspace_id", "sender_key") WHERE ("sender_key_type" = 'domain'::"text");

CREATE INDEX IF NOT EXISTS "capture_sender_profiles_email_lookup_idx" ON "public"."capture_sender_profiles" USING "btree" ("workspace_id", "sender_key") WHERE ("sender_key_type" = 'email'::"text");

CREATE INDEX IF NOT EXISTS "capture_sender_profiles_workspace_idx" ON "public"."capture_sender_profiles" USING "btree" ("workspace_id");

DO $$ BEGIN
  EXECUTE 'ALTER TABLE ONLY "public"."capture_sender_profiles"
    ADD CONSTRAINT "capture_sender_profiles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL';
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE ONLY "public"."capture_sender_profiles"
    ADD CONSTRAINT "capture_sender_profiles_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE';
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

ALTER TABLE "public"."capture_sender_profiles" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_members_manage_sender_profiles" ON "public"."capture_sender_profiles";

CREATE POLICY "workspace_members_manage_sender_profiles" ON "public"."capture_sender_profiles" USING (("workspace_id" IN ( SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'member'::"text"]))))));

DROP POLICY IF EXISTS "workspace_members_view_sender_profiles" ON "public"."capture_sender_profiles";

CREATE POLICY "workspace_members_view_sender_profiles" ON "public"."capture_sender_profiles" FOR SELECT USING (("workspace_id" IN ( SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE ("workspace_members"."user_id" = "auth"."uid"()))));

GRANT ALL ON TABLE "public"."capture_sender_profiles" TO "anon";

GRANT ALL ON TABLE "public"."capture_sender_profiles" TO "authenticated";

GRANT ALL ON TABLE "public"."capture_sender_profiles" TO "service_role";
