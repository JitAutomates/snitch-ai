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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      briefs: {
        Row: {
          action_plan: string
          body: string
          created_at: string
          day: string
          highlights: Json
          id: string
          model: string | null
          pinned: boolean
          title: string
          user_id: string
        }
        Insert: {
          action_plan: string
          body: string
          created_at?: string
          day: string
          highlights?: Json
          id?: string
          model?: string | null
          pinned?: boolean
          title: string
          user_id: string
        }
        Update: {
          action_plan?: string
          body?: string
          created_at?: string
          day?: string
          highlights?: Json
          id?: string
          model?: string | null
          pinned?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      competitor_activity: {
        Row: {
          category: string
          company_url: string | null
          competitor_id: string | null
          competitor_name: string
          created_at: string
          headline: string
          id: string
          published_at: string | null
          source_url: string
          summary: string
          user_id: string
          week_start: string
        }
        Insert: {
          category?: string
          company_url?: string | null
          competitor_id?: string | null
          competitor_name: string
          created_at?: string
          headline: string
          id?: string
          published_at?: string | null
          source_url: string
          summary: string
          user_id: string
          week_start: string
        }
        Update: {
          category?: string
          company_url?: string | null
          competitor_id?: string | null
          competitor_name?: string
          created_at?: string
          headline?: string
          id?: string
          published_at?: string | null
          source_url?: string
          summary?: string
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_activity_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "competitors"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_activity_runs: {
        Row: {
          finished_at: string | null
          id: string
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          finished_at?: string | null
          id?: string
          started_at?: string
          status: string
          user_id: string
        }
        Update: {
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      competitor_summaries: {
        Row: {
          company_url: string
          competitor_id: string | null
          competitor_name: string
          created_at: string
          id: string
          source_urls: Json
          summary: string
          user_id: string
          week_start: string
        }
        Insert: {
          company_url: string
          competitor_id?: string | null
          competitor_name: string
          created_at?: string
          id?: string
          source_urls?: Json
          summary?: string
          user_id: string
          week_start: string
        }
        Update: {
          company_url?: string
          competitor_id?: string | null
          competitor_name?: string
          created_at?: string
          id?: string
          source_urls?: Json
          summary?: string
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_summaries_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "competitors"
            referencedColumns: ["id"]
          },
        ]
      }
      competitors: {
        Row: {
          company_url: string | null
          created_at: string
          exa_id: string | null
          id: string
          name: string
          rank: number
          resolved_at: string
          sales_estimate: string | null
          scale: string | null
          source: string
          user_id: string
        }
        Insert: {
          company_url?: string | null
          created_at?: string
          exa_id?: string | null
          id?: string
          name: string
          rank?: number
          resolved_at?: string
          sales_estimate?: string | null
          scale?: string | null
          source?: string
          user_id: string
        }
        Update: {
          company_url?: string | null
          created_at?: string
          exa_id?: string | null
          id?: string
          name?: string
          rank?: number
          resolved_at?: string
          sales_estimate?: string | null
          scale?: string | null
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      niche_news: {
        Row: {
          body: string
          created_at: string
          day: string
          headline: string
          id: string
          source_urls: Json
          tag: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          day: string
          headline: string
          id?: string
          source_urls?: Json
          tag?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          day?: string
          headline?: string
          id?: string
          source_urls?: Json
          tag?: string
          user_id?: string
        }
        Relationships: []
      }
      peer_prices: {
        Row: {
          amount: number | null
          amount_display: string | null
          company_url: string | null
          competitor_id: string
          competitor_name: string
          created_at: string
          currency: string
          id: string
          notes: string | null
          observed_at: string
          plan_label: string
          source_url: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          amount_display?: string | null
          company_url?: string | null
          competitor_id: string
          competitor_name: string
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          observed_at?: string
          plan_label?: string
          source_url?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          amount_display?: string | null
          company_url?: string | null
          competitor_id?: string
          competitor_name?: string
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          observed_at?: string
          plan_label?: string
          source_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_prices_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "competitors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age_verified: boolean
          created_at: string
          display_name: string | null
          email_opt_in: boolean
          id: string
          industry: string | null
          onboarded: boolean
          peers_resolve_status: string | null
          peers_resolved_at: string | null
          product: string | null
          region: string | null
          sales_volume: number | null
          scale: string | null
        }
        Insert: {
          age_verified?: boolean
          created_at?: string
          display_name?: string | null
          email_opt_in?: boolean
          id: string
          industry?: string | null
          onboarded?: boolean
          peers_resolve_status?: string | null
          peers_resolved_at?: string | null
          product?: string | null
          region?: string | null
          sales_volume?: number | null
          scale?: string | null
        }
        Update: {
          age_verified?: boolean
          created_at?: string
          display_name?: string | null
          email_opt_in?: boolean
          id?: string
          industry?: string | null
          onboarded?: boolean
          peers_resolve_status?: string | null
          peers_resolved_at?: string | null
          product?: string | null
          region?: string | null
          sales_volume?: number | null
          scale?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
