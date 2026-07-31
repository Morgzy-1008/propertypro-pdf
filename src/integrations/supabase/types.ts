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
      approved_staff: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      developers: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      facade_renders: {
        Row: {
          aspect: string
          created_at: string
          facade_name: string | null
          id: string
          source_url: string | null
          widened_url: string
        }
        Insert: {
          aspect?: string
          created_at?: string
          facade_name?: string | null
          id: string
          source_url?: string | null
          widened_url: string
        }
        Update: {
          aspect?: string
          created_at?: string
          facade_name?: string | null
          id?: string
          source_url?: string | null
          widened_url?: string
        }
        Relationships: []
      }
      land_lots: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          deadline: string | null
          developer: string
          developer_contact_email: string | null
          developer_contact_name: string | null
          developer_contact_phone: string | null
          estate: string
          exclusive_consultants: string[]
          frontage: number | null
          id: string
          land_price: number | null
          land_size: number | null
          lot_number: string | null
          notes: string | null
          registration_date: string | null
          status: Database["public"]["Enums"]["lot_status"]
          suburb: string
          titled: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          developer?: string
          developer_contact_email?: string | null
          developer_contact_name?: string | null
          developer_contact_phone?: string | null
          estate?: string
          exclusive_consultants?: string[]
          frontage?: number | null
          id?: string
          land_price?: number | null
          land_size?: number | null
          lot_number?: string | null
          notes?: string | null
          registration_date?: string | null
          status?: Database["public"]["Enums"]["lot_status"]
          suburb?: string
          titled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          developer?: string
          developer_contact_email?: string | null
          developer_contact_name?: string | null
          developer_contact_phone?: string | null
          estate?: string
          exclusive_consultants?: string[]
          frontage?: number | null
          id?: string
          land_price?: number | null
          land_size?: number | null
          lot_number?: string | null
          notes?: string | null
          registration_date?: string | null
          status?: Database["public"]["Enums"]["lot_status"]
          suburb?: string
          titled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      package_requests: {
        Row: {
          created_at: string
          created_by: string | null
          handled_by: string | null
          id: string
          lot_id: string | null
          note: string | null
          package_id: string | null
          requested_design: string | null
          requested_range: string | null
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          handled_by?: string | null
          id?: string
          lot_id?: string | null
          note?: string | null
          package_id?: string | null
          requested_design?: string | null
          requested_range?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          handled_by?: string | null
          id?: string
          lot_id?: string | null
          note?: string | null
          package_id?: string | null
          requested_design?: string | null
          requested_range?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_requests_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "land_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_requests_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          baths: string | null
          beds: string | null
          cars: string | null
          created_at: string
          created_by: string | null
          deadline: string | null
          design: string
          facade_id: string | null
          facade_name: string | null
          facade_uplift: number
          facade_url: string | null
          floorplan_size: string | null
          flyer_data: Json | null
          house_price: number | null
          housing_type: string
          id: string
          land_price: number | null
          lot_id: string | null
          name: string | null
          needs_review: boolean
          notes: string | null
          range_id: string
          status: Database["public"]["Enums"]["package_status"]
          total_price: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          baths?: string | null
          beds?: string | null
          cars?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          design?: string
          facade_id?: string | null
          facade_name?: string | null
          facade_uplift?: number
          facade_url?: string | null
          floorplan_size?: string | null
          flyer_data?: Json | null
          house_price?: number | null
          housing_type?: string
          id?: string
          land_price?: number | null
          lot_id?: string | null
          name?: string | null
          needs_review?: boolean
          notes?: string | null
          range_id?: string
          status?: Database["public"]["Enums"]["package_status"]
          total_price?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          baths?: string | null
          beds?: string | null
          cars?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          design?: string
          facade_id?: string | null
          facade_name?: string | null
          facade_uplift?: number
          facade_url?: string | null
          floorplan_size?: string | null
          flyer_data?: Json | null
          house_price?: number | null
          housing_type?: string
          id?: string
          land_price?: number | null
          lot_id?: string | null
          name?: string | null
          needs_review?: boolean
          notes?: string | null
          range_id?: string
          status?: Database["public"]["Enums"]["package_status"]
          total_price?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "packages_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "land_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
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
      lot_status: "available" | "on_hold" | "sold" | "nhc_exclusive"
      package_status: "draft" | "live" | "sold"
      request_status: "open" | "in_progress" | "done" | "declined"
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
      lot_status: ["available", "on_hold", "sold", "nhc_exclusive"],
      package_status: ["draft", "live", "sold"],
      request_status: ["open", "in_progress", "done", "declined"],
    },
  },
} as const
