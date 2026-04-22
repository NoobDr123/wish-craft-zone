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
        ]
      }
      orders: {
        Row: {
          amount_cents: number
          amount_paid_cents: number
          audio_variants: Json | null
          auto_qc_results: Json | null
          brief: Json | null
          brief_score: Json | null
          buyer_email: string
          buyer_name: string | null
          created_at: string
          currency: string
          customer_name: string | null
          delivered_at: string | null
          delivery_date: string | null
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
          quiz_payload: Json | null
          recipient_email: string | null
          recipient_name: string
          recipient_relationship: string | null
          relationship: string | null
          revision_count: number
          revision_notes: string | null
          scheduled_delivery_at: string | null
          selected_variant_id: string | null
          share_page_slug: string | null
          song_title_idea: string | null
          status: string
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
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
          brief?: Json | null
          brief_score?: Json | null
          buyer_email: string
          buyer_name?: string | null
          created_at?: string
          currency?: string
          customer_name?: string | null
          delivered_at?: string | null
          delivery_date?: string | null
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
          quiz_payload?: Json | null
          recipient_email?: string | null
          recipient_name: string
          recipient_relationship?: string | null
          relationship?: string | null
          revision_count?: number
          revision_notes?: string | null
          scheduled_delivery_at?: string | null
          selected_variant_id?: string | null
          share_page_slug?: string | null
          song_title_idea?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
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
          brief?: Json | null
          brief_score?: Json | null
          buyer_email?: string
          buyer_name?: string | null
          created_at?: string
          currency?: string
          customer_name?: string | null
          delivered_at?: string | null
          delivery_date?: string | null
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
          quiz_payload?: Json | null
          recipient_email?: string | null
          recipient_name?: string
          recipient_relationship?: string | null
          relationship?: string | null
          revision_count?: number
          revision_notes?: string | null
          scheduled_delivery_at?: string | null
          selected_variant_id?: string | null
          share_page_slug?: string | null
          song_title_idea?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_my_guest_orders: { Args: never; Returns: number }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
