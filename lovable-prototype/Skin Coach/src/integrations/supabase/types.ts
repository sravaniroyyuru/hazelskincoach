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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      checkins: {
        Row: {
          breakouts: string
          created_at: string
          derm_note: string | null
          id: string
          mood: string
          picking: string
          routine_followed: string
          skin_feel: string
          user_id: string
        }
        Insert: {
          breakouts: string
          created_at?: string
          derm_note?: string | null
          id?: string
          mood: string
          picking: string
          routine_followed: string
          skin_feel: string
          user_id: string
        }
        Update: {
          breakouts?: string
          created_at?: string
          derm_note?: string | null
          id?: string
          mood?: string
          picking?: string
          routine_followed?: string
          skin_feel?: string
          user_id?: string
        }
        Relationships: []
      }
      derm_notes: {
        Row: {
          context: string | null
          created_at: string
          id: string
          note: string
          user_id: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          id?: string
          note: string
          user_id: string
        }
        Update: {
          context?: string | null
          created_at?: string
          id?: string
          note?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          brand: string | null
          category: string | null
          created_at: string
          flags: string[] | null
          id: string
          key_ingredients: string[] | null
          name: string
          notes: string | null
          start_date: string | null
          status: string
          stop_date: string | null
          stop_reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brand?: string | null
          category?: string | null
          created_at?: string
          flags?: string[] | null
          id?: string
          key_ingredients?: string[] | null
          name: string
          notes?: string | null
          start_date?: string | null
          status?: string
          stop_date?: string | null
          stop_reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brand?: string | null
          category?: string | null
          created_at?: string
          flags?: string[] | null
          id?: string
          key_ingredients?: string[] | null
          name?: string
          notes?: string | null
          start_date?: string | null
          status?: string
          stop_date?: string | null
          stop_reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          concern_other: string | null
          concerns: string[] | null
          created_at: string
          display_name: string
          goal_other: string | null
          goals: string[] | null
          id: string
          routine_complexity: string | null
          skin_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          concern_other?: string | null
          concerns?: string[] | null
          created_at?: string
          display_name?: string
          goal_other?: string | null
          goals?: string[] | null
          id?: string
          routine_complexity?: string | null
          skin_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          concern_other?: string | null
          concerns?: string[] | null
          created_at?: string
          display_name?: string
          goal_other?: string | null
          goals?: string[] | null
          id?: string
          routine_complexity?: string | null
          skin_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      routine_steps: {
        Row: {
          created_at: string
          frequency: string
          id: string
          is_paused: boolean
          product_id: string | null
          sort_order: number
          step_name: string
          time_of_day: string
          updated_at: string
          usage_notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          frequency?: string
          id?: string
          is_paused?: boolean
          product_id?: string | null
          sort_order?: number
          step_name: string
          time_of_day: string
          updated_at?: string
          usage_notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          frequency?: string
          id?: string
          is_paused?: boolean
          product_id?: string | null
          sort_order?: number
          step_name?: string
          time_of_day?: string
          updated_at?: string
          usage_notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_steps_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
