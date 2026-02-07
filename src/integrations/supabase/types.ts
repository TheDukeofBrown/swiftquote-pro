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
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          after: Json | null
          before: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          admin_user_id: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          admin_user_id?: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["admin_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: Database["public"]["Enums"]["admin_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["admin_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string | null
          business_name: string
          created_at: string
          default_labour_rate: number | null
          email: string | null
          id: string
          logo_url: string | null
          phone: string | null
          trade: Database["public"]["Enums"]["trade_type"]
          updated_at: string
          user_id: string
          vat_rate: number | null
          vat_registered: boolean | null
        }
        Insert: {
          address?: string | null
          business_name: string
          created_at?: string
          default_labour_rate?: number | null
          email?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          trade: Database["public"]["Enums"]["trade_type"]
          updated_at?: string
          user_id: string
          vat_rate?: number | null
          vat_registered?: boolean | null
        }
        Update: {
          address?: string | null
          business_name?: string
          created_at?: string
          default_labour_rate?: number | null
          email?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          trade?: Database["public"]["Enums"]["trade_type"]
          updated_at?: string
          user_id?: string
          vat_rate?: number | null
          vat_registered?: boolean | null
        }
        Relationships: []
      }
      company_flags: {
        Row: {
          company_id: string
          is_locked: boolean
          lock_reason: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          is_locked?: boolean
          lock_reason?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          is_locked?: boolean
          lock_reason?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_flags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          company_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          company_id: string
          created_at: string
          error: string | null
          id: string
          provider: string
          provider_message_id: string | null
          quote_id: string | null
          status: string
          subject: string
          to_email: string
        }
        Insert: {
          company_id: string
          created_at?: string
          error?: string | null
          id?: string
          provider?: string
          provider_message_id?: string | null
          quote_id?: string | null
          status: string
          subject: string
          to_email: string
        }
        Update: {
          company_id?: string
          created_at?: string
          error?: string | null
          id?: string
          provider?: string
          provider_message_id?: string | null
          quote_id?: string | null
          status?: string
          subject?: string
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_events_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      price_items: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
          type: Database["public"]["Enums"]["price_item_type"]
          unit: Database["public"]["Enums"]["price_item_unit"]
          unit_price: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          type?: Database["public"]["Enums"]["price_item_type"]
          unit?: Database["public"]["Enums"]["price_item_unit"]
          unit_price?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          type?: Database["public"]["Enums"]["price_item_type"]
          unit?: Database["public"]["Enums"]["price_item_unit"]
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_events: {
        Row: {
          company_id: string
          created_at: string
          event_type: string
          id: string
          payload: Json | null
          quote_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          event_type: string
          id?: string
          payload?: Json | null
          quote_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json | null
          quote_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_events_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          created_at: string
          description: string
          id: string
          item_type: string
          line_total: number
          markup_percent: number | null
          quantity: number
          quote_id: string
          sort_order: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          item_type?: string
          line_total?: number
          markup_percent?: number | null
          quantity?: number
          quote_id: string
          sort_order?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          item_type?: string
          line_total?: number
          markup_percent?: number | null
          quantity?: number
          quote_id?: string
          sort_order?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          declined_at: string | null
          id: string
          job_address: string | null
          notes: string | null
          reference: string
          sent_at: string | null
          status: Database["public"]["Enums"]["quote_status"]
          subtotal: number
          total: number
          updated_at: string
          valid_until: string | null
          vat_amount: number
          viewed_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          declined_at?: string | null
          id?: string
          job_address?: string | null
          notes?: string | null
          reference: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          valid_until?: string | null
          vat_amount?: number
          viewed_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          declined_at?: string | null
          id?: string
          job_address?: string | null
          notes?: string | null
          reference?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          valid_until?: string | null
          vat_amount?: number
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          canceled_at: string | null
          company_id: string
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          canceled_at?: string | null
          company_id: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          canceled_at?: string | null
          company_id?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_records: {
        Row: {
          company_id: string
          created_at: string
          id: string
          pdfs_generated_this_month: number
          period_start: string
          quotes_created_this_month: number
          quotes_sent_this_month: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          pdfs_generated_this_month?: number
          period_start?: string
          quotes_created_this_month?: number
          quotes_sent_this_month?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          pdfs_generated_this_month?: number
          period_start?: string
          quotes_created_this_month?: number
          quotes_sent_this_month?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_can_modify: { Args: never; Returns: boolean }
      admin_get_audit_log: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          action: string
          admin_email: string
          admin_user_id: string
          after: Json
          before: Json
          created_at: string
          entity_id: string
          entity_type: string
          id: string
        }[]
      }
      admin_get_companies: {
        Args: never
        Returns: {
          business_name: string
          created_at: string
          email: string
          email_failure_rate: number
          id: string
          is_locked: boolean
          lock_reason: string
          notes: string
          phone: string
          quotes_accepted_30d: number
          quotes_sent_30d: number
          trade: string
        }[]
      }
      admin_get_company_detail: {
        Args: { p_company_id: string }
        Returns: Json
      }
      admin_get_events: {
        Args: {
          p_company_id?: string
          p_date_from?: string
          p_date_to?: string
          p_event_type?: string
          p_limit?: number
          p_offset?: number
          p_quote_id?: string
        }
        Returns: {
          company_id: string
          company_name: string
          created_at: string
          error: string
          event_source: string
          event_type: string
          id: string
          payload: Json
          quote_id: string
          quote_reference: string
        }[]
      }
      admin_get_metrics: {
        Args: { p_date_from: string; p_date_to: string }
        Returns: Json
      }
      admin_get_quotes: {
        Args: never
        Returns: {
          accepted_at: string
          company_id: string
          company_name: string
          created_at: string
          customer_email: string
          customer_name: string
          declined_at: string
          id: string
          reference: string
          sent_at: string
          status: string
          total: number
          viewed_at: string
        }[]
      }
      admin_get_users: {
        Args: never
        Returns: {
          company_id: string
          company_name: string
          created_at: string
          email: string
          is_admin: boolean
          trade: string
          user_id: string
        }[]
      }
      admin_lock_company: {
        Args: { p_company_id: string; p_reason: string }
        Returns: boolean
      }
      admin_resend_quote: { Args: { p_quote_id: string }; Returns: Json }
      admin_set_company_note: {
        Args: { p_company_id: string; p_note: string }
        Returns: boolean
      }
      admin_unlock_company: { Args: { p_company_id: string }; Returns: boolean }
      can_modify_quotes: { Args: { _company_id: string }; Returns: boolean }
      get_admin_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["admin_role"]
      }
      increment_usage: {
        Args: { p_company_id: string; p_metric: string }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_company_locked: { Args: { _company_id: string }; Returns: boolean }
    }
    Enums: {
      admin_role: "super_admin" | "admin" | "support"
      price_item_type: "labour" | "material" | "service" | "uplift"
      price_item_unit: "each" | "hour" | "percent" | "metre" | "day"
      quote_status: "draft" | "sent" | "viewed" | "accepted" | "declined"
      subscription_plan: "free" | "pro" | "business"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "expired"
      trade_type:
        | "builder"
        | "plumber"
        | "electrician"
        | "plasterer"
        | "painter"
        | "roofer"
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
      admin_role: ["super_admin", "admin", "support"],
      price_item_type: ["labour", "material", "service", "uplift"],
      price_item_unit: ["each", "hour", "percent", "metre", "day"],
      quote_status: ["draft", "sent", "viewed", "accepted", "declined"],
      subscription_plan: ["free", "pro", "business"],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "canceled",
        "expired",
      ],
      trade_type: [
        "builder",
        "plumber",
        "electrician",
        "plasterer",
        "painter",
        "roofer",
      ],
    },
  },
} as const
