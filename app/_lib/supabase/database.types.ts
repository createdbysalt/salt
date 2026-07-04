export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_entries: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          detail: string | null
          id: string
          metadata: Json | null
          play_run_id: string | null
          title: string
          workspace_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          metadata?: Json | null
          play_run_id?: string | null
          title: string
          workspace_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          metadata?: Json | null
          play_run_id?: string | null
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_entries_play_run_id_fkey"
            columns: ["play_run_id"]
            isOneToOne: false
            referencedRelation: "play_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_entries_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_entries_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_audit_log: {
        Row: {
          agent_id: string
          agent_session: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          escalation_reason: string | null
          id: string
          operation_tier: number
          operation_type: string
          output_file_path: string | null
          result_status: string
          result_summary: string | null
          row_count: number | null
          sql_hash: string | null
          sql_query: string | null
          target_schema: string | null
          target_tables: string[] | null
          user_request: string | null
        }
        Insert: {
          agent_id: string
          agent_session?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          escalation_reason?: string | null
          id?: string
          operation_tier?: number
          operation_type: string
          output_file_path?: string | null
          result_status?: string
          result_summary?: string | null
          row_count?: number | null
          sql_hash?: string | null
          sql_query?: string | null
          target_schema?: string | null
          target_tables?: string[] | null
          user_request?: string | null
        }
        Update: {
          agent_id?: string
          agent_session?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          escalation_reason?: string | null
          id?: string
          operation_tier?: number
          operation_type?: string
          output_file_path?: string | null
          result_status?: string
          result_summary?: string | null
          row_count?: number | null
          sql_hash?: string | null
          sql_query?: string | null
          target_schema?: string | null
          target_tables?: string[] | null
          user_request?: string | null
        }
        Relationships: []
      }
      ai_audits: {
        Row: {
          audit_data: Json
          generated_at: string
          id: string
          project_id: string
        }
        Insert: {
          audit_data: Json
          generated_at?: string
          id?: string
          project_id: string
        }
        Update: {
          audit_data?: Json
          generated_at?: string
          id?: string
          project_id?: string
        }
        Relationships: []
      }
      ai_credit_balances: {
        Row: {
          created_at: string
          last_reset_at: string
          monthly_allocation: number
          purchased_credits: number
          total_available: number | null
          updated_at: string
          used_this_month: number
          user_id: string
        }
        Insert: {
          created_at?: string
          last_reset_at?: string
          monthly_allocation?: number
          purchased_credits?: number
          total_available?: number | null
          updated_at?: string
          used_this_month?: number
          user_id: string
        }
        Update: {
          created_at?: string
          last_reset_at?: string
          monthly_allocation?: number
          purchased_credits?: number
          total_available?: number | null
          updated_at?: string
          used_this_month?: number
          user_id?: string
        }
        Relationships: []
      }
      ai_credit_purchases: {
        Row: {
          amount_paid_cents: number
          id: string
          pack_size: number
          purchased_at: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          user_id: string
        }
        Insert: {
          amount_paid_cents: number
          id?: string
          pack_size: number
          purchased_at?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          user_id: string
        }
        Update: {
          amount_paid_cents?: number
          id?: string
          pack_size?: number
          purchased_at?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_credit_usage: {
        Row: {
          actual_api_cost_usd: number | null
          billing_month: string
          created_at: string
          credits_deducted: number
          id: string
          metadata: Json | null
          operation_type: string
          user_id: string
        }
        Insert: {
          actual_api_cost_usd?: number | null
          billing_month: string
          created_at?: string
          credits_deducted: number
          id?: string
          metadata?: Json | null
          operation_type: string
          user_id: string
        }
        Update: {
          actual_api_cost_usd?: number | null
          billing_month?: string
          created_at?: string
          credits_deducted?: number
          id?: string
          metadata?: Json | null
          operation_type?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_insights: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          generated_at: string
          id: string
          insights: Json
          model_used: string | null
          range_end: string
          range_start: string
          timeframe: string
          tokens_used: number | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          generated_at?: string
          id?: string
          insights?: Json
          model_used?: string | null
          range_end: string
          range_start: string
          timeframe: string
          tokens_used?: number | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          generated_at?: string
          id?: string
          insights?: Json
          model_used?: string | null
          range_end?: string
          range_start?: string
          timeframe?: string
          tokens_used?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_insights_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ask_salt_conversations: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          last_message_at: string | null
          mode: string
          title: string | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          mode?: string
          title?: string | null
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          mode?: string
          title?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ask_salt_conversations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ask_salt_conversations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ask_salt_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ask_salt_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ask_salt_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_accounts: {
        Row: {
          created_at: string
          id: string
          last_computed_at: string | null
          lifetime_revenue_cents: number | null
          mrr_cents: number | null
          organization_id: string | null
          outstanding_cents: number | null
          person_id: string | null
          retainer_label: string | null
          source: string | null
          total_paid_cents: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_computed_at?: string | null
          lifetime_revenue_cents?: number | null
          mrr_cents?: number | null
          organization_id?: string | null
          outstanding_cents?: number | null
          person_id?: string | null
          retainer_label?: string | null
          source?: string | null
          total_paid_cents?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_computed_at?: string | null
          lifetime_revenue_cents?: number | null
          mrr_cents?: number | null
          organization_id?: string | null
          outstanding_cents?: number | null
          person_id?: string | null
          retainer_label?: string | null
          source?: string | null
          total_paid_cents?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_accounts_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_accounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_accounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_payments: {
        Row: {
          amount_cents: number
          billing_record_id: string | null
          capture_event_id: string | null
          created_at: string
          currency: string
          id: string
          match_confidence: number | null
          match_status: Database["public"]["Enums"]["billing_payment_match_status"]
          metadata: Json
          paid_at: string | null
          provider: Database["public"]["Enums"]["billing_provider"]
          source_external_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          amount_cents: number
          billing_record_id?: string | null
          capture_event_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          match_confidence?: number | null
          match_status?: Database["public"]["Enums"]["billing_payment_match_status"]
          metadata?: Json
          paid_at?: string | null
          provider: Database["public"]["Enums"]["billing_provider"]
          source_external_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          amount_cents?: number
          billing_record_id?: string | null
          capture_event_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          match_confidence?: number | null
          match_status?: Database["public"]["Enums"]["billing_payment_match_status"]
          metadata?: Json
          paid_at?: string | null
          provider?: Database["public"]["Enums"]["billing_provider"]
          source_external_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_payments_billing_record_id_fkey"
            columns: ["billing_record_id"]
            isOneToOne: false
            referencedRelation: "billing_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_payments_capture_event_id_fkey"
            columns: ["capture_event_id"]
            isOneToOne: false
            referencedRelation: "capture_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_payments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_payments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_records: {
        Row: {
          amount_cents: number
          amount_paid_cents: number
          app_url: string | null
          capture_event_id: string | null
          category: Database["public"]["Enums"]["billing_category"] | null
          created_at: string
          created_by: string | null
          currency: string
          direction: Database["public"]["Enums"]["billing_direction"]
          due_at: string | null
          duplicate_of: string | null
          extraction: Json | null
          id: string
          issued_at: string | null
          line_items: Json
          metadata: Json
          number: string | null
          organization_id: string | null
          origin: Database["public"]["Enums"]["billing_origin"]
          paid_at: string | null
          person_id: string | null
          project_id: string | null
          provider: Database["public"]["Enums"]["billing_provider"]
          recurrence_cadence: string | null
          recurrence_next_at: string | null
          recurrence_series_id: string | null
          source: string
          source_document_path: string | null
          source_external_id: string | null
          status: Database["public"]["Enums"]["billing_status"]
          tags: string[]
          updated_at: string
          vendor_label: string | null
          workspace_id: string
          workspace_integration_id: string | null
          worth_attention: Json | null
        }
        Insert: {
          amount_cents: number
          amount_paid_cents?: number
          app_url?: string | null
          capture_event_id?: string | null
          category?: Database["public"]["Enums"]["billing_category"] | null
          created_at?: string
          created_by?: string | null
          currency?: string
          direction: Database["public"]["Enums"]["billing_direction"]
          due_at?: string | null
          duplicate_of?: string | null
          extraction?: Json | null
          id?: string
          issued_at?: string | null
          line_items?: Json
          metadata?: Json
          number?: string | null
          organization_id?: string | null
          origin?: Database["public"]["Enums"]["billing_origin"]
          paid_at?: string | null
          person_id?: string | null
          project_id?: string | null
          provider?: Database["public"]["Enums"]["billing_provider"]
          recurrence_cadence?: string | null
          recurrence_next_at?: string | null
          recurrence_series_id?: string | null
          source?: string
          source_document_path?: string | null
          source_external_id?: string | null
          status?: Database["public"]["Enums"]["billing_status"]
          tags?: string[]
          updated_at?: string
          vendor_label?: string | null
          workspace_id: string
          workspace_integration_id?: string | null
          worth_attention?: Json | null
        }
        Update: {
          amount_cents?: number
          amount_paid_cents?: number
          app_url?: string | null
          capture_event_id?: string | null
          category?: Database["public"]["Enums"]["billing_category"] | null
          created_at?: string
          created_by?: string | null
          currency?: string
          direction?: Database["public"]["Enums"]["billing_direction"]
          due_at?: string | null
          duplicate_of?: string | null
          extraction?: Json | null
          id?: string
          issued_at?: string | null
          line_items?: Json
          metadata?: Json
          number?: string | null
          organization_id?: string | null
          origin?: Database["public"]["Enums"]["billing_origin"]
          paid_at?: string | null
          person_id?: string | null
          project_id?: string | null
          provider?: Database["public"]["Enums"]["billing_provider"]
          recurrence_cadence?: string | null
          recurrence_next_at?: string | null
          recurrence_series_id?: string | null
          source?: string
          source_document_path?: string | null
          source_external_id?: string | null
          status?: Database["public"]["Enums"]["billing_status"]
          tags?: string[]
          updated_at?: string
          vendor_label?: string | null
          workspace_id?: string
          workspace_integration_id?: string | null
          worth_attention?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_records_capture_event_id_fkey"
            columns: ["capture_event_id"]
            isOneToOne: false
            referencedRelation: "capture_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_records_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "billing_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_records_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_records_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_records_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_records_workspace_integration_id_fkey"
            columns: ["workspace_integration_id"]
            isOneToOne: false
            referencedRelation: "studio_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_records_workspace_integration_id_fkey"
            columns: ["workspace_integration_id"]
            isOneToOne: false
            referencedRelation: "workspace_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_webhook_events: {
        Row: {
          created_at: string
          endpoint: string
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          processing_error: string | null
          retry_count: number | null
          stripe_created: string
          stripe_event_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          event_type: string
          id?: string
          payload: Json
          processed_at?: string | null
          processing_error?: string | null
          retry_count?: number | null
          stripe_created: string
          stripe_event_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          processing_error?: string | null
          retry_count?: number | null
          stripe_created?: string
          stripe_event_id?: string
        }
        Relationships: []
      }
      blog_newsletter_subscribers: {
        Row: {
          article_slug: string | null
          country_code: string
          created_at: string
          email: string
          id: string
          marketing_consent: boolean
          metadata: Json
          normalized_email: string
          source: string
          updated_at: string
        }
        Insert: {
          article_slug?: string | null
          country_code?: string
          created_at?: string
          email: string
          id?: string
          marketing_consent?: boolean
          metadata?: Json
          normalized_email: string
          source?: string
          updated_at?: string
        }
        Update: {
          article_slug?: string | null
          country_code?: string
          created_at?: string
          email?: string
          id?: string
          marketing_consent?: boolean
          metadata?: Json
          normalized_email?: string
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      capture_events: {
        Row: {
          capture_type: Database["public"]["Enums"]["capture_event_type"]
          created_at: string
          created_by: string | null
          extracted_data: Json
          id: string
          is_bootstrap: boolean | null
          origin: Database["public"]["Enums"]["capture_origin"]
          overall_confidence: number | null
          processed_at: string | null
          raw_payload: Json
          resolved_org_id: string | null
          resolved_person_id: string | null
          source_connection_id: string | null
          source_external_id: string | null
          source_type: Database["public"]["Enums"]["capture_source_type"]
          state: Database["public"]["Enums"]["capture_state"]
          title: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          capture_type: Database["public"]["Enums"]["capture_event_type"]
          created_at?: string
          created_by?: string | null
          extracted_data?: Json
          id?: string
          is_bootstrap?: boolean | null
          origin?: Database["public"]["Enums"]["capture_origin"]
          overall_confidence?: number | null
          processed_at?: string | null
          raw_payload?: Json
          resolved_org_id?: string | null
          resolved_person_id?: string | null
          source_connection_id?: string | null
          source_external_id?: string | null
          source_type: Database["public"]["Enums"]["capture_source_type"]
          state?: Database["public"]["Enums"]["capture_state"]
          title?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          capture_type?: Database["public"]["Enums"]["capture_event_type"]
          created_at?: string
          created_by?: string | null
          extracted_data?: Json
          id?: string
          is_bootstrap?: boolean | null
          origin?: Database["public"]["Enums"]["capture_origin"]
          overall_confidence?: number | null
          processed_at?: string | null
          raw_payload?: Json
          resolved_org_id?: string | null
          resolved_person_id?: string | null
          source_connection_id?: string | null
          source_external_id?: string | null
          source_type?: Database["public"]["Enums"]["capture_source_type"]
          state?: Database["public"]["Enums"]["capture_state"]
          title?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "capture_events_resolved_org_id_fkey"
            columns: ["resolved_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capture_events_resolved_person_id_fkey"
            columns: ["resolved_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capture_events_source_connection_id_fkey"
            columns: ["source_connection_id"]
            isOneToOne: false
            referencedRelation: "studio_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capture_events_source_connection_id_fkey"
            columns: ["source_connection_id"]
            isOneToOne: false
            referencedRelation: "workspace_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capture_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capture_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      capture_routing_decisions: {
        Row: {
          action: Database["public"]["Enums"]["routing_action"] | null
          capture_event_id: string
          confidence: number
          correction_notes: string | null
          created_at: string
          evidence: Json | null
          id: string
          original_target_entity_id: string | null
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          routed_at: string | null
          status: Database["public"]["Enums"]["routing_status"]
          target_entity_id: string | null
          target_entity_type: string | null
          target_surface: Database["public"]["Enums"]["memory_surface"]
          updated_at: string
        }
        Insert: {
          action?: Database["public"]["Enums"]["routing_action"] | null
          capture_event_id: string
          confidence: number
          correction_notes?: string | null
          created_at?: string
          evidence?: Json | null
          id?: string
          original_target_entity_id?: string | null
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          routed_at?: string | null
          status?: Database["public"]["Enums"]["routing_status"]
          target_entity_id?: string | null
          target_entity_type?: string | null
          target_surface: Database["public"]["Enums"]["memory_surface"]
          updated_at?: string
        }
        Update: {
          action?: Database["public"]["Enums"]["routing_action"] | null
          capture_event_id?: string
          confidence?: number
          correction_notes?: string | null
          created_at?: string
          evidence?: Json | null
          id?: string
          original_target_entity_id?: string | null
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          routed_at?: string | null
          status?: Database["public"]["Enums"]["routing_status"]
          target_entity_id?: string | null
          target_entity_type?: string | null
          target_surface?: Database["public"]["Enums"]["memory_surface"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capture_routing_decisions_capture_event_id_fkey"
            columns: ["capture_event_id"]
            isOneToOne: false
            referencedRelation: "capture_events"
            referencedColumns: ["id"]
          },
        ]
      }
      capture_sender_profiles: {
        Row: {
          confidence: number
          created_at: string
          created_by: string | null
          evidence_count: number
          id: string
          kind: Database["public"]["Enums"]["capture_sender_kind"]
          sender_key: string
          sender_key_type: string
          source: string
          updated_at: string
          vendor_name: string | null
          workspace_id: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          created_by?: string | null
          evidence_count?: number
          id?: string
          kind: Database["public"]["Enums"]["capture_sender_kind"]
          sender_key: string
          sender_key_type: string
          source: string
          updated_at?: string
          vendor_name?: string | null
          workspace_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          created_by?: string | null
          evidence_count?: number
          id?: string
          kind?: Database["public"]["Enums"]["capture_sender_kind"]
          sender_key?: string
          sender_key_type?: string
          source?: string
          updated_at?: string
          vendor_name?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "capture_sender_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capture_sender_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      client_meetings: {
        Row: {
          address: string | null
          agenda: Json | null
          app_url: string | null
          attendees: Json | null
          cal_booking_id: string | null
          cal_event_uid: string | null
          capture_event_id: string | null
          created_at: string
          description: string | null
          end_time: string
          external_calendar_id: string | null
          external_etag: string | null
          external_event_id: string | null
          external_provider: string | null
          external_updated_at: string | null
          fireflies_meeting_id: string | null
          id: string
          location_type: string | null
          meeting_type: string | null
          meeting_url: string | null
          notes: string | null
          organization_id: string | null
          origin: string | null
          person_id: string | null
          phone_number: string | null
          project_id: string | null
          provider: Database["public"]["Enums"]["entity_provider"] | null
          recall_bot_id: string | null
          recording_consent: boolean | null
          recording_url: string | null
          source_external_id: string | null
          source_origin:
            | Database["public"]["Enums"]["entity_source_origin"]
            | null
          start_time: string
          status: string | null
          title: string
          transcript_action_items: Json | null
          transcript_content: string | null
          transcript_status: string | null
          transcript_summary: string | null
          updated_at: string
          visibility: string | null
          workspace_id: string
        }
        Insert: {
          address?: string | null
          agenda?: Json | null
          app_url?: string | null
          attendees?: Json | null
          cal_booking_id?: string | null
          cal_event_uid?: string | null
          capture_event_id?: string | null
          created_at?: string
          description?: string | null
          end_time: string
          external_calendar_id?: string | null
          external_etag?: string | null
          external_event_id?: string | null
          external_provider?: string | null
          external_updated_at?: string | null
          fireflies_meeting_id?: string | null
          id?: string
          location_type?: string | null
          meeting_type?: string | null
          meeting_url?: string | null
          notes?: string | null
          organization_id?: string | null
          origin?: string | null
          person_id?: string | null
          phone_number?: string | null
          project_id?: string | null
          provider?: Database["public"]["Enums"]["entity_provider"] | null
          recall_bot_id?: string | null
          recording_consent?: boolean | null
          recording_url?: string | null
          source_external_id?: string | null
          source_origin?:
            | Database["public"]["Enums"]["entity_source_origin"]
            | null
          start_time: string
          status?: string | null
          title: string
          transcript_action_items?: Json | null
          transcript_content?: string | null
          transcript_status?: string | null
          transcript_summary?: string | null
          updated_at?: string
          visibility?: string | null
          workspace_id: string
        }
        Update: {
          address?: string | null
          agenda?: Json | null
          app_url?: string | null
          attendees?: Json | null
          cal_booking_id?: string | null
          cal_event_uid?: string | null
          capture_event_id?: string | null
          created_at?: string
          description?: string | null
          end_time?: string
          external_calendar_id?: string | null
          external_etag?: string | null
          external_event_id?: string | null
          external_provider?: string | null
          external_updated_at?: string | null
          fireflies_meeting_id?: string | null
          id?: string
          location_type?: string | null
          meeting_type?: string | null
          meeting_url?: string | null
          notes?: string | null
          organization_id?: string | null
          origin?: string | null
          person_id?: string | null
          phone_number?: string | null
          project_id?: string | null
          provider?: Database["public"]["Enums"]["entity_provider"] | null
          recall_bot_id?: string | null
          recording_consent?: boolean | null
          recording_url?: string | null
          source_external_id?: string | null
          source_origin?:
            | Database["public"]["Enums"]["entity_source_origin"]
            | null
          start_time?: string
          status?: string | null
          title?: string
          transcript_action_items?: Json | null
          transcript_content?: string | null
          transcript_status?: string | null
          transcript_summary?: string | null
          updated_at?: string
          visibility?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_meetings_capture_event_id_fkey"
            columns: ["capture_event_id"]
            isOneToOne: false
            referencedRelation: "capture_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_meetings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_meetings_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_meetings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_meetings_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_meetings_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      connector_catalog: {
        Row: {
          auth_method: string
          category: string
          coming_soon: boolean
          created_at: string
          description: string
          first_seen_at: string
          last_synced_at: string | null
          logo_url: string | null
          meta: Json
          name: string
          provider_key: string
          sync_status: Database["public"]["Enums"]["catalog_sync_status"]
          toolkit_slug: string
          updated_at: string
        }
        Insert: {
          auth_method?: string
          category?: string
          coming_soon?: boolean
          created_at?: string
          description?: string
          first_seen_at?: string
          last_synced_at?: string | null
          logo_url?: string | null
          meta?: Json
          name: string
          provider_key: string
          sync_status?: Database["public"]["Enums"]["catalog_sync_status"]
          toolkit_slug: string
          updated_at?: string
        }
        Update: {
          auth_method?: string
          category?: string
          coming_soon?: boolean
          created_at?: string
          description?: string
          first_seen_at?: string
          last_synced_at?: string | null
          logo_url?: string | null
          meta?: Json
          name?: string
          provider_key?: string
          sync_status?: Database["public"]["Enums"]["catalog_sync_status"]
          toolkit_slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      connector_overrides: {
        Row: {
          api_key_field_name: string | null
          api_key_form: Json | null
          ask_salt_label: string | null
          ask_salt_slug_prefix: string | null
          auth_config_env_var: string | null
          auth_config_id: string
          created_at: string
          notes: string | null
          provider_key: string
          tier: Database["public"]["Enums"]["connector_tier"]
          updated_at: string
        }
        Insert: {
          api_key_field_name?: string | null
          api_key_form?: Json | null
          ask_salt_label?: string | null
          ask_salt_slug_prefix?: string | null
          auth_config_env_var?: string | null
          auth_config_id?: string
          created_at?: string
          notes?: string | null
          provider_key: string
          tier?: Database["public"]["Enums"]["connector_tier"]
          updated_at?: string
        }
        Update: {
          api_key_field_name?: string | null
          api_key_form?: Json | null
          ask_salt_label?: string | null
          ask_salt_slug_prefix?: string | null
          auth_config_env_var?: string | null
          auth_config_id?: string
          created_at?: string
          notes?: string | null
          provider_key?: string
          tier?: Database["public"]["Enums"]["connector_tier"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "connector_overrides_provider_key_fkey"
            columns: ["provider_key"]
            isOneToOne: true
            referencedRelation: "connector_catalog"
            referencedColumns: ["provider_key"]
          },
        ]
      }
      connector_sync_events: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          detail: Json
          id: string
          kind: string
          subject_slug: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          detail?: Json
          id?: string
          kind: string
          subject_slug: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          detail?: Json
          id?: string
          kind?: string
          subject_slug?: string
        }
        Relationships: []
      }
      connector_tools: {
        Row: {
          created_at: string
          description: string
          first_seen_at: string
          input_schema: Json | null
          last_synced_at: string | null
          name: string
          output_schema: Json | null
          schema_hash: string | null
          sync_status: Database["public"]["Enums"]["catalog_sync_status"]
          tool_slug: string
          toolkit_slug: string
          updated_at: string
          version: string | null
        }
        Insert: {
          created_at?: string
          description?: string
          first_seen_at?: string
          input_schema?: Json | null
          last_synced_at?: string | null
          name?: string
          output_schema?: Json | null
          schema_hash?: string | null
          sync_status?: Database["public"]["Enums"]["catalog_sync_status"]
          tool_slug: string
          toolkit_slug: string
          updated_at?: string
          version?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          first_seen_at?: string
          input_schema?: Json | null
          last_synced_at?: string | null
          name?: string
          output_schema?: Json | null
          schema_hash?: string | null
          sync_status?: Database["public"]["Enums"]["catalog_sync_status"]
          tool_slug?: string
          toolkit_slug?: string
          updated_at?: string
          version?: string | null
        }
        Relationships: []
      }
      connector_trigger_types: {
        Row: {
          config_schema: Json | null
          created_at: string
          delivery: string | null
          description: string
          first_seen_at: string
          last_synced_at: string | null
          name: string
          payload_schema: Json | null
          sync_status: Database["public"]["Enums"]["catalog_sync_status"]
          toolkit_slug: string
          trigger_slug: string
          updated_at: string
        }
        Insert: {
          config_schema?: Json | null
          created_at?: string
          delivery?: string | null
          description?: string
          first_seen_at?: string
          last_synced_at?: string | null
          name?: string
          payload_schema?: Json | null
          sync_status?: Database["public"]["Enums"]["catalog_sync_status"]
          toolkit_slug: string
          trigger_slug: string
          updated_at?: string
        }
        Update: {
          config_schema?: Json | null
          created_at?: string
          delivery?: string | null
          description?: string
          first_seen_at?: string
          last_synced_at?: string | null
          name?: string
          payload_schema?: Json | null
          sync_status?: Database["public"]["Enums"]["catalog_sync_status"]
          toolkit_slug?: string
          trigger_slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_icp_matches: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          icp_segment_id: string
          id: string
          match_score: number
          match_signals: Json
          proposed_at: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          icp_segment_id: string
          id?: string
          match_score: number
          match_signals?: Json
          proposed_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          icp_segment_id?: string
          id?: string
          match_score?: number
          match_signals?: Json
          proposed_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_icp_matches_icp_segment_id_fkey"
            columns: ["icp_segment_id"]
            isOneToOne: false
            referencedRelation: "workspace_icp_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_icp_matches_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_icp_matches_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          category: string | null
          content: string
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_default: boolean | null
          name: string
          updated_at: string
          variables: Json | null
          workspace_id: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string
          variables?: Json | null
          workspace_id: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string
          variables?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_templates_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          expected_response_time: string | null
          id: string
          is_archived: boolean
          last_message_at: string | null
          last_message_preview: string | null
          studio_notes: string | null
          tags: string[]
          title: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          expected_response_time?: string | null
          id?: string
          is_archived?: boolean
          last_message_at?: string | null
          last_message_preview?: string | null
          studio_notes?: string | null
          tags?: string[]
          title?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          expected_response_time?: string | null
          id?: string
          is_archived?: boolean
          last_message_at?: string | null
          last_message_preview?: string | null
          studio_notes?: string | null
          tags?: string[]
          title?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_links: {
        Row: {
          because: string | null
          confidence: number | null
          created_at: string
          created_by: string | null
          id: string
          relation_type: string
          source: string
          source_id: string
          source_type: string
          target_id: string
          target_type: string
          workspace_id: string
        }
        Insert: {
          because?: string | null
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          relation_type?: string
          source?: string
          source_id: string
          source_type: string
          target_id: string
          target_type: string
          workspace_id: string
        }
        Update: {
          because?: string | null
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          relation_type?: string
          source?: string
          source_id?: string
          source_type?: string
          target_id?: string
          target_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_links_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_links_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_source_history: {
        Row: {
          actor_id: string | null
          app_url: string | null
          capture_event_id: string | null
          context: string | null
          created_at: string
          entity_id: string
          entity_type: string
          event_type: string
          id: string
          provider: Database["public"]["Enums"]["entity_provider"]
          source_external_id: string | null
          source_origin: Database["public"]["Enums"]["entity_source_origin"]
          sourced_at: string
          workspace_id: string
        }
        Insert: {
          actor_id?: string | null
          app_url?: string | null
          capture_event_id?: string | null
          context?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          event_type: string
          id?: string
          provider?: Database["public"]["Enums"]["entity_provider"]
          source_external_id?: string | null
          source_origin?: Database["public"]["Enums"]["entity_source_origin"]
          sourced_at?: string
          workspace_id: string
        }
        Update: {
          actor_id?: string | null
          app_url?: string | null
          capture_event_id?: string | null
          context?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          event_type?: string
          id?: string
          provider?: Database["public"]["Enums"]["entity_provider"]
          source_external_id?: string | null
          source_origin?: Database["public"]["Enums"]["entity_source_origin"]
          sourced_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_source_history_capture_event_id_fkey"
            columns: ["capture_event_id"]
            isOneToOne: false
            referencedRelation: "capture_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_source_history_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_source_history_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_tag_assignments: {
        Row: {
          because: string | null
          confidence: number | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          source: string
          source_ref: string | null
          tag_id: string
          workspace_id: string
        }
        Insert: {
          because?: string | null
          confidence?: number | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          source?: string
          source_ref?: string | null
          tag_id: string
          workspace_id: string
        }
        Update: {
          because?: string | null
          confidence?: number | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          source?: string
          source_ref?: string | null
          tag_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "workspace_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_tag_assignments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_tag_assignments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      file_activities: {
        Row: {
          activity_type: string
          actor_id: string | null
          actor_label: string | null
          created_at: string
          file_id: string
          id: string
          metadata: Json | null
          workspace_id: string
        }
        Insert: {
          activity_type: string
          actor_id?: string | null
          actor_label?: string | null
          created_at?: string
          file_id: string
          id?: string
          metadata?: Json | null
          workspace_id: string
        }
        Update: {
          activity_type?: string
          actor_id?: string | null
          actor_label?: string | null
          created_at?: string
          file_id?: string
          id?: string
          metadata?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_activities_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "project_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_activities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_activities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      file_tag_assignments: {
        Row: {
          created_at: string
          file_id: string
          id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          file_id: string
          id?: string
          tag_id: string
        }
        Update: {
          created_at?: string
          file_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_tag_assignments_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "project_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "file_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      file_tags: {
        Row: {
          color: string | null
          created_at: string
          default_direction:
            | Database["public"]["Enums"]["file_direction"]
            | null
          display_order: number
          id: string
          is_system: boolean
          label: string
          system_tag_id: string | null
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          default_direction?:
            | Database["public"]["Enums"]["file_direction"]
            | null
          display_order?: number
          id?: string
          is_system?: boolean
          label: string
          system_tag_id?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          default_direction?:
            | Database["public"]["Enums"]["file_direction"]
            | null
          display_order?: number
          id?: string
          is_system?: boolean
          label?: string
          system_tag_id?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_tags_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_tags_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_tags_system_tag_id_fkey"
            columns: ["system_tag_id"]
            isOneToOne: false
            referencedRelation: "file_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_read_states: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          read_at: string | null
          snoozed_until: string | null
          source_id: string
          source_table: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          snoozed_until?: string | null
          source_id: string
          source_table: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          snoozed_until?: string | null
          source_id?: string
          source_table?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_read_states_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_read_states_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      intelligence_events: {
        Row: {
          archived_at: string | null
          category: string
          created_at: string
          details: Json | null
          dismissed_at: string | null
          dismissed_by: string | null
          event_type: string
          id: string
          impact: string | null
          is_saved: boolean | null
          project_id: string | null
          raw_data: Json | null
          recommendation: string | null
          saved_at: string | null
          source: string
          source_url: string | null
          status: string
          summary: string
          tags: string[] | null
          title: string
          updated_at: string
          urgency: string
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          category: string
          created_at?: string
          details?: Json | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          event_type: string
          id?: string
          impact?: string | null
          is_saved?: boolean | null
          project_id?: string | null
          raw_data?: Json | null
          recommendation?: string | null
          saved_at?: string | null
          source: string
          source_url?: string | null
          status?: string
          summary: string
          tags?: string[] | null
          title: string
          updated_at?: string
          urgency?: string
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          category?: string
          created_at?: string
          details?: Json | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          event_type?: string
          id?: string
          impact?: string | null
          is_saved?: boolean | null
          project_id?: string | null
          raw_data?: Json | null
          recommendation?: string | null
          saved_at?: string | null
          source?: string
          source_url?: string | null
          status?: string
          summary?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          urgency?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intelligence_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intelligence_events_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intelligence_events_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      intelligence_findings: {
        Row: {
          acted_at: string | null
          confidence: number
          content: string | null
          corrected_at: string | null
          corrected_by: string | null
          correction_reason: string | null
          created_at: string
          dismissed_at: string | null
          evidence: Json | null
          finding_type: Database["public"]["Enums"]["finding_type"]
          flagged_at: string | null
          flagged_by: string | null
          id: string
          org_id: string | null
          person_id: string | null
          state: Database["public"]["Enums"]["finding_state"]
          title: string
          triggered_plays: Json | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          acted_at?: string | null
          confidence: number
          content?: string | null
          corrected_at?: string | null
          corrected_by?: string | null
          correction_reason?: string | null
          created_at?: string
          dismissed_at?: string | null
          evidence?: Json | null
          finding_type: Database["public"]["Enums"]["finding_type"]
          flagged_at?: string | null
          flagged_by?: string | null
          id?: string
          org_id?: string | null
          person_id?: string | null
          state?: Database["public"]["Enums"]["finding_state"]
          title: string
          triggered_plays?: Json | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          acted_at?: string | null
          confidence?: number
          content?: string | null
          corrected_at?: string | null
          corrected_by?: string | null
          correction_reason?: string | null
          created_at?: string
          dismissed_at?: string | null
          evidence?: Json | null
          finding_type?: Database["public"]["Enums"]["finding_type"]
          flagged_at?: string | null
          flagged_by?: string | null
          id?: string
          org_id?: string | null
          person_id?: string | null
          state?: Database["public"]["Enums"]["finding_state"]
          title?: string
          triggered_plays?: Json | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intelligence_findings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intelligence_findings_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intelligence_findings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intelligence_findings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      intelligence_queue: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          error_message: string | null
          id: string
          job_config: Json | null
          job_type: string
          progress: number | null
          project_id: string | null
          result_event_id: string | null
          started_at: string | null
          status: string
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          error_message?: string | null
          id?: string
          job_config?: Json | null
          job_type: string
          progress?: number | null
          project_id?: string | null
          result_event_id?: string | null
          started_at?: string | null
          status?: string
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          error_message?: string | null
          id?: string
          job_config?: Json | null
          job_type?: string
          progress?: number | null
          project_id?: string | null
          result_event_id?: string | null
          started_at?: string | null
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intelligence_queue_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intelligence_queue_result_event_id_fkey"
            columns: ["result_event_id"]
            isOneToOne: false
            referencedRelation: "intelligence_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intelligence_queue_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intelligence_queue_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lifecycle_events: {
        Row: {
          because: string | null
          confidence: number | null
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          event_type: string
          from_value: string | null
          id: string
          source: string
          source_ref: string | null
          to_value: string
          workspace_id: string
        }
        Insert: {
          because?: string | null
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          event_type: string
          from_value?: string | null
          id?: string
          source: string
          source_ref?: string | null
          to_value: string
          workspace_id: string
        }
        Update: {
          because?: string | null
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          event_type?: string
          from_value?: string | null
          id?: string
          source?: string
          source_ref?: string | null
          to_value?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lifecycle_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lifecycle_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_funnel_events: {
        Row: {
          created_at: string
          event: string
          id: string
          metadata: Json
          path: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          metadata?: Json
          path?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          metadata?: Json
          path?: string | null
        }
        Relationships: []
      }
      meeting_action_items: {
        Row: {
          assignee: string | null
          assignee_person_id: string | null
          completed: boolean | null
          completed_at: string | null
          context: string | null
          created_at: string
          due_date: string | null
          id: string
          meeting_id: string
          play_id: string | null
          priority: string | null
          source_id: string | null
          text: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assignee?: string | null
          assignee_person_id?: string | null
          completed?: boolean | null
          completed_at?: string | null
          context?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          meeting_id: string
          play_id?: string | null
          priority?: string | null
          source_id?: string | null
          text: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assignee?: string | null
          assignee_person_id?: string | null
          completed?: boolean | null
          completed_at?: string | null
          context?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          meeting_id?: string
          play_id?: string | null
          priority?: string | null
          source_id?: string | null
          text?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_action_items_assignee_person_id_fkey"
            columns: ["assignee_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_action_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "client_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_action_items_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "meeting_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_action_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_action_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_decisions: {
        Row: {
          created_at: string
          id: string
          meeting_id: string
          rationale: string | null
          source_id: string | null
          text: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meeting_id: string
          rationale?: string | null
          source_id?: string | null
          text: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meeting_id?: string
          rationale?: string | null
          source_id?: string | null
          text?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_decisions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "client_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_decisions_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "meeting_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_decisions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_decisions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_sources: {
        Row: {
          created_at: string
          display_name: string | null
          external_id: string | null
          id: string
          imported_at: string
          kind: string
          meeting_id: string
          metadata: Json | null
          provider: string
          source_url: string | null
          updated_at: string
          workspace_id: string
          workspace_integration_id: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          external_id?: string | null
          id?: string
          imported_at?: string
          kind: string
          meeting_id: string
          metadata?: Json | null
          provider: string
          source_url?: string | null
          updated_at?: string
          workspace_id: string
          workspace_integration_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          external_id?: string | null
          id?: string
          imported_at?: string
          kind?: string
          meeting_id?: string
          metadata?: Json | null
          provider?: string
          source_url?: string | null
          updated_at?: string
          workspace_id?: string
          workspace_integration_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_sources_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "client_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_sources_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_sources_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_sources_workspace_integration_id_fkey"
            columns: ["workspace_integration_id"]
            isOneToOne: false
            referencedRelation: "studio_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_sources_workspace_integration_id_fkey"
            columns: ["workspace_integration_id"]
            isOneToOne: false
            referencedRelation: "workspace_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_summaries: {
        Row: {
          content: string
          created_at: string
          generated_by: string | null
          id: string
          is_current: boolean | null
          meeting_id: string
          source_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          content: string
          created_at?: string
          generated_by?: string | null
          id?: string
          is_current?: boolean | null
          meeting_id: string
          source_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          content?: string
          created_at?: string
          generated_by?: string | null
          id?: string
          is_current?: boolean | null
          meeting_id?: string
          source_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_summaries_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "client_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_summaries_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "meeting_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_summaries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_summaries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_templates: {
        Row: {
          created_at: string
          default_description: string | null
          default_location_type: string | null
          duration_minutes: number
          id: string
          is_default: boolean | null
          meeting_type: string | null
          name: string
          user_id: string
          visibility_default: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          default_description?: string | null
          default_location_type?: string | null
          duration_minutes: number
          id?: string
          is_default?: boolean | null
          meeting_type?: string | null
          name: string
          user_id: string
          visibility_default?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          default_description?: string | null
          default_location_type?: string | null
          duration_minutes?: number
          id?: string
          is_default?: boolean | null
          meeting_type?: string | null
          name?: string
          user_id?: string
          visibility_default?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_templates_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_templates_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_transcripts: {
        Row: {
          content: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          meeting_id: string
          recording_url: string | null
          segments: Json | null
          source_id: string | null
          status: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          meeting_id: string
          recording_url?: string | null
          segments?: Json | null
          source_id?: string | null
          status?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          meeting_id?: string
          recording_url?: string | null
          segments?: Json | null
          source_id?: string | null
          status?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_transcripts_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "client_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_transcripts_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "meeting_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_transcripts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_transcripts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_types: {
        Row: {
          booking_questions: Json | null
          buffer_minutes: number | null
          cal_event_type_id: string | null
          cal_synced_at: string | null
          created_at: string
          currency: string | null
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean | null
          location: string | null
          location_address: string | null
          location_link: string | null
          location_phone: string | null
          min_notice_hours: number | null
          name: string
          price_cents: number | null
          requires_confirmation: boolean | null
          slug: string
          sort_order: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          booking_questions?: Json | null
          buffer_minutes?: number | null
          cal_event_type_id?: string | null
          cal_synced_at?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          duration_minutes: number
          id?: string
          is_active?: boolean | null
          location?: string | null
          location_address?: string | null
          location_link?: string | null
          location_phone?: string | null
          min_notice_hours?: number | null
          name: string
          price_cents?: number | null
          requires_confirmation?: boolean | null
          slug: string
          sort_order?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          booking_questions?: Json | null
          buffer_minutes?: number | null
          cal_event_type_id?: string | null
          cal_synced_at?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          location?: string | null
          location_address?: string | null
          location_link?: string | null
          location_phone?: string | null
          min_notice_hours?: number | null
          name?: string
          price_cents?: number | null
          requires_confirmation?: boolean | null
          slug?: string
          sort_order?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_types_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_types_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      message_deletions: {
        Row: {
          deleted_at: string
          id: string
          message_id: string
          message_type: string
          user_id: string
        }
        Insert: {
          deleted_at?: string
          id?: string
          message_id: string
          message_type: string
          user_id: string
        }
        Update: {
          deleted_at?: string
          id?: string
          message_id?: string
          message_type?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          content_tsv: unknown
          conversation_id: string
          created_at: string
          gmail_message_id: string | null
          gmail_thread_id: string | null
          id: string
          is_urgent: boolean | null
          knowledge_mentions: Json | null
          read_at: string | null
          reply_to_id: string | null
          sender_id: string
          sender_type: string
          sent_via: string | null
        }
        Insert: {
          content: string
          content_tsv?: unknown
          conversation_id: string
          created_at?: string
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          is_urgent?: boolean | null
          knowledge_mentions?: Json | null
          read_at?: string | null
          reply_to_id?: string | null
          sender_id: string
          sender_type: string
          sent_via?: string | null
        }
        Update: {
          content?: string
          content_tsv?: unknown
          conversation_id?: string
          created_at?: string
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          is_urgent?: boolean | null
          knowledge_mentions?: Json | null
          read_at?: string | null
          reply_to_id?: string | null
          sender_id?: string
          sender_type?: string
          sent_via?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          archived_at: string | null
          author_type: string | null
          category: string | null
          confidence: number | null
          content: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          is_archived: boolean | null
          is_pinned: boolean | null
          note_kind: string | null
          source: string | null
          source_ref: string | null
          status: string | null
          tags: string[] | null
          title: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          author_type?: string | null
          category?: string | null
          confidence?: number | null
          content: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_archived?: boolean | null
          is_pinned?: boolean | null
          note_kind?: string | null
          source?: string | null
          source_ref?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          author_type?: string | null
          category?: string | null
          confidence?: number | null
          content?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_archived?: boolean | null
          is_pinned?: boolean | null
          note_kind?: string | null
          source?: string | null
          source_ref?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          batching: string
          created_at: string
          id: string
          quiet_hours_days: number[]
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          quiet_hours_timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          batching?: string
          created_at?: string
          id?: string
          quiet_hours_days?: number[]
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          quiet_hours_timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          batching?: string
          created_at?: string
          id?: string
          quiet_hours_days?: number[]
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          quiet_hours_timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_checklists: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          items: Json | null
          proposal_id: string | null
          started_at: string | null
          status: string
          template_name: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          items?: Json | null
          proposal_id?: string | null
          started_at?: string | null
          status?: string
          template_name?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          items?: Json | null
          proposal_id?: string | null
          started_at?: string | null
          status?: string
          template_name?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_checklists_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_checklists_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_checklists_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_goals: {
        Row: {
          ai_progress: Json | null
          created_at: string
          current_value: number | null
          detail: string | null
          goal_type: Database["public"]["Enums"]["operator_goal_type"]
          horizon: Database["public"]["Enums"]["operator_goal_horizon"]
          id: string
          progress: number
          status: Database["public"]["Enums"]["operator_goal_status"]
          target_period: string | null
          target_unit: Database["public"]["Enums"]["operator_goal_unit"] | null
          target_value: number | null
          title: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          ai_progress?: Json | null
          created_at?: string
          current_value?: number | null
          detail?: string | null
          goal_type?: Database["public"]["Enums"]["operator_goal_type"]
          horizon?: Database["public"]["Enums"]["operator_goal_horizon"]
          id?: string
          progress?: number
          status?: Database["public"]["Enums"]["operator_goal_status"]
          target_period?: string | null
          target_unit?: Database["public"]["Enums"]["operator_goal_unit"] | null
          target_value?: number | null
          title: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          ai_progress?: Json | null
          created_at?: string
          current_value?: number | null
          detail?: string | null
          goal_type?: Database["public"]["Enums"]["operator_goal_type"]
          horizon?: Database["public"]["Enums"]["operator_goal_horizon"]
          id?: string
          progress?: number
          status?: Database["public"]["Enums"]["operator_goal_status"]
          target_period?: string | null
          target_unit?: Database["public"]["Enums"]["operator_goal_unit"] | null
          target_value?: number | null
          title?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operator_goals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_goals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_memory_facts: {
        Row: {
          category: Database["public"]["Enums"]["operator_fact_category"]
          confidence: number | null
          confirmed_at: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["operator_fact_kind"]
          label: string | null
          provenance: Json
          scope_type: Database["public"]["Enums"]["operator_fact_scope"]
          scope_value: string | null
          source: Database["public"]["Enums"]["operator_fact_source"]
          source_capture_id: string | null
          status: Database["public"]["Enums"]["operator_fact_status"]
          updated_at: string
          user_id: string
          value: string
          vote_count: number
          workspace_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["operator_fact_category"]
          confidence?: number | null
          confirmed_at?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["operator_fact_kind"]
          label?: string | null
          provenance?: Json
          scope_type?: Database["public"]["Enums"]["operator_fact_scope"]
          scope_value?: string | null
          source?: Database["public"]["Enums"]["operator_fact_source"]
          source_capture_id?: string | null
          status?: Database["public"]["Enums"]["operator_fact_status"]
          updated_at?: string
          user_id: string
          value: string
          vote_count?: number
          workspace_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["operator_fact_category"]
          confidence?: number | null
          confirmed_at?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["operator_fact_kind"]
          label?: string | null
          provenance?: Json
          scope_type?: Database["public"]["Enums"]["operator_fact_scope"]
          scope_value?: string | null
          source?: Database["public"]["Enums"]["operator_fact_source"]
          source_capture_id?: string | null
          status?: Database["public"]["Enums"]["operator_fact_status"]
          updated_at?: string
          user_id?: string
          value?: string
          vote_count?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operator_memory_facts_source_capture_id_fkey"
            columns: ["source_capture_id"]
            isOneToOne: false
            referencedRelation: "capture_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_memory_facts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_memory_facts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_voice_profile: {
        Row: {
          created_at: string
          id: string
          inherits_workspace: boolean
          learned_style: string | null
          updated_at: string
          user_id: string
          voice_archetype: string | null
          voice_spectrums: Json | null
          voice_style_guide: string | null
          voice_terminology: Json
          voice_tone: string[]
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inherits_workspace?: boolean
          learned_style?: string | null
          updated_at?: string
          user_id: string
          voice_archetype?: string | null
          voice_spectrums?: Json | null
          voice_style_guide?: string | null
          voice_terminology?: Json
          voice_tone?: string[]
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inherits_workspace?: boolean
          learned_style?: string | null
          updated_at?: string
          user_id?: string
          voice_archetype?: string | null
          voice_spectrums?: Json | null
          voice_style_guide?: string | null
          voice_terminology?: Json
          voice_tone?: string[]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operator_voice_profile_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_voice_profile_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_gaps: {
        Row: {
          amount_max: number | null
          amount_min: number | null
          category: string | null
          claim: string
          confidence: number | null
          created_at: string
          currency: string | null
          dismissed_at: string | null
          id: string
          is_primary: boolean | null
          sources: Json | null
          summary: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          amount_max?: number | null
          amount_min?: number | null
          category?: string | null
          claim: string
          confidence?: number | null
          created_at?: string
          currency?: string | null
          dismissed_at?: string | null
          id?: string
          is_primary?: boolean | null
          sources?: Json | null
          summary?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          amount_max?: number | null
          amount_min?: number | null
          category?: string | null
          claim?: string
          confidence?: number | null
          created_at?: string
          currency?: string | null
          dismissed_at?: string | null
          id?: string
          is_primary?: boolean | null
          sources?: Json | null
          summary?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_gaps_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_gaps_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_people: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean | null
          organization_id: string
          person_id: string
          role: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean | null
          organization_id: string
          person_id: string
          role?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean | null
          organization_id?: string
          person_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_people_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_people_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          address_line_1: string | null
          address_line_2: string | null
          ai_summary: string | null
          ai_summary_generated_at: string | null
          ai_summary_inputs_hash: string | null
          ai_summary_model: string | null
          ai_worth_attention: string | null
          ai_worth_attention_play: string | null
          app_url: string | null
          archived_at: string | null
          billing_email: string | null
          capture_event_id: string | null
          city: string | null
          country: string | null
          created_at: string
          created_via: string | null
          deleted_at: string | null
          deleted_by: string | null
          domain: string | null
          estimated_budget_tier: string | null
          estimated_company_size: string | null
          icp_fit_score: number | null
          icp_fit_signals: Json | null
          icp_fit_status: string | null
          id: string
          industry: string | null
          industry_child: string | null
          industry_parent: string | null
          last_contact_at: string | null
          metadata: Json | null
          name: string
          notes: string | null
          postal_code: string | null
          project_count: number | null
          provider: Database["public"]["Enums"]["entity_provider"] | null
          record_status: string
          record_status_changed_at: string | null
          record_status_source: string | null
          relationship_health_archetype: string | null
          relationship_health_band: string | null
          relationship_health_factors: Json | null
          relationship_health_score: number | null
          relationship_health_updated_at: string | null
          relationship_health_version: number | null
          relationship_status: string | null
          slug: string | null
          source_external_id: string | null
          source_origin:
            | Database["public"]["Enums"]["entity_source_origin"]
            | null
          state: string | null
          successful_project_count: number | null
          tax_id: string | null
          total_project_value_cents: number | null
          updated_at: string
          website: string | null
          workspace_id: string
        }
        Insert: {
          address?: string | null
          address_line_1?: string | null
          address_line_2?: string | null
          ai_summary?: string | null
          ai_summary_generated_at?: string | null
          ai_summary_inputs_hash?: string | null
          ai_summary_model?: string | null
          ai_worth_attention?: string | null
          ai_worth_attention_play?: string | null
          app_url?: string | null
          archived_at?: string | null
          billing_email?: string | null
          capture_event_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_via?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          domain?: string | null
          estimated_budget_tier?: string | null
          estimated_company_size?: string | null
          icp_fit_score?: number | null
          icp_fit_signals?: Json | null
          icp_fit_status?: string | null
          id?: string
          industry?: string | null
          industry_child?: string | null
          industry_parent?: string | null
          last_contact_at?: string | null
          metadata?: Json | null
          name: string
          notes?: string | null
          postal_code?: string | null
          project_count?: number | null
          provider?: Database["public"]["Enums"]["entity_provider"] | null
          record_status?: string
          record_status_changed_at?: string | null
          record_status_source?: string | null
          relationship_health_archetype?: string | null
          relationship_health_band?: string | null
          relationship_health_factors?: Json | null
          relationship_health_score?: number | null
          relationship_health_updated_at?: string | null
          relationship_health_version?: number | null
          relationship_status?: string | null
          slug?: string | null
          source_external_id?: string | null
          source_origin?:
            | Database["public"]["Enums"]["entity_source_origin"]
            | null
          state?: string | null
          successful_project_count?: number | null
          tax_id?: string | null
          total_project_value_cents?: number | null
          updated_at?: string
          website?: string | null
          workspace_id: string
        }
        Update: {
          address?: string | null
          address_line_1?: string | null
          address_line_2?: string | null
          ai_summary?: string | null
          ai_summary_generated_at?: string | null
          ai_summary_inputs_hash?: string | null
          ai_summary_model?: string | null
          ai_worth_attention?: string | null
          ai_worth_attention_play?: string | null
          app_url?: string | null
          archived_at?: string | null
          billing_email?: string | null
          capture_event_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_via?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          domain?: string | null
          estimated_budget_tier?: string | null
          estimated_company_size?: string | null
          icp_fit_score?: number | null
          icp_fit_signals?: Json | null
          icp_fit_status?: string | null
          id?: string
          industry?: string | null
          industry_child?: string | null
          industry_parent?: string | null
          last_contact_at?: string | null
          metadata?: Json | null
          name?: string
          notes?: string | null
          postal_code?: string | null
          project_count?: number | null
          provider?: Database["public"]["Enums"]["entity_provider"] | null
          record_status?: string
          record_status_changed_at?: string | null
          record_status_source?: string | null
          relationship_health_archetype?: string | null
          relationship_health_band?: string | null
          relationship_health_factors?: Json | null
          relationship_health_score?: number | null
          relationship_health_updated_at?: string | null
          relationship_health_version?: number | null
          relationship_status?: string | null
          slug?: string | null
          source_external_id?: string | null
          source_origin?:
            | Database["public"]["Enums"]["entity_source_origin"]
            | null
          state?: string | null
          successful_project_count?: number | null
          tax_id?: string | null
          total_project_value_cents?: number | null
          updated_at?: string
          website?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_capture_event_id_fkey"
            columns: ["capture_event_id"]
            isOneToOne: false
            referencedRelation: "capture_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          ai_summary: string | null
          ai_summary_generated_at: string | null
          ai_summary_inputs_hash: string | null
          ai_summary_model: string | null
          ai_worth_attention: string | null
          ai_worth_attention_play: string | null
          app_url: string | null
          archived_at: string | null
          avatar_url: string | null
          avg_response_time_hours: number | null
          billing_email: string | null
          capture_event_id: string | null
          city: string | null
          country: string | null
          created_at: string
          created_via: string | null
          days_to_first_project: number | null
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          first_contact_at: string | null
          icp_fit_score: number | null
          icp_fit_signals: Json | null
          icp_fit_status: string | null
          id: string
          last_contact_at: string | null
          metadata: Json | null
          migrated_from_client_user_id: string | null
          name: string
          notes: string | null
          phone: string | null
          portal_user_id: string | null
          postal_code: string | null
          project_count: number | null
          provider: Database["public"]["Enums"]["entity_provider"] | null
          record_status: string
          record_status_changed_at: string | null
          record_status_source: string | null
          referral_given: boolean | null
          referral_received: boolean | null
          relationship_health_archetype: string | null
          relationship_health_band: string | null
          relationship_health_factors: Json | null
          relationship_health_score: number | null
          relationship_health_updated_at: string | null
          relationship_health_version: number | null
          relationship_status: string | null
          relationship_type: string | null
          source_external_id: string | null
          source_origin:
            | Database["public"]["Enums"]["entity_source_origin"]
            | null
          state: string | null
          successful_project_count: number | null
          timezone: string | null
          title: string | null
          total_project_value_cents: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          ai_summary?: string | null
          ai_summary_generated_at?: string | null
          ai_summary_inputs_hash?: string | null
          ai_summary_model?: string | null
          ai_worth_attention?: string | null
          ai_worth_attention_play?: string | null
          app_url?: string | null
          archived_at?: string | null
          avatar_url?: string | null
          avg_response_time_hours?: number | null
          billing_email?: string | null
          capture_event_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_via?: string | null
          days_to_first_project?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          first_contact_at?: string | null
          icp_fit_score?: number | null
          icp_fit_signals?: Json | null
          icp_fit_status?: string | null
          id?: string
          last_contact_at?: string | null
          metadata?: Json | null
          migrated_from_client_user_id?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          portal_user_id?: string | null
          postal_code?: string | null
          project_count?: number | null
          provider?: Database["public"]["Enums"]["entity_provider"] | null
          record_status?: string
          record_status_changed_at?: string | null
          record_status_source?: string | null
          referral_given?: boolean | null
          referral_received?: boolean | null
          relationship_health_archetype?: string | null
          relationship_health_band?: string | null
          relationship_health_factors?: Json | null
          relationship_health_score?: number | null
          relationship_health_updated_at?: string | null
          relationship_health_version?: number | null
          relationship_status?: string | null
          relationship_type?: string | null
          source_external_id?: string | null
          source_origin?:
            | Database["public"]["Enums"]["entity_source_origin"]
            | null
          state?: string | null
          successful_project_count?: number | null
          timezone?: string | null
          title?: string | null
          total_project_value_cents?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          ai_summary?: string | null
          ai_summary_generated_at?: string | null
          ai_summary_inputs_hash?: string | null
          ai_summary_model?: string | null
          ai_worth_attention?: string | null
          ai_worth_attention_play?: string | null
          app_url?: string | null
          archived_at?: string | null
          avatar_url?: string | null
          avg_response_time_hours?: number | null
          billing_email?: string | null
          capture_event_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_via?: string | null
          days_to_first_project?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          first_contact_at?: string | null
          icp_fit_score?: number | null
          icp_fit_signals?: Json | null
          icp_fit_status?: string | null
          id?: string
          last_contact_at?: string | null
          metadata?: Json | null
          migrated_from_client_user_id?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          portal_user_id?: string | null
          postal_code?: string | null
          project_count?: number | null
          provider?: Database["public"]["Enums"]["entity_provider"] | null
          record_status?: string
          record_status_changed_at?: string | null
          record_status_source?: string | null
          referral_given?: boolean | null
          referral_received?: boolean | null
          relationship_health_archetype?: string | null
          relationship_health_band?: string | null
          relationship_health_factors?: Json | null
          relationship_health_score?: number | null
          relationship_health_updated_at?: string | null
          relationship_health_version?: number | null
          relationship_status?: string | null
          relationship_type?: string | null
          source_external_id?: string | null
          source_origin?:
            | Database["public"]["Enums"]["entity_source_origin"]
            | null
          state?: string | null
          successful_project_count?: number | null
          timezone?: string | null
          title?: string | null
          total_project_value_cents?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_capture_event_id_fkey"
            columns: ["capture_event_id"]
            isOneToOne: false
            referencedRelation: "capture_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      play_run_assignments: {
        Row: {
          assignee_member_id: string | null
          assignee_team_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          due_at: string | null
          id: string
          metadata: Json
          play_run_id: string
          role: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assignee_member_id?: string | null
          assignee_team_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          metadata?: Json
          play_run_id: string
          role?: string
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assignee_member_id?: string | null
          assignee_team_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          metadata?: Json
          play_run_id?: string
          role?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "play_run_assignments_assignee_member_id_fkey"
            columns: ["assignee_member_id"]
            isOneToOne: false
            referencedRelation: "studio_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "play_run_assignments_assignee_member_id_fkey"
            columns: ["assignee_member_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "play_run_assignments_assignee_team_id_fkey"
            columns: ["assignee_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "play_run_assignments_play_run_id_fkey"
            columns: ["play_run_id"]
            isOneToOne: false
            referencedRelation: "play_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "play_run_assignments_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "play_run_assignments_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      play_run_sources: {
        Row: {
          created_at: string
          excerpt: string | null
          external_url: string | null
          id: string
          label: string | null
          metadata: Json | null
          play_run_id: string
          source_type: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          excerpt?: string | null
          external_url?: string | null
          id?: string
          label?: string | null
          metadata?: Json | null
          play_run_id: string
          source_type: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          excerpt?: string | null
          external_url?: string | null
          id?: string
          label?: string | null
          metadata?: Json | null
          play_run_id?: string
          source_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "play_run_sources_play_run_id_fkey"
            columns: ["play_run_id"]
            isOneToOne: false
            referencedRelation: "play_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "play_run_sources_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "play_run_sources_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      play_runs: {
        Row: {
          approved_at: string | null
          channel: string | null
          channels: string[] | null
          confidence: number | null
          created_at: string
          dismissed_at: string | null
          draft_body: string | null
          eta_label: string | null
          id: string
          last_error: string | null
          metadata: Json
          opportunity_gap_id: string | null
          owner_member_id: string | null
          owner_team_id: string | null
          player_id: string | null
          prepared_by_player_id: string | null
          preview: string | null
          ran_at: string | null
          recipient_label: string | null
          scheduled_for: string | null
          space_id: string | null
          state: string
          target_id: string | null
          target_label: string | null
          target_type: string | null
          template_id: string | null
          title: string
          updated_at: string
          value_amount: number | null
          value_attributed_at: string | null
          value_basis: string | null
          value_currency: string | null
          value_kind: string | null
          workspace_id: string
        }
        Insert: {
          approved_at?: string | null
          channel?: string | null
          channels?: string[] | null
          confidence?: number | null
          created_at?: string
          dismissed_at?: string | null
          draft_body?: string | null
          eta_label?: string | null
          id?: string
          last_error?: string | null
          metadata?: Json
          opportunity_gap_id?: string | null
          owner_member_id?: string | null
          owner_team_id?: string | null
          player_id?: string | null
          prepared_by_player_id?: string | null
          preview?: string | null
          ran_at?: string | null
          recipient_label?: string | null
          scheduled_for?: string | null
          space_id?: string | null
          state?: string
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
          template_id?: string | null
          title: string
          updated_at?: string
          value_amount?: number | null
          value_attributed_at?: string | null
          value_basis?: string | null
          value_currency?: string | null
          value_kind?: string | null
          workspace_id: string
        }
        Update: {
          approved_at?: string | null
          channel?: string | null
          channels?: string[] | null
          confidence?: number | null
          created_at?: string
          dismissed_at?: string | null
          draft_body?: string | null
          eta_label?: string | null
          id?: string
          last_error?: string | null
          metadata?: Json
          opportunity_gap_id?: string | null
          owner_member_id?: string | null
          owner_team_id?: string | null
          player_id?: string | null
          prepared_by_player_id?: string | null
          preview?: string | null
          ran_at?: string | null
          recipient_label?: string | null
          scheduled_for?: string | null
          space_id?: string | null
          state?: string
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string
          value_amount?: number | null
          value_attributed_at?: string | null
          value_basis?: string | null
          value_currency?: string | null
          value_kind?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "play_runs_opportunity_gap_id_fkey"
            columns: ["opportunity_gap_id"]
            isOneToOne: false
            referencedRelation: "opportunity_gaps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "play_runs_owner_member_id_fkey"
            columns: ["owner_member_id"]
            isOneToOne: false
            referencedRelation: "studio_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "play_runs_owner_member_id_fkey"
            columns: ["owner_member_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "play_runs_owner_team_id_fkey"
            columns: ["owner_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "play_runs_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "play_runs_prepared_by_player_id_fkey"
            columns: ["prepared_by_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "play_runs_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "play_runs_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "play_runs_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "play_runs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "play_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      play_templates: {
        Row: {
          actions_approved_at: string | null
          actions_approved_by: string | null
          approved_actions: string[]
          blueprint_slug: string | null
          blueprint_version: number | null
          created_at: string
          default_channel: string | null
          definition: Json | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          player_id: string | null
          procedure_md: string | null
          required_actions: string[]
          slug: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          actions_approved_at?: string | null
          actions_approved_by?: string | null
          approved_actions?: string[]
          blueprint_slug?: string | null
          blueprint_version?: number | null
          created_at?: string
          default_channel?: string | null
          definition?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          player_id?: string | null
          procedure_md?: string | null
          required_actions?: string[]
          slug: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          actions_approved_at?: string | null
          actions_approved_by?: string | null
          approved_actions?: string[]
          blueprint_slug?: string | null
          blueprint_version?: number | null
          created_at?: string
          default_channel?: string | null
          definition?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          player_id?: string | null
          procedure_md?: string | null
          required_actions?: string[]
          slug?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "play_templates_blueprint_slug_fkey"
            columns: ["blueprint_slug"]
            isOneToOne: false
            referencedRelation: "playbook_blueprints"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "play_templates_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "play_templates_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "play_templates_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      playbook_blueprint_versions: {
        Row: {
          blueprint_slug: string
          change_summary: string | null
          created_at: string
          definition: Json
          fill_rules: Json | null
          id: string
          kind: string
          procedure_md: string
          required_actions: string[]
          value_model: Json | null
          version: number
        }
        Insert: {
          blueprint_slug: string
          change_summary?: string | null
          created_at?: string
          definition: Json
          fill_rules?: Json | null
          id?: string
          kind?: string
          procedure_md: string
          required_actions?: string[]
          value_model?: Json | null
          version: number
        }
        Update: {
          blueprint_slug?: string
          change_summary?: string | null
          created_at?: string
          definition?: Json
          fill_rules?: Json | null
          id?: string
          kind?: string
          procedure_md?: string
          required_actions?: string[]
          value_model?: Json | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "playbook_blueprint_versions_blueprint_slug_fkey"
            columns: ["blueprint_slug"]
            isOneToOne: false
            referencedRelation: "playbook_blueprints"
            referencedColumns: ["slug"]
          },
        ]
      }
      playbook_blueprints: {
        Row: {
          created_at: string
          definition: Json
          description: string | null
          fill_rules: Json | null
          kind: string
          name: string
          player_slug: string
          procedure_md: string
          required_actions: string[]
          slug: string
          status: string
          trigger: Json
          updated_at: string
          value_model: Json | null
          version: number
          when_to_use: string | null
        }
        Insert: {
          created_at?: string
          definition: Json
          description?: string | null
          fill_rules?: Json | null
          kind?: string
          name: string
          player_slug: string
          procedure_md: string
          required_actions?: string[]
          slug: string
          status?: string
          trigger?: Json
          updated_at?: string
          value_model?: Json | null
          version?: number
          when_to_use?: string | null
        }
        Update: {
          created_at?: string
          definition?: Json
          description?: string | null
          fill_rules?: Json | null
          kind?: string
          name?: string
          player_slug?: string
          procedure_md?: string
          required_actions?: string[]
          slug?: string
          status?: string
          trigger?: Json
          updated_at?: string
          value_model?: Json | null
          version?: number
          when_to_use?: string | null
        }
        Relationships: []
      }
      playbook_eval_runs: {
        Row: {
          blueprint_slug: string
          eval_id: string
          evidence: Json
          id: string
          passed: boolean
          scored_at: string
          version: number
        }
        Insert: {
          blueprint_slug: string
          eval_id: string
          evidence?: Json
          id?: string
          passed: boolean
          scored_at?: string
          version: number
        }
        Update: {
          blueprint_slug?: string
          eval_id?: string
          evidence?: Json
          id?: string
          passed?: boolean
          scored_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "playbook_eval_runs_blueprint_slug_fkey"
            columns: ["blueprint_slug"]
            isOneToOne: false
            referencedRelation: "playbook_blueprints"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "playbook_eval_runs_eval_id_fkey"
            columns: ["eval_id"]
            isOneToOne: false
            referencedRelation: "playbook_evals"
            referencedColumns: ["id"]
          },
        ]
      }
      playbook_evals: {
        Row: {
          assertions: Json
          blueprint_slug: string
          created_at: string
          eval_key: string
          id: string
          input: Json
          mocks: Json
          name: string
          origin: string
          source_run_id: string | null
        }
        Insert: {
          assertions?: Json
          blueprint_slug: string
          created_at?: string
          eval_key: string
          id?: string
          input?: Json
          mocks?: Json
          name: string
          origin?: string
          source_run_id?: string | null
        }
        Update: {
          assertions?: Json
          blueprint_slug?: string
          created_at?: string
          eval_key?: string
          id?: string
          input?: Json
          mocks?: Json
          name?: string
          origin?: string
          source_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playbook_evals_blueprint_slug_fkey"
            columns: ["blueprint_slug"]
            isOneToOne: false
            referencedRelation: "playbook_blueprints"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "playbook_evals_source_run_id_fkey"
            columns: ["source_run_id"]
            isOneToOne: false
            referencedRelation: "play_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      playbook_improvement_proposals: {
        Row: {
          benchmark_delta: Json | null
          blueprint_slug: string
          created_at: string
          evidence: Json
          from_version: number
          id: string
          proposed_definition: Json
          proposed_procedure_md: string
          proposed_required_actions: string[]
          rationale: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          benchmark_delta?: Json | null
          blueprint_slug: string
          created_at?: string
          evidence?: Json
          from_version: number
          id?: string
          proposed_definition: Json
          proposed_procedure_md: string
          proposed_required_actions?: string[]
          rationale: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          benchmark_delta?: Json | null
          blueprint_slug?: string
          created_at?: string
          evidence?: Json
          from_version?: number
          id?: string
          proposed_definition?: Json
          proposed_procedure_md?: string
          proposed_required_actions?: string[]
          rationale?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbook_improvement_proposals_blueprint_slug_fkey"
            columns: ["blueprint_slug"]
            isOneToOne: false
            referencedRelation: "playbook_blueprints"
            referencedColumns: ["slug"]
          },
        ]
      }
      playbook_learning_signals: {
        Row: {
          blueprint_slug: string | null
          created_at: string
          delta: Json
          id: string
          play_run_id: string | null
          signal_type: string
          template_id: string | null
          workspace_id: string
        }
        Insert: {
          blueprint_slug?: string | null
          created_at?: string
          delta?: Json
          id?: string
          play_run_id?: string | null
          signal_type: string
          template_id?: string | null
          workspace_id: string
        }
        Update: {
          blueprint_slug?: string | null
          created_at?: string
          delta?: Json
          id?: string
          play_run_id?: string | null
          signal_type?: string
          template_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbook_learning_signals_blueprint_slug_fkey"
            columns: ["blueprint_slug"]
            isOneToOne: false
            referencedRelation: "playbook_blueprints"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "playbook_learning_signals_play_run_id_fkey"
            columns: ["play_run_id"]
            isOneToOne: false
            referencedRelation: "play_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbook_learning_signals_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "play_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbook_learning_signals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbook_learning_signals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string
          department: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          role_label: string | null
          slug: string
          tone: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          role_label?: string | null
          slug: string
          tone?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          role_label?: string | null
          slug?: string
          tone?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_field_provenance: {
        Row: {
          blueprint_slug: string | null
          blueprint_version: number | null
          confidence: number | null
          entity_id: string
          entity_type: string
          evidence: Json
          field: string
          id: string
          rule_id: string | null
          set_at: string
          source: string
          status: string
          value: Json
          workspace_id: string
        }
        Insert: {
          blueprint_slug?: string | null
          blueprint_version?: number | null
          confidence?: number | null
          entity_id: string
          entity_type: string
          evidence?: Json
          field: string
          id?: string
          rule_id?: string | null
          set_at?: string
          source: string
          status?: string
          value: Json
          workspace_id: string
        }
        Update: {
          blueprint_slug?: string | null
          blueprint_version?: number | null
          confidence?: number | null
          entity_id?: string
          entity_type?: string
          evidence?: Json
          field?: string
          id?: string
          rule_id?: string | null
          set_at?: string
          source?: string
          status?: string
          value?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_field_provenance_blueprint_slug_fkey"
            columns: ["blueprint_slug"]
            isOneToOne: false
            referencedRelation: "playbook_blueprints"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "profile_field_provenance_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_field_provenance_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_playbook_settings: {
        Row: {
          active_sections: string[]
          ai_fallback_enabled: boolean
          auto_apply_threshold: number
          blueprint_slug: string
          context_facts: Json
          fill_rules_override: Json | null
          tag_auto_create_threshold: number | null
          tag_max_ai_created: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          active_sections?: string[]
          ai_fallback_enabled?: boolean
          auto_apply_threshold?: number
          blueprint_slug: string
          context_facts?: Json
          fill_rules_override?: Json | null
          tag_auto_create_threshold?: number | null
          tag_max_ai_created?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          active_sections?: string[]
          ai_fallback_enabled?: boolean
          auto_apply_threshold?: number
          blueprint_slug?: string
          context_facts?: Json
          fill_rules_override?: Json | null
          tag_auto_create_threshold?: number | null
          tag_max_ai_created?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_playbook_settings_blueprint_slug_fkey"
            columns: ["blueprint_slug"]
            isOneToOne: false
            referencedRelation: "playbook_blueprints"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "profile_playbook_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_playbook_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          avatar_url: string | null
          city: string | null
          company_name: string | null
          country: string | null
          created_at: string
          current_focus: string | null
          customer_id: string | null
          display_name: string | null
          email: string | null
          email_signature: string | null
          first_name: string | null
          full_name: string | null
          gender: string | null
          has_access: boolean
          id: string
          job_title: string | null
          last_name: string | null
          last_seen_at: string | null
          location: string | null
          phone: string | null
          postal_code: string | null
          preferred_contact_method: string | null
          preferred_name: string | null
          price_id: string | null
          professional_credentials: string | null
          role_title: string | null
          saas_subscription_id: string | null
          saas_subscription_status: string | null
          saas_tier: string | null
          state: string | null
          stripe_connect_account_id: string | null
          stripe_connect_charges_enabled: boolean | null
          stripe_connect_details_submitted: boolean | null
          stripe_connect_payouts_enabled: boolean | null
          stripe_connect_status: string | null
          tagline: string | null
          timezone: string | null
          trial_ends_at: string | null
          updated_at: string
          working_hours: string | null
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          avatar_url?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          current_focus?: string | null
          customer_id?: string | null
          display_name?: string | null
          email?: string | null
          email_signature?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          has_access?: boolean
          id: string
          job_title?: string | null
          last_name?: string | null
          last_seen_at?: string | null
          location?: string | null
          phone?: string | null
          postal_code?: string | null
          preferred_contact_method?: string | null
          preferred_name?: string | null
          price_id?: string | null
          professional_credentials?: string | null
          role_title?: string | null
          saas_subscription_id?: string | null
          saas_subscription_status?: string | null
          saas_tier?: string | null
          state?: string | null
          stripe_connect_account_id?: string | null
          stripe_connect_charges_enabled?: boolean | null
          stripe_connect_details_submitted?: boolean | null
          stripe_connect_payouts_enabled?: boolean | null
          stripe_connect_status?: string | null
          tagline?: string | null
          timezone?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          working_hours?: string | null
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          avatar_url?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          current_focus?: string | null
          customer_id?: string | null
          display_name?: string | null
          email?: string | null
          email_signature?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          has_access?: boolean
          id?: string
          job_title?: string | null
          last_name?: string | null
          last_seen_at?: string | null
          location?: string | null
          phone?: string | null
          postal_code?: string | null
          preferred_contact_method?: string | null
          preferred_name?: string | null
          price_id?: string | null
          professional_credentials?: string | null
          role_title?: string | null
          saas_subscription_id?: string | null
          saas_subscription_status?: string | null
          saas_tier?: string | null
          state?: string | null
          stripe_connect_account_id?: string | null
          stripe_connect_charges_enabled?: boolean | null
          stripe_connect_details_submitted?: boolean | null
          stripe_connect_payouts_enabled?: boolean | null
          stripe_connect_status?: string | null
          tagline?: string | null
          timezone?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          working_hours?: string | null
        }
        Relationships: []
      }
      project_files: {
        Row: {
          ai_error: string | null
          ai_extracted_at: string | null
          ai_status: Database["public"]["Enums"]["file_ai_status"] | null
          ai_summary: string | null
          app_url: string | null
          archived_at: string | null
          brand_metadata: Json | null
          bucket_id: string
          capture_event_id: string | null
          capture_source_url: string | null
          category: Database["public"]["Enums"]["file_category"]
          created_at: string
          currency: string | null
          description: string | null
          direction: Database["public"]["Enums"]["file_direction"] | null
          document_type: string | null
          due_date: string | null
          expiry_date: string | null
          external_url: string | null
          extracted_data: Json | null
          extraction_status: string | null
          extraction_version: number | null
          file_name: string
          file_type: string
          follow_up_date: string | null
          follow_up_reason: string | null
          follow_up_suggested: boolean | null
          id: string
          is_operator_asset: boolean
          lifecycle_status: string | null
          mime_type: string | null
          object_path: string | null
          organization_id: string | null
          person_id: string | null
          project_id: string | null
          provider: Database["public"]["Enums"]["entity_provider"] | null
          shared_with_client: boolean | null
          signed_date: string | null
          size_bytes: number | null
          source_external_id: string | null
          source_origin:
            | Database["public"]["Enums"]["entity_source_origin"]
            | null
          source_provider: string | null
          source_reclassified_as_manual: boolean | null
          source_type: string | null
          total_amount_cents: number | null
          updated_at: string
          uploaded_by: string
          workspace_id: string
        }
        Insert: {
          ai_error?: string | null
          ai_extracted_at?: string | null
          ai_status?: Database["public"]["Enums"]["file_ai_status"] | null
          ai_summary?: string | null
          app_url?: string | null
          archived_at?: string | null
          brand_metadata?: Json | null
          bucket_id?: string
          capture_event_id?: string | null
          capture_source_url?: string | null
          category?: Database["public"]["Enums"]["file_category"]
          created_at?: string
          currency?: string | null
          description?: string | null
          direction?: Database["public"]["Enums"]["file_direction"] | null
          document_type?: string | null
          due_date?: string | null
          expiry_date?: string | null
          external_url?: string | null
          extracted_data?: Json | null
          extraction_status?: string | null
          extraction_version?: number | null
          file_name: string
          file_type?: string
          follow_up_date?: string | null
          follow_up_reason?: string | null
          follow_up_suggested?: boolean | null
          id?: string
          is_operator_asset?: boolean
          lifecycle_status?: string | null
          mime_type?: string | null
          object_path?: string | null
          organization_id?: string | null
          person_id?: string | null
          project_id?: string | null
          provider?: Database["public"]["Enums"]["entity_provider"] | null
          shared_with_client?: boolean | null
          signed_date?: string | null
          size_bytes?: number | null
          source_external_id?: string | null
          source_origin?:
            | Database["public"]["Enums"]["entity_source_origin"]
            | null
          source_provider?: string | null
          source_reclassified_as_manual?: boolean | null
          source_type?: string | null
          total_amount_cents?: number | null
          updated_at?: string
          uploaded_by: string
          workspace_id: string
        }
        Update: {
          ai_error?: string | null
          ai_extracted_at?: string | null
          ai_status?: Database["public"]["Enums"]["file_ai_status"] | null
          ai_summary?: string | null
          app_url?: string | null
          archived_at?: string | null
          brand_metadata?: Json | null
          bucket_id?: string
          capture_event_id?: string | null
          capture_source_url?: string | null
          category?: Database["public"]["Enums"]["file_category"]
          created_at?: string
          currency?: string | null
          description?: string | null
          direction?: Database["public"]["Enums"]["file_direction"] | null
          document_type?: string | null
          due_date?: string | null
          expiry_date?: string | null
          external_url?: string | null
          extracted_data?: Json | null
          extraction_status?: string | null
          extraction_version?: number | null
          file_name?: string
          file_type?: string
          follow_up_date?: string | null
          follow_up_reason?: string | null
          follow_up_suggested?: boolean | null
          id?: string
          is_operator_asset?: boolean
          lifecycle_status?: string | null
          mime_type?: string | null
          object_path?: string | null
          organization_id?: string | null
          person_id?: string | null
          project_id?: string | null
          provider?: Database["public"]["Enums"]["entity_provider"] | null
          shared_with_client?: boolean | null
          signed_date?: string | null
          size_bytes?: number | null
          source_external_id?: string | null
          source_origin?:
            | Database["public"]["Enums"]["entity_source_origin"]
            | null
          source_provider?: string | null
          source_reclassified_as_manual?: boolean | null
          source_type?: string | null
          total_amount_cents?: number | null
          updated_at?: string
          uploaded_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_files_capture_event_id_fkey"
            columns: ["capture_event_id"]
            isOneToOne: false
            referencedRelation: "capture_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          client_visible: boolean | null
          completed_at: string | null
          created_at: string
          depends_on_milestone_id: string | null
          description: string | null
          due_at: string | null
          id: string
          order_index: number
          project_id: string
          status: string | null
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          client_visible?: boolean | null
          completed_at?: string | null
          created_at?: string
          depends_on_milestone_id?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          order_index: number
          project_id: string
          status?: string | null
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          client_visible?: boolean | null
          completed_at?: string | null
          created_at?: string
          depends_on_milestone_id?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          order_index?: number
          project_id?: string
          status?: string | null
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_depends_on_milestone_id_fkey"
            columns: ["depends_on_milestone_id"]
            isOneToOne: false
            referencedRelation: "project_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_milestones_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_milestones_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      project_retainers: {
        Row: {
          active: boolean
          created_at: string
          hourly_rate_cents: number | null
          id: string
          included_hours_per_month: number
          project_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          hourly_rate_cents?: number | null
          id?: string
          included_hours_per_month: number
          project_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          hourly_rate_cents?: number | null
          id?: string
          included_hours_per_month?: number
          project_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_retainers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_retainers_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_retainers_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          ai_summary: string | null
          ai_summary_generated_at: string | null
          ai_summary_inputs_hash: string | null
          ai_summary_model: string | null
          ai_worth_attention: string | null
          ai_worth_attention_play: string | null
          app_url: string | null
          archived_at: string | null
          billing_contact_id: string | null
          billing_cycle:
            | Database["public"]["Enums"]["work_billing_cycle"]
            | null
          capture_event_id: string | null
          closed_at: string | null
          contract_value_cents: number | null
          created_at: string
          currency: string | null
          deadline: string | null
          decision_date: string | null
          deleted_at: string | null
          deleted_by: string | null
          delivered_at: string | null
          description: string | null
          discount_amount_cents: number | null
          discount_percent: number | null
          discount_reason: string | null
          estimated_timeline: string | null
          event_date: string | null
          final_price_cents: number | null
          health_archetype: string | null
          health_band: string | null
          health_factors: Json | null
          health_score_cached: number | null
          health_updated_at: string | null
          health_version: number | null
          hourly_rate_cents: number | null
          hours_estimate: number | null
          hours_logged: number | null
          id: string
          metadata: Json | null
          name: string
          organization_id: string | null
          payment_terms:
            | Database["public"]["Enums"]["work_payment_terms"]
            | null
          payment_type:
            | Database["public"]["Enums"]["projects_payment_type"]
            | null
          person_id: string | null
          po_number: string | null
          progress_override: number | null
          provider: Database["public"]["Enums"]["entity_provider"] | null
          renewal_date: string | null
          retainer_mrr_cents: number | null
          retainer_start_date: string | null
          scope_items: Json | null
          service_id: string | null
          slug: string
          source_external_id: string | null
          source_origin:
            | Database["public"]["Enums"]["entity_source_origin"]
            | null
          stage: string | null
          stage_entered_at: string | null
          start_date: string | null
          started_at: string | null
          status: string | null
          updated_at: string
          win_probability: number | null
          work_type: Database["public"]["Enums"]["projects_type"] | null
          workspace_id: string
        }
        Insert: {
          ai_summary?: string | null
          ai_summary_generated_at?: string | null
          ai_summary_inputs_hash?: string | null
          ai_summary_model?: string | null
          ai_worth_attention?: string | null
          ai_worth_attention_play?: string | null
          app_url?: string | null
          archived_at?: string | null
          billing_contact_id?: string | null
          billing_cycle?:
            | Database["public"]["Enums"]["work_billing_cycle"]
            | null
          capture_event_id?: string | null
          closed_at?: string | null
          contract_value_cents?: number | null
          created_at?: string
          currency?: string | null
          deadline?: string | null
          decision_date?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          delivered_at?: string | null
          description?: string | null
          discount_amount_cents?: number | null
          discount_percent?: number | null
          discount_reason?: string | null
          estimated_timeline?: string | null
          event_date?: string | null
          final_price_cents?: number | null
          health_archetype?: string | null
          health_band?: string | null
          health_factors?: Json | null
          health_score_cached?: number | null
          health_updated_at?: string | null
          health_version?: number | null
          hourly_rate_cents?: number | null
          hours_estimate?: number | null
          hours_logged?: number | null
          id?: string
          metadata?: Json | null
          name: string
          organization_id?: string | null
          payment_terms?:
            | Database["public"]["Enums"]["work_payment_terms"]
            | null
          payment_type?:
            | Database["public"]["Enums"]["projects_payment_type"]
            | null
          person_id?: string | null
          po_number?: string | null
          progress_override?: number | null
          provider?: Database["public"]["Enums"]["entity_provider"] | null
          renewal_date?: string | null
          retainer_mrr_cents?: number | null
          retainer_start_date?: string | null
          scope_items?: Json | null
          service_id?: string | null
          slug: string
          source_external_id?: string | null
          source_origin?:
            | Database["public"]["Enums"]["entity_source_origin"]
            | null
          stage?: string | null
          stage_entered_at?: string | null
          start_date?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string
          win_probability?: number | null
          work_type?: Database["public"]["Enums"]["projects_type"] | null
          workspace_id: string
        }
        Update: {
          ai_summary?: string | null
          ai_summary_generated_at?: string | null
          ai_summary_inputs_hash?: string | null
          ai_summary_model?: string | null
          ai_worth_attention?: string | null
          ai_worth_attention_play?: string | null
          app_url?: string | null
          archived_at?: string | null
          billing_contact_id?: string | null
          billing_cycle?:
            | Database["public"]["Enums"]["work_billing_cycle"]
            | null
          capture_event_id?: string | null
          closed_at?: string | null
          contract_value_cents?: number | null
          created_at?: string
          currency?: string | null
          deadline?: string | null
          decision_date?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          delivered_at?: string | null
          description?: string | null
          discount_amount_cents?: number | null
          discount_percent?: number | null
          discount_reason?: string | null
          estimated_timeline?: string | null
          event_date?: string | null
          final_price_cents?: number | null
          health_archetype?: string | null
          health_band?: string | null
          health_factors?: Json | null
          health_score_cached?: number | null
          health_updated_at?: string | null
          health_version?: number | null
          hourly_rate_cents?: number | null
          hours_estimate?: number | null
          hours_logged?: number | null
          id?: string
          metadata?: Json | null
          name?: string
          organization_id?: string | null
          payment_terms?:
            | Database["public"]["Enums"]["work_payment_terms"]
            | null
          payment_type?:
            | Database["public"]["Enums"]["projects_payment_type"]
            | null
          person_id?: string | null
          po_number?: string | null
          progress_override?: number | null
          provider?: Database["public"]["Enums"]["entity_provider"] | null
          renewal_date?: string | null
          retainer_mrr_cents?: number | null
          retainer_start_date?: string | null
          scope_items?: Json | null
          service_id?: string | null
          slug?: string
          source_external_id?: string | null
          source_origin?:
            | Database["public"]["Enums"]["entity_source_origin"]
            | null
          stage?: string | null
          stage_entered_at?: string | null
          start_date?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string
          win_probability?: number | null
          work_type?: Database["public"]["Enums"]["projects_type"] | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_billing_contact_id_fkey"
            columns: ["billing_contact_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_capture_event_id_fkey"
            columns: ["capture_event_id"]
            isOneToOne: false
            referencedRelation: "capture_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_new_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_new_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "studio_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "workspace_services"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_templates: {
        Row: {
          content: Json | null
          created_at: string
          default_terms: Json | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          default_terms?: Json | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          default_terms?: Json | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_templates_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_templates_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          accepted_at: string | null
          consent_checkbox_text: string | null
          content: Json | null
          created_at: string
          currency: string | null
          declined_at: string | null
          deposit_amount: number | null
          deposit_paid: boolean | null
          deposit_paid_at: string | null
          document_hash: string | null
          expires_at: string | null
          id: string
          intake_id: string | null
          payment_schedule: Json | null
          public_id: string
          sent_at: string | null
          signature_email: string | null
          signature_geolocation: Json | null
          signature_ip: unknown
          signature_name: string | null
          signature_user_agent: string | null
          signed_at: string | null
          signing_link_id: string | null
          signing_session_id: string | null
          status: string
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          template_id: string | null
          terms: Json | null
          terms_version: string | null
          title: string
          total_amount: number | null
          updated_at: string
          viewed_at: string | null
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          consent_checkbox_text?: string | null
          content?: Json | null
          created_at?: string
          currency?: string | null
          declined_at?: string | null
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          deposit_paid_at?: string | null
          document_hash?: string | null
          expires_at?: string | null
          id?: string
          intake_id?: string | null
          payment_schedule?: Json | null
          public_id?: string
          sent_at?: string | null
          signature_email?: string | null
          signature_geolocation?: Json | null
          signature_ip?: unknown
          signature_name?: string | null
          signature_user_agent?: string | null
          signed_at?: string | null
          signing_link_id?: string | null
          signing_session_id?: string | null
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          template_id?: string | null
          terms?: Json | null
          terms_version?: string | null
          title: string
          total_amount?: number | null
          updated_at?: string
          viewed_at?: string | null
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          consent_checkbox_text?: string | null
          content?: Json | null
          created_at?: string
          currency?: string | null
          declined_at?: string | null
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          deposit_paid_at?: string | null
          document_hash?: string | null
          expires_at?: string | null
          id?: string
          intake_id?: string | null
          payment_schedule?: Json | null
          public_id?: string
          sent_at?: string | null
          signature_email?: string | null
          signature_geolocation?: Json | null
          signature_ip?: unknown
          signature_name?: string | null
          signature_user_agent?: string | null
          signed_at?: string | null
          signing_link_id?: string | null
          signing_session_id?: string | null
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          template_id?: string | null
          terms?: Json | null
          terms_version?: string | null
          title?: string
          total_amount?: number | null
          updated_at?: string
          viewed_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "proposal_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      retainer_time_entries: {
        Row: {
          created_at: string
          created_by: string
          description: string
          hours: number
          id: string
          project_id: string
          retainer_id: string
          updated_at: string
          work_date: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description: string
          hours: number
          id?: string
          project_id: string
          retainer_id: string
          updated_at?: string
          work_date: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          hours?: number
          id?: string
          project_id?: string
          retainer_id?: string
          updated_at?: string
          work_date?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "retainer_time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retainer_time_entries_retainer_id_fkey"
            columns: ["retainer_id"]
            isOneToOne: false
            referencedRelation: "project_retainers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retainer_time_entries_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retainer_time_entries_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          interval: string
          metadata: Json | null
          price_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          tier: string
          trial_end: string | null
          trial_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string
          current_period_end: string
          current_period_start: string
          id?: string
          interval: string
          metadata?: Json | null
          price_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          tier: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          interval?: string
          metadata?: Json | null
          price_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          tier?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seo_alerts: {
        Row: {
          alert_type: string
          created_at: string
          dismissed_at: string | null
          dismissed_by: string | null
          id: string
          is_dismissed: boolean
          message: string
          metadata: Json
          project_id: string
          workspace_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          dismissed_at?: string | null
          dismissed_by?: string | null
          id?: string
          is_dismissed?: boolean
          message: string
          metadata?: Json
          project_id: string
          workspace_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          dismissed_at?: string | null
          dismissed_by?: string | null
          id?: string
          is_dismissed?: boolean
          message?: string
          metadata?: Json
          project_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_alerts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_alerts_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_alerts_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_audits: {
        Row: {
          audit_type: string
          audited_at: string
          created_at: string
          id: string
          project_id: string
          raw_data: Json | null
          scores: Json
          workspace_id: string
        }
        Insert: {
          audit_type: string
          audited_at?: string
          created_at?: string
          id?: string
          project_id: string
          raw_data?: Json | null
          scores: Json
          workspace_id: string
        }
        Update: {
          audit_type?: string
          audited_at?: string
          created_at?: string
          id?: string
          project_id?: string
          raw_data?: Json | null
          scores?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_audits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_audits_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_audits_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_configs: {
        Row: {
          client_visible_metrics: Json
          created_at: string
          domain: string | null
          id: string
          is_enabled: boolean
          project_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          client_visible_metrics?: Json
          created_at?: string
          domain?: string | null
          id?: string
          is_enabled?: boolean
          project_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          client_visible_metrics?: Json
          created_at?: string
          domain?: string | null
          id?: string
          is_enabled?: boolean
          project_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_configs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_configs_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_configs_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_categories_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_categories_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      service_icp_mappings: {
        Row: {
          created_at: string
          fit_score: number
          icp_segment_id: string
          id: string
          service_id: string
          source: string
        }
        Insert: {
          created_at?: string
          fit_score?: number
          icp_segment_id: string
          id?: string
          service_id: string
          source?: string
        }
        Update: {
          created_at?: string
          fit_score?: number
          icp_segment_id?: string
          id?: string
          service_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_icp_mappings_icp_segment_id_fkey"
            columns: ["icp_segment_id"]
            isOneToOne: false
            referencedRelation: "workspace_icp_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_icp_mappings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "studio_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_icp_mappings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "workspace_services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_relationships: {
        Row: {
          created_at: string
          display_order: number
          id: string
          recommendation_note: string | null
          related_service_id: string
          relationship_type: string
          service_id: string
          source: string
          strength: number
          typical_gap_days: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          recommendation_note?: string | null
          related_service_id: string
          relationship_type: string
          service_id: string
          source?: string
          strength?: number
          typical_gap_days?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          recommendation_note?: string | null
          related_service_id?: string
          relationship_type?: string
          service_id?: string
          source?: string
          strength?: number
          typical_gap_days?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_relationships_related_service_id_fkey"
            columns: ["related_service_id"]
            isOneToOne: false
            referencedRelation: "studio_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_relationships_related_service_id_fkey"
            columns: ["related_service_id"]
            isOneToOne: false
            referencedRelation: "workspace_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_relationships_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "studio_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_relationships_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "workspace_services"
            referencedColumns: ["id"]
          },
        ]
      }
      space_decisions: {
        Row: {
          created_at: string
          created_by: string | null
          decided_at: string | null
          decided_by: string | null
          description: string | null
          id: string
          metadata: Json
          source_id: string | null
          source_type: string | null
          space_id: string
          status: string
          title: string
          updated_at: string
          visibility_scope: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json
          source_id?: string | null
          source_type?: string | null
          space_id: string
          status?: string
          title: string
          updated_at?: string
          visibility_scope?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json
          source_id?: string | null
          source_type?: string | null
          space_id?: string
          status?: string
          title?: string
          updated_at?: string
          visibility_scope?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_decisions_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_decisions_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_decisions_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      space_links: {
        Row: {
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          id: string
          label: string | null
          metadata: Json
          relation_type: string | null
          space_id: string
          visibility_scope: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
          label?: string | null
          metadata?: Json
          relation_type?: string | null
          space_id: string
          visibility_scope?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          label?: string | null
          metadata?: Json
          relation_type?: string | null
          space_id?: string
          visibility_scope?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_links_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_links_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_links_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      space_participants: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          person_id: string | null
          role: string
          space_id: string
          studio_member_id: string | null
          team_id: string | null
          visibility_scope: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          person_id?: string | null
          role?: string
          space_id: string
          studio_member_id?: string | null
          team_id?: string | null
          visibility_scope?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          person_id?: string | null
          role?: string
          space_id?: string
          studio_member_id?: string | null
          team_id?: string | null
          visibility_scope?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_participants_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_participants_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_participants_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_participants_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_participants_studio_member_id_fkey"
            columns: ["studio_member_id"]
            isOneToOne: false
            referencedRelation: "studio_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_participants_studio_member_id_fkey"
            columns: ["studio_member_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_participants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      spaces: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_pinned: boolean
          linked_entity_id: string | null
          linked_entity_type: string | null
          metadata: Json
          owner_member_id: string | null
          owner_team_id: string | null
          slug: string | null
          status: string
          title: string
          updated_at: string
          visibility: string
          workspace_id: string
          worth_attention: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_pinned?: boolean
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          metadata?: Json
          owner_member_id?: string | null
          owner_team_id?: string | null
          slug?: string | null
          status?: string
          title: string
          updated_at?: string
          visibility?: string
          workspace_id: string
          worth_attention?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_pinned?: boolean
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          metadata?: Json
          owner_member_id?: string | null
          owner_team_id?: string | null
          slug?: string | null
          status?: string
          title?: string
          updated_at?: string
          visibility?: string
          workspace_id?: string
          worth_attention?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spaces_owner_member_id_fkey"
            columns: ["owner_member_id"]
            isOneToOne: false
            referencedRelation: "studio_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spaces_owner_member_id_fkey"
            columns: ["owner_member_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spaces_owner_team_id_fkey"
            columns: ["owner_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spaces_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spaces_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      system_plays: {
        Row: {
          action_type: Database["public"]["Enums"]["system_play_action"]
          created_at: string
          description: string | null
          input_schema: Json
          is_system: boolean
          name: string
          slug: string
          target_entity: Database["public"]["Enums"]["system_play_target"]
        }
        Insert: {
          action_type: Database["public"]["Enums"]["system_play_action"]
          created_at?: string
          description?: string | null
          input_schema?: Json
          is_system?: boolean
          name: string
          slug: string
          target_entity: Database["public"]["Enums"]["system_play_target"]
        }
        Update: {
          action_type?: Database["public"]["Enums"]["system_play_action"]
          created_at?: string
          description?: string | null
          input_schema?: Json
          is_system?: boolean
          name?: string
          slug?: string
          target_entity?: Database["public"]["Enums"]["system_play_target"]
        }
        Relationships: []
      }
      teams: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          metadata: Json | null
          name: string
          slug: string | null
          status: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          metadata?: Json | null
          name: string
          slug?: string | null
          status?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          slug?: string | null
          status?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_classifications: {
        Row: {
          approved_at: string | null
          classified_by: string | null
          created_at: string
          disabled_reason: string | null
          model_proposal: Json | null
          notes: string | null
          proposed_at: string | null
          requires_human_confirmation: boolean
          risk: Database["public"]["Enums"]["connector_tool_risk"] | null
          source: string
          status: Database["public"]["Enums"]["tool_classification_status"]
          tool_slug: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          classified_by?: string | null
          created_at?: string
          disabled_reason?: string | null
          model_proposal?: Json | null
          notes?: string | null
          proposed_at?: string | null
          requires_human_confirmation?: boolean
          risk?: Database["public"]["Enums"]["connector_tool_risk"] | null
          source?: string
          status?: Database["public"]["Enums"]["tool_classification_status"]
          tool_slug: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          classified_by?: string | null
          created_at?: string
          disabled_reason?: string | null
          model_proposal?: Json | null
          notes?: string | null
          proposed_at?: string | null
          requires_human_confirmation?: boolean
          risk?: Database["public"]["Enums"]["connector_tool_risk"] | null
          source?: string
          status?: Database["public"]["Enums"]["tool_classification_status"]
          tool_slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      waitlist_leads: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json
          normalized_email: string
          source: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json
          normalized_email: string
          source?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json
          normalized_email?: string
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      work_blockers: {
        Row: {
          blocker_type: string
          confidence: number | null
          created_at: string
          detail: string | null
          detected_at: string
          id: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          source: string
          source_entity_id: string | null
          source_entity_type: string | null
          status: string
          title: string
          updated_at: string
          work_id: string
          workspace_id: string
        }
        Insert: {
          blocker_type: string
          confidence?: number | null
          created_at?: string
          detail?: string | null
          detected_at?: string
          id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source?: string
          source_entity_id?: string | null
          source_entity_type?: string | null
          status?: string
          title: string
          updated_at?: string
          work_id: string
          workspace_id: string
        }
        Update: {
          blocker_type?: string
          confidence?: number | null
          created_at?: string
          detail?: string | null
          detected_at?: string
          id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source?: string
          source_entity_id?: string | null
          source_entity_type?: string | null
          status?: string
          title?: string
          updated_at?: string
          work_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_blockers_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_blockers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_blockers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      work_milestones: {
        Row: {
          amount_cents: number | null
          became_due_at: string | null
          created_at: string
          due_date: string | null
          id: string
          invoice_ref: string | null
          name: string
          paid_at: string | null
          percent: number | null
          sort_order: number
          status: string
          trigger_stage: string | null
          trigger_type: string
          updated_at: string
          work_id: string
          workspace_id: string
        }
        Insert: {
          amount_cents?: number | null
          became_due_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_ref?: string | null
          name: string
          paid_at?: string | null
          percent?: number | null
          sort_order?: number
          status?: string
          trigger_stage?: string | null
          trigger_type?: string
          updated_at?: string
          work_id: string
          workspace_id: string
        }
        Update: {
          amount_cents?: number | null
          became_due_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_ref?: string | null
          name?: string
          paid_at?: string | null
          percent?: number | null
          sort_order?: number
          status?: string
          trigger_stage?: string | null
          trigger_type?: string
          updated_at?: string
          work_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_milestones_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_milestones_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_milestones_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_brand_config: {
        Row: {
          color_accent: string | null
          color_neutral: string | null
          color_primary: string | null
          color_secondary: string | null
          created_at: string
          font_body: string | null
          font_heading: string | null
          id: string
          logo_dark_url: string | null
          logo_icon_url: string | null
          logo_light_url: string | null
          updated_at: string
          voice_archetype: string | null
          voice_sample_content: string[] | null
          voice_spectrums: Json | null
          voice_style_guide: string | null
          voice_terminology: Json | null
          voice_tone: string[] | null
          workspace_id: string
        }
        Insert: {
          color_accent?: string | null
          color_neutral?: string | null
          color_primary?: string | null
          color_secondary?: string | null
          created_at?: string
          font_body?: string | null
          font_heading?: string | null
          id?: string
          logo_dark_url?: string | null
          logo_icon_url?: string | null
          logo_light_url?: string | null
          updated_at?: string
          voice_archetype?: string | null
          voice_sample_content?: string[] | null
          voice_spectrums?: Json | null
          voice_style_guide?: string | null
          voice_terminology?: Json | null
          voice_tone?: string[] | null
          workspace_id: string
        }
        Update: {
          color_accent?: string | null
          color_neutral?: string | null
          color_primary?: string | null
          color_secondary?: string | null
          created_at?: string
          font_body?: string | null
          font_heading?: string | null
          id?: string
          logo_dark_url?: string | null
          logo_icon_url?: string | null
          logo_light_url?: string | null
          updated_at?: string
          voice_archetype?: string | null
          voice_sample_content?: string[] | null
          voice_spectrums?: Json | null
          voice_style_guide?: string | null
          voice_terminology?: Json | null
          voice_tone?: string[] | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_brand_config_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_brand_config_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_calendar_connections: {
        Row: {
          auto_record_client_meetings: boolean | null
          bot_name_override: string | null
          created_at: string
          disconnected_at: string | null
          email: string
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          provider: string
          recall_calendar_id: string
          sync_error: string | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          auto_record_client_meetings?: boolean | null
          bot_name_override?: string | null
          created_at?: string
          disconnected_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          provider: string
          recall_calendar_id: string
          sync_error?: string | null
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          auto_record_client_meetings?: boolean | null
          bot_name_override?: string | null
          created_at?: string
          disconnected_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          provider?: string
          recall_calendar_id?: string
          sync_error?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_calendar_connections_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_calendar_connections_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_domains: {
        Row: {
          created_at: string
          hostname: string
          id: string
          last_verified_at: string | null
          ssl_issued_at: string | null
          ssl_status: string | null
          status: Database["public"]["Enums"]["domain_status"]
          updated_at: string
          verification_method: string
          verification_token: string
          verified_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          hostname: string
          id?: string
          last_verified_at?: string | null
          ssl_issued_at?: string | null
          ssl_status?: string | null
          status?: Database["public"]["Enums"]["domain_status"]
          updated_at?: string
          verification_method?: string
          verification_token?: string
          verified_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          hostname?: string
          id?: string
          last_verified_at?: string | null
          ssl_issued_at?: string | null
          ssl_status?: string | null
          status?: Database["public"]["Enums"]["domain_status"]
          updated_at?: string
          verification_method?: string
          verification_token?: string
          verified_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_domains_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_domains_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_email_templates: {
        Row: {
          body_template: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          subject_template: string
          trigger_type: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          body_template: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          subject_template: string
          trigger_type: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          body_template?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          subject_template?: string
          trigger_type?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_email_templates_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_email_templates_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_icp_segments: {
        Row: {
          budget_signal: string | null
          confidence: number | null
          created_at: string
          description: string | null
          desired_outcomes: string[] | null
          display_order: number | null
          disqualifying_signals: string[] | null
          id: string
          min_project_value_cents: number | null
          name: string
          pain_points: string[] | null
          qualifying_signals: string[] | null
          source: string
          status: string
          target_company_size: string | null
          target_industry: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          budget_signal?: string | null
          confidence?: number | null
          created_at?: string
          description?: string | null
          desired_outcomes?: string[] | null
          display_order?: number | null
          disqualifying_signals?: string[] | null
          id?: string
          min_project_value_cents?: number | null
          name: string
          pain_points?: string[] | null
          qualifying_signals?: string[] | null
          source?: string
          status?: string
          target_company_size?: string | null
          target_industry?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          budget_signal?: string | null
          confidence?: number | null
          created_at?: string
          description?: string | null
          desired_outcomes?: string[] | null
          display_order?: number | null
          disqualifying_signals?: string[] | null
          id?: string
          min_project_value_cents?: number | null
          name?: string
          pain_points?: string[] | null
          qualifying_signals?: string[] | null
          source?: string
          status?: string
          target_company_size?: string | null
          target_industry?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_icp_segments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_icp_segments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_integrations: {
        Row: {
          api_key_encrypted: string | null
          capture_enabled: boolean
          composio_connection_id: string | null
          composio_status: string | null
          config: Json | null
          connected_at: string | null
          connected_by: string | null
          created_at: string
          id: string
          is_active: boolean | null
          last_error: string | null
          last_synced_at: string | null
          provider: string
          trust_level: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          api_key_encrypted?: string | null
          capture_enabled?: boolean
          composio_connection_id?: string | null
          composio_status?: string | null
          config?: Json | null
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_synced_at?: string | null
          provider: string
          trust_level?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          api_key_encrypted?: string | null
          capture_enabled?: boolean
          composio_connection_id?: string | null
          composio_status?: string | null
          config?: Json | null
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_synced_at?: string | null
          provider?: string
          trust_level?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_integrations_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_integrations_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          email: string
          id: string
          role: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          role?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_members_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_members_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_services: {
        Row: {
          ai_description: string | null
          ai_generation_context: Json | null
          ai_generation_context_source: string | null
          ai_pitch: string | null
          ai_pitch_source: string | null
          ai_sales_context: Json | null
          ai_sales_context_source: string | null
          archived_at: string | null
          base_price_cents: number | null
          billing_interval: string | null
          category: string | null
          category_id: string | null
          created_at: string
          currency: string | null
          deleted_at: string | null
          deliverables: string[] | null
          deliverables_source: string | null
          description: string | null
          differentiators: string[] | null
          differentiators_source: string | null
          discovery_questions: string[] | null
          discovery_questions_source: string | null
          display_order: number | null
          hours_included: number | null
          id: string
          is_active: boolean | null
          is_bundle: boolean
          is_recommended: boolean | null
          name: string
          prerequisites: string[] | null
          prerequisites_source: string | null
          price_max: number | null
          price_min: number | null
          pricing_intelligence: Json | null
          pricing_intelligence_source: string | null
          pricing_type: string | null
          response_time: string | null
          rollover_hours: number | null
          services_included: Json | null
          stripe_price_id: string | null
          stripe_product_id: string | null
          stripe_sync_status: string | null
          stripe_synced_at: string | null
          typical_timeline: string | null
          updated_at: string
          value_proposition: string | null
          value_proposition_source: string | null
          workspace_id: string
        }
        Insert: {
          ai_description?: string | null
          ai_generation_context?: Json | null
          ai_generation_context_source?: string | null
          ai_pitch?: string | null
          ai_pitch_source?: string | null
          ai_sales_context?: Json | null
          ai_sales_context_source?: string | null
          archived_at?: string | null
          base_price_cents?: number | null
          billing_interval?: string | null
          category?: string | null
          category_id?: string | null
          created_at?: string
          currency?: string | null
          deleted_at?: string | null
          deliverables?: string[] | null
          deliverables_source?: string | null
          description?: string | null
          differentiators?: string[] | null
          differentiators_source?: string | null
          discovery_questions?: string[] | null
          discovery_questions_source?: string | null
          display_order?: number | null
          hours_included?: number | null
          id?: string
          is_active?: boolean | null
          is_bundle?: boolean
          is_recommended?: boolean | null
          name: string
          prerequisites?: string[] | null
          prerequisites_source?: string | null
          price_max?: number | null
          price_min?: number | null
          pricing_intelligence?: Json | null
          pricing_intelligence_source?: string | null
          pricing_type?: string | null
          response_time?: string | null
          rollover_hours?: number | null
          services_included?: Json | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          stripe_sync_status?: string | null
          stripe_synced_at?: string | null
          typical_timeline?: string | null
          updated_at?: string
          value_proposition?: string | null
          value_proposition_source?: string | null
          workspace_id: string
        }
        Update: {
          ai_description?: string | null
          ai_generation_context?: Json | null
          ai_generation_context_source?: string | null
          ai_pitch?: string | null
          ai_pitch_source?: string | null
          ai_sales_context?: Json | null
          ai_sales_context_source?: string | null
          archived_at?: string | null
          base_price_cents?: number | null
          billing_interval?: string | null
          category?: string | null
          category_id?: string | null
          created_at?: string
          currency?: string | null
          deleted_at?: string | null
          deliverables?: string[] | null
          deliverables_source?: string | null
          description?: string | null
          differentiators?: string[] | null
          differentiators_source?: string | null
          discovery_questions?: string[] | null
          discovery_questions_source?: string | null
          display_order?: number | null
          hours_included?: number | null
          id?: string
          is_active?: boolean | null
          is_bundle?: boolean
          is_recommended?: boolean | null
          name?: string
          prerequisites?: string[] | null
          prerequisites_source?: string | null
          price_max?: number | null
          price_min?: number | null
          pricing_intelligence?: Json | null
          pricing_intelligence_source?: string | null
          pricing_type?: string | null
          response_time?: string | null
          rollover_hours?: number | null
          services_included?: Json | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          stripe_sync_status?: string | null
          stripe_synced_at?: string | null
          typical_timeline?: string | null
          updated_at?: string
          value_proposition?: string | null
          value_proposition_source?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_services_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_services_studio_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_tags: {
        Row: {
          ai_description: string | null
          category: string
          color: string | null
          created_at: string
          id: string
          is_archived: boolean
          is_system: boolean
          label: string
          scope: string
          slug: string
          sort_order: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ai_description?: string | null
          category?: string
          color?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          is_system?: boolean
          label: string
          scope?: string
          slug: string
          sort_order?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ai_description?: string | null
          category?: string
          color?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          is_system?: boolean
          label?: string
          scope?: string
          slug?: string
          sort_order?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_tags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_tags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_tool_executions: {
        Row: {
          approved_by: string | null
          args_summary: Json | null
          created_at: string
          error: string | null
          id: string
          provider: string | null
          risk: string
          source: string
          status: string
          tool_slug: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          approved_by?: string | null
          args_summary?: Json | null
          created_at?: string
          error?: string | null
          id?: string
          provider?: string | null
          risk: string
          source?: string
          status: string
          tool_slug: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          approved_by?: string | null
          args_summary?: Json | null
          created_at?: string
          error?: string | null
          id?: string
          provider?: string | null
          risk?: string
          source?: string
          status?: string
          tool_slug?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_tool_executions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_tool_executions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          auto_handled_seen_at: string | null
          bridge_branding: Json | null
          business_email: string | null
          business_phone: string | null
          business_type: string | null
          created_at: string
          default_currency: string | null
          description: string | null
          founded_year: number | null
          id: string
          industry: string | null
          legal_address: string | null
          legal_address_line_1: string | null
          legal_address_line_2: string | null
          legal_business_name: string | null
          legal_city: string | null
          legal_country: string | null
          legal_postal_code: string | null
          legal_state: string | null
          location: string | null
          logo_url: string | null
          name: string
          owner_id: string
          payment_terms: string | null
          settings: Json | null
          slug: string
          social_links: Json | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          tagline: string | null
          tax_id_last4: string | null
          tax_id_type: string | null
          team_size: string | null
          trust_level: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          auto_handled_seen_at?: string | null
          bridge_branding?: Json | null
          business_email?: string | null
          business_phone?: string | null
          business_type?: string | null
          created_at?: string
          default_currency?: string | null
          description?: string | null
          founded_year?: number | null
          id?: string
          industry?: string | null
          legal_address?: string | null
          legal_address_line_1?: string | null
          legal_address_line_2?: string | null
          legal_business_name?: string | null
          legal_city?: string | null
          legal_country?: string | null
          legal_postal_code?: string | null
          legal_state?: string | null
          location?: string | null
          logo_url?: string | null
          name: string
          owner_id: string
          payment_terms?: string | null
          settings?: Json | null
          slug: string
          social_links?: Json | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          tagline?: string | null
          tax_id_last4?: string | null
          tax_id_type?: string | null
          team_size?: string | null
          trust_level?: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          auto_handled_seen_at?: string | null
          bridge_branding?: Json | null
          business_email?: string | null
          business_phone?: string | null
          business_type?: string | null
          created_at?: string
          default_currency?: string | null
          description?: string | null
          founded_year?: number | null
          id?: string
          industry?: string | null
          legal_address?: string | null
          legal_address_line_1?: string | null
          legal_address_line_2?: string | null
          legal_business_name?: string | null
          legal_city?: string | null
          legal_country?: string | null
          legal_postal_code?: string | null
          legal_state?: string | null
          location?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          payment_terms?: string | null
          settings?: Json | null
          slug?: string
          social_links?: Json | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          tagline?: string | null
          tax_id_last4?: string | null
          tax_id_type?: string | null
          team_size?: string | null
          trust_level?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      studio_calendar_connections: {
        Row: {
          auto_record_client_meetings: boolean | null
          bot_name_override: string | null
          created_at: string | null
          disconnected_at: string | null
          email: string | null
          id: string | null
          is_active: boolean | null
          last_sync_at: string | null
          provider: string | null
          recall_calendar_id: string | null
          studio_id: string | null
          sync_error: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          auto_record_client_meetings?: boolean | null
          bot_name_override?: string | null
          created_at?: string | null
          disconnected_at?: string | null
          email?: string | null
          id?: string | null
          is_active?: boolean | null
          last_sync_at?: string | null
          provider?: string | null
          recall_calendar_id?: string | null
          studio_id?: string | null
          sync_error?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          auto_record_client_meetings?: boolean | null
          bot_name_override?: string | null
          created_at?: string | null
          disconnected_at?: string | null
          email?: string | null
          id?: string | null
          is_active?: boolean | null
          last_sync_at?: string | null
          provider?: string | null
          recall_calendar_id?: string | null
          studio_id?: string | null
          sync_error?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_calendar_connections_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_calendar_connections_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_domains: {
        Row: {
          created_at: string | null
          hostname: string | null
          id: string | null
          last_verified_at: string | null
          ssl_issued_at: string | null
          ssl_status: string | null
          status: Database["public"]["Enums"]["domain_status"] | null
          studio_id: string | null
          updated_at: string | null
          verification_method: string | null
          verification_token: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          hostname?: string | null
          id?: string | null
          last_verified_at?: string | null
          ssl_issued_at?: string | null
          ssl_status?: string | null
          status?: Database["public"]["Enums"]["domain_status"] | null
          studio_id?: string | null
          updated_at?: string | null
          verification_method?: string | null
          verification_token?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          hostname?: string | null
          id?: string | null
          last_verified_at?: string | null
          ssl_issued_at?: string | null
          ssl_status?: string | null
          status?: Database["public"]["Enums"]["domain_status"] | null
          studio_id?: string | null
          updated_at?: string | null
          verification_method?: string | null
          verification_token?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_domains_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_domains_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_integrations: {
        Row: {
          api_key_encrypted: string | null
          composio_connection_id: string | null
          composio_status: string | null
          config: Json | null
          connected_at: string | null
          connected_by: string | null
          created_at: string | null
          id: string | null
          is_active: boolean | null
          last_error: string | null
          last_synced_at: string | null
          provider: string | null
          studio_id: string | null
          updated_at: string | null
        }
        Insert: {
          api_key_encrypted?: string | null
          composio_connection_id?: string | null
          composio_status?: string | null
          config?: Json | null
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          last_error?: string | null
          last_synced_at?: string | null
          provider?: string | null
          studio_id?: string | null
          updated_at?: string | null
        }
        Update: {
          api_key_encrypted?: string | null
          composio_connection_id?: string | null
          composio_status?: string | null
          config?: Json | null
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          last_error?: string | null
          last_synced_at?: string | null
          provider?: string | null
          studio_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_integrations_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_integrations_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_members: {
        Row: {
          created_at: string | null
          email: string | null
          id: string | null
          role: string | null
          studio_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string | null
          role?: string | null
          studio_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string | null
          role?: string | null
          studio_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_members_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_members_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_services: {
        Row: {
          ai_description: string | null
          archived_at: string | null
          billing_interval: string | null
          category: string | null
          category_id: string | null
          created_at: string | null
          currency: string | null
          deleted_at: string | null
          deliverables: string[] | null
          description: string | null
          display_order: number | null
          hours_included: number | null
          id: string | null
          is_active: boolean | null
          is_recommended: boolean | null
          name: string | null
          price_max: number | null
          price_min: number | null
          pricing_type: string | null
          response_time: string | null
          rollover_hours: number | null
          services_included: Json | null
          stripe_price_id: string | null
          stripe_product_id: string | null
          stripe_sync_status: string | null
          stripe_synced_at: string | null
          studio_id: string | null
          typical_timeline: string | null
          updated_at: string | null
        }
        Insert: {
          ai_description?: string | null
          archived_at?: string | null
          billing_interval?: string | null
          category?: string | null
          category_id?: string | null
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          deliverables?: string[] | null
          description?: string | null
          display_order?: number | null
          hours_included?: number | null
          id?: string | null
          is_active?: boolean | null
          is_recommended?: boolean | null
          name?: string | null
          price_max?: number | null
          price_min?: number | null
          pricing_type?: string | null
          response_time?: string | null
          rollover_hours?: number | null
          services_included?: Json | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          stripe_sync_status?: string | null
          stripe_synced_at?: string | null
          studio_id?: string | null
          typical_timeline?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_description?: string | null
          archived_at?: string | null
          billing_interval?: string | null
          category?: string | null
          category_id?: string | null
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          deliverables?: string[] | null
          description?: string | null
          display_order?: number | null
          hours_included?: number | null
          id?: string | null
          is_active?: boolean | null
          is_recommended?: boolean | null
          name?: string | null
          price_max?: number | null
          price_min?: number | null
          pricing_type?: string | null
          response_time?: string | null
          rollover_hours?: number | null
          services_included?: Json | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          stripe_sync_status?: string | null
          stripe_synced_at?: string | null
          studio_id?: string | null
          typical_timeline?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_services_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_services_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      studios: {
        Row: {
          bridge_branding: Json | null
          created_at: string | null
          description: string | null
          founded_year: number | null
          id: string | null
          location: string | null
          logo_url: string | null
          name: string | null
          owner_id: string | null
          settings: Json | null
          slug: string | null
          social_links: Json | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          tagline: string | null
          team_size: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          bridge_branding?: Json | null
          created_at?: string | null
          description?: string | null
          founded_year?: number | null
          id?: string | null
          location?: string | null
          logo_url?: string | null
          name?: string | null
          owner_id?: string | null
          settings?: Json | null
          slug?: string | null
          social_links?: Json | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          tagline?: string | null
          team_size?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          bridge_branding?: Json | null
          created_at?: string | null
          description?: string | null
          founded_year?: number | null
          id?: string | null
          location?: string | null
          logo_url?: string | null
          name?: string | null
          owner_id?: string | null
          settings?: Json | null
          slug?: string | null
          social_links?: Json | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          tagline?: string | null
          team_size?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      waitlist_leads_sheet: {
        Row: {
          annual_revenue: string | null
          completed_at: string | null
          created_at: string | null
          email: string | null
          hear_about: string | null
          id: string | null
          last_step: string | null
          operational_bottleneck: string | null
          primary_business: string | null
          source: string | null
          status: string | null
          tools: string | null
          updated_at: string | null
        }
        Insert: {
          annual_revenue?: never
          completed_at?: never
          created_at?: string | null
          email?: string | null
          hear_about?: never
          id?: string | null
          last_step?: never
          operational_bottleneck?: never
          primary_business?: never
          source?: string | null
          status?: never
          tools?: never
          updated_at?: string | null
        }
        Update: {
          annual_revenue?: never
          completed_at?: never
          created_at?: string | null
          email?: string | null
          hear_about?: never
          id?: string | null
          last_step?: never
          operational_bottleneck?: never
          primary_business?: never
          source?: string | null
          status?: never
          tools?: never
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_purchased_credits: {
        Args: { p_credits: number; p_user_id: string }
        Returns: undefined
      }
      cleanup_expired_invoice_tokens: { Args: never; Returns: number }
      deduct_ai_credits: {
        Args: {
          p_actual_cost_usd?: number
          p_credits: number
          p_metadata?: Json
          p_operation_type: string
          p_user_id: string
        }
        Returns: boolean
      }
      generate_invoice_number: { Args: never; Returns: string }
      generate_nanoid: { Args: { size?: number }; Returns: string }
      get_capture_stream: {
        Args: { p_limit?: number; p_offset?: number; p_workspace_id: string }
        Returns: {
          capture_id: string
          capture_type: Database["public"]["Enums"]["capture_event_type"]
          created_at: string
          origin: Database["public"]["Enums"]["capture_origin"]
          overall_confidence: number
          processed_at: string
          source_type: Database["public"]["Enums"]["capture_source_type"]
          state: Database["public"]["Enums"]["capture_state"]
          title: string
        }[]
      }
      get_deletion_days_remaining: {
        Args: { deleted_at_timestamp: string }
        Returns: number
      }
      get_domain_verification_instructions: {
        Args: { domain_id: string }
        Returns: Json
      }
      get_entity_lifecycle_events: {
        Args: {
          p_entity_id: string
          p_entity_type: string
          p_limit?: number
          p_workspace_id: string
        }
        Returns: {
          because: string
          created_at: string
          event_type: string
          from_value: string
          id: string
          source: string
          to_value: string
        }[]
      }
      get_entity_notes_with_provenance: {
        Args: {
          p_entity_id: string
          p_entity_type: string
          p_include_dismissed?: boolean
          p_workspace_id: string
        }
        Returns: {
          author_type: string
          confidence: number
          content: string
          created_at: string
          id: string
          is_pinned: boolean
          note_kind: string
          source: string
          source_ref: string
          status: string
          tags: string[]
          title: string
        }[]
      }
      get_notes_mentioning_entity: {
        Args: {
          p_entity_id: string
          p_entity_type: string
          p_workspace_id: string
        }
        Returns: {
          author_type: string
          content: string
          created_at: string
          note_id: string
          title: string
        }[]
      }
      get_pending_captures: {
        Args: { p_workspace_id: string }
        Returns: {
          capture_id: string
          capture_type: Database["public"]["Enums"]["capture_event_type"]
          created_at: string
          origin: Database["public"]["Enums"]["capture_origin"]
          overall_confidence: number
          routing_count: number
          source_type: Database["public"]["Enums"]["capture_source_type"]
          title: string
        }[]
      }
      is_studio_member: { Args: { p_studio_id: string }; Returns: boolean }
      is_workspace_member: {
        Args: { p_workspace_id: string }
        Returns: boolean
      }
      log_agent_operation: {
        Args: {
          p_agent_id: string
          p_duration_ms?: number
          p_error_message?: string
          p_operation_tier?: number
          p_operation_type: string
          p_output_file_path?: string
          p_result_status?: string
          p_result_summary?: string
          p_sql_query?: string
          p_target_tables?: string[]
          p_user_request?: string
        }
        Returns: string
      }
      mark_token_spent_for_checkout: {
        Args: { p_token_hash: string }
        Returns: boolean
      }
      record_capture_correction: {
        Args: {
          p_new_entity_id: string
          p_notes?: string
          p_routing_id: string
        }
        Returns: undefined
      }
      refresh_client_engagement_stats: { Args: never; Returns: undefined }
      reset_monthly_ai_credits: { Args: never; Returns: number }
      revoke_invoice_tokens: {
        Args: { p_invoice_id: string }
        Returns: undefined
      }
      search_messages_fulltext: {
        Args: {
          conversation_ids: string[]
          from_date?: string
          result_limit?: number
          search_query: string
          sender_id_filter?: string
          to_date?: string
        }
        Returns: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          rank: number
          read_at: string
          sender_id: string
          sender_type: string
        }[]
      }
      seed_default_meeting_types: {
        Args: { p_studio_id: string }
        Returns: undefined
      }
      seed_default_services: {
        Args: { p_studio_id: string }
        Returns: undefined
      }
      seed_default_workspace_tags: {
        Args: { p_workspace_id: string }
        Returns: undefined
      }
      verify_studio_domain: { Args: { domain_id: string }; Returns: Json }
    }
    Enums: {
      billing_category: "contractor" | "software" | "other"
      billing_direction: "receivable" | "payable"
      billing_origin: "found" | "added"
      billing_payment_match_status: "matched" | "unmatched" | "reversed"
      billing_provider:
        | "stripe"
        | "quickbooks"
        | "square"
        | "shopify"
        | "lemonsqueezy"
        | "mercury"
        | "manual"
      billing_status:
        | "draft"
        | "due"
        | "overdue"
        | "paid"
        | "partial"
        | "refunded"
        | "disputed"
      capture_event_type:
        | "message"
        | "thread"
        | "meeting"
        | "transcript"
        | "file"
        | "contact"
        | "payment"
        | "task"
        | "note"
        | "post"
        | "event"
        | "other"
      capture_origin: "added" | "found"
      capture_sender_kind: "client" | "vendor_saas" | "payment_rail"
      capture_source_type:
        | "gmail"
        | "outlook"
        | "slack"
        | "whatsapp"
        | "discord"
        | "telegram"
        | "googlecalendar"
        | "outlook_calendar"
        | "calendly"
        | "calcom"
        | "fireflies"
        | "granola"
        | "zoom"
        | "googledrive"
        | "googledocs"
        | "googlesheets"
        | "googleslides"
        | "onedrive"
        | "dropbox"
        | "stripe"
        | "quickbooks"
        | "square"
        | "mercury"
        | "hubspot"
        | "salesforce"
        | "pipedrive"
        | "notion"
        | "linear"
        | "asana"
        | "clickup"
        | "trello"
        | "airtable"
        | "instagram"
        | "linkedin"
        | "facebook"
        | "youtube"
        | "mailchimp"
        | "kit"
        | "manual"
        | "ask_salt"
      capture_state: "pending" | "routed" | "dismissed"
      catalog_sync_status: "active" | "changed" | "removed"
      client_user_status: "pending" | "active" | "not_invited" | "revoked"
      connector_tier: "catalog_only" | "action" | "capture"
      connector_tool_risk: "read" | "mutating" | "destructive"
      domain_status: "pending" | "verified" | "failed" | "disabled"
      entity_provider:
        | "manual"
        | "hubspot"
        | "salesforce"
        | "pipedrive"
        | "gmail"
        | "outlook"
        | "google-calendar"
        | "calendly"
        | "calcom"
        | "zoom"
        | "fireflies"
        | "granola"
        | "recall"
        | "asana"
        | "linear"
        | "jira"
        | "clickup"
        | "monday"
        | "trello"
        | "notion"
        | "airtable"
        | "github"
        | "figma"
        | "google-drive"
        | "google-docs"
        | "google-sheets"
        | "docusign"
        | "pandadoc"
        | "slack"
        | "stripe"
        | "quickbooks"
        | "square"
      entity_source_origin: "found" | "created" | "extracted" | "imported"
      file_ai_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "unsupported"
      file_category:
        | "brand_asset"
        | "deliverable"
        | "contract"
        | "screenshot"
        | "other"
        | "invoice"
        | "proposal"
        | "reference"
        | "media"
        | "notes"
        | "process"
      file_direction: "from_client" | "to_client" | "internal"
      finding_state: "needs_you" | "auto_handled" | "acted" | "dismissed"
      finding_type:
        | "revenue_buying"
        | "revenue_closing"
        | "revenue_upsell"
        | "revenue_risk"
        | "new_person"
        | "new_org"
        | "referral"
        | "pending_question"
        | "pending_deliverable"
        | "pending_reply"
        | "needs_routing"
        | "note_suggestion"
      memory_surface:
        | "people"
        | "orgs"
        | "work"
        | "files"
        | "conversations"
        | "meetings"
        | "teams"
        | "me"
      operator_fact_category:
        | "identity"
        | "business"
        | "preference"
        | "goal"
        | "voice"
        | "relationship"
      operator_fact_kind: "fact" | "preference" | "procedure"
      operator_fact_scope: "global" | "person" | "org" | "topic"
      operator_fact_source: "manual" | "ai_capture" | "ask_salt" | "draft_edit"
      operator_fact_status: "proposed" | "confirmed" | "dismissed"
      operator_goal_horizon: "week" | "quarter" | "year"
      operator_goal_status: "active" | "paused" | "done" | "dropped"
      operator_goal_type:
        | "revenue_target"
        | "new_clients"
        | "project_minimum"
        | "work_hours"
        | "custom"
      operator_goal_unit: "dollars" | "clients" | "projects" | "hours"
      projects_payment_type: "fixed" | "retainer" | "hourly" | "milestone"
      projects_type:
        | "project"
        | "retainer"
        | "hourly"
        | "proposal"
        | "quick"
        | "event"
      routing_action: "created" | "updated" | "linked"
      routing_status:
        | "auto_routed"
        | "pending"
        | "approved"
        | "dismissed"
        | "corrected"
      service_item_billing_interval: "monthly" | "quarterly" | "annually"
      service_item_pricing_type: "fixed" | "hourly" | "retainer" | "milestone"
      system_play_action:
        | "create"
        | "update"
        | "archive"
        | "link"
        | "unlink"
        | "attach"
        | "classify"
      system_play_target:
        | "person"
        | "org"
        | "work"
        | "playbook"
        | "player"
        | "space"
        | "note"
        | "conversation"
        | "email"
        | "file"
        | "meeting"
        | "invoice"
        | "payment"
      tool_classification_status:
        | "unclassified"
        | "proposed"
        | "approved"
        | "rejected"
        | "disabled"
      work_billing_cycle: "monthly" | "quarterly" | "annually"
      work_payment_terms:
        | "due_on_receipt"
        | "net_15"
        | "net_30"
        | "net_60"
        | "net_45"
        | "custom"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      billing_category: ["contractor", "software", "other"],
      billing_direction: ["receivable", "payable"],
      billing_origin: ["found", "added"],
      billing_payment_match_status: ["matched", "unmatched", "reversed"],
      billing_provider: [
        "stripe",
        "quickbooks",
        "square",
        "shopify",
        "lemonsqueezy",
        "mercury",
        "manual",
      ],
      billing_status: [
        "draft",
        "due",
        "overdue",
        "paid",
        "partial",
        "refunded",
        "disputed",
      ],
      capture_event_type: [
        "message",
        "thread",
        "meeting",
        "transcript",
        "file",
        "contact",
        "payment",
        "task",
        "note",
        "post",
        "event",
        "other",
      ],
      capture_origin: ["added", "found"],
      capture_sender_kind: ["client", "vendor_saas", "payment_rail"],
      capture_source_type: [
        "gmail",
        "outlook",
        "slack",
        "whatsapp",
        "discord",
        "telegram",
        "googlecalendar",
        "outlook_calendar",
        "calendly",
        "calcom",
        "fireflies",
        "granola",
        "zoom",
        "googledrive",
        "googledocs",
        "googlesheets",
        "googleslides",
        "onedrive",
        "dropbox",
        "stripe",
        "quickbooks",
        "square",
        "mercury",
        "hubspot",
        "salesforce",
        "pipedrive",
        "notion",
        "linear",
        "asana",
        "clickup",
        "trello",
        "airtable",
        "instagram",
        "linkedin",
        "facebook",
        "youtube",
        "mailchimp",
        "kit",
        "manual",
        "ask_salt",
      ],
      capture_state: ["pending", "routed", "dismissed"],
      catalog_sync_status: ["active", "changed", "removed"],
      client_user_status: ["pending", "active", "not_invited", "revoked"],
      connector_tier: ["catalog_only", "action", "capture"],
      connector_tool_risk: ["read", "mutating", "destructive"],
      domain_status: ["pending", "verified", "failed", "disabled"],
      entity_provider: [
        "manual",
        "hubspot",
        "salesforce",
        "pipedrive",
        "gmail",
        "outlook",
        "google-calendar",
        "calendly",
        "calcom",
        "zoom",
        "fireflies",
        "granola",
        "recall",
        "asana",
        "linear",
        "jira",
        "clickup",
        "monday",
        "trello",
        "notion",
        "airtable",
        "github",
        "figma",
        "google-drive",
        "google-docs",
        "google-sheets",
        "docusign",
        "pandadoc",
        "slack",
        "stripe",
        "quickbooks",
        "square",
      ],
      entity_source_origin: ["found", "created", "extracted", "imported"],
      file_ai_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "unsupported",
      ],
      file_category: [
        "brand_asset",
        "deliverable",
        "contract",
        "screenshot",
        "other",
        "invoice",
        "proposal",
        "reference",
        "media",
        "notes",
        "process",
      ],
      file_direction: ["from_client", "to_client", "internal"],
      finding_state: ["needs_you", "auto_handled", "acted", "dismissed"],
      finding_type: [
        "revenue_buying",
        "revenue_closing",
        "revenue_upsell",
        "revenue_risk",
        "new_person",
        "new_org",
        "referral",
        "pending_question",
        "pending_deliverable",
        "pending_reply",
        "needs_routing",
        "note_suggestion",
      ],
      memory_surface: [
        "people",
        "orgs",
        "work",
        "files",
        "conversations",
        "meetings",
        "teams",
        "me",
      ],
      operator_fact_category: [
        "identity",
        "business",
        "preference",
        "goal",
        "voice",
        "relationship",
      ],
      operator_fact_kind: ["fact", "preference", "procedure"],
      operator_fact_scope: ["global", "person", "org", "topic"],
      operator_fact_source: ["manual", "ai_capture", "ask_salt", "draft_edit"],
      operator_fact_status: ["proposed", "confirmed", "dismissed"],
      operator_goal_horizon: ["week", "quarter", "year"],
      operator_goal_status: ["active", "paused", "done", "dropped"],
      operator_goal_type: [
        "revenue_target",
        "new_clients",
        "project_minimum",
        "work_hours",
        "custom",
      ],
      operator_goal_unit: ["dollars", "clients", "projects", "hours"],
      projects_payment_type: ["fixed", "retainer", "hourly", "milestone"],
      projects_type: [
        "project",
        "retainer",
        "hourly",
        "proposal",
        "quick",
        "event",
      ],
      routing_action: ["created", "updated", "linked"],
      routing_status: [
        "auto_routed",
        "pending",
        "approved",
        "dismissed",
        "corrected",
      ],
      service_item_billing_interval: ["monthly", "quarterly", "annually"],
      service_item_pricing_type: ["fixed", "hourly", "retainer", "milestone"],
      system_play_action: [
        "create",
        "update",
        "archive",
        "link",
        "unlink",
        "attach",
        "classify",
      ],
      system_play_target: [
        "person",
        "org",
        "work",
        "playbook",
        "player",
        "space",
        "note",
        "conversation",
        "email",
        "file",
        "meeting",
        "invoice",
        "payment",
      ],
      tool_classification_status: [
        "unclassified",
        "proposed",
        "approved",
        "rejected",
        "disabled",
      ],
      work_billing_cycle: ["monthly", "quarterly", "annually"],
      work_payment_terms: [
        "due_on_receipt",
        "net_15",
        "net_30",
        "net_60",
        "net_45",
        "custom",
      ],
    },
  },
} as const
