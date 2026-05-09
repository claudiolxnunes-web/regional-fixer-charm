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
      activities: {
        Row: {
          client_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          duration: number | null
          id: string
          location: string | null
          opportunity_id: string | null
          outcome: string | null
          representative_id: string | null
          scheduled_at: string | null
          status: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: string
          location?: string | null
          opportunity_id?: string | null
          outcome?: string | null
          representative_id?: string | null
          scheduled_at?: string | null
          status?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: string
          location?: string | null
          opportunity_id?: string | null
          outcome?: string | null
          representative_id?: string | null
          scheduled_at?: string | null
          status?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "representatives"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          abc_class: string | null
          address: string | null
          animal_count: number | null
          animal_types: string | null
          business_potential: number | null
          city: string | null
          client_code: string | null
          cnpj: string | null
          consumed_products: string | null
          contact_name: string | null
          covered_municipalities: number | null
          created_at: string
          email: string | null
          farming_system: string | null
          final_clients_count: number | null
          id: string
          last_purchase_date: string | null
          lat: number | null
          lng: number | null
          monthly_sales_volume: number | null
          name: string
          notes: string | null
          phone: string | null
          product_lines: string | null
          product_mix: string | null
          production_capacity: number | null
          production_type: string | null
          property_area: number | null
          purchase_potential: number | null
          ration_types: string | null
          raw_material_volume: number | null
          region_id: string | null
          representative_id: string | null
          segment: string | null
          state: string | null
          status: Database["public"]["Enums"]["client_status"] | null
          total_purchases: number | null
          type: Database["public"]["Enums"]["client_type"]
          updated_at: string
          website: string | null
        }
        Insert: {
          abc_class?: string | null
          address?: string | null
          animal_count?: number | null
          animal_types?: string | null
          business_potential?: number | null
          city?: string | null
          client_code?: string | null
          cnpj?: string | null
          consumed_products?: string | null
          contact_name?: string | null
          covered_municipalities?: number | null
          created_at?: string
          email?: string | null
          farming_system?: string | null
          final_clients_count?: number | null
          id?: string
          last_purchase_date?: string | null
          lat?: number | null
          lng?: number | null
          monthly_sales_volume?: number | null
          name: string
          notes?: string | null
          phone?: string | null
          product_lines?: string | null
          product_mix?: string | null
          production_capacity?: number | null
          production_type?: string | null
          property_area?: number | null
          purchase_potential?: number | null
          ration_types?: string | null
          raw_material_volume?: number | null
          region_id?: string | null
          representative_id?: string | null
          segment?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["client_status"] | null
          total_purchases?: number | null
          type: Database["public"]["Enums"]["client_type"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          abc_class?: string | null
          address?: string | null
          animal_count?: number | null
          animal_types?: string | null
          business_potential?: number | null
          city?: string | null
          client_code?: string | null
          cnpj?: string | null
          consumed_products?: string | null
          contact_name?: string | null
          covered_municipalities?: number | null
          created_at?: string
          email?: string | null
          farming_system?: string | null
          final_clients_count?: number | null
          id?: string
          last_purchase_date?: string | null
          lat?: number | null
          lng?: number | null
          monthly_sales_volume?: number | null
          name?: string
          notes?: string | null
          phone?: string | null
          product_lines?: string | null
          product_mix?: string | null
          production_capacity?: number | null
          production_type?: string | null
          property_area?: number | null
          purchase_potential?: number | null
          ration_types?: string | null
          raw_material_volume?: number | null
          region_id?: string | null
          representative_id?: string | null
          segment?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["client_status"] | null
          total_purchases?: number | null
          type?: Database["public"]["Enums"]["client_type"]
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "representatives"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          current_value: number | null
          description: string | null
          id: string
          name: string | null
          period: string
          region_id: string | null
          representative_id: string | null
          status: string | null
          target_value: number
          type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_value?: number | null
          description?: string | null
          id?: string
          name?: string | null
          period: string
          region_id?: string | null
          representative_id?: string | null
          status?: string | null
          target_value: number
          type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_value?: number | null
          description?: string | null
          id?: string
          name?: string | null
          period?: string
          region_id?: string | null
          representative_id?: string | null
          status?: string | null
          target_value?: number
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "representatives"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          client_id: string | null
          created_at: string
          expected_close_date: string | null
          id: string
          lost_reason: string | null
          notes: string | null
          probability: number | null
          product: string | null
          region_id: string | null
          representative_id: string | null
          stage: Database["public"]["Enums"]["opp_stage"]
          title: string
          updated_at: string
          value: number
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          expected_close_date?: string | null
          id?: string
          lost_reason?: string | null
          notes?: string | null
          probability?: number | null
          product?: string | null
          region_id?: string | null
          representative_id?: string | null
          stage?: Database["public"]["Enums"]["opp_stage"]
          title: string
          updated_at?: string
          value?: number
        }
        Update: {
          client_id?: string | null
          created_at?: string
          expected_close_date?: string | null
          id?: string
          lost_reason?: string | null
          notes?: string | null
          probability?: number | null
          product?: string | null
          region_id?: string | null
          representative_id?: string | null
          stage?: Database["public"]["Enums"]["opp_stage"]
          title?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "representatives"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      regions: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      representatives: {
        Row: {
          company: string | null
          company_cnpj: string | null
          created_at: string
          email: string | null
          hire_date: string | null
          home_city: string | null
          home_state: string | null
          id: string
          name: string
          notes: string | null
          performance_score: number | null
          phone: string | null
          region_id: string | null
          rep_code: string | null
          status: string
          territory: string | null
          total_clients: number | null
          total_opportunities: number | null
          total_sales: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company?: string | null
          company_cnpj?: string | null
          created_at?: string
          email?: string | null
          hire_date?: string | null
          home_city?: string | null
          home_state?: string | null
          id?: string
          name: string
          notes?: string | null
          performance_score?: number | null
          phone?: string | null
          region_id?: string | null
          rep_code?: string | null
          status?: string
          territory?: string | null
          total_clients?: number | null
          total_opportunities?: number | null
          total_sales?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company?: string | null
          company_cnpj?: string | null
          created_at?: string
          email?: string | null
          hire_date?: string | null
          home_city?: string | null
          home_state?: string | null
          id?: string
          name?: string
          notes?: string | null
          performance_score?: number | null
          phone?: string | null
          region_id?: string | null
          rep_code?: string | null
          status?: string
          territory?: string | null
          total_clients?: number | null
          total_opportunities?: number | null
          total_sales?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "representatives_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
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
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "manager" | "rep" | "user"
      client_status: "active" | "inactive" | "prospect"
      client_type:
        | "fazenda_ruminantes"
        | "fabrica_racao"
        | "revenda_agropecuaria"
      opp_stage:
        | "prospecting"
        | "qualification"
        | "proposal"
        | "negotiation"
        | "won"
        | "lost"
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
      app_role: ["admin", "manager", "rep", "user"],
      client_status: ["active", "inactive", "prospect"],
      client_type: [
        "fazenda_ruminantes",
        "fabrica_racao",
        "revenda_agropecuaria",
      ],
      opp_stage: [
        "prospecting",
        "qualification",
        "proposal",
        "negotiation",
        "won",
        "lost",
      ],
    },
  },
} as const
