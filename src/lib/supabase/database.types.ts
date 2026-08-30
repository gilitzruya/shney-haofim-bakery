export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      app_users: {
        Row: {
          customer_id: string | null
          phone: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          customer_id?: string | null
          phone: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          customer_id?: string | null
          phone?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_users_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      bakery_settings: {
        Row: {
          address: string | null
          email: string | null
          id: number
          name: string
          opening_hours: Json | null
          phone: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          email?: string | null
          id?: number
          name: string
          opening_hours?: Json | null
          phone?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          email?: string | null
          id?: number
          name?: string
          opening_hours?: Json | null
          phone?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
        }
        Relationships: []
      }
      customer_contacts: {
        Row: {
          customer_id: string
          email: string | null
          id: string
          is_primary: boolean
          name: string | null
          phone: string | null
        }
        Insert: {
          customer_id: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string | null
          phone?: string | null
        }
        Update: {
          customer_id?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string | null
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_prices: {
        Row: {
          customer_id: string
          price: number
          product_id: string
        }
        Insert: {
          customer_id: string
          price: number
          product_id: string
        }
        Update: {
          customer_id?: string
          price?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_prices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          allowed_rounds: Database["public"]["Enums"]["round_id"][]
          blocked: boolean
          business_id: string | null
          code: string | null
          created_at: string
          delivery_notes: string | null
          id: string
          name: string
        }
        Insert: {
          address?: string | null
          allowed_rounds?: Database["public"]["Enums"]["round_id"][]
          blocked?: boolean
          business_id?: string | null
          code?: string | null
          created_at?: string
          delivery_notes?: string | null
          id?: string
          name: string
        }
        Update: {
          address?: string | null
          allowed_rounds?: Database["public"]["Enums"]["round_id"][]
          blocked?: boolean
          business_id?: string | null
          code?: string | null
          created_at?: string
          delivery_notes?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      cutoff_exceptions: {
        Row: {
          cutoff_at: string | null
          date: string
          label: string
          open: boolean
        }
        Insert: {
          cutoff_at?: string | null
          date: string
          label?: string
          open?: boolean
        }
        Update: {
          cutoff_at?: string | null
          date?: string
          label?: string
          open?: boolean
        }
        Relationships: []
      }
      cutoff_rules: {
        Row: {
          cutoff_time: string
          enabled: boolean
          offset_days: number
          weekday: number
        }
        Insert: {
          cutoff_time?: string
          enabled?: boolean
          offset_days?: number
          weekday: number
        }
        Update: {
          cutoff_time?: string
          enabled?: boolean
          offset_days?: number
          weekday?: number
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          error: string | null
          external_id: string | null
          id: string
          number: string | null
          order_id: string
          status: Database["public"]["Enums"]["doc_status"]
          type: Database["public"]["Enums"]["doc_type"]
        }
        Insert: {
          created_at?: string
          error?: string | null
          external_id?: string | null
          id?: string
          number?: string | null
          order_id: string
          status?: Database["public"]["Enums"]["doc_status"]
          type?: Database["public"]["Enums"]["doc_type"]
        }
        Update: {
          created_at?: string
          error?: string | null
          external_id?: string | null
          id?: string
          number?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["doc_status"]
          type?: Database["public"]["Enums"]["doc_type"]
        }
        Relationships: [
          {
            foreignKeyName: "documents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_lines: {
        Row: {
          id: string
          order_id: string
          product_id: string
          product_name: string
          qty: number
          sku: string | null
          unit: Database["public"]["Enums"]["unit_type"]
          unit_price: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          product_name: string
          qty: number
          sku?: string | null
          unit: Database["public"]["Enums"]["unit_type"]
          unit_price: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          product_name?: string
          qty?: number
          sku?: string | null
          unit?: Database["public"]["Enums"]["unit_type"]
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          delivery_date: string | null
          id: string
          note: string | null
          recurring_id: string | null
          round: Database["public"]["Enums"]["round_id"]
          source: Database["public"]["Enums"]["order_source"]
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          delivery_date?: string | null
          id?: string
          note?: string | null
          recurring_id?: string | null
          round: Database["public"]["Enums"]["round_id"]
          source?: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          delivery_date?: string | null
          id?: string
          note?: string | null
          recurring_id?: string | null
          round?: Database["public"]["Enums"]["round_id"]
          source?: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_recurring_id_fkey"
            columns: ["recurring_id"]
            isOneToOne: false
            referencedRelation: "recurring_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          available: boolean
          category_id: string
          deleted_at: string | null
          id: string
          image_path: string | null
          min_qty: number
          name: string
          note: string | null
          position: number
          price: number
          sku: string | null
          step: number
          unavailable_reason: string | null
          unit: Database["public"]["Enums"]["unit_type"]
          weight_grams: number | null
        }
        Insert: {
          available?: boolean
          category_id: string
          deleted_at?: string | null
          id?: string
          image_path?: string | null
          min_qty?: number
          name: string
          note?: string | null
          position?: number
          price: number
          sku?: string | null
          step?: number
          unavailable_reason?: string | null
          unit?: Database["public"]["Enums"]["unit_type"]
          weight_grams?: number | null
        }
        Update: {
          available?: boolean
          category_id?: string
          deleted_at?: string | null
          id?: string
          image_path?: string | null
          min_qty?: number
          name?: string
          note?: string | null
          position?: number
          price?: number
          sku?: string | null
          step?: number
          unavailable_reason?: string | null
          unit?: Database["public"]["Enums"]["unit_type"]
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_order_lines: {
        Row: {
          id: string
          product_id: string
          qty: number
          recurring_id: string
        }
        Insert: {
          id?: string
          product_id: string
          qty: number
          recurring_id: string
        }
        Update: {
          id?: string
          product_id?: string
          qty?: number
          recurring_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_order_lines_recurring_id_fkey"
            columns: ["recurring_id"]
            isOneToOne: false
            referencedRelation: "recurring_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_orders: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          name: string
          note: string | null
          round: Database["public"]["Enums"]["round_id"]
          start_date: string | null
          status: Database["public"]["Enums"]["recurring_status"]
          weekdays: number[]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          name: string
          note?: string | null
          round: Database["public"]["Enums"]["round_id"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["recurring_status"]
          weekdays: number[]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          name?: string
          note?: string | null
          round?: Database["public"]["Enums"]["round_id"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["recurring_status"]
          weekdays?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "recurring_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fn_current_customer_id: { Args: never; Returns: string }
      fn_cutoff_at: { Args: { p_delivery_date: string }; Returns: string }
      fn_is_admin: { Args: never; Returns: boolean }
      fn_materialize_recurring_occurrence_internal: {
        Args: { p_date: string; p_patch: Json; p_recurring_id: string }
        Returns: string
      }
      fn_next_document_number: {
        Args: { p_type: Database["public"]["Enums"]["doc_type"] }
        Returns: string
      }
      fn_recurring_occurrences: {
        Args: { p_date: string }
        Returns: {
          created_at: string
          created_by: string
          customer_id: string
          name: string
          note: string
          product_id: string
          product_name: string
          qty: number
          recurring_id: string
          round: Database["public"]["Enums"]["round_id"]
          sku: string
          unit: Database["public"]["Enums"]["unit_type"]
          unit_price: number
        }[]
      }
      job_close_completed_orders: { Args: never; Returns: undefined }
      job_close_upcoming_recurring: { Args: never; Returns: undefined }
      job_expire_stale_drafts: { Args: never; Returns: undefined }
      rpc_confirm_order: {
        Args: { p_order_id: string }
        Returns: {
          created_at: string
          created_by: string | null
          customer_id: string
          delivery_date: string | null
          id: string
          note: string | null
          recurring_id: string | null
          round: Database["public"]["Enums"]["round_id"]
          source: Database["public"]["Enums"]["order_source"]
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_materialize_recurring_occurrence: {
        Args: { p_date: string; p_patch?: Json; p_recurring_id: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "customer" | "admin"
      doc_status: "pending" | "issued" | "error"
      doc_type: "delivery_note" | "invoice"
      order_source: "manual" | "recurring" | "admin"
      order_status: "draft" | "approved" | "completed" | "cancelled"
      recurring_status: "active" | "paused" | "cancelled"
      round_id: "morning" | "noon"
      unit_type: "unit" | "kg"
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
      app_role: ["customer", "admin"],
      doc_status: ["pending", "issued", "error"],
      doc_type: ["delivery_note", "invoice"],
      order_source: ["manual", "recurring", "admin"],
      order_status: ["draft", "approved", "completed", "cancelled"],
      recurring_status: ["active", "paused", "cancelled"],
      round_id: ["morning", "noon"],
      unit_type: ["unit", "kg"],
    },
  },
} as const

