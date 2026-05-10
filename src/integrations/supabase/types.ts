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
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_view"
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
      alerts: {
        Row: {
          client_code: string | null
          client_id: string | null
          client_name: string | null
          created_at: string
          dedupe_key: string | null
          id: string
          message: string | null
          metadata: Json | null
          read_at: string | null
          rep_user_id: string | null
          representative_id: string | null
          resolved_at: string | null
          severity: string
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          client_code?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          dedupe_key?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          read_at?: string | null
          rep_user_id?: string | null
          representative_id?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          client_code?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          dedupe_key?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          read_at?: string | null
          rep_user_id?: string | null
          representative_id?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          abc_class: string | null
          address: string | null
          animal_count: number | null
          animal_types: string | null
          business_potential: number | null
          category: string | null
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
          group_code: string | null
          group_name: string | null
          id: string
          import_source: string | null
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
          category?: string | null
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
          group_code?: string | null
          group_name?: string | null
          id?: string
          import_source?: string | null
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
          category?: string | null
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
          group_code?: string | null
          group_name?: string | null
          id?: string
          import_source?: string | null
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
      daily_reports: {
        Row: {
          calls_count: number
          created_at: string
          id: string
          observations: string | null
          orders_count: number
          proposals_count: number
          rep_user_id: string
          report_date: string
          representative_id: string | null
          submitted_at: string | null
          updated_at: string
          visits_count: number
        }
        Insert: {
          calls_count?: number
          created_at?: string
          id?: string
          observations?: string | null
          orders_count?: number
          proposals_count?: number
          rep_user_id?: string
          report_date?: string
          representative_id?: string | null
          submitted_at?: string | null
          updated_at?: string
          visits_count?: number
        }
        Update: {
          calls_count?: number
          created_at?: string
          id?: string
          observations?: string | null
          orders_count?: number
          proposals_count?: number
          rep_user_id?: string
          report_date?: string
          representative_id?: string | null
          submitted_at?: string | null
          updated_at?: string
          visits_count?: number
        }
        Relationships: []
      }
      goal_targets: {
        Row: {
          created_at: string
          id: string
          import_source: string | null
          line: string | null
          line_code: string | null
          month: number
          pct: number | null
          representative_code: string | null
          representative_id: string | null
          representative_name: string | null
          revenue_target: number | null
          solution: string | null
          solution_code: string | null
          subsolution: string | null
          subsolution_code: string | null
          total_year: number | null
          updated_at: string
          volume_target: number | null
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          import_source?: string | null
          line?: string | null
          line_code?: string | null
          month: number
          pct?: number | null
          representative_code?: string | null
          representative_id?: string | null
          representative_name?: string | null
          revenue_target?: number | null
          solution?: string | null
          solution_code?: string | null
          subsolution?: string | null
          subsolution_code?: string | null
          total_year?: number | null
          updated_at?: string
          volume_target?: number | null
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          import_source?: string | null
          line?: string | null
          line_code?: string | null
          month?: number
          pct?: number | null
          representative_code?: string | null
          representative_id?: string | null
          representative_name?: string | null
          revenue_target?: number | null
          solution?: string | null
          solution_code?: string | null
          subsolution?: string | null
          subsolution_code?: string | null
          total_year?: number | null
          updated_at?: string
          volume_target?: number | null
          year?: number
        }
        Relationships: []
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
      open_orders: {
        Row: {
          billing_real: string | null
          block_type: string | null
          branch_code: string | null
          category: string | null
          client_code: string | null
          client_id: string | null
          client_name: string | null
          created_at: string
          ddd: string | null
          delivery_real: string | null
          delivery_requested: string | null
          director: string | null
          driver: string | null
          driver_phone: string | null
          erc: string | null
          erc_code: string | null
          financial_block_reason: string | null
          forecast_billing_real: string | null
          forecast_billing_requested: string | null
          gev: string | null
          green_order: string | null
          grv: string | null
          id: string
          import_source: string | null
          is_vef: string | null
          line: string | null
          load_id: string | null
          oc: string | null
          order_inclusion_date: string | null
          order_number: string | null
          order_value: number | null
          order_volume: number | null
          pre_load: string | null
          prescription_block_reason: string | null
          product_code: string | null
          product_name: string | null
          representative_id: string | null
          segment: string | null
          snapshot_at: string
          status_tracking: string | null
          updated_at: string
        }
        Insert: {
          billing_real?: string | null
          block_type?: string | null
          branch_code?: string | null
          category?: string | null
          client_code?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          ddd?: string | null
          delivery_real?: string | null
          delivery_requested?: string | null
          director?: string | null
          driver?: string | null
          driver_phone?: string | null
          erc?: string | null
          erc_code?: string | null
          financial_block_reason?: string | null
          forecast_billing_real?: string | null
          forecast_billing_requested?: string | null
          gev?: string | null
          green_order?: string | null
          grv?: string | null
          id?: string
          import_source?: string | null
          is_vef?: string | null
          line?: string | null
          load_id?: string | null
          oc?: string | null
          order_inclusion_date?: string | null
          order_number?: string | null
          order_value?: number | null
          order_volume?: number | null
          pre_load?: string | null
          prescription_block_reason?: string | null
          product_code?: string | null
          product_name?: string | null
          representative_id?: string | null
          segment?: string | null
          snapshot_at?: string
          status_tracking?: string | null
          updated_at?: string
        }
        Update: {
          billing_real?: string | null
          block_type?: string | null
          branch_code?: string | null
          category?: string | null
          client_code?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          ddd?: string | null
          delivery_real?: string | null
          delivery_requested?: string | null
          director?: string | null
          driver?: string | null
          driver_phone?: string | null
          erc?: string | null
          erc_code?: string | null
          financial_block_reason?: string | null
          forecast_billing_real?: string | null
          forecast_billing_requested?: string | null
          gev?: string | null
          green_order?: string | null
          grv?: string | null
          id?: string
          import_source?: string | null
          is_vef?: string | null
          line?: string | null
          load_id?: string | null
          oc?: string | null
          order_inclusion_date?: string | null
          order_number?: string | null
          order_value?: number | null
          order_volume?: number | null
          pre_load?: string | null
          prescription_block_reason?: string | null
          product_code?: string | null
          product_name?: string | null
          representative_id?: string | null
          segment?: string | null
          snapshot_at?: string
          status_tracking?: string | null
          updated_at?: string
        }
        Relationships: []
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
            foreignKeyName: "opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_view"
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
      products: {
        Row: {
          active: boolean | null
          base_price: number | null
          created_at: string
          group_code: string | null
          id: string
          line: string | null
          name: string
          notes: string | null
          product_code: string | null
          product_group: string | null
          solution: string | null
          subsolution: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          base_price?: number | null
          created_at?: string
          group_code?: string | null
          id?: string
          line?: string | null
          name: string
          notes?: string | null
          product_code?: string | null
          product_group?: string | null
          solution?: string | null
          subsolution?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          base_price?: number | null
          created_at?: string
          group_code?: string | null
          id?: string
          line?: string | null
          name?: string
          notes?: string | null
          product_code?: string | null
          product_group?: string | null
          solution?: string | null
          subsolution?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
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
      quotes: {
        Row: {
          client_id: string | null
          client_name: string | null
          created_at: string
          id: string
          items: Json
          manager_response: string | null
          notes: string | null
          payment_terms: string | null
          rep_user_id: string
          representative_id: string | null
          responded_at: string | null
          status: string
          total: number | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          id?: string
          items?: Json
          manager_response?: string | null
          notes?: string | null
          payment_terms?: string | null
          rep_user_id?: string
          representative_id?: string | null
          responded_at?: string | null
          status?: string
          total?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          id?: string
          items?: Json
          manager_response?: string | null
          notes?: string | null
          payment_terms?: string | null
          rep_user_id?: string
          representative_id?: string | null
          responded_at?: string | null
          status?: string
          total?: number | null
          updated_at?: string
          valid_until?: string | null
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
          filial: string | null
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
          filial?: string | null
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
          filial?: string | null
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
      sales: {
        Row: {
          bonus: number | null
          branch: string | null
          branch_code: string | null
          category: string | null
          cfop: string | null
          city: string | null
          client_code: string | null
          client_group: string | null
          client_id: string | null
          client_name: string | null
          cofins_total: number | null
          commercial_expense: number | null
          commission_pct: number | null
          commission_value: number | null
          cost_total: number | null
          created_at: string
          currency: string | null
          customized: string | null
          discount_pct: number | null
          fl_vef: string | null
          freight: number | null
          gnv: string | null
          group_code: string | null
          grv: string | null
          icms_total: number | null
          id: string
          import_source: string | null
          invoice_date: string | null
          invoice_number: string | null
          line: string | null
          mb_cb_pct: number | null
          mb_cb_total: number | null
          ml_cb_pct: number | null
          ml_cb_total: number | null
          month_year: string | null
          operation_type: string | null
          order_date: string | null
          order_number: string | null
          pis_total: number | null
          pmr: number | null
          price_per_bag: number | null
          price_per_kg: number | null
          product_code: string | null
          product_group: string | null
          product_group_code: string | null
          product_name: string | null
          qty_bags: number | null
          region: string | null
          rep_code: string | null
          representative: string | null
          representative_id: string | null
          revenue: number | null
          revenue_no_charges: number | null
          segmentation: string | null
          solution: string | null
          state: string | null
          subsolution: string | null
          updated_at: string
          volume_converted: number | null
          volume_sales: number | null
          volume_sales_bonus: number | null
          year: number | null
        }
        Insert: {
          bonus?: number | null
          branch?: string | null
          branch_code?: string | null
          category?: string | null
          cfop?: string | null
          city?: string | null
          client_code?: string | null
          client_group?: string | null
          client_id?: string | null
          client_name?: string | null
          cofins_total?: number | null
          commercial_expense?: number | null
          commission_pct?: number | null
          commission_value?: number | null
          cost_total?: number | null
          created_at?: string
          currency?: string | null
          customized?: string | null
          discount_pct?: number | null
          fl_vef?: string | null
          freight?: number | null
          gnv?: string | null
          group_code?: string | null
          grv?: string | null
          icms_total?: number | null
          id?: string
          import_source?: string | null
          invoice_date?: string | null
          invoice_number?: string | null
          line?: string | null
          mb_cb_pct?: number | null
          mb_cb_total?: number | null
          ml_cb_pct?: number | null
          ml_cb_total?: number | null
          month_year?: string | null
          operation_type?: string | null
          order_date?: string | null
          order_number?: string | null
          pis_total?: number | null
          pmr?: number | null
          price_per_bag?: number | null
          price_per_kg?: number | null
          product_code?: string | null
          product_group?: string | null
          product_group_code?: string | null
          product_name?: string | null
          qty_bags?: number | null
          region?: string | null
          rep_code?: string | null
          representative?: string | null
          representative_id?: string | null
          revenue?: number | null
          revenue_no_charges?: number | null
          segmentation?: string | null
          solution?: string | null
          state?: string | null
          subsolution?: string | null
          updated_at?: string
          volume_converted?: number | null
          volume_sales?: number | null
          volume_sales_bonus?: number | null
          year?: number | null
        }
        Update: {
          bonus?: number | null
          branch?: string | null
          branch_code?: string | null
          category?: string | null
          cfop?: string | null
          city?: string | null
          client_code?: string | null
          client_group?: string | null
          client_id?: string | null
          client_name?: string | null
          cofins_total?: number | null
          commercial_expense?: number | null
          commission_pct?: number | null
          commission_value?: number | null
          cost_total?: number | null
          created_at?: string
          currency?: string | null
          customized?: string | null
          discount_pct?: number | null
          fl_vef?: string | null
          freight?: number | null
          gnv?: string | null
          group_code?: string | null
          grv?: string | null
          icms_total?: number | null
          id?: string
          import_source?: string | null
          invoice_date?: string | null
          invoice_number?: string | null
          line?: string | null
          mb_cb_pct?: number | null
          mb_cb_total?: number | null
          ml_cb_pct?: number | null
          ml_cb_total?: number | null
          month_year?: string | null
          operation_type?: string | null
          order_date?: string | null
          order_number?: string | null
          pis_total?: number | null
          pmr?: number | null
          price_per_bag?: number | null
          price_per_kg?: number | null
          product_code?: string | null
          product_group?: string | null
          product_group_code?: string | null
          product_name?: string | null
          qty_bags?: number | null
          region?: string | null
          rep_code?: string | null
          representative?: string | null
          representative_id?: string | null
          revenue?: number | null
          revenue_no_charges?: number | null
          segmentation?: string | null
          solution?: string | null
          state?: string | null
          subsolution?: string | null
          updated_at?: string
          volume_converted?: number | null
          volume_sales?: number | null
          volume_sales_bonus?: number | null
          year?: number | null
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
      clients_view: {
        Row: {
          abc_class: string | null
          address: string | null
          animal_count: number | null
          animal_types: string | null
          business_potential: number | null
          category: string | null
          city: string | null
          client_code: string | null
          cnpj: string | null
          computed_last_purchase_date: string | null
          computed_total_purchases: number | null
          consumed_products: string | null
          contact_name: string | null
          covered_municipalities: number | null
          created_at: string | null
          days_since_last_purchase: number | null
          effective_status: string | null
          email: string | null
          farming_system: string | null
          final_clients_count: number | null
          group_code: string | null
          group_name: string | null
          id: string | null
          last_purchase_date: string | null
          lat: number | null
          lng: number | null
          monthly_sales_volume: number | null
          name: string | null
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
          type: Database["public"]["Enums"]["client_type"] | null
          updated_at: string | null
          website: string | null
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
      sales_rep_view: {
        Row: {
          bonus: number | null
          branch: string | null
          branch_code: string | null
          category: string | null
          city: string | null
          client_code: string | null
          client_id: string | null
          client_name: string | null
          currency: string | null
          id: string | null
          invoice_date: string | null
          invoice_number: string | null
          line: string | null
          month_year: string | null
          order_date: string | null
          order_number: string | null
          price_per_bag: number | null
          price_per_kg: number | null
          product_code: string | null
          product_group: string | null
          product_group_code: string | null
          product_name: string | null
          qty_bags: number | null
          region: string | null
          rep_code: string | null
          representative: string | null
          representative_id: string | null
          revenue: number | null
          segmentation: string | null
          solution: string | null
          state: string | null
          subsolution: string | null
          volume_sales: number | null
          volume_sales_bonus: number | null
          year: number | null
        }
        Insert: {
          bonus?: number | null
          branch?: string | null
          branch_code?: string | null
          category?: string | null
          city?: string | null
          client_code?: string | null
          client_id?: string | null
          client_name?: string | null
          currency?: string | null
          id?: string | null
          invoice_date?: string | null
          invoice_number?: string | null
          line?: string | null
          month_year?: string | null
          order_date?: string | null
          order_number?: string | null
          price_per_bag?: number | null
          price_per_kg?: number | null
          product_code?: string | null
          product_group?: string | null
          product_group_code?: string | null
          product_name?: string | null
          qty_bags?: number | null
          region?: string | null
          rep_code?: string | null
          representative?: string | null
          representative_id?: string | null
          revenue?: number | null
          segmentation?: string | null
          solution?: string | null
          state?: string | null
          subsolution?: string | null
          volume_sales?: number | null
          volume_sales_bonus?: number | null
          year?: number | null
        }
        Update: {
          bonus?: number | null
          branch?: string | null
          branch_code?: string | null
          category?: string | null
          city?: string | null
          client_code?: string | null
          client_id?: string | null
          client_name?: string | null
          currency?: string | null
          id?: string | null
          invoice_date?: string | null
          invoice_number?: string | null
          line?: string | null
          month_year?: string | null
          order_date?: string | null
          order_number?: string | null
          price_per_bag?: number | null
          price_per_kg?: number | null
          product_code?: string | null
          product_group?: string | null
          product_group_code?: string | null
          product_name?: string | null
          qty_bags?: number | null
          region?: string | null
          rep_code?: string | null
          representative?: string | null
          representative_id?: string | null
          revenue?: number | null
          segmentation?: string | null
          solution?: string | null
          state?: string | null
          subsolution?: string | null
          volume_sales?: number | null
          volume_sales_bonus?: number | null
          year?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      current_rep_code: { Args: never; Returns: string }
      current_rep_id: { Args: never; Returns: string }
      generate_all_alerts: { Args: never; Returns: Json }
      generate_consumption_drop_alerts: { Args: never; Returns: number }
      generate_goal_at_risk_alerts: { Args: never; Returns: number }
      generate_inactive_client_alerts: { Args: never; Returns: number }
      generate_low_stock_alerts: { Args: never; Returns: number }
      generate_quote_expiring_alerts: { Args: never; Returns: number }
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
      app_role: "admin" | "manager" | "rep" | "user" | "representative"
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
      app_role: ["admin", "manager", "rep", "user", "representative"],
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
