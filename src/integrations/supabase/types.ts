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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      featured_samples: {
        Row: {
          audio_url: string | null
          audio_variants: Json | null
          brief: Json | null
          brief_score: Json | null
          cover_image_url: string | null
          created_at: string
          flag_reason: string | null
          for_text: string | null
          genre: string
          genre_label: string
          id: string
          kie_callback_received_at: string | null
          kie_submitted_at: string | null
          kie_task_id: string | null
          lyrics: string | null
          published: boolean
          quote: string | null
          recipient_name: string
          relationship: string | null
          sort_order: number
          stage: string | null
          status: string
          story_prompt: string
          synced_lyrics: Json | null
          tempo: string
          testimonial_slug: string | null
          title: string
          updated_at: string
          voice: string
        }
        Insert: {
          audio_url?: string | null
          audio_variants?: Json | null
          brief?: Json | null
          brief_score?: Json | null
          cover_image_url?: string | null
          created_at?: string
          flag_reason?: string | null
          for_text?: string | null
          genre?: string
          genre_label?: string
          id?: string
          kie_callback_received_at?: string | null
          kie_submitted_at?: string | null
          kie_task_id?: string | null
          lyrics?: string | null
          published?: boolean
          quote?: string | null
          recipient_name: string
          relationship?: string | null
          sort_order?: number
          stage?: string | null
          status?: string
          story_prompt: string
          synced_lyrics?: Json | null
          tempo?: string
          testimonial_slug?: string | null
          title: string
          updated_at?: string
          voice?: string
        }
        Update: {
          audio_url?: string | null
          audio_variants?: Json | null
          brief?: Json | null
          brief_score?: Json | null
          cover_image_url?: string | null
          created_at?: string
          flag_reason?: string | null
          for_text?: string | null
          genre?: string
          genre_label?: string
          id?: string
          kie_callback_received_at?: string | null
          kie_submitted_at?: string | null
          kie_task_id?: string | null
          lyrics?: string | null
          published?: boolean
          quote?: string | null
          recipient_name?: string
          relationship?: string | null
          sort_order?: number
          stage?: string | null
          status?: string
          story_prompt?: string
          synced_lyrics?: Json | null
          tempo?: string
          testimonial_slug?: string | null
          title?: string
          updated_at?: string
          voice?: string
        }
        Relationships: []
      }
      internal_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      job_events: {
        Row: {
          created_at: string
          event_type: string
          id: number
          order_id: string
          payload: Json | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: number
          order_id: string
          payload?: Json | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: number
          order_id?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "job_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "public_shared_songs"
            referencedColumns: ["id"]
          },
        ]
      }
      kie_callbacks: {
        Row: {
          id: number
          order_id: string | null
          payload: Json
          processed: boolean
          received_at: string
          stage: string
          task_id: string
        }
        Insert: {
          id?: number
          order_id?: string | null
          payload: Json
          processed?: boolean
          received_at?: string
          stage: string
          task_id: string
        }
        Update: {
          id?: number
          order_id?: string | null
          payload?: Json
          processed?: boolean
          received_at?: string
          stage?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kie_callbacks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kie_callbacks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "public_shared_songs"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_verifications: {
        Row: {
          expires_at: string
          id: string
          user_agent: string | null
          user_id: string
          verified_at: string
        }
        Insert: {
          expires_at?: string
          id?: string
          user_agent?: string | null
          user_id: string
          verified_at?: string
        }
        Update: {
          expires_at?: string
          id?: string
          user_agent?: string | null
          user_id?: string
          verified_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount_cents: number
          amount_paid_cents: number
          audio_variants: Json | null
          auto_qc_results: Json | null
          auto_user_provisioned_at: string | null
          brief: Json | null
          brief_score: Json | null
          buyer_email: string
          buyer_name: string | null
          confirmation_email_sent_at: string | null
          created_at: string
          currency: string
          customer_name: string | null
          delivered_at: string | null
          delivery_date: string | null
          delivery_tier: string
          discount_cents: number
          flag_reason: string | null
          flagged_for_review: boolean
          genre: string | null
          has_3rd_verse: boolean
          has_unlimited_edits: boolean
          human_qc_notes: string | null
          human_qc_reviewer: string | null
          id: string
          is_gift: boolean
          is_rush: boolean
          kie_callback_received_at: string | null
          kie_submitted_at: string | null
          kie_task_id: string | null
          parent_order_id: string | null
          payment_status: string
          personal_note: string | null
          priority: string
          product_config: Json
          promo_code_id: string | null
          quiz_payload: Json | null
          recipient_email: string | null
          recipient_name: string
          recipient_relationship: string | null
          regeneration_used_at: string | null
          relationship: string | null
          revision_count: number
          revision_notes: string | null
          scheduled_delivery_at: string | null
          second_variant_unlocked_at: string | null
          selected_variant_id: string | null
          share_page_slug: string | null
          song_title_idea: string | null
          source_kind: string
          source_promo_code_id: string | null
          source_reward_code_id: string | null
          status: string
          stripe_checkout_session_id: string | null
          stripe_customer_id: string | null
          stripe_env: string | null
          stripe_fulfillment_synced_at: string | null
          stripe_payment_intent_id: string | null
          stripe_payment_method_id: string | null
          tempo: string | null
          updated_at: string
          user_id: string | null
          voice: string | null
        }
        Insert: {
          amount_cents?: number
          amount_paid_cents?: number
          audio_variants?: Json | null
          auto_qc_results?: Json | null
          auto_user_provisioned_at?: string | null
          brief?: Json | null
          brief_score?: Json | null
          buyer_email: string
          buyer_name?: string | null
          confirmation_email_sent_at?: string | null
          created_at?: string
          currency?: string
          customer_name?: string | null
          delivered_at?: string | null
          delivery_date?: string | null
          delivery_tier?: string
          discount_cents?: number
          flag_reason?: string | null
          flagged_for_review?: boolean
          genre?: string | null
          has_3rd_verse?: boolean
          has_unlimited_edits?: boolean
          human_qc_notes?: string | null
          human_qc_reviewer?: string | null
          id?: string
          is_gift?: boolean
          is_rush?: boolean
          kie_callback_received_at?: string | null
          kie_submitted_at?: string | null
          kie_task_id?: string | null
          parent_order_id?: string | null
          payment_status?: string
          personal_note?: string | null
          priority?: string
          product_config?: Json
          promo_code_id?: string | null
          quiz_payload?: Json | null
          recipient_email?: string | null
          recipient_name: string
          recipient_relationship?: string | null
          regeneration_used_at?: string | null
          relationship?: string | null
          revision_count?: number
          revision_notes?: string | null
          scheduled_delivery_at?: string | null
          second_variant_unlocked_at?: string | null
          selected_variant_id?: string | null
          share_page_slug?: string | null
          song_title_idea?: string | null
          source_kind?: string
          source_promo_code_id?: string | null
          source_reward_code_id?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_env?: string | null
          stripe_fulfillment_synced_at?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_method_id?: string | null
          tempo?: string | null
          updated_at?: string
          user_id?: string | null
          voice?: string | null
        }
        Update: {
          amount_cents?: number
          amount_paid_cents?: number
          audio_variants?: Json | null
          auto_qc_results?: Json | null
          auto_user_provisioned_at?: string | null
          brief?: Json | null
          brief_score?: Json | null
          buyer_email?: string
          buyer_name?: string | null
          confirmation_email_sent_at?: string | null
          created_at?: string
          currency?: string
          customer_name?: string | null
          delivered_at?: string | null
          delivery_date?: string | null
          delivery_tier?: string
          discount_cents?: number
          flag_reason?: string | null
          flagged_for_review?: boolean
          genre?: string | null
          has_3rd_verse?: boolean
          has_unlimited_edits?: boolean
          human_qc_notes?: string | null
          human_qc_reviewer?: string | null
          id?: string
          is_gift?: boolean
          is_rush?: boolean
          kie_callback_received_at?: string | null
          kie_submitted_at?: string | null
          kie_task_id?: string | null
          parent_order_id?: string | null
          payment_status?: string
          personal_note?: string | null
          priority?: string
          product_config?: Json
          promo_code_id?: string | null
          quiz_payload?: Json | null
          recipient_email?: string | null
          recipient_name?: string
          recipient_relationship?: string | null
          regeneration_used_at?: string | null
          relationship?: string | null
          revision_count?: number
          revision_notes?: string | null
          scheduled_delivery_at?: string | null
          second_variant_unlocked_at?: string | null
          selected_variant_id?: string | null
          share_page_slug?: string | null
          song_title_idea?: string | null
          source_kind?: string
          source_promo_code_id?: string | null
          source_reward_code_id?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_env?: string | null
          stripe_fulfillment_synced_at?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_method_id?: string | null
          tempo?: string | null
          updated_at?: string
          user_id?: string | null
          voice?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_parent_order_id_fkey"
            columns: ["parent_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_parent_order_id_fkey"
            columns: ["parent_order_id"]
            isOneToOne: false
            referencedRelation: "public_shared_songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_source_promo_code_id_fkey"
            columns: ["source_promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_source_reward_code_id_fkey"
            columns: ["source_reward_code_id"]
            isOneToOne: false
            referencedRelation: "reaction_reward_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      page_sessions: {
        Row: {
          buyer_email: string | null
          created_at: string
          first_seen_at: string
          id: string
          landing_path: string | null
          last_seen_at: string
          order_id: string | null
          referrer: string | null
          session_id: string
          user_agent: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          buyer_email?: string | null
          created_at?: string
          first_seen_at?: string
          id?: string
          landing_path?: string | null
          last_seen_at?: string
          order_id?: string | null
          referrer?: string | null
          session_id: string
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          buyer_email?: string | null
          created_at?: string
          first_seen_at?: string
          id?: string
          landing_path?: string | null
          last_seen_at?: string
          order_id?: string | null
          referrer?: string | null
          session_id?: string
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      play_events: {
        Row: {
          duration_ms: number | null
          id: number
          ip_hash: string | null
          order_id: string
          played_at: string
          source: string | null
          user_agent: string | null
          variant_id: string | null
        }
        Insert: {
          duration_ms?: number | null
          id?: number
          ip_hash?: string | null
          order_id: string
          played_at?: string
          source?: string | null
          user_agent?: string | null
          variant_id?: string | null
        }
        Update: {
          duration_ms?: number | null
          id?: number
          ip_hash?: string | null
          order_id?: string
          played_at?: string
          source?: string | null
          user_agent?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "play_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "play_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "public_shared_songs"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_code_redemptions: {
        Row: {
          buyer_email: string | null
          created_at: string
          discount_cents: number
          id: string
          order_id: string
          promo_code_id: string
        }
        Insert: {
          buyer_email?: string | null
          created_at?: string
          discount_cents: number
          id?: string
          order_id: string
          promo_code_id: string
        }
        Update: {
          buyer_email?: string | null
          created_at?: string
          discount_cents?: number
          id?: string
          order_id?: string
          promo_code_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_redemptions_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_pct: number
          expires_at: string | null
          id: string
          issued_for_order_id: string | null
          issued_for_reward_code_id: string | null
          kind: string
          max_uses: number
          notes: string | null
          owner_email: string | null
          owner_user_id: string | null
          times_used: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_pct: number
          expires_at?: string | null
          id?: string
          issued_for_order_id?: string | null
          issued_for_reward_code_id?: string | null
          kind?: string
          max_uses?: number
          notes?: string | null
          owner_email?: string | null
          owner_user_id?: string | null
          times_used?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_pct?: number
          expires_at?: string | null
          id?: string
          issued_for_order_id?: string | null
          issued_for_reward_code_id?: string | null
          kind?: string
          max_uses?: number
          notes?: string | null
          owner_email?: string | null
          owner_user_id?: string | null
          times_used?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_issued_for_order_id_fkey"
            columns: ["issued_for_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_codes_issued_for_order_id_fkey"
            columns: ["issued_for_order_id"]
            isOneToOne: false
            referencedRelation: "public_shared_songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_codes_issued_for_reward_code_id_fkey"
            columns: ["issued_for_reward_code_id"]
            isOneToOne: false
            referencedRelation: "reaction_reward_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      public_featured_samples: {
        Row: {
          audio_url: string | null
          cover_image_url: string | null
          created_at: string | null
          for_text: string | null
          genre: string | null
          genre_label: string | null
          id: string
          lyrics: string | null
          quote: string | null
          recipient_name: string | null
          relationship: string | null
          sort_order: number | null
          synced_lyrics: Json | null
          tempo: string | null
          testimonial_slug: string | null
          title: string | null
          updated_at: string | null
          voice: string | null
        }
        Insert: {
          audio_url?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          for_text?: string | null
          genre?: string | null
          genre_label?: string | null
          id: string
          lyrics?: string | null
          quote?: string | null
          recipient_name?: string | null
          relationship?: string | null
          sort_order?: number | null
          synced_lyrics?: Json | null
          tempo?: string | null
          testimonial_slug?: string | null
          title?: string | null
          updated_at?: string | null
          voice?: string | null
        }
        Update: {
          audio_url?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          for_text?: string | null
          genre?: string | null
          genre_label?: string | null
          id?: string
          lyrics?: string | null
          quote?: string | null
          recipient_name?: string | null
          relationship?: string | null
          sort_order?: number | null
          synced_lyrics?: Json | null
          tempo?: string | null
          testimonial_slug?: string | null
          title?: string | null
          updated_at?: string | null
          voice?: string | null
        }
        Relationships: []
      }
      quiz_events: {
        Row: {
          amount_cents: number | null
          buyer_email: string | null
          created_at: string
          event_type: string
          id: number
          order_id: string | null
          payload: Json | null
          session_id: string
          step_index: number | null
          step_key: string | null
          time_on_step_ms: number | null
          upsell_type: string | null
        }
        Insert: {
          amount_cents?: number | null
          buyer_email?: string | null
          created_at?: string
          event_type: string
          id?: number
          order_id?: string | null
          payload?: Json | null
          session_id: string
          step_index?: number | null
          step_key?: string | null
          time_on_step_ms?: number | null
          upsell_type?: string | null
        }
        Update: {
          amount_cents?: number | null
          buyer_email?: string | null
          created_at?: string
          event_type?: string
          id?: number
          order_id?: string | null
          payload?: Json | null
          session_id?: string
          step_index?: number | null
          step_key?: string | null
          time_on_step_ms?: number | null
          upsell_type?: string | null
        }
        Relationships: []
      }
      reaction_reward_codes: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          buyer_email: string
          code: string
          created_at: string
          first_redeemed_at: string | null
          free_songs_remaining: number
          fully_redeemed_at: string | null
          id: string
          order_id: string
          reaction_video_id: string | null
          refund_amount_cents: number | null
          refund_request_id: string | null
          refund_stripe_id: string | null
          refund_synced_at: string | null
          rejected_at: string | null
          rejection_reason: string | null
          status: string
          unlocked_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          buyer_email: string
          code: string
          created_at?: string
          first_redeemed_at?: string | null
          free_songs_remaining?: number
          fully_redeemed_at?: string | null
          id?: string
          order_id: string
          reaction_video_id?: string | null
          refund_amount_cents?: number | null
          refund_request_id?: string | null
          refund_stripe_id?: string | null
          refund_synced_at?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string
          unlocked_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          buyer_email?: string
          code?: string
          created_at?: string
          first_redeemed_at?: string | null
          free_songs_remaining?: number
          fully_redeemed_at?: string | null
          id?: string
          order_id?: string
          reaction_video_id?: string | null
          refund_amount_cents?: number | null
          refund_request_id?: string | null
          refund_stripe_id?: string | null
          refund_synced_at?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string
          unlocked_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      reaction_videos: {
        Row: {
          buyer_email: string
          caption: string | null
          created_at: string
          file_size_bytes: number | null
          id: string
          is_public: boolean
          mime_type: string | null
          order_id: string
          status: string
          storage_path: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          buyer_email: string
          caption?: string | null
          created_at?: string
          file_size_bytes?: number | null
          id?: string
          is_public?: boolean
          mime_type?: string | null
          order_id: string
          status?: string
          storage_path: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          buyer_email?: string
          caption?: string | null
          created_at?: string
          file_size_bytes?: number | null
          id?: string
          is_public?: boolean
          mime_type?: string | null
          order_id?: string
          status?: string
          storage_path?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reaction_videos_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reaction_videos_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "public_shared_songs"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_requests: {
        Row: {
          admin_notes: string | null
          amount_cents: number | null
          buyer_email: string
          created_at: string
          id: string
          order_id: string
          reaction_video_id: string | null
          reason: string
          request_type: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount_cents?: number | null
          buyer_email: string
          created_at?: string
          id?: string
          order_id: string
          reaction_video_id?: string | null
          reason: string
          request_type: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount_cents?: number | null
          buyer_email?: string
          created_at?: string
          id?: string
          order_id?: string
          reaction_video_id?: string | null
          reason?: string
          request_type?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "public_shared_songs"
            referencedColumns: ["id"]
          },
        ]
      }
      revision_requests: {
        Row: {
          admin_notes: string | null
          buyer_email: string
          created_at: string
          delivered_audio_url: string | null
          id: string
          is_free: boolean
          notes: string
          order_id: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          buyer_email: string
          created_at?: string
          delivered_audio_url?: string | null
          id?: string
          is_free?: boolean
          notes: string
          order_id: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          buyer_email?: string
          created_at?: string
          delivered_audio_url?: string | null
          id?: string
          is_free?: boolean
          notes?: string
          order_id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revision_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revision_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "public_shared_songs"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_events: {
        Row: {
          event_id: string
          event_type: string | null
          payload: Json | null
          processed: boolean
          received_at: string
        }
        Insert: {
          event_id: string
          event_type?: string | null
          payload?: Json | null
          processed?: boolean
          received_at?: string
        }
        Update: {
          event_id?: string
          event_type?: string | null
          payload?: Json | null
          processed?: boolean
          received_at?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          author_user_id: string | null
          body: string
          created_at: string
          direction: string
          id: string
          thread_id: string
        }
        Insert: {
          author_user_id?: string | null
          body: string
          created_at?: string
          direction: string
          id?: string
          thread_id: string
        }
        Update: {
          author_user_id?: string | null
          body?: string
          created_at?: string
          direction?: string
          id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "support_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      support_threads: {
        Row: {
          assigned_to: string | null
          created_at: string
          id: string
          last_activity_at: string
          order_id_text: string | null
          sender_email: string
          sender_name: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          last_activity_at?: string
          order_id_text?: string | null
          sender_email: string
          sender_name: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          last_activity_at?: string
          order_id_text?: string | null
          sender_email?: string
          sender_name?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_mfa: {
        Row: {
          created_at: string
          enrolled: boolean
          recovery_codes: string[]
          totp_secret: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enrolled?: boolean
          recovery_codes?: string[]
          totp_secret: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enrolled?: boolean
          recovery_codes?: string[]
          totp_secret?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_shared_songs: {
        Row: {
          audio_variants: Json | null
          brief: Json | null
          delivered_at: string | null
          genre: string | null
          id: string | null
          recipient_name: string | null
          selected_variant_id: string | null
          share_page_slug: string | null
          song_title_idea: string | null
          tempo: string | null
          voice: string | null
        }
        Insert: {
          audio_variants?: Json | null
          brief?: Json | null
          delivered_at?: string | null
          genre?: string | null
          id?: string | null
          recipient_name?: string | null
          selected_variant_id?: string | null
          share_page_slug?: string | null
          song_title_idea?: string | null
          tempo?: string | null
          voice?: string | null
        }
        Update: {
          audio_variants?: Json | null
          brief?: Json | null
          delivered_at?: string | null
          genre?: string | null
          id?: string | null
          recipient_name?: string | null
          selected_variant_id?: string | null
          share_page_slug?: string | null
          song_title_idea?: string | null
          tempo?: string | null
          voice?: string | null
        }
        Relationships: []
      }
      user_mfa_status: {
        Row: {
          created_at: string | null
          enrolled: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          enrolled?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          enrolled?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      claim_my_guest_orders: { Args: never; Returns: number }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_due_deliveries: { Args: never; Returns: number }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_reward_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_valid_mfa: { Args: { _user_id: string }; Returns: boolean }
      issue_personal_promo_code: {
        Args: {
          _discount_pct: number
          _expires_in_days?: number
          _issued_for_order_id?: string
          _issued_for_reward_code_id?: string
          _kind: string
          _owner_email: string
          _owner_user_id: string
        }
        Returns: {
          active: boolean
          code: string
          created_at: string
          discount_pct: number
          expires_at: string | null
          id: string
          issued_for_order_id: string | null
          issued_for_reward_code_id: string | null
          kind: string
          max_uses: number
          notes: string | null
          owner_email: string | null
          owner_user_id: string | null
          times_used: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "promo_codes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      issue_reward_code_for_order: {
        Args: { _order_id: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          buyer_email: string
          code: string
          created_at: string
          first_redeemed_at: string | null
          free_songs_remaining: number
          fully_redeemed_at: string | null
          id: string
          order_id: string
          reaction_video_id: string | null
          refund_amount_cents: number | null
          refund_request_id: string | null
          refund_stripe_id: string | null
          refund_synced_at: string | null
          rejected_at: string | null
          rejection_reason: string | null
          status: string
          unlocked_at: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "reaction_reward_codes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      redeem_promo_code: {
        Args: { _base_amount_cents: number; _code: string; _order_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
