export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      admin_activity_log: {
        Row: {
          action: string;
          admin_user_id: string | null;
          created_at: string;
          details: Json | null;
          id: string;
          ip_address: unknown;
          resource_id: string | null;
          resource_type: string;
          user_agent: string | null;
        };
        Insert: {
          action: string;
          admin_user_id?: string | null;
          created_at?: string;
          details?: Json | null;
          id?: string;
          ip_address?: unknown;
          resource_id?: string | null;
          resource_type: string;
          user_agent?: string | null;
        };
        Update: {
          action?: string;
          admin_user_id?: string | null;
          created_at?: string;
          details?: Json | null;
          id?: string;
          ip_address?: unknown;
          resource_id?: string | null;
          resource_type?: string;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "admin_activity_log_admin_user_id_fkey";
            columns: ["admin_user_id"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_activity_log_admin_user_id_fkey";
            columns: ["admin_user_id"];
            isOneToOne: false;
            referencedRelation: "admin_users_view";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_branch_access: {
        Row: {
          admin_user_id: string;
          branch_id: string | null;
          created_at: string;
          id: string;
          is_primary: boolean | null;
          role: string | null;
        };
        Insert: {
          admin_user_id: string;
          branch_id?: string | null;
          created_at?: string;
          id?: string;
          is_primary?: boolean | null;
          role?: string | null;
        };
        Update: {
          admin_user_id?: string;
          branch_id?: string | null;
          created_at?: string;
          id?: string;
          is_primary?: boolean | null;
          role?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "admin_branch_access_admin_user_id_fkey";
            columns: ["admin_user_id"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_branch_access_admin_user_id_fkey";
            columns: ["admin_user_id"];
            isOneToOne: false;
            referencedRelation: "admin_users_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_branch_access_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_notifications: {
        Row: {
          action_label: string | null;
          action_url: string | null;
          branch_id: string | null;
          created_at: string;
          created_by: string | null;
          created_by_system: boolean | null;
          expires_at: string | null;
          id: string;
          is_archived: boolean | null;
          is_read: boolean | null;
          message: string;
          metadata: Json | null;
          organization_id: string | null;
          priority:
            | Database["public"]["Enums"]["admin_notification_priority"]
            | null;
          read_at: string | null;
          related_entity_id: string | null;
          related_entity_type: string | null;
          target_admin_id: string | null;
          target_admin_role: string | null;
          title: string;
          type: Database["public"]["Enums"]["admin_notification_type"];
          updated_at: string;
        };
        Insert: {
          action_label?: string | null;
          action_url?: string | null;
          branch_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          created_by_system?: boolean | null;
          expires_at?: string | null;
          id?: string;
          is_archived?: boolean | null;
          is_read?: boolean | null;
          message: string;
          metadata?: Json | null;
          organization_id?: string | null;
          priority?:
            | Database["public"]["Enums"]["admin_notification_priority"]
            | null;
          read_at?: string | null;
          related_entity_id?: string | null;
          related_entity_type?: string | null;
          target_admin_id?: string | null;
          target_admin_role?: string | null;
          title: string;
          type: Database["public"]["Enums"]["admin_notification_type"];
          updated_at?: string;
        };
        Update: {
          action_label?: string | null;
          action_url?: string | null;
          branch_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          created_by_system?: boolean | null;
          expires_at?: string | null;
          id?: string;
          is_archived?: boolean | null;
          is_read?: boolean | null;
          message?: string;
          metadata?: Json | null;
          organization_id?: string | null;
          priority?:
            | Database["public"]["Enums"]["admin_notification_priority"]
            | null;
          read_at?: string | null;
          related_entity_id?: string | null;
          related_entity_type?: string | null;
          target_admin_id?: string | null;
          target_admin_role?: string | null;
          title?: string;
          type?: Database["public"]["Enums"]["admin_notification_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "admin_notifications_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_notifications_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_users: {
        Row: {
          created_at: string;
          created_by: string | null;
          email: string;
          id: string;
          is_active: boolean | null;
          last_login: string | null;
          organization_id: string | null;
          permissions: Json;
          role: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          email: string;
          id: string;
          is_active?: boolean | null;
          last_login?: string | null;
          organization_id?: string | null;
          permissions?: Json;
          role?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          email?: string;
          id?: string;
          is_active?: boolean | null;
          last_login?: string | null;
          organization_id?: string | null;
          permissions?: Json;
          role?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "admin_users_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_users_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "admin_users_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_users_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      agreement_customers: {
        Row: {
          agreement_id: string;
          created_at: string;
          customer_id: string;
          first_order_at: string;
          id: string;
          last_order_at: string;
          order_count: number;
          total_copago: number;
          total_institutional: number;
          updated_at: string;
        };
        Insert: {
          agreement_id: string;
          created_at?: string;
          customer_id: string;
          first_order_at: string;
          id?: string;
          last_order_at: string;
          order_count?: number;
          total_copago?: number;
          total_institutional?: number;
          updated_at?: string;
        };
        Update: {
          agreement_id?: string;
          created_at?: string;
          customer_id?: string;
          first_order_at?: string;
          id?: string;
          last_order_at?: string;
          order_count?: number;
          total_copago?: number;
          total_institutional?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agreement_customers_agreement_id_fkey";
            columns: ["agreement_id"];
            isOneToOne: false;
            referencedRelation: "agreements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agreement_customers_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      agreement_institutional_balances: {
        Row: {
          agreement_id: string;
          amount: number;
          created_at: string;
          id: string;
          invoice_id: string | null;
          order_id: string;
          paid_at: string | null;
          payment_reference: string | null;
          purchase_order_id: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          agreement_id: string;
          amount: number;
          created_at?: string;
          id?: string;
          invoice_id?: string | null;
          order_id: string;
          paid_at?: string | null;
          payment_reference?: string | null;
          purchase_order_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          agreement_id?: string;
          amount?: number;
          created_at?: string;
          id?: string;
          invoice_id?: string | null;
          order_id?: string;
          paid_at?: string | null;
          payment_reference?: string | null;
          purchase_order_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agreement_institutional_balances_agreement_id_fkey";
            columns: ["agreement_id"];
            isOneToOne: false;
            referencedRelation: "agreements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agreement_institutional_balances_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agreement_institutional_balances_purchase_order_id_fkey";
            columns: ["purchase_order_id"];
            isOneToOne: false;
            referencedRelation: "agreement_purchase_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_agreement_institutional_balances_invoice_id";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "agreement_institutional_invoices";
            referencedColumns: ["id"];
          },
        ];
      };
      agreement_institutional_invoice_balances: {
        Row: {
          amount: number;
          balance_id: string;
          id: string;
          invoice_id: string;
        };
        Insert: {
          amount: number;
          balance_id: string;
          id?: string;
          invoice_id: string;
        };
        Update: {
          amount?: number;
          balance_id?: string;
          id?: string;
          invoice_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agreement_institutional_invoice_balances_balance_id_fkey";
            columns: ["balance_id"];
            isOneToOne: true;
            referencedRelation: "agreement_institutional_balances";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agreement_institutional_invoice_balances_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "agreement_institutional_invoices";
            referencedColumns: ["id"];
          },
        ];
      };
      agreement_institutional_invoices: {
        Row: {
          agreement_id: string;
          branch_id: string;
          created_at: string;
          currency: string | null;
          document_type: string;
          emitted_at: string | null;
          emitted_by: string | null;
          folio: string;
          id: string;
          institution_name: string;
          institution_rut: string;
          organization_id: string;
          paid_at: string | null;
          payment_reference: string | null;
          pdf_url: string | null;
          period_from: string;
          period_to: string;
          sii_emission_date: string | null;
          sii_folio: string | null;
          sii_response_data: Json | null;
          sii_status: string | null;
          sii_track_id: string | null;
          status: string;
          subtotal: number;
          tax_amount: number;
          total_amount: number;
          updated_at: string;
        };
        Insert: {
          agreement_id: string;
          branch_id: string;
          created_at?: string;
          currency?: string | null;
          document_type?: string;
          emitted_at?: string | null;
          emitted_by?: string | null;
          folio: string;
          id?: string;
          institution_name: string;
          institution_rut: string;
          organization_id: string;
          paid_at?: string | null;
          payment_reference?: string | null;
          pdf_url?: string | null;
          period_from: string;
          period_to: string;
          sii_emission_date?: string | null;
          sii_folio?: string | null;
          sii_response_data?: Json | null;
          sii_status?: string | null;
          sii_track_id?: string | null;
          status?: string;
          subtotal: number;
          tax_amount?: number;
          total_amount: number;
          updated_at?: string;
        };
        Update: {
          agreement_id?: string;
          branch_id?: string;
          created_at?: string;
          currency?: string | null;
          document_type?: string;
          emitted_at?: string | null;
          emitted_by?: string | null;
          folio?: string;
          id?: string;
          institution_name?: string;
          institution_rut?: string;
          organization_id?: string;
          paid_at?: string | null;
          payment_reference?: string | null;
          pdf_url?: string | null;
          period_from?: string;
          period_to?: string;
          sii_emission_date?: string | null;
          sii_folio?: string | null;
          sii_response_data?: Json | null;
          sii_status?: string | null;
          sii_track_id?: string | null;
          status?: string;
          subtotal?: number;
          tax_amount?: number;
          total_amount?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agreement_institutional_invoices_agreement_id_fkey";
            columns: ["agreement_id"];
            isOneToOne: false;
            referencedRelation: "agreements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agreement_institutional_invoices_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agreement_institutional_invoices_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      agreement_purchase_orders: {
        Row: {
          agreement_id: string;
          created_at: string;
          id: string;
          issued_at: string | null;
          max_amount: number | null;
          notes: string | null;
          oc_number: string;
          status: string;
          updated_at: string;
          used_amount: number;
          valid_until: string | null;
        };
        Insert: {
          agreement_id: string;
          created_at?: string;
          id?: string;
          issued_at?: string | null;
          max_amount?: number | null;
          notes?: string | null;
          oc_number: string;
          status?: string;
          updated_at?: string;
          used_amount?: number;
          valid_until?: string | null;
        };
        Update: {
          agreement_id?: string;
          created_at?: string;
          id?: string;
          issued_at?: string | null;
          max_amount?: number | null;
          notes?: string | null;
          oc_number?: string;
          status?: string;
          updated_at?: string;
          used_amount?: number;
          valid_until?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "agreement_purchase_orders_agreement_id_fkey";
            columns: ["agreement_id"];
            isOneToOne: false;
            referencedRelation: "agreements";
            referencedColumns: ["id"];
          },
        ];
      };
      agreements: {
        Row: {
          agreement_type: string;
          billing_rules: Json | null;
          branch_id: string | null;
          created_at: string;
          created_by: string | null;
          discount_percent: number | null;
          id: string;
          institution_name: string;
          institution_rut: string;
          max_installments_by_product: Json | null;
          name: string;
          notes: string | null;
          organization_id: string;
          representative_email: string | null;
          representative_name: string | null;
          representative_phone: string | null;
          status: string;
          updated_at: string;
          updated_by: string | null;
          valid_from: string;
          valid_until: string | null;
        };
        Insert: {
          agreement_type: string;
          billing_rules?: Json | null;
          branch_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          discount_percent?: number | null;
          id?: string;
          institution_name: string;
          institution_rut: string;
          max_installments_by_product?: Json | null;
          name: string;
          notes?: string | null;
          organization_id: string;
          representative_email?: string | null;
          representative_name?: string | null;
          representative_phone?: string | null;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
          valid_from: string;
          valid_until?: string | null;
        };
        Update: {
          agreement_type?: string;
          billing_rules?: Json | null;
          branch_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          discount_percent?: number | null;
          id?: string;
          institution_name?: string;
          institution_rut?: string;
          max_installments_by_product?: Json | null;
          name?: string;
          notes?: string | null;
          organization_id?: string;
          representative_email?: string | null;
          representative_name?: string | null;
          representative_phone?: string | null;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
          valid_from?: string;
          valid_until?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "agreements_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agreements_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_insights: {
        Row: {
          action_label: string | null;
          action_url: string | null;
          created_at: string;
          feedback_comment: string | null;
          feedback_score: number | null;
          id: string;
          is_dismissed: boolean;
          message: string;
          metadata: Json | null;
          organization_id: string;
          priority: number;
          section: string;
          title: string;
          type: string;
          updated_at: string;
        };
        Insert: {
          action_label?: string | null;
          action_url?: string | null;
          created_at?: string;
          feedback_comment?: string | null;
          feedback_score?: number | null;
          id?: string;
          is_dismissed?: boolean;
          message: string;
          metadata?: Json | null;
          organization_id: string;
          priority?: number;
          section: string;
          title: string;
          type: string;
          updated_at?: string;
        };
        Update: {
          action_label?: string | null;
          action_url?: string | null;
          created_at?: string;
          feedback_comment?: string | null;
          feedback_score?: number | null;
          id?: string;
          is_dismissed?: boolean;
          message?: string;
          metadata?: Json | null;
          organization_id?: string;
          priority?: number;
          section?: string;
          title?: string;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_insights_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_usage_log: {
        Row: {
          completion_tokens: number;
          created_at: string;
          endpoint: string | null;
          id: string;
          model: string;
          organization_id: string;
          prompt_tokens: number;
          provider: string;
        };
        Insert: {
          completion_tokens?: number;
          created_at?: string;
          endpoint?: string | null;
          id?: string;
          model: string;
          organization_id: string;
          prompt_tokens?: number;
          provider: string;
        };
        Update: {
          completion_tokens?: number;
          created_at?: string;
          endpoint?: string | null;
          id?: string;
          model?: string;
          organization_id?: string;
          prompt_tokens?: number;
          provider?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_usage_log_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      appointments: {
        Row: {
          appointment_date: string;
          appointment_time: string;
          appointment_type: string | null;
          assigned_to: string | null;
          branch_id: string | null;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          completed_at: string | null;
          created_at: string | null;
          created_by: string | null;
          customer_id: string | null;
          duration_minutes: number | null;
          field_operation_id: string | null;
          follow_up_date: string | null;
          follow_up_required: boolean | null;
          guest_email: string | null;
          guest_first_name: string | null;
          guest_last_name: string | null;
          guest_phone: string | null;
          guest_rut: string | null;
          id: string;
          notes: string | null;
          order_id: string | null;
          organization_id: string | null;
          outcome: string | null;
          prescription_id: string | null;
          reason: string | null;
          reminder_sent: boolean | null;
          reminder_sent_at: string | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          appointment_date: string;
          appointment_time: string;
          appointment_type?: string | null;
          assigned_to?: string | null;
          branch_id?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          customer_id?: string | null;
          duration_minutes?: number | null;
          field_operation_id?: string | null;
          follow_up_date?: string | null;
          follow_up_required?: boolean | null;
          guest_email?: string | null;
          guest_first_name?: string | null;
          guest_last_name?: string | null;
          guest_phone?: string | null;
          guest_rut?: string | null;
          id?: string;
          notes?: string | null;
          order_id?: string | null;
          organization_id?: string | null;
          outcome?: string | null;
          prescription_id?: string | null;
          reason?: string | null;
          reminder_sent?: boolean | null;
          reminder_sent_at?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          appointment_date?: string;
          appointment_time?: string;
          appointment_type?: string | null;
          assigned_to?: string | null;
          branch_id?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          customer_id?: string | null;
          duration_minutes?: number | null;
          field_operation_id?: string | null;
          follow_up_date?: string | null;
          follow_up_required?: boolean | null;
          guest_email?: string | null;
          guest_first_name?: string | null;
          guest_last_name?: string | null;
          guest_phone?: string | null;
          guest_rut?: string | null;
          id?: string;
          notes?: string | null;
          order_id?: string | null;
          organization_id?: string | null;
          outcome?: string | null;
          prescription_id?: string | null;
          reason?: string | null;
          reminder_sent?: boolean | null;
          reminder_sent_at?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_field_operation_id_fkey";
            columns: ["field_operation_id"];
            isOneToOne: false;
            referencedRelation: "field_operations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_prescription_id_fkey";
            columns: ["prescription_id"];
            isOneToOne: false;
            referencedRelation: "prescriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      branches: {
        Row: {
          address_line_1: string | null;
          address_line_2: string | null;
          city: string | null;
          code: string;
          country: string | null;
          created_at: string;
          email: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          organization_id: string | null;
          phone: string | null;
          postal_code: string | null;
          settings: Json | null;
          state: string | null;
          updated_at: string;
        };
        Insert: {
          address_line_1?: string | null;
          address_line_2?: string | null;
          city?: string | null;
          code: string;
          country?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          organization_id?: string | null;
          phone?: string | null;
          postal_code?: string | null;
          settings?: Json | null;
          state?: string | null;
          updated_at?: string;
        };
        Update: {
          address_line_1?: string | null;
          address_line_2?: string | null;
          city?: string | null;
          code?: string;
          country?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          organization_id?: string | null;
          phone?: string | null;
          postal_code?: string | null;
          settings?: Json | null;
          state?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "branches_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      cart_items: {
        Row: {
          created_at: string;
          id: string;
          product_id: string;
          quantity: number;
          session_id: string | null;
          updated_at: string;
          user_id: string | null;
          variant_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          product_id: string;
          quantity: number;
          session_id?: string | null;
          updated_at?: string;
          user_id?: string | null;
          variant_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          product_id?: string;
          quantity?: number;
          session_id?: string | null;
          updated_at?: string;
          user_id?: string | null;
          variant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cart_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products_with_stock";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      cash_register_closures: {
        Row: {
          actual_cash: number | null;
          branch_id: string;
          card_machine_credit_total: number | null;
          card_machine_debit_total: number | null;
          card_machine_difference: number | null;
          cash_difference: number | null;
          cash_sales: number;
          closed_at: string;
          closed_by: string;
          closing_cash_amount: number | null;
          closure_date: string;
          confirmed_at: string | null;
          created_at: string;
          credit_card_sales: number;
          debit_card_sales: number;
          discrepancies: string | null;
          expected_cash: number;
          field_operation_id: string | null;
          id: string;
          installments_sales: number;
          notes: string | null;
          opened_at: string;
          opening_cash_amount: number;
          other_payment_sales: number;
          pos_session_id: string | null;
          status: string | null;
          total_discounts: number;
          total_sales: number;
          total_subtotal: number;
          total_tax: number;
          total_transactions: number;
          updated_at: string;
        };
        Insert: {
          actual_cash?: number | null;
          branch_id: string;
          card_machine_credit_total?: number | null;
          card_machine_debit_total?: number | null;
          card_machine_difference?: number | null;
          cash_difference?: number | null;
          cash_sales?: number;
          closed_at?: string;
          closed_by: string;
          closing_cash_amount?: number | null;
          closure_date?: string;
          confirmed_at?: string | null;
          created_at?: string;
          credit_card_sales?: number;
          debit_card_sales?: number;
          discrepancies?: string | null;
          expected_cash?: number;
          field_operation_id?: string | null;
          id?: string;
          installments_sales?: number;
          notes?: string | null;
          opened_at: string;
          opening_cash_amount?: number;
          other_payment_sales?: number;
          pos_session_id?: string | null;
          status?: string | null;
          total_discounts?: number;
          total_sales?: number;
          total_subtotal?: number;
          total_tax?: number;
          total_transactions?: number;
          updated_at?: string;
        };
        Update: {
          actual_cash?: number | null;
          branch_id?: string;
          card_machine_credit_total?: number | null;
          card_machine_debit_total?: number | null;
          card_machine_difference?: number | null;
          cash_difference?: number | null;
          cash_sales?: number;
          closed_at?: string;
          closed_by?: string;
          closing_cash_amount?: number | null;
          closure_date?: string;
          confirmed_at?: string | null;
          created_at?: string;
          credit_card_sales?: number;
          debit_card_sales?: number;
          discrepancies?: string | null;
          expected_cash?: number;
          field_operation_id?: string | null;
          id?: string;
          installments_sales?: number;
          notes?: string | null;
          opened_at?: string;
          opening_cash_amount?: number;
          other_payment_sales?: number;
          pos_session_id?: string | null;
          status?: string | null;
          total_discounts?: number;
          total_sales?: number;
          total_subtotal?: number;
          total_tax?: number;
          total_transactions?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cash_register_closures_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cash_register_closures_field_operation_id_fkey";
            columns: ["field_operation_id"];
            isOneToOne: false;
            referencedRelation: "field_operations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cash_register_closures_pos_session_id_fkey";
            columns: ["pos_session_id"];
            isOneToOne: false;
            referencedRelation: "pos_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          image_url: string | null;
          is_active: boolean | null;
          is_default: boolean | null;
          is_system: boolean;
          name: string;
          parent_id: string | null;
          slug: string;
          sort_order: number | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean | null;
          is_default?: boolean | null;
          is_system?: boolean;
          name: string;
          parent_id?: string | null;
          slug: string;
          sort_order?: number | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean | null;
          is_default?: boolean | null;
          is_system?: boolean;
          name?: string;
          parent_id?: string | null;
          slug?: string;
          sort_order?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_messages: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          metadata: Json | null;
          role: string;
          session_id: string;
          tool_calls: Json | null;
          tool_results: Json | null;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          metadata?: Json | null;
          role: string;
          session_id: string;
          tool_calls?: Json | null;
          tool_results?: Json | null;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          metadata?: Json | null;
          role?: string;
          session_id?: string;
          tool_calls?: Json | null;
          tool_results?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "chat_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_sessions: {
        Row: {
          config: Json | null;
          created_at: string;
          id: string;
          last_message_preview: string | null;
          message_count: number | null;
          metadata: Json | null;
          model: string;
          organization_id: string | null;
          provider: string;
          title: string | null;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          config?: Json | null;
          created_at?: string;
          id?: string;
          last_message_preview?: string | null;
          message_count?: number | null;
          metadata?: Json | null;
          model: string;
          organization_id?: string | null;
          provider: string;
          title?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          config?: Json | null;
          created_at?: string;
          id?: string;
          last_message_preview?: string | null;
          message_count?: number | null;
          metadata?: Json | null;
          model?: string;
          organization_id?: string | null;
          provider?: string;
          title?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chat_sessions_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_lens_encargos: {
        Row: {
          addition_od: number | null;
          addition_os: number | null;
          axis_od: number | null;
          axis_os: number | null;
          branch_id: string;
          contact_lens_family_id: string;
          created_at: string | null;
          customer_id: string | null;
          cylinder_od: number | null;
          cylinder_os: number | null;
          delivered_at: string | null;
          expected_delivery_date: string | null;
          id: string;
          notes: string | null;
          ordered_at: string | null;
          organization_id: string;
          quantity_od: number | null;
          quantity_os: number | null;
          received_at: string | null;
          requested_at: string | null;
          sphere_od: number | null;
          sphere_os: number | null;
          status: string;
          supplier_order_id: string | null;
          total_price: number | null;
          unit_price: number | null;
          updated_at: string | null;
        };
        Insert: {
          addition_od?: number | null;
          addition_os?: number | null;
          axis_od?: number | null;
          axis_os?: number | null;
          branch_id: string;
          contact_lens_family_id: string;
          created_at?: string | null;
          customer_id?: string | null;
          cylinder_od?: number | null;
          cylinder_os?: number | null;
          delivered_at?: string | null;
          expected_delivery_date?: string | null;
          id?: string;
          notes?: string | null;
          ordered_at?: string | null;
          organization_id: string;
          quantity_od?: number | null;
          quantity_os?: number | null;
          received_at?: string | null;
          requested_at?: string | null;
          sphere_od?: number | null;
          sphere_os?: number | null;
          status?: string;
          supplier_order_id?: string | null;
          total_price?: number | null;
          unit_price?: number | null;
          updated_at?: string | null;
        };
        Update: {
          addition_od?: number | null;
          addition_os?: number | null;
          axis_od?: number | null;
          axis_os?: number | null;
          branch_id?: string;
          contact_lens_family_id?: string;
          created_at?: string | null;
          customer_id?: string | null;
          cylinder_od?: number | null;
          cylinder_os?: number | null;
          delivered_at?: string | null;
          expected_delivery_date?: string | null;
          id?: string;
          notes?: string | null;
          ordered_at?: string | null;
          organization_id?: string;
          quantity_od?: number | null;
          quantity_os?: number | null;
          received_at?: string | null;
          requested_at?: string | null;
          sphere_od?: number | null;
          sphere_os?: number | null;
          status?: string;
          supplier_order_id?: string | null;
          total_price?: number | null;
          unit_price?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "contact_lens_encargos_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contact_lens_encargos_contact_lens_family_id_fkey";
            columns: ["contact_lens_family_id"];
            isOneToOne: false;
            referencedRelation: "contact_lens_families";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contact_lens_encargos_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contact_lens_encargos_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_lens_families: {
        Row: {
          base_curve: number | null;
          brand: string | null;
          category_id: string | null;
          created_at: string;
          description: string | null;
          diameter: number | null;
          id: string;
          is_active: boolean | null;
          material: string | null;
          modality: string;
          name: string;
          organization_id: string | null;
          packaging: string;
          updated_at: string;
          use_type: string;
        };
        Insert: {
          base_curve?: number | null;
          brand?: string | null;
          category_id?: string | null;
          created_at?: string;
          description?: string | null;
          diameter?: number | null;
          id?: string;
          is_active?: boolean | null;
          material?: string | null;
          modality: string;
          name: string;
          organization_id?: string | null;
          packaging: string;
          updated_at?: string;
          use_type: string;
        };
        Update: {
          base_curve?: number | null;
          brand?: string | null;
          category_id?: string | null;
          created_at?: string;
          description?: string | null;
          diameter?: number | null;
          id?: string;
          is_active?: boolean | null;
          material?: string | null;
          modality?: string;
          name?: string;
          organization_id?: string | null;
          packaging?: string;
          updated_at?: string;
          use_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contact_lens_families_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contact_lens_families_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_lens_inventory: {
        Row: {
          branch_id: string;
          contact_lens_family_id: string;
          created_at: string;
          cylinder_max: number | null;
          cylinder_min: number | null;
          id: string;
          is_active: boolean | null;
          min_stock_threshold: number | null;
          notes: string | null;
          quantity: number;
          sphere_max: number;
          sphere_min: number;
          updated_at: string;
        };
        Insert: {
          branch_id: string;
          contact_lens_family_id: string;
          created_at?: string;
          cylinder_max?: number | null;
          cylinder_min?: number | null;
          id?: string;
          is_active?: boolean | null;
          min_stock_threshold?: number | null;
          notes?: string | null;
          quantity?: number;
          sphere_max: number;
          sphere_min: number;
          updated_at?: string;
        };
        Update: {
          branch_id?: string;
          contact_lens_family_id?: string;
          created_at?: string;
          cylinder_max?: number | null;
          cylinder_min?: number | null;
          id?: string;
          is_active?: boolean | null;
          min_stock_threshold?: number | null;
          notes?: string | null;
          quantity?: number;
          sphere_max?: number;
          sphere_min?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contact_lens_inventory_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contact_lens_inventory_contact_lens_family_id_fkey";
            columns: ["contact_lens_family_id"];
            isOneToOne: false;
            referencedRelation: "contact_lens_families";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_lens_price_matrices: {
        Row: {
          addition_max: number | null;
          addition_min: number | null;
          axis_max: number | null;
          axis_min: number | null;
          base_price: number;
          contact_lens_family_id: string;
          cost: number;
          created_at: string;
          cylinder_max: number | null;
          cylinder_min: number | null;
          id: string;
          is_active: boolean | null;
          name: string | null;
          organization_id: string | null;
          sphere_max: number;
          sphere_min: number;
          updated_at: string;
        };
        Insert: {
          addition_max?: number | null;
          addition_min?: number | null;
          axis_max?: number | null;
          axis_min?: number | null;
          base_price: number;
          contact_lens_family_id: string;
          cost: number;
          created_at?: string;
          cylinder_max?: number | null;
          cylinder_min?: number | null;
          id?: string;
          is_active?: boolean | null;
          name?: string | null;
          organization_id?: string | null;
          sphere_max: number;
          sphere_min: number;
          updated_at?: string;
        };
        Update: {
          addition_max?: number | null;
          addition_min?: number | null;
          axis_max?: number | null;
          axis_min?: number | null;
          base_price?: number;
          contact_lens_family_id?: string;
          cost?: number;
          created_at?: string;
          cylinder_max?: number | null;
          cylinder_min?: number | null;
          id?: string;
          is_active?: boolean | null;
          name?: string | null;
          organization_id?: string | null;
          sphere_max?: number;
          sphere_min?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contact_lens_price_matrices_contact_lens_family_id_fkey";
            columns: ["contact_lens_family_id"];
            isOneToOne: false;
            referencedRelation: "contact_lens_families";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contact_lens_price_matrices_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      credit_note_movements: {
        Row: {
          amount: number;
          created_at: string;
          credit_note_id: string;
          id: string;
          pos_session_id: string | null;
          refund_method: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          credit_note_id: string;
          id?: string;
          pos_session_id?: string | null;
          refund_method: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          credit_note_id?: string;
          id?: string;
          pos_session_id?: string | null;
          refund_method?: string;
        };
        Relationships: [
          {
            foreignKeyName: "credit_note_movements_credit_note_id_fkey";
            columns: ["credit_note_id"];
            isOneToOne: false;
            referencedRelation: "credit_notes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "credit_note_movements_pos_session_id_fkey";
            columns: ["pos_session_id"];
            isOneToOne: false;
            referencedRelation: "pos_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      credit_notes: {
        Row: {
          amount: number;
          branch_id: string | null;
          created_at: string;
          created_by: string | null;
          credit_note_number: string;
          id: string;
          order_id: string | null;
          organization_id: string | null;
          pos_session_id: string | null;
          reason: string | null;
          refund_method: string;
          updated_at: string;
        };
        Insert: {
          amount: number;
          branch_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          credit_note_number: string;
          id?: string;
          order_id?: string | null;
          organization_id?: string | null;
          pos_session_id?: string | null;
          reason?: string | null;
          refund_method: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          branch_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          credit_note_number?: string;
          id?: string;
          order_id?: string | null;
          organization_id?: string | null;
          pos_session_id?: string | null;
          reason?: string | null;
          refund_method?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "credit_notes_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "credit_notes_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "credit_notes_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "credit_notes_pos_session_id_fkey";
            columns: ["pos_session_id"];
            isOneToOne: false;
            referencedRelation: "pos_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_lens_purchases: {
        Row: {
          coatings: string[] | null;
          created_at: string | null;
          customer_id: string;
          delivery_date: string | null;
          frame_brand: string | null;
          frame_color: string | null;
          frame_model: string | null;
          frame_size: string | null;
          id: string;
          lens_index: number | null;
          lens_material: string | null;
          lens_type: string | null;
          notes: string | null;
          order_id: string | null;
          prescription_id: string | null;
          prescription_used: Json | null;
          product_id: string | null;
          product_name: string;
          product_type: string | null;
          purchase_date: string;
          quantity: number | null;
          status: string | null;
          tint: string | null;
          total_price: number;
          unit_price: number;
          updated_at: string | null;
          warranty_details: string | null;
          warranty_end_date: string | null;
          warranty_start_date: string | null;
        };
        Insert: {
          coatings?: string[] | null;
          created_at?: string | null;
          customer_id: string;
          delivery_date?: string | null;
          frame_brand?: string | null;
          frame_color?: string | null;
          frame_model?: string | null;
          frame_size?: string | null;
          id?: string;
          lens_index?: number | null;
          lens_material?: string | null;
          lens_type?: string | null;
          notes?: string | null;
          order_id?: string | null;
          prescription_id?: string | null;
          prescription_used?: Json | null;
          product_id?: string | null;
          product_name: string;
          product_type?: string | null;
          purchase_date?: string;
          quantity?: number | null;
          status?: string | null;
          tint?: string | null;
          total_price: number;
          unit_price: number;
          updated_at?: string | null;
          warranty_details?: string | null;
          warranty_end_date?: string | null;
          warranty_start_date?: string | null;
        };
        Update: {
          coatings?: string[] | null;
          created_at?: string | null;
          customer_id?: string;
          delivery_date?: string | null;
          frame_brand?: string | null;
          frame_color?: string | null;
          frame_model?: string | null;
          frame_size?: string | null;
          id?: string;
          lens_index?: number | null;
          lens_material?: string | null;
          lens_type?: string | null;
          notes?: string | null;
          order_id?: string | null;
          prescription_id?: string | null;
          prescription_used?: Json | null;
          product_id?: string | null;
          product_name?: string;
          product_type?: string | null;
          purchase_date?: string;
          quantity?: number | null;
          status?: string | null;
          tint?: string | null;
          total_price?: number;
          unit_price?: number;
          updated_at?: string | null;
          warranty_details?: string | null;
          warranty_end_date?: string | null;
          warranty_start_date?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customer_lens_purchases_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_lens_purchases_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_lens_purchases_prescription_id_fkey";
            columns: ["prescription_id"];
            isOneToOne: false;
            referencedRelation: "prescriptions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_lens_purchases_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_lens_purchases_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products_with_stock";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_satisfaction_surveys: {
        Row: {
          comment: string | null;
          created_at: string;
          customer_id: string | null;
          id: string;
          organization_id: string;
          score: number;
          token_used: string;
          work_order_id: string | null;
        };
        Insert: {
          comment?: string | null;
          created_at?: string;
          customer_id?: string | null;
          id?: string;
          organization_id: string;
          score: number;
          token_used: string;
          work_order_id?: string | null;
        };
        Update: {
          comment?: string | null;
          created_at?: string;
          customer_id?: string | null;
          id?: string;
          organization_id?: string;
          score?: number;
          token_used?: string;
          work_order_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customer_satisfaction_surveys_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_satisfaction_surveys_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_satisfaction_surveys_work_order_id_fkey";
            columns: ["work_order_id"];
            isOneToOne: false;
            referencedRelation: "lab_work_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          address_line_1: string | null;
          address_line_2: string | null;
          allergies: string[] | null;
          branch_id: string;
          city: string | null;
          country: string | null;
          created_at: string;
          created_by: string | null;
          date_of_birth: string | null;
          email: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          field_operation_id: string | null;
          first_name: string;
          gender: string | null;
          id: string;
          insurance_policy_number: string | null;
          insurance_provider: string | null;
          is_active: boolean | null;
          last_eye_exam_date: string | null;
          last_name: string;
          medical_conditions: string[] | null;
          medical_notes: string | null;
          medications: string[] | null;
          next_eye_exam_due: string | null;
          notes: string | null;
          organization_id: string | null;
          phone: string | null;
          postal_code: string | null;
          preferred_contact_method: string | null;
          rut: string | null;
          state: string | null;
          tags: string[] | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          address_line_1?: string | null;
          address_line_2?: string | null;
          allergies?: string[] | null;
          branch_id: string;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          created_by?: string | null;
          date_of_birth?: string | null;
          email?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          field_operation_id?: string | null;
          first_name: string;
          gender?: string | null;
          id?: string;
          insurance_policy_number?: string | null;
          insurance_provider?: string | null;
          is_active?: boolean | null;
          last_eye_exam_date?: string | null;
          last_name: string;
          medical_conditions?: string[] | null;
          medical_notes?: string | null;
          medications?: string[] | null;
          next_eye_exam_due?: string | null;
          notes?: string | null;
          organization_id?: string | null;
          phone?: string | null;
          postal_code?: string | null;
          preferred_contact_method?: string | null;
          rut?: string | null;
          state?: string | null;
          tags?: string[] | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          address_line_1?: string | null;
          address_line_2?: string | null;
          allergies?: string[] | null;
          branch_id?: string;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          created_by?: string | null;
          date_of_birth?: string | null;
          email?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          field_operation_id?: string | null;
          first_name?: string;
          gender?: string | null;
          id?: string;
          insurance_policy_number?: string | null;
          insurance_provider?: string | null;
          is_active?: boolean | null;
          last_eye_exam_date?: string | null;
          last_name?: string;
          medical_conditions?: string[] | null;
          medical_notes?: string | null;
          medications?: string[] | null;
          next_eye_exam_due?: string | null;
          notes?: string | null;
          organization_id?: string | null;
          phone?: string | null;
          postal_code?: string | null;
          preferred_contact_method?: string | null;
          rut?: string | null;
          state?: string | null;
          tags?: string[] | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customers_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customers_field_operation_id_fkey";
            columns: ["field_operation_id"];
            isOneToOne: false;
            referencedRelation: "field_operations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customers_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      demo_requests: {
        Row: {
          conversion_date: string | null;
          created_at: string | null;
          demo_expires_at: string | null;
          demo_started_at: string | null;
          email: string;
          full_name: string | null;
          funnel_stage: string | null;
          id: string;
          last_contact_at: string | null;
          last_email_sent: string | null;
          last_email_sent_at: string | null;
          last_login_at: string | null;
          login_count: number | null;
          lost_reason: string | null;
          meeting_completed_at: string | null;
          meeting_scheduled_at: string | null;
          meeting_url: string | null;
          metadata: Json | null;
          notes: string | null;
          offer_details: Json | null;
          offer_sent_at: string | null;
          offer_type: string | null;
          optica_name: string | null;
          organization_id: string | null;
          phone: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          source: string | null;
          status: string | null;
        };
        Insert: {
          conversion_date?: string | null;
          created_at?: string | null;
          demo_expires_at?: string | null;
          demo_started_at?: string | null;
          email: string;
          full_name?: string | null;
          funnel_stage?: string | null;
          id?: string;
          last_contact_at?: string | null;
          last_email_sent?: string | null;
          last_email_sent_at?: string | null;
          last_login_at?: string | null;
          login_count?: number | null;
          lost_reason?: string | null;
          meeting_completed_at?: string | null;
          meeting_scheduled_at?: string | null;
          meeting_url?: string | null;
          metadata?: Json | null;
          notes?: string | null;
          offer_details?: Json | null;
          offer_sent_at?: string | null;
          offer_type?: string | null;
          optica_name?: string | null;
          organization_id?: string | null;
          phone?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          source?: string | null;
          status?: string | null;
        };
        Update: {
          conversion_date?: string | null;
          created_at?: string | null;
          demo_expires_at?: string | null;
          demo_started_at?: string | null;
          email?: string;
          full_name?: string | null;
          funnel_stage?: string | null;
          id?: string;
          last_contact_at?: string | null;
          last_email_sent?: string | null;
          last_email_sent_at?: string | null;
          last_login_at?: string | null;
          login_count?: number | null;
          lost_reason?: string | null;
          meeting_completed_at?: string | null;
          meeting_scheduled_at?: string | null;
          meeting_url?: string | null;
          metadata?: Json | null;
          notes?: string | null;
          offer_details?: Json | null;
          offer_sent_at?: string | null;
          offer_type?: string | null;
          optica_name?: string | null;
          organization_id?: string | null;
          phone?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          source?: string | null;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "demo_requests_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      drivers: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          is_active: boolean | null;
          license_number: string;
          name: string;
          organization_id: string;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id?: string;
          is_active?: boolean | null;
          license_number: string;
          name: string;
          organization_id: string;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          is_active?: boolean | null;
          license_number?: string;
          name?: string;
          organization_id?: string;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "drivers_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      email_send_events: {
        Row: {
          created_at: string;
          email_id: string;
          event_type: string;
          id: string;
          metadata: Json | null;
          recipient: string | null;
          subject: string | null;
          template_id: string | null;
        };
        Insert: {
          created_at?: string;
          email_id: string;
          event_type: string;
          id?: string;
          metadata?: Json | null;
          recipient?: string | null;
          subject?: string | null;
          template_id?: string | null;
        };
        Update: {
          created_at?: string;
          email_id?: string;
          event_type?: string;
          id?: string;
          metadata?: Json | null;
          recipient?: string | null;
          subject?: string | null;
          template_id?: string | null;
        };
        Relationships: [];
      };
      embeddings: {
        Row: {
          content: string;
          created_at: string;
          embedding: string | null;
          embedding_provider: string;
          embedding_small: string | null;
          id: string;
          metadata: Json | null;
          source_id: string;
          source_type: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          content: string;
          created_at?: string;
          embedding?: string | null;
          embedding_provider: string;
          embedding_small?: string | null;
          id?: string;
          metadata?: Json | null;
          source_id: string;
          source_type: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          content?: string;
          created_at?: string;
          embedding?: string | null;
          embedding_provider?: string;
          embedding_small?: string | null;
          id?: string;
          metadata?: Json | null;
          source_id?: string;
          source_type?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      field_operations: {
        Row: {
          branch_id: string;
          created_at: string | null;
          created_by: string | null;
          id: string;
          location: string | null;
          name: string;
          organization_id: string;
          scheduled_date: string;
          status: string;
          updated_at: string | null;
        };
        Insert: {
          branch_id: string;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          location?: string | null;
          name: string;
          organization_id: string;
          scheduled_date: string;
          status?: string;
          updated_at?: string | null;
        };
        Update: {
          branch_id?: string;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          location?: string | null;
          name?: string;
          organization_id?: string;
          scheduled_date?: string;
          status?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "field_operations_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "field_operations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      internal_order_items: {
        Row: {
          created_at: string;
          id: string;
          internal_order_id: string;
          notes: string | null;
          product_id: string;
          quantity: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          internal_order_id: string;
          notes?: string | null;
          product_id: string;
          quantity: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          internal_order_id?: string;
          notes?: string | null;
          product_id?: string;
          quantity?: number;
        };
        Relationships: [
          {
            foreignKeyName: "internal_order_items_internal_order_id_fkey";
            columns: ["internal_order_id"];
            isOneToOne: false;
            referencedRelation: "internal_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "internal_order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "internal_order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products_with_stock";
            referencedColumns: ["id"];
          },
        ];
      };
      internal_order_status_history: {
        Row: {
          changed_by: string;
          created_at: string;
          id: string;
          internal_order_id: string;
          notes: string | null;
          status: string;
        };
        Insert: {
          changed_by: string;
          created_at?: string;
          id?: string;
          internal_order_id: string;
          notes?: string | null;
          status: string;
        };
        Update: {
          changed_by?: string;
          created_at?: string;
          id?: string;
          internal_order_id?: string;
          notes?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "internal_order_status_history_changed_by_fkey";
            columns: ["changed_by"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "internal_order_status_history_changed_by_fkey";
            columns: ["changed_by"];
            isOneToOne: false;
            referencedRelation: "admin_users_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "internal_order_status_history_internal_order_id_fkey";
            columns: ["internal_order_id"];
            isOneToOne: false;
            referencedRelation: "internal_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      internal_orders: {
        Row: {
          actual_delivery_date: string | null;
          assigned_driver_id: string | null;
          assigned_vehicle_id: string | null;
          created_at: string;
          created_by: string;
          destination_branch_id: string;
          id: string;
          notes: string | null;
          order_number: string;
          organization_id: string;
          origin_branch_id: string;
          priority: string | null;
          scheduled_date: string | null;
          status: string | null;
          updated_at: string;
        };
        Insert: {
          actual_delivery_date?: string | null;
          assigned_driver_id?: string | null;
          assigned_vehicle_id?: string | null;
          created_at?: string;
          created_by: string;
          destination_branch_id: string;
          id?: string;
          notes?: string | null;
          order_number: string;
          organization_id: string;
          origin_branch_id: string;
          priority?: string | null;
          scheduled_date?: string | null;
          status?: string | null;
          updated_at?: string;
        };
        Update: {
          actual_delivery_date?: string | null;
          assigned_driver_id?: string | null;
          assigned_vehicle_id?: string | null;
          created_at?: string;
          created_by?: string;
          destination_branch_id?: string;
          id?: string;
          notes?: string | null;
          order_number?: string;
          organization_id?: string;
          origin_branch_id?: string;
          priority?: string | null;
          scheduled_date?: string | null;
          status?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "internal_orders_assigned_driver_id_fkey";
            columns: ["assigned_driver_id"];
            isOneToOne: false;
            referencedRelation: "drivers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "internal_orders_assigned_vehicle_id_fkey";
            columns: ["assigned_vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "internal_orders_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "internal_orders_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "admin_users_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "internal_orders_destination_branch_id_fkey";
            columns: ["destination_branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "internal_orders_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "internal_orders_origin_branch_id_fkey";
            columns: ["origin_branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_movements: {
        Row: {
          branch_id: string;
          created_at: string | null;
          created_by: string | null;
          id: string;
          movement_type: string;
          product_id: string;
          quantity_change: number;
          reference_id: string | null;
          reference_type: string | null;
        };
        Insert: {
          branch_id: string;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          movement_type: string;
          product_id: string;
          quantity_change: number;
          reference_id?: string | null;
          reference_type?: string | null;
        };
        Update: {
          branch_id?: string;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          movement_type?: string;
          product_id?: string;
          quantity_change?: number;
          reference_id?: string | null;
          reference_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_movements_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products_with_stock";
            referencedColumns: ["id"];
          },
        ];
      };
      lab_work_order_status_history: {
        Row: {
          changed_at: string | null;
          changed_by: string | null;
          created_at: string | null;
          from_status: string | null;
          id: string;
          notes: string | null;
          to_status: string;
          work_order_id: string;
        };
        Insert: {
          changed_at?: string | null;
          changed_by?: string | null;
          created_at?: string | null;
          from_status?: string | null;
          id?: string;
          notes?: string | null;
          to_status: string;
          work_order_id: string;
        };
        Update: {
          changed_at?: string | null;
          changed_by?: string | null;
          created_at?: string | null;
          from_status?: string | null;
          id?: string;
          notes?: string | null;
          to_status?: string;
          work_order_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lab_work_order_status_history_work_order_id_fkey";
            columns: ["work_order_id"];
            isOneToOne: false;
            referencedRelation: "lab_work_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      lab_work_orders: {
        Row: {
          agreement_id: string | null;
          assigned_to: string | null;
          balance_amount: number | null;
          branch_id: string | null;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          contact_lens_cost: number | null;
          contact_lens_family_id: string | null;
          contact_lens_quantity: number | null;
          contact_lens_rx_add_od: number | null;
          contact_lens_rx_add_os: number | null;
          contact_lens_rx_axis_od: number | null;
          contact_lens_rx_axis_os: number | null;
          contact_lens_rx_base_curve_od: number | null;
          contact_lens_rx_base_curve_os: number | null;
          contact_lens_rx_cylinder_od: number | null;
          contact_lens_rx_cylinder_os: number | null;
          contact_lens_rx_diameter_od: number | null;
          contact_lens_rx_diameter_os: number | null;
          contact_lens_rx_sphere_od: number | null;
          contact_lens_rx_sphere_os: number | null;
          created_at: string | null;
          created_by: string | null;
          currency: string | null;
          customer_id: string;
          customer_notes: string | null;
          customer_own_frame: boolean;
          customer_own_near_frame: boolean | null;
          delivered_at: string | null;
          deposit_amount: number | null;
          discount_amount: number | null;
          far_lens_cost: number | null;
          far_lens_family_id: string | null;
          field_operation_id: string | null;
          frame_brand: string | null;
          frame_color: string | null;
          frame_cost: number | null;
          frame_model: string | null;
          frame_name: string;
          frame_product_id: string | null;
          frame_serial_number: string | null;
          frame_size: string | null;
          frame_sku: string | null;
          id: string;
          internal_notes: string | null;
          lab_completed_at: string | null;
          lab_contact: string | null;
          lab_contact_person: string | null;
          lab_cost: number | null;
          lab_estimated_delivery_date: string | null;
          lab_name: string | null;
          lab_notes: string | null;
          lab_order_number: string | null;
          lab_started_at: string | null;
          labor_cost: number | null;
          lens_cost: number | null;
          lens_family_id: string | null;
          lens_index: number | null;
          lens_material: string;
          lens_sourcing_type: string | null;
          lens_tint_color: string | null;
          lens_tint_percentage: number | null;
          lens_treatments: string[];
          lens_type: string;
          mounted_at: string | null;
          near_frame_brand: string | null;
          near_frame_color: string | null;
          near_frame_cost: number | null;
          near_frame_model: string | null;
          near_frame_name: string | null;
          near_frame_price: number | null;
          near_frame_price_includes_tax: boolean | null;
          near_frame_product_id: string | null;
          near_frame_size: string | null;
          near_frame_sku: string | null;
          near_lens_cost: number | null;
          near_lens_family_id: string | null;
          operativo_batch_id: string | null;
          operativo_delivered_at: string | null;
          operativo_recipient_name: string | null;
          ordered_at: string | null;
          organization_id: string | null;
          payment_method: string | null;
          payment_status: string | null;
          pos_order_id: string | null;
          presbyopia_solution: string | null;
          prescription_id: string | null;
          prescription_snapshot: Json | null;
          quality_checked_at: string | null;
          quality_notes: string | null;
          quote_id: string | null;
          ready_at: string | null;
          received_from_lab_at: string | null;
          sent_to_lab_at: string | null;
          status: string | null;
          subtotal: number | null;
          tax_amount: number | null;
          total_amount: number;
          treatments_cost: number | null;
          updated_at: string | null;
          warranty_details: string | null;
          warranty_end_date: string | null;
          warranty_start_date: string | null;
          work_order_date: string;
          work_order_number: string;
        };
        Insert: {
          agreement_id?: string | null;
          assigned_to?: string | null;
          balance_amount?: number | null;
          branch_id?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          contact_lens_cost?: number | null;
          contact_lens_family_id?: string | null;
          contact_lens_quantity?: number | null;
          contact_lens_rx_add_od?: number | null;
          contact_lens_rx_add_os?: number | null;
          contact_lens_rx_axis_od?: number | null;
          contact_lens_rx_axis_os?: number | null;
          contact_lens_rx_base_curve_od?: number | null;
          contact_lens_rx_base_curve_os?: number | null;
          contact_lens_rx_cylinder_od?: number | null;
          contact_lens_rx_cylinder_os?: number | null;
          contact_lens_rx_diameter_od?: number | null;
          contact_lens_rx_diameter_os?: number | null;
          contact_lens_rx_sphere_od?: number | null;
          contact_lens_rx_sphere_os?: number | null;
          created_at?: string | null;
          created_by?: string | null;
          currency?: string | null;
          customer_id: string;
          customer_notes?: string | null;
          customer_own_frame?: boolean;
          customer_own_near_frame?: boolean | null;
          delivered_at?: string | null;
          deposit_amount?: number | null;
          discount_amount?: number | null;
          far_lens_cost?: number | null;
          far_lens_family_id?: string | null;
          field_operation_id?: string | null;
          frame_brand?: string | null;
          frame_color?: string | null;
          frame_cost?: number | null;
          frame_model?: string | null;
          frame_name: string;
          frame_product_id?: string | null;
          frame_serial_number?: string | null;
          frame_size?: string | null;
          frame_sku?: string | null;
          id?: string;
          internal_notes?: string | null;
          lab_completed_at?: string | null;
          lab_contact?: string | null;
          lab_contact_person?: string | null;
          lab_cost?: number | null;
          lab_estimated_delivery_date?: string | null;
          lab_name?: string | null;
          lab_notes?: string | null;
          lab_order_number?: string | null;
          lab_started_at?: string | null;
          labor_cost?: number | null;
          lens_cost?: number | null;
          lens_family_id?: string | null;
          lens_index?: number | null;
          lens_material: string;
          lens_sourcing_type?: string | null;
          lens_tint_color?: string | null;
          lens_tint_percentage?: number | null;
          lens_treatments?: string[];
          lens_type: string;
          mounted_at?: string | null;
          near_frame_brand?: string | null;
          near_frame_color?: string | null;
          near_frame_cost?: number | null;
          near_frame_model?: string | null;
          near_frame_name?: string | null;
          near_frame_price?: number | null;
          near_frame_price_includes_tax?: boolean | null;
          near_frame_product_id?: string | null;
          near_frame_size?: string | null;
          near_frame_sku?: string | null;
          near_lens_cost?: number | null;
          near_lens_family_id?: string | null;
          operativo_batch_id?: string | null;
          operativo_delivered_at?: string | null;
          operativo_recipient_name?: string | null;
          ordered_at?: string | null;
          organization_id?: string | null;
          payment_method?: string | null;
          payment_status?: string | null;
          pos_order_id?: string | null;
          presbyopia_solution?: string | null;
          prescription_id?: string | null;
          prescription_snapshot?: Json | null;
          quality_checked_at?: string | null;
          quality_notes?: string | null;
          quote_id?: string | null;
          ready_at?: string | null;
          received_from_lab_at?: string | null;
          sent_to_lab_at?: string | null;
          status?: string | null;
          subtotal?: number | null;
          tax_amount?: number | null;
          total_amount: number;
          treatments_cost?: number | null;
          updated_at?: string | null;
          warranty_details?: string | null;
          warranty_end_date?: string | null;
          warranty_start_date?: string | null;
          work_order_date?: string;
          work_order_number: string;
        };
        Update: {
          agreement_id?: string | null;
          assigned_to?: string | null;
          balance_amount?: number | null;
          branch_id?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          contact_lens_cost?: number | null;
          contact_lens_family_id?: string | null;
          contact_lens_quantity?: number | null;
          contact_lens_rx_add_od?: number | null;
          contact_lens_rx_add_os?: number | null;
          contact_lens_rx_axis_od?: number | null;
          contact_lens_rx_axis_os?: number | null;
          contact_lens_rx_base_curve_od?: number | null;
          contact_lens_rx_base_curve_os?: number | null;
          contact_lens_rx_cylinder_od?: number | null;
          contact_lens_rx_cylinder_os?: number | null;
          contact_lens_rx_diameter_od?: number | null;
          contact_lens_rx_diameter_os?: number | null;
          contact_lens_rx_sphere_od?: number | null;
          contact_lens_rx_sphere_os?: number | null;
          created_at?: string | null;
          created_by?: string | null;
          currency?: string | null;
          customer_id?: string;
          customer_notes?: string | null;
          customer_own_frame?: boolean;
          customer_own_near_frame?: boolean | null;
          delivered_at?: string | null;
          deposit_amount?: number | null;
          discount_amount?: number | null;
          far_lens_cost?: number | null;
          far_lens_family_id?: string | null;
          field_operation_id?: string | null;
          frame_brand?: string | null;
          frame_color?: string | null;
          frame_cost?: number | null;
          frame_model?: string | null;
          frame_name?: string;
          frame_product_id?: string | null;
          frame_serial_number?: string | null;
          frame_size?: string | null;
          frame_sku?: string | null;
          id?: string;
          internal_notes?: string | null;
          lab_completed_at?: string | null;
          lab_contact?: string | null;
          lab_contact_person?: string | null;
          lab_cost?: number | null;
          lab_estimated_delivery_date?: string | null;
          lab_name?: string | null;
          lab_notes?: string | null;
          lab_order_number?: string | null;
          lab_started_at?: string | null;
          labor_cost?: number | null;
          lens_cost?: number | null;
          lens_family_id?: string | null;
          lens_index?: number | null;
          lens_material?: string;
          lens_sourcing_type?: string | null;
          lens_tint_color?: string | null;
          lens_tint_percentage?: number | null;
          lens_treatments?: string[];
          lens_type?: string;
          mounted_at?: string | null;
          near_frame_brand?: string | null;
          near_frame_color?: string | null;
          near_frame_cost?: number | null;
          near_frame_model?: string | null;
          near_frame_name?: string | null;
          near_frame_price?: number | null;
          near_frame_price_includes_tax?: boolean | null;
          near_frame_product_id?: string | null;
          near_frame_size?: string | null;
          near_frame_sku?: string | null;
          near_lens_cost?: number | null;
          near_lens_family_id?: string | null;
          operativo_batch_id?: string | null;
          operativo_delivered_at?: string | null;
          operativo_recipient_name?: string | null;
          ordered_at?: string | null;
          organization_id?: string | null;
          payment_method?: string | null;
          payment_status?: string | null;
          pos_order_id?: string | null;
          presbyopia_solution?: string | null;
          prescription_id?: string | null;
          prescription_snapshot?: Json | null;
          quality_checked_at?: string | null;
          quality_notes?: string | null;
          quote_id?: string | null;
          ready_at?: string | null;
          received_from_lab_at?: string | null;
          sent_to_lab_at?: string | null;
          status?: string | null;
          subtotal?: number | null;
          tax_amount?: number | null;
          total_amount?: number;
          treatments_cost?: number | null;
          updated_at?: string | null;
          warranty_details?: string | null;
          warranty_end_date?: string | null;
          warranty_start_date?: string | null;
          work_order_date?: string;
          work_order_number?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lab_work_orders_agreement_id_fkey";
            columns: ["agreement_id"];
            isOneToOne: false;
            referencedRelation: "agreements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lab_work_orders_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lab_work_orders_contact_lens_family_id_fkey";
            columns: ["contact_lens_family_id"];
            isOneToOne: false;
            referencedRelation: "contact_lens_families";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lab_work_orders_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lab_work_orders_far_lens_family_id_fkey";
            columns: ["far_lens_family_id"];
            isOneToOne: false;
            referencedRelation: "lens_families";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lab_work_orders_field_operation_id_fkey";
            columns: ["field_operation_id"];
            isOneToOne: false;
            referencedRelation: "field_operations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lab_work_orders_frame_product_id_fkey";
            columns: ["frame_product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lab_work_orders_frame_product_id_fkey";
            columns: ["frame_product_id"];
            isOneToOne: false;
            referencedRelation: "products_with_stock";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lab_work_orders_lens_family_id_fkey";
            columns: ["lens_family_id"];
            isOneToOne: false;
            referencedRelation: "lens_families";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lab_work_orders_near_frame_product_id_fkey";
            columns: ["near_frame_product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lab_work_orders_near_frame_product_id_fkey";
            columns: ["near_frame_product_id"];
            isOneToOne: false;
            referencedRelation: "products_with_stock";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lab_work_orders_near_lens_family_id_fkey";
            columns: ["near_lens_family_id"];
            isOneToOne: false;
            referencedRelation: "lens_families";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lab_work_orders_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lab_work_orders_pos_order_id_fkey";
            columns: ["pos_order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lab_work_orders_prescription_id_fkey";
            columns: ["prescription_id"];
            isOneToOne: false;
            referencedRelation: "prescriptions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lab_work_orders_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
        ];
      };
      lens_families: {
        Row: {
          brand: string | null;
          category_id: string | null;
          created_at: string | null;
          description: string | null;
          id: string;
          is_active: boolean | null;
          is_stock_available: boolean | null;
          lens_material: string;
          lens_type: string;
          name: string;
          organization_id: string | null;
          stock_cylinder_max: number | null;
          stock_cylinder_min: number | null;
          stock_sphere_max: number | null;
          stock_sphere_min: number | null;
          updated_at: string | null;
        };
        Insert: {
          brand?: string | null;
          category_id?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_stock_available?: boolean | null;
          lens_material: string;
          lens_type: string;
          name: string;
          organization_id?: string | null;
          stock_cylinder_max?: number | null;
          stock_cylinder_min?: number | null;
          stock_sphere_max?: number | null;
          stock_sphere_min?: number | null;
          updated_at?: string | null;
        };
        Update: {
          brand?: string | null;
          category_id?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_stock_available?: boolean | null;
          lens_material?: string;
          lens_type?: string;
          name?: string;
          organization_id?: string | null;
          stock_cylinder_max?: number | null;
          stock_cylinder_min?: number | null;
          stock_sphere_max?: number | null;
          stock_sphere_min?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "lens_families_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lens_families_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      lens_price_matrices: {
        Row: {
          addition_max: number | null;
          addition_min: number | null;
          base_price: number;
          cost: number;
          created_at: string | null;
          cylinder_max: number;
          cylinder_min: number;
          id: string;
          is_active: boolean | null;
          lens_family_id: string;
          name: string | null;
          organization_id: string | null;
          sourcing_type: string | null;
          sphere_max: number;
          sphere_min: number;
          updated_at: string | null;
        };
        Insert: {
          addition_max?: number | null;
          addition_min?: number | null;
          base_price: number;
          cost: number;
          created_at?: string | null;
          cylinder_max: number;
          cylinder_min: number;
          id?: string;
          is_active?: boolean | null;
          lens_family_id: string;
          name?: string | null;
          organization_id?: string | null;
          sourcing_type?: string | null;
          sphere_max: number;
          sphere_min: number;
          updated_at?: string | null;
        };
        Update: {
          addition_max?: number | null;
          addition_min?: number | null;
          base_price?: number;
          cost?: number;
          created_at?: string | null;
          cylinder_max?: number;
          cylinder_min?: number;
          id?: string;
          is_active?: boolean | null;
          lens_family_id?: string;
          name?: string | null;
          organization_id?: string | null;
          sourcing_type?: string | null;
          sphere_max?: number;
          sphere_min?: number;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "lens_price_matrices_lens_family_id_fkey";
            columns: ["lens_family_id"];
            isOneToOne: false;
            referencedRelation: "lens_families";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lens_price_matrices_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      memory_facts: {
        Row: {
          category: string | null;
          content: string;
          created_at: string;
          embedding: string | null;
          embedding_provider: string | null;
          embedding_small: string | null;
          expires_at: string | null;
          fact_type: string;
          id: string;
          importance: number | null;
          last_accessed_at: string | null;
          source_message_id: string | null;
          source_session_id: string | null;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          category?: string | null;
          content: string;
          created_at?: string;
          embedding?: string | null;
          embedding_provider?: string | null;
          embedding_small?: string | null;
          expires_at?: string | null;
          fact_type: string;
          id?: string;
          importance?: number | null;
          last_accessed_at?: string | null;
          source_message_id?: string | null;
          source_session_id?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          category?: string | null;
          content?: string;
          created_at?: string;
          embedding?: string | null;
          embedding_provider?: string | null;
          embedding_small?: string | null;
          expires_at?: string | null;
          fact_type?: string;
          id?: string;
          importance?: number | null;
          last_accessed_at?: string | null;
          source_message_id?: string | null;
          source_session_id?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "memory_facts_source_session_id_fkey";
            columns: ["source_session_id"];
            isOneToOne: false;
            referencedRelation: "chat_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_settings: {
        Row: {
          branch_id: string | null;
          created_at: string;
          enabled: boolean | null;
          id: string;
          metadata: Json | null;
          notification_type: Database["public"]["Enums"]["admin_notification_type"];
          notify_all_admins: boolean | null;
          notify_specific_roles: string[] | null;
          organization_id: string | null;
          priority:
            | Database["public"]["Enums"]["admin_notification_priority"]
            | null;
          updated_at: string;
        };
        Insert: {
          branch_id?: string | null;
          created_at?: string;
          enabled?: boolean | null;
          id?: string;
          metadata?: Json | null;
          notification_type: Database["public"]["Enums"]["admin_notification_type"];
          notify_all_admins?: boolean | null;
          notify_specific_roles?: string[] | null;
          organization_id?: string | null;
          priority?:
            | Database["public"]["Enums"]["admin_notification_priority"]
            | null;
          updated_at?: string;
        };
        Update: {
          branch_id?: string | null;
          created_at?: string;
          enabled?: boolean | null;
          id?: string;
          metadata?: Json | null;
          notification_type?: Database["public"]["Enums"]["admin_notification_type"];
          notify_all_admins?: boolean | null;
          notify_specific_roles?: string[] | null;
          organization_id?: string | null;
          priority?:
            | Database["public"]["Enums"]["admin_notification_priority"]
            | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_settings_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_settings_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      operativo_mobile_stock: {
        Row: {
          created_at: string | null;
          field_operation_id: string;
          id: string;
          product_id: string;
          quantity: number;
          reserved_quantity: number;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          field_operation_id: string;
          id?: string;
          product_id: string;
          quantity?: number;
          reserved_quantity?: number;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          field_operation_id?: string;
          id?: string;
          product_id?: string;
          quantity?: number;
          reserved_quantity?: number;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "operativo_mobile_stock_field_operation_id_fkey";
            columns: ["field_operation_id"];
            isOneToOne: false;
            referencedRelation: "field_operations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "operativo_mobile_stock_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "operativo_mobile_stock_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products_with_stock";
            referencedColumns: ["id"];
          },
        ];
      };
      operativo_sync_queue: {
        Row: {
          created_at: string;
          device_id: string;
          entity_type: string;
          error_message: string | null;
          field_operation_id: string;
          id: string;
          payload: Json;
          status: string;
          synced_at: string | null;
        };
        Insert: {
          created_at?: string;
          device_id: string;
          entity_type: string;
          error_message?: string | null;
          field_operation_id: string;
          id?: string;
          payload: Json;
          status?: string;
          synced_at?: string | null;
        };
        Update: {
          created_at?: string;
          device_id?: string;
          entity_type?: string;
          error_message?: string | null;
          field_operation_id?: string;
          id?: string;
          payload?: Json;
          status?: string;
          synced_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "operativo_sync_queue_field_operation_id_fkey";
            columns: ["field_operation_id"];
            isOneToOne: false;
            referencedRelation: "field_operations";
            referencedColumns: ["id"];
          },
        ];
      };
      optical_internal_support_messages: {
        Row: {
          attachments: Json | null;
          created_at: string;
          id: string;
          is_internal: boolean | null;
          message: string;
          message_type: string | null;
          sender_email: string;
          sender_id: string | null;
          sender_name: string;
          sender_role: string | null;
          ticket_id: string;
          updated_at: string;
        };
        Insert: {
          attachments?: Json | null;
          created_at?: string;
          id?: string;
          is_internal?: boolean | null;
          message: string;
          message_type?: string | null;
          sender_email: string;
          sender_id?: string | null;
          sender_name: string;
          sender_role?: string | null;
          ticket_id: string;
          updated_at?: string;
        };
        Update: {
          attachments?: Json | null;
          created_at?: string;
          id?: string;
          is_internal?: boolean | null;
          message?: string;
          message_type?: string | null;
          sender_email?: string;
          sender_id?: string | null;
          sender_name?: string;
          sender_role?: string | null;
          ticket_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "optical_internal_support_messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "optical_internal_support_messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "admin_users_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "optical_internal_support_messages_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "optical_internal_support_tickets";
            referencedColumns: ["id"];
          },
        ];
      };
      optical_internal_support_tickets: {
        Row: {
          assigned_at: string | null;
          assigned_to: string | null;
          branch_id: string | null;
          category: string;
          created_at: string;
          created_by_name: string | null;
          created_by_role: string | null;
          created_by_user_id: string | null;
          customer_email: string | null;
          customer_id: string | null;
          customer_name: string | null;
          customer_phone: string | null;
          description: string;
          first_response_at: string | null;
          id: string;
          last_response_at: string | null;
          metadata: Json | null;
          organization_id: string;
          priority: string;
          related_appointment_id: string | null;
          related_order_id: string | null;
          related_quote_id: string | null;
          related_work_order_id: string | null;
          resolution: string | null;
          resolution_notes: string | null;
          resolution_time_minutes: number | null;
          resolved_at: string | null;
          resolved_by: string | null;
          response_time_minutes: number | null;
          status: string;
          subject: string;
          ticket_number: string;
          updated_at: string;
        };
        Insert: {
          assigned_at?: string | null;
          assigned_to?: string | null;
          branch_id?: string | null;
          category: string;
          created_at?: string;
          created_by_name?: string | null;
          created_by_role?: string | null;
          created_by_user_id?: string | null;
          customer_email?: string | null;
          customer_id?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          description: string;
          first_response_at?: string | null;
          id?: string;
          last_response_at?: string | null;
          metadata?: Json | null;
          organization_id: string;
          priority?: string;
          related_appointment_id?: string | null;
          related_order_id?: string | null;
          related_quote_id?: string | null;
          related_work_order_id?: string | null;
          resolution?: string | null;
          resolution_notes?: string | null;
          resolution_time_minutes?: number | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          response_time_minutes?: number | null;
          status?: string;
          subject: string;
          ticket_number: string;
          updated_at?: string;
        };
        Update: {
          assigned_at?: string | null;
          assigned_to?: string | null;
          branch_id?: string | null;
          category?: string;
          created_at?: string;
          created_by_name?: string | null;
          created_by_role?: string | null;
          created_by_user_id?: string | null;
          customer_email?: string | null;
          customer_id?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          description?: string;
          first_response_at?: string | null;
          id?: string;
          last_response_at?: string | null;
          metadata?: Json | null;
          organization_id?: string;
          priority?: string;
          related_appointment_id?: string | null;
          related_order_id?: string | null;
          related_quote_id?: string | null;
          related_work_order_id?: string | null;
          resolution?: string | null;
          resolution_notes?: string | null;
          resolution_time_minutes?: number | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          response_time_minutes?: number | null;
          status?: string;
          subject?: string;
          ticket_number?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "optical_internal_support_tickets_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "optical_internal_support_tickets_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "admin_users_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "optical_internal_support_tickets_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "optical_internal_support_tickets_created_by_user_id_fkey";
            columns: ["created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "optical_internal_support_tickets_created_by_user_id_fkey";
            columns: ["created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "admin_users_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "optical_internal_support_tickets_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "optical_internal_support_tickets_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "optical_internal_support_tickets_related_appointment_id_fkey";
            columns: ["related_appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "optical_internal_support_tickets_related_order_id_fkey";
            columns: ["related_order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "optical_internal_support_tickets_related_quote_id_fkey";
            columns: ["related_quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "optical_internal_support_tickets_related_work_order_id_fkey";
            columns: ["related_work_order_id"];
            isOneToOne: false;
            referencedRelation: "lab_work_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "optical_internal_support_tickets_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "optical_internal_support_tickets_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "admin_users_view";
            referencedColumns: ["id"];
          },
        ];
      };
      opticas_access_tokens: {
        Row: {
          created_at: string;
          created_by: string | null;
          expires_at: string;
          id: string;
          label: string | null;
          token: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          expires_at: string;
          id?: string;
          label?: string | null;
          token: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          expires_at?: string;
          id?: string;
          label?: string | null;
          token?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          created_at: string;
          id: string;
          order_id: string;
          product_id: string | null;
          product_name: string;
          quantity: number;
          sku: string | null;
          total_price: number;
          unit_price: number;
          variant_id: string | null;
          variant_title: string | null;
          weight: number | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          quantity: number;
          sku?: string | null;
          total_price: number;
          unit_price: number;
          variant_id?: string | null;
          variant_title?: string | null;
          weight?: number | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          order_id?: string;
          product_id?: string | null;
          product_name?: string;
          quantity?: number;
          sku?: string | null;
          total_price?: number;
          unit_price?: number;
          variant_id?: string | null;
          variant_title?: string | null;
          weight?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products_with_stock";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      order_payments: {
        Row: {
          amount: number;
          created_at: string | null;
          created_by: string | null;
          id: string;
          notes: string | null;
          order_id: string;
          paid_at: string | null;
          payment_method: string;
          payment_reference: string | null;
          pos_session_id: string | null;
        };
        Insert: {
          amount: number;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          notes?: string | null;
          order_id: string;
          paid_at?: string | null;
          payment_method: string;
          payment_reference?: string | null;
          pos_session_id?: string | null;
        };
        Update: {
          amount?: number;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          notes?: string | null;
          order_id?: string;
          paid_at?: string | null;
          payment_method?: string;
          payment_reference?: string | null;
          pos_session_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_payments_pos_session_id_fkey";
            columns: ["pos_session_id"];
            isOneToOne: false;
            referencedRelation: "pos_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          agreement_id: string | null;
          billing_address_1: string | null;
          billing_address_2: string | null;
          billing_city: string | null;
          billing_company: string | null;
          billing_country: string | null;
          billing_first_name: string | null;
          billing_last_name: string | null;
          billing_phone: string | null;
          billing_postal_code: string | null;
          billing_state: string | null;
          branch_id: string | null;
          cancellation_reason: string | null;
          card_last_four_digits: string | null;
          card_machine_authorization_code: string | null;
          card_machine_brand: string | null;
          card_machine_transaction_id: string | null;
          carrier: string | null;
          copago_amount: number | null;
          created_at: string;
          currency: string;
          customer_id: string | null;
          customer_name: string | null;
          customer_notes: string | null;
          delivered_at: string | null;
          discount_amount: number | null;
          document_type: string | null;
          email: string;
          field_operation_id: string | null;
          first_installment_due_date: string | null;
          fulfillment_status: string | null;
          id: string;
          installment_amount: number | null;
          installments: number | null;
          installments_count: number | null;
          institutional_amount: number | null;
          internal_folio: string | null;
          is_pos_sale: boolean | null;
          mercadopago_payment_id: number | null;
          mercadopago_preference_id: string | null;
          mp_payment_id: string | null;
          mp_payment_method: string | null;
          mp_payment_type: string | null;
          mp_preference_id: string | null;
          mp_status: string | null;
          mp_status_detail: string | null;
          order_number: string;
          organization_id: string | null;
          payment_method: string | null;
          payment_method_type: string | null;
          payment_status: string | null;
          pdf_url: string | null;
          pos_cashier_id: string | null;
          pos_location: string | null;
          pos_session_id: string | null;
          pos_terminal_id: string | null;
          purchase_order_id: string | null;
          shipped_at: string | null;
          shipping_address_1: string | null;
          shipping_address_2: string | null;
          shipping_amount: number | null;
          shipping_city: string | null;
          shipping_company: string | null;
          shipping_country: string | null;
          shipping_first_name: string | null;
          shipping_last_name: string | null;
          shipping_phone: string | null;
          shipping_postal_code: string | null;
          shipping_state: string | null;
          sii_address: string | null;
          sii_business_name: string | null;
          sii_city: string | null;
          sii_commune: string | null;
          sii_dte_number: string | null;
          sii_folio: string | null;
          sii_invoice_number: string | null;
          sii_invoice_type: string | null;
          sii_response: Json | null;
          sii_rut: string | null;
          sii_sent_at: string | null;
          sii_status: string | null;
          sii_track_id: string | null;
          status: string | null;
          subtotal: number;
          tax_amount: number | null;
          tax_breakdown: Json | null;
          total_amount: number;
          tracking_number: string | null;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          agreement_id?: string | null;
          billing_address_1?: string | null;
          billing_address_2?: string | null;
          billing_city?: string | null;
          billing_company?: string | null;
          billing_country?: string | null;
          billing_first_name?: string | null;
          billing_last_name?: string | null;
          billing_phone?: string | null;
          billing_postal_code?: string | null;
          billing_state?: string | null;
          branch_id?: string | null;
          cancellation_reason?: string | null;
          card_last_four_digits?: string | null;
          card_machine_authorization_code?: string | null;
          card_machine_brand?: string | null;
          card_machine_transaction_id?: string | null;
          carrier?: string | null;
          copago_amount?: number | null;
          created_at?: string;
          currency?: string;
          customer_id?: string | null;
          customer_name?: string | null;
          customer_notes?: string | null;
          delivered_at?: string | null;
          discount_amount?: number | null;
          document_type?: string | null;
          email: string;
          field_operation_id?: string | null;
          first_installment_due_date?: string | null;
          fulfillment_status?: string | null;
          id?: string;
          installment_amount?: number | null;
          installments?: number | null;
          installments_count?: number | null;
          institutional_amount?: number | null;
          internal_folio?: string | null;
          is_pos_sale?: boolean | null;
          mercadopago_payment_id?: number | null;
          mercadopago_preference_id?: string | null;
          mp_payment_id?: string | null;
          mp_payment_method?: string | null;
          mp_payment_type?: string | null;
          mp_preference_id?: string | null;
          mp_status?: string | null;
          mp_status_detail?: string | null;
          order_number: string;
          organization_id?: string | null;
          payment_method?: string | null;
          payment_method_type?: string | null;
          payment_status?: string | null;
          pdf_url?: string | null;
          pos_cashier_id?: string | null;
          pos_location?: string | null;
          pos_session_id?: string | null;
          pos_terminal_id?: string | null;
          purchase_order_id?: string | null;
          shipped_at?: string | null;
          shipping_address_1?: string | null;
          shipping_address_2?: string | null;
          shipping_amount?: number | null;
          shipping_city?: string | null;
          shipping_company?: string | null;
          shipping_country?: string | null;
          shipping_first_name?: string | null;
          shipping_last_name?: string | null;
          shipping_phone?: string | null;
          shipping_postal_code?: string | null;
          shipping_state?: string | null;
          sii_address?: string | null;
          sii_business_name?: string | null;
          sii_city?: string | null;
          sii_commune?: string | null;
          sii_dte_number?: string | null;
          sii_folio?: string | null;
          sii_invoice_number?: string | null;
          sii_invoice_type?: string | null;
          sii_response?: Json | null;
          sii_rut?: string | null;
          sii_sent_at?: string | null;
          sii_status?: string | null;
          sii_track_id?: string | null;
          status?: string | null;
          subtotal: number;
          tax_amount?: number | null;
          tax_breakdown?: Json | null;
          total_amount: number;
          tracking_number?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          agreement_id?: string | null;
          billing_address_1?: string | null;
          billing_address_2?: string | null;
          billing_city?: string | null;
          billing_company?: string | null;
          billing_country?: string | null;
          billing_first_name?: string | null;
          billing_last_name?: string | null;
          billing_phone?: string | null;
          billing_postal_code?: string | null;
          billing_state?: string | null;
          branch_id?: string | null;
          cancellation_reason?: string | null;
          card_last_four_digits?: string | null;
          card_machine_authorization_code?: string | null;
          card_machine_brand?: string | null;
          card_machine_transaction_id?: string | null;
          carrier?: string | null;
          copago_amount?: number | null;
          created_at?: string;
          currency?: string;
          customer_id?: string | null;
          customer_name?: string | null;
          customer_notes?: string | null;
          delivered_at?: string | null;
          discount_amount?: number | null;
          document_type?: string | null;
          email?: string;
          field_operation_id?: string | null;
          first_installment_due_date?: string | null;
          fulfillment_status?: string | null;
          id?: string;
          installment_amount?: number | null;
          installments?: number | null;
          installments_count?: number | null;
          institutional_amount?: number | null;
          internal_folio?: string | null;
          is_pos_sale?: boolean | null;
          mercadopago_payment_id?: number | null;
          mercadopago_preference_id?: string | null;
          mp_payment_id?: string | null;
          mp_payment_method?: string | null;
          mp_payment_type?: string | null;
          mp_preference_id?: string | null;
          mp_status?: string | null;
          mp_status_detail?: string | null;
          order_number?: string;
          organization_id?: string | null;
          payment_method?: string | null;
          payment_method_type?: string | null;
          payment_status?: string | null;
          pdf_url?: string | null;
          pos_cashier_id?: string | null;
          pos_location?: string | null;
          pos_session_id?: string | null;
          pos_terminal_id?: string | null;
          purchase_order_id?: string | null;
          shipped_at?: string | null;
          shipping_address_1?: string | null;
          shipping_address_2?: string | null;
          shipping_amount?: number | null;
          shipping_city?: string | null;
          shipping_company?: string | null;
          shipping_country?: string | null;
          shipping_first_name?: string | null;
          shipping_last_name?: string | null;
          shipping_phone?: string | null;
          shipping_postal_code?: string | null;
          shipping_state?: string | null;
          sii_address?: string | null;
          sii_business_name?: string | null;
          sii_city?: string | null;
          sii_commune?: string | null;
          sii_dte_number?: string | null;
          sii_folio?: string | null;
          sii_invoice_number?: string | null;
          sii_invoice_type?: string | null;
          sii_response?: Json | null;
          sii_rut?: string | null;
          sii_sent_at?: string | null;
          sii_status?: string | null;
          sii_track_id?: string | null;
          status?: string | null;
          subtotal?: number;
          tax_amount?: number | null;
          tax_breakdown?: Json | null;
          total_amount?: number;
          tracking_number?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "orders_agreement_id_fkey";
            columns: ["agreement_id"];
            isOneToOne: false;
            referencedRelation: "agreements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_field_operation_id_fkey";
            columns: ["field_operation_id"];
            isOneToOne: false;
            referencedRelation: "field_operations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_pos_session_id_fkey";
            columns: ["pos_session_id"];
            isOneToOne: false;
            referencedRelation: "pos_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_purchase_order_id_fkey";
            columns: ["purchase_order_id"];
            isOneToOne: false;
            referencedRelation: "agreement_purchase_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_settings: {
        Row: {
          auto_print_receipt: boolean | null;
          business_address: string | null;
          business_email: string | null;
          business_name: string | null;
          business_phone: string | null;
          business_rut: string | null;
          country: string | null;
          created_at: string | null;
          currency: string | null;
          default_document_type: string | null;
          footer_text: string | null;
          header_text: string | null;
          id: string;
          logo_url: string | null;
          min_deposit_amount: number | null;
          min_deposit_percent: number | null;
          organization_id: string | null;
          printer_height_mm: number | null;
          printer_type: string | null;
          printer_width_mm: number | null;
          terms_and_conditions: string | null;
          updated_at: string | null;
        };
        Insert: {
          auto_print_receipt?: boolean | null;
          business_address?: string | null;
          business_email?: string | null;
          business_name?: string | null;
          business_phone?: string | null;
          business_rut?: string | null;
          country?: string | null;
          created_at?: string | null;
          currency?: string | null;
          default_document_type?: string | null;
          footer_text?: string | null;
          header_text?: string | null;
          id?: string;
          logo_url?: string | null;
          min_deposit_amount?: number | null;
          min_deposit_percent?: number | null;
          organization_id?: string | null;
          printer_height_mm?: number | null;
          printer_type?: string | null;
          printer_width_mm?: number | null;
          terms_and_conditions?: string | null;
          updated_at?: string | null;
        };
        Update: {
          auto_print_receipt?: boolean | null;
          business_address?: string | null;
          business_email?: string | null;
          business_name?: string | null;
          business_phone?: string | null;
          business_rut?: string | null;
          country?: string | null;
          created_at?: string | null;
          currency?: string | null;
          default_document_type?: string | null;
          footer_text?: string | null;
          header_text?: string | null;
          id?: string;
          logo_url?: string | null;
          min_deposit_amount?: number | null;
          min_deposit_percent?: number | null;
          organization_id?: string | null;
          printer_height_mm?: number | null;
          printer_type?: string | null;
          printer_width_mm?: number | null;
          terms_and_conditions?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      organizations: {
        Row: {
          created_at: string;
          id: string;
          logo_url: string | null;
          metadata: Json | null;
          name: string;
          owner_id: string | null;
          scheduled_tier: string | null;
          scheduled_tier_effective_at: string | null;
          slogan: string | null;
          slug: string;
          status: string | null;
          subscription_tier: string | null;
          trial_days_override: number | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          metadata?: Json | null;
          name: string;
          owner_id?: string | null;
          scheduled_tier?: string | null;
          scheduled_tier_effective_at?: string | null;
          slogan?: string | null;
          slug: string;
          status?: string | null;
          subscription_tier?: string | null;
          trial_days_override?: number | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          metadata?: Json | null;
          name?: string;
          owner_id?: string | null;
          scheduled_tier?: string | null;
          scheduled_tier_effective_at?: string | null;
          slogan?: string | null;
          slug?: string;
          status?: string | null;
          subscription_tier?: string | null;
          trial_days_override?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      payment_gateways_config: {
        Row: {
          config: Json | null;
          created_at: string;
          description: string | null;
          display_order: number;
          gateway_id: string;
          icon_name: string | null;
          id: string;
          is_enabled: boolean;
          name: string;
          updated_at: string;
        };
        Insert: {
          config?: Json | null;
          created_at?: string;
          description?: string | null;
          display_order?: number;
          gateway_id: string;
          icon_name?: string | null;
          id?: string;
          is_enabled?: boolean;
          name: string;
          updated_at?: string;
        };
        Update: {
          config?: Json | null;
          created_at?: string;
          description?: string | null;
          display_order?: number;
          gateway_id?: string;
          icon_name?: string | null;
          id?: string;
          is_enabled?: boolean;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payment_installments: {
        Row: {
          amount: number;
          created_at: string;
          due_date: string;
          id: string;
          installment_number: number;
          notes: string | null;
          order_id: string;
          paid_amount: number | null;
          paid_at: string | null;
          payment_method: string | null;
          payment_status: string | null;
          updated_at: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          due_date: string;
          id?: string;
          installment_number: number;
          notes?: string | null;
          order_id: string;
          paid_amount?: number | null;
          paid_at?: string | null;
          payment_method?: string | null;
          payment_status?: string | null;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          due_date?: string;
          id?: string;
          installment_number?: number;
          notes?: string | null;
          order_id?: string;
          paid_amount?: number | null;
          paid_at?: string | null;
          payment_method?: string | null;
          payment_status?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_installments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount: number;
          created_at: string;
          currency: string;
          gateway: string;
          gateway_charge_id: string | null;
          gateway_payment_intent_id: string | null;
          gateway_transaction_id: string | null;
          id: string;
          metadata: Json | null;
          mp_merchant_order_id: string | null;
          mp_payment_id: string | null;
          mp_payment_method: string | null;
          mp_payment_type: string | null;
          mp_preference_id: string | null;
          order_id: string | null;
          organization_id: string;
          payment_method: string | null;
          status: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          amount: number;
          created_at?: string;
          currency?: string;
          gateway: string;
          gateway_charge_id?: string | null;
          gateway_payment_intent_id?: string | null;
          gateway_transaction_id?: string | null;
          id?: string;
          metadata?: Json | null;
          mp_merchant_order_id?: string | null;
          mp_payment_id?: string | null;
          mp_payment_method?: string | null;
          mp_payment_type?: string | null;
          mp_preference_id?: string | null;
          order_id?: string | null;
          organization_id: string;
          payment_method?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          amount?: number;
          created_at?: string;
          currency?: string;
          gateway?: string;
          gateway_charge_id?: string | null;
          gateway_payment_intent_id?: string | null;
          gateway_transaction_id?: string | null;
          id?: string;
          metadata?: Json | null;
          mp_merchant_order_id?: string | null;
          mp_payment_id?: string | null;
          mp_payment_method?: string | null;
          mp_payment_type?: string | null;
          mp_preference_id?: string | null;
          order_id?: string | null;
          organization_id?: string;
          payment_method?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      pos_sale_idempotency: {
        Row: {
          created_at: string;
          idempotency_key: string;
          order_id: string;
          response_snapshot: Json | null;
          work_order_id: string | null;
        };
        Insert: {
          created_at?: string;
          idempotency_key: string;
          order_id: string;
          response_snapshot?: Json | null;
          work_order_id?: string | null;
        };
        Update: {
          created_at?: string;
          idempotency_key?: string;
          order_id?: string;
          response_snapshot?: Json | null;
          work_order_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pos_sale_idempotency_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pos_sale_idempotency_work_order_id_fkey";
            columns: ["work_order_id"];
            isOneToOne: false;
            referencedRelation: "lab_work_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      pos_sessions: {
        Row: {
          branch_id: string | null;
          cashier_id: string;
          closing_cash_amount: number | null;
          closing_time: string | null;
          created_at: string;
          field_operation_id: string | null;
          id: string;
          location: string | null;
          notes: string | null;
          opening_cash_amount: number | null;
          opening_time: string;
          reopen_count: number | null;
          reopened_at: string | null;
          reopened_by: string | null;
          status: string | null;
          terminal_id: string | null;
          updated_at: string;
        };
        Insert: {
          branch_id?: string | null;
          cashier_id: string;
          closing_cash_amount?: number | null;
          closing_time?: string | null;
          created_at?: string;
          field_operation_id?: string | null;
          id?: string;
          location?: string | null;
          notes?: string | null;
          opening_cash_amount?: number | null;
          opening_time?: string;
          reopen_count?: number | null;
          reopened_at?: string | null;
          reopened_by?: string | null;
          status?: string | null;
          terminal_id?: string | null;
          updated_at?: string;
        };
        Update: {
          branch_id?: string | null;
          cashier_id?: string;
          closing_cash_amount?: number | null;
          closing_time?: string | null;
          created_at?: string;
          field_operation_id?: string | null;
          id?: string;
          location?: string | null;
          notes?: string | null;
          opening_cash_amount?: number | null;
          opening_time?: string;
          reopen_count?: number | null;
          reopened_at?: string | null;
          reopened_by?: string | null;
          status?: string | null;
          terminal_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pos_sessions_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pos_sessions_field_operation_id_fkey";
            columns: ["field_operation_id"];
            isOneToOne: false;
            referencedRelation: "field_operations";
            referencedColumns: ["id"];
          },
        ];
      };
      pos_settings: {
        Row: {
          auto_print_receipt: boolean | null;
          branch_id: string;
          business_address: string | null;
          business_email: string | null;
          business_name: string | null;
          business_phone: string | null;
          business_rut: string | null;
          created_at: string | null;
          default_document_type: string | null;
          footer_text: string | null;
          header_text: string | null;
          id: string;
          logo_url: string | null;
          min_deposit_amount: number | null;
          min_deposit_percent: number | null;
          organization_id: string | null;
          printer_height_mm: number | null;
          printer_type: string | null;
          printer_width_mm: number | null;
          terms_and_conditions: string | null;
          updated_at: string | null;
        };
        Insert: {
          auto_print_receipt?: boolean | null;
          branch_id: string;
          business_address?: string | null;
          business_email?: string | null;
          business_name?: string | null;
          business_phone?: string | null;
          business_rut?: string | null;
          created_at?: string | null;
          default_document_type?: string | null;
          footer_text?: string | null;
          header_text?: string | null;
          id?: string;
          logo_url?: string | null;
          min_deposit_amount?: number | null;
          min_deposit_percent?: number | null;
          organization_id?: string | null;
          printer_height_mm?: number | null;
          printer_type?: string | null;
          printer_width_mm?: number | null;
          terms_and_conditions?: string | null;
          updated_at?: string | null;
        };
        Update: {
          auto_print_receipt?: boolean | null;
          branch_id?: string;
          business_address?: string | null;
          business_email?: string | null;
          business_name?: string | null;
          business_phone?: string | null;
          business_rut?: string | null;
          created_at?: string | null;
          default_document_type?: string | null;
          footer_text?: string | null;
          header_text?: string | null;
          id?: string;
          logo_url?: string | null;
          min_deposit_amount?: number | null;
          min_deposit_percent?: number | null;
          organization_id?: string | null;
          printer_height_mm?: number | null;
          printer_type?: string | null;
          printer_width_mm?: number | null;
          terms_and_conditions?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pos_settings_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: true;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pos_settings_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      pos_transactions: {
        Row: {
          amount: number;
          card_machine_authorization_code: string | null;
          card_machine_transaction_id: string | null;
          change_amount: number | null;
          created_at: string;
          id: string;
          notes: string | null;
          order_id: string;
          payment_method: string;
          pos_session_id: string | null;
          receipt_number: string | null;
          receipt_printed: boolean | null;
          transaction_type: string;
          updated_at: string;
        };
        Insert: {
          amount: number;
          card_machine_authorization_code?: string | null;
          card_machine_transaction_id?: string | null;
          change_amount?: number | null;
          created_at?: string;
          id?: string;
          notes?: string | null;
          order_id: string;
          payment_method: string;
          pos_session_id?: string | null;
          receipt_number?: string | null;
          receipt_printed?: boolean | null;
          transaction_type: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          card_machine_authorization_code?: string | null;
          card_machine_transaction_id?: string | null;
          change_amount?: number | null;
          created_at?: string;
          id?: string;
          notes?: string | null;
          order_id?: string;
          payment_method?: string;
          pos_session_id?: string | null;
          receipt_number?: string | null;
          receipt_printed?: boolean | null;
          transaction_type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pos_transactions_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pos_transactions_pos_session_id_fkey";
            columns: ["pos_session_id"];
            isOneToOne: false;
            referencedRelation: "pos_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      prescriptions: {
        Row: {
          branch_id: string | null;
          coatings: string[] | null;
          created_at: string | null;
          created_by: string | null;
          customer_id: string;
          expiration_date: string | null;
          field_operation_id: string | null;
          frame_pd: number | null;
          height_segmentation: number | null;
          id: string;
          is_active: boolean | null;
          is_current: boolean | null;
          issued_by: string | null;
          issued_by_license: string | null;
          lens_material: string | null;
          lens_type: string | null;
          notes: string | null;
          observations: string | null;
          od_add: number | null;
          od_axis: number | null;
          od_cylinder: number | null;
          od_near_pd: number | null;
          od_pd: number | null;
          od_sphere: number | null;
          organization_id: string | null;
          os_add: number | null;
          os_axis: number | null;
          os_cylinder: number | null;
          os_near_pd: number | null;
          os_pd: number | null;
          os_sphere: number | null;
          prescription_date: string;
          prescription_number: string | null;
          prescription_type: string | null;
          prism_od: string | null;
          prism_os: string | null;
          recommendations: string | null;
          tint_od: string | null;
          tint_os: string | null;
          updated_at: string | null;
        };
        Insert: {
          branch_id?: string | null;
          coatings?: string[] | null;
          created_at?: string | null;
          created_by?: string | null;
          customer_id: string;
          expiration_date?: string | null;
          field_operation_id?: string | null;
          frame_pd?: number | null;
          height_segmentation?: number | null;
          id?: string;
          is_active?: boolean | null;
          is_current?: boolean | null;
          issued_by?: string | null;
          issued_by_license?: string | null;
          lens_material?: string | null;
          lens_type?: string | null;
          notes?: string | null;
          observations?: string | null;
          od_add?: number | null;
          od_axis?: number | null;
          od_cylinder?: number | null;
          od_near_pd?: number | null;
          od_pd?: number | null;
          od_sphere?: number | null;
          organization_id?: string | null;
          os_add?: number | null;
          os_axis?: number | null;
          os_cylinder?: number | null;
          os_near_pd?: number | null;
          os_pd?: number | null;
          os_sphere?: number | null;
          prescription_date?: string;
          prescription_number?: string | null;
          prescription_type?: string | null;
          prism_od?: string | null;
          prism_os?: string | null;
          recommendations?: string | null;
          tint_od?: string | null;
          tint_os?: string | null;
          updated_at?: string | null;
        };
        Update: {
          branch_id?: string | null;
          coatings?: string[] | null;
          created_at?: string | null;
          created_by?: string | null;
          customer_id?: string;
          expiration_date?: string | null;
          field_operation_id?: string | null;
          frame_pd?: number | null;
          height_segmentation?: number | null;
          id?: string;
          is_active?: boolean | null;
          is_current?: boolean | null;
          issued_by?: string | null;
          issued_by_license?: string | null;
          lens_material?: string | null;
          lens_type?: string | null;
          notes?: string | null;
          observations?: string | null;
          od_add?: number | null;
          od_axis?: number | null;
          od_cylinder?: number | null;
          od_near_pd?: number | null;
          od_pd?: number | null;
          od_sphere?: number | null;
          organization_id?: string | null;
          os_add?: number | null;
          os_axis?: number | null;
          os_cylinder?: number | null;
          os_near_pd?: number | null;
          os_pd?: number | null;
          os_sphere?: number | null;
          prescription_date?: string;
          prescription_number?: string | null;
          prescription_type?: string | null;
          prism_od?: string | null;
          prism_os?: string | null;
          recommendations?: string | null;
          tint_od?: string | null;
          tint_os?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "prescriptions_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "prescriptions_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "prescriptions_field_operation_id_fkey";
            columns: ["field_operation_id"];
            isOneToOne: false;
            referencedRelation: "field_operations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "prescriptions_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      product_branch_stock: {
        Row: {
          available_quantity: number | null;
          branch_id: string;
          created_at: string;
          id: string;
          last_stock_movement: string | null;
          low_stock_threshold: number | null;
          product_id: string;
          quantity: number;
          reorder_point: number | null;
          reserved_quantity: number;
          updated_at: string;
        };
        Insert: {
          available_quantity?: number | null;
          branch_id: string;
          created_at?: string;
          id?: string;
          last_stock_movement?: string | null;
          low_stock_threshold?: number | null;
          product_id: string;
          quantity?: number;
          reorder_point?: number | null;
          reserved_quantity?: number;
          updated_at?: string;
        };
        Update: {
          available_quantity?: number | null;
          branch_id?: string;
          created_at?: string;
          id?: string;
          last_stock_movement?: string | null;
          low_stock_threshold?: number | null;
          product_id?: string;
          quantity?: number;
          reorder_point?: number | null;
          reserved_quantity?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_branch_stock_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_branch_stock_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_branch_stock_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products_with_stock";
            referencedColumns: ["id"];
          },
        ];
      };
      product_option_fields: {
        Row: {
          created_at: string | null;
          display_order: number | null;
          field_category: string;
          field_key: string;
          field_label: string;
          form_type: string;
          id: string;
          is_active: boolean | null;
          is_array: boolean | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          display_order?: number | null;
          field_category: string;
          field_key: string;
          field_label: string;
          form_type?: string;
          id?: string;
          is_active?: boolean | null;
          is_array?: boolean | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          display_order?: number | null;
          field_category?: string;
          field_key?: string;
          field_label?: string;
          form_type?: string;
          id?: string;
          is_active?: boolean | null;
          is_array?: boolean | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      product_option_values: {
        Row: {
          created_at: string | null;
          display_order: number | null;
          field_id: string;
          id: string;
          is_active: boolean | null;
          is_default: boolean | null;
          label: string;
          metadata: Json | null;
          updated_at: string | null;
          value: string;
        };
        Insert: {
          created_at?: string | null;
          display_order?: number | null;
          field_id: string;
          id?: string;
          is_active?: boolean | null;
          is_default?: boolean | null;
          label: string;
          metadata?: Json | null;
          updated_at?: string | null;
          value: string;
        };
        Update: {
          created_at?: string | null;
          display_order?: number | null;
          field_id?: string;
          id?: string;
          is_active?: boolean | null;
          is_default?: boolean | null;
          label?: string;
          metadata?: Json | null;
          updated_at?: string | null;
          value?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_option_values_field_id_fkey";
            columns: ["field_id"];
            isOneToOne: false;
            referencedRelation: "product_option_fields";
            referencedColumns: ["id"];
          },
        ];
      };
      product_variants: {
        Row: {
          barcode: string | null;
          compare_at_price: number | null;
          cost_price: number | null;
          created_at: string;
          id: string;
          image_url: string | null;
          inventory_quantity: number | null;
          is_default: boolean | null;
          option1: string | null;
          option2: string | null;
          option3: string | null;
          position: number | null;
          price: number;
          product_id: string;
          sku: string | null;
          title: string;
          updated_at: string;
          weight: number | null;
        };
        Insert: {
          barcode?: string | null;
          compare_at_price?: number | null;
          cost_price?: number | null;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          inventory_quantity?: number | null;
          is_default?: boolean | null;
          option1?: string | null;
          option2?: string | null;
          option3?: string | null;
          position?: number | null;
          price: number;
          product_id: string;
          sku?: string | null;
          title: string;
          updated_at?: string;
          weight?: number | null;
        };
        Update: {
          barcode?: string | null;
          compare_at_price?: number | null;
          cost_price?: number | null;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          inventory_quantity?: number | null;
          is_default?: boolean | null;
          option1?: string | null;
          option2?: string | null;
          option3?: string | null;
          position?: number | null;
          price?: number;
          product_id?: string;
          sku?: string | null;
          title?: string;
          updated_at?: string;
          weight?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products_with_stock";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          barcode: string | null;
          benefits: string[] | null;
          blue_light_filter: boolean | null;
          blue_light_filter_percentage: number | null;
          branch_id: string | null;
          brand: string | null;
          category_id: string | null;
          certifications: string[] | null;
          collections: string[] | null;
          compare_at_price: number | null;
          compatible_with: string[] | null;
          cost_price: number | null;
          created_at: string;
          currency: string;
          description: string | null;
          dimensions: Json | null;
          featured_image: string | null;
          frame_age_group: string | null;
          frame_brand: string | null;
          frame_color: string | null;
          frame_colors: string[] | null;
          frame_features: string[] | null;
          frame_gender: string | null;
          frame_material: string | null;
          frame_measurements: Json | null;
          frame_model: string | null;
          frame_shape: string | null;
          frame_size: string | null;
          frame_sku: string | null;
          frame_type: string | null;
          gallery: Json | null;
          id: string;
          ingredients: Json | null;
          inventory_policy: string | null;
          inventory_quantity: number | null;
          is_customizable: boolean | null;
          is_digital: boolean | null;
          is_featured: boolean | null;
          lens_coatings: string[] | null;
          lens_index: number | null;
          lens_material: string | null;
          lens_tint_options: string[] | null;
          lens_type: string | null;
          low_stock_threshold: number | null;
          manufacturer: string | null;
          meta_description: string | null;
          meta_title: string | null;
          model_number: string | null;
          name: string;
          optical_category: string | null;
          organization_id: string | null;
          package_characteristics: string | null;
          photochromic: boolean | null;
          photochromic_tint_levels: Json | null;
          precautions: string | null;
          prescription_available: boolean | null;
          prescription_range: Json | null;
          price: number;
          price_includes_tax: boolean | null;
          product_type: string | null;
          published_at: string | null;
          requires_prescription: boolean | null;
          requires_shipping: boolean | null;
          search_keywords: string[] | null;
          shelf_life_months: number | null;
          short_description: string | null;
          skin_type: string[] | null;
          sku: string | null;
          slug: string;
          status: string | null;
          tags: string[] | null;
          track_inventory: boolean | null;
          updated_at: string;
          usage_instructions: string | null;
          uv_protection: string | null;
          vendor: string | null;
          video_url: string | null;
          warranty_details: string | null;
          warranty_months: number | null;
          weight: number | null;
        };
        Insert: {
          barcode?: string | null;
          benefits?: string[] | null;
          blue_light_filter?: boolean | null;
          blue_light_filter_percentage?: number | null;
          branch_id?: string | null;
          brand?: string | null;
          category_id?: string | null;
          certifications?: string[] | null;
          collections?: string[] | null;
          compare_at_price?: number | null;
          compatible_with?: string[] | null;
          cost_price?: number | null;
          created_at?: string;
          currency?: string;
          description?: string | null;
          dimensions?: Json | null;
          featured_image?: string | null;
          frame_age_group?: string | null;
          frame_brand?: string | null;
          frame_color?: string | null;
          frame_colors?: string[] | null;
          frame_features?: string[] | null;
          frame_gender?: string | null;
          frame_material?: string | null;
          frame_measurements?: Json | null;
          frame_model?: string | null;
          frame_shape?: string | null;
          frame_size?: string | null;
          frame_sku?: string | null;
          frame_type?: string | null;
          gallery?: Json | null;
          id?: string;
          ingredients?: Json | null;
          inventory_policy?: string | null;
          inventory_quantity?: number | null;
          is_customizable?: boolean | null;
          is_digital?: boolean | null;
          is_featured?: boolean | null;
          lens_coatings?: string[] | null;
          lens_index?: number | null;
          lens_material?: string | null;
          lens_tint_options?: string[] | null;
          lens_type?: string | null;
          low_stock_threshold?: number | null;
          manufacturer?: string | null;
          meta_description?: string | null;
          meta_title?: string | null;
          model_number?: string | null;
          name: string;
          optical_category?: string | null;
          organization_id?: string | null;
          package_characteristics?: string | null;
          photochromic?: boolean | null;
          photochromic_tint_levels?: Json | null;
          precautions?: string | null;
          prescription_available?: boolean | null;
          prescription_range?: Json | null;
          price: number;
          price_includes_tax?: boolean | null;
          product_type?: string | null;
          published_at?: string | null;
          requires_prescription?: boolean | null;
          requires_shipping?: boolean | null;
          search_keywords?: string[] | null;
          shelf_life_months?: number | null;
          short_description?: string | null;
          skin_type?: string[] | null;
          sku?: string | null;
          slug: string;
          status?: string | null;
          tags?: string[] | null;
          track_inventory?: boolean | null;
          updated_at?: string;
          usage_instructions?: string | null;
          uv_protection?: string | null;
          vendor?: string | null;
          video_url?: string | null;
          warranty_details?: string | null;
          warranty_months?: number | null;
          weight?: number | null;
        };
        Update: {
          barcode?: string | null;
          benefits?: string[] | null;
          blue_light_filter?: boolean | null;
          blue_light_filter_percentage?: number | null;
          branch_id?: string | null;
          brand?: string | null;
          category_id?: string | null;
          certifications?: string[] | null;
          collections?: string[] | null;
          compare_at_price?: number | null;
          compatible_with?: string[] | null;
          cost_price?: number | null;
          created_at?: string;
          currency?: string;
          description?: string | null;
          dimensions?: Json | null;
          featured_image?: string | null;
          frame_age_group?: string | null;
          frame_brand?: string | null;
          frame_color?: string | null;
          frame_colors?: string[] | null;
          frame_features?: string[] | null;
          frame_gender?: string | null;
          frame_material?: string | null;
          frame_measurements?: Json | null;
          frame_model?: string | null;
          frame_shape?: string | null;
          frame_size?: string | null;
          frame_sku?: string | null;
          frame_type?: string | null;
          gallery?: Json | null;
          id?: string;
          ingredients?: Json | null;
          inventory_policy?: string | null;
          inventory_quantity?: number | null;
          is_customizable?: boolean | null;
          is_digital?: boolean | null;
          is_featured?: boolean | null;
          lens_coatings?: string[] | null;
          lens_index?: number | null;
          lens_material?: string | null;
          lens_tint_options?: string[] | null;
          lens_type?: string | null;
          low_stock_threshold?: number | null;
          manufacturer?: string | null;
          meta_description?: string | null;
          meta_title?: string | null;
          model_number?: string | null;
          name?: string;
          optical_category?: string | null;
          organization_id?: string | null;
          package_characteristics?: string | null;
          photochromic?: boolean | null;
          photochromic_tint_levels?: Json | null;
          precautions?: string | null;
          prescription_available?: boolean | null;
          prescription_range?: Json | null;
          price?: number;
          price_includes_tax?: boolean | null;
          product_type?: string | null;
          published_at?: string | null;
          requires_prescription?: boolean | null;
          requires_shipping?: boolean | null;
          search_keywords?: string[] | null;
          shelf_life_months?: number | null;
          short_description?: string | null;
          skin_type?: string[] | null;
          sku?: string | null;
          slug?: string;
          status?: string | null;
          tags?: string[] | null;
          track_inventory?: boolean | null;
          updated_at?: string;
          usage_instructions?: string | null;
          uv_protection?: string | null;
          vendor?: string | null;
          video_url?: string | null;
          warranty_details?: string | null;
          warranty_months?: number | null;
          weight?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "products_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          address_line_1: string | null;
          address_line_2: string | null;
          allergies: string[] | null;
          avatar_url: string | null;
          bio: string | null;
          city: string | null;
          country: string | null;
          created_at: string;
          date_of_birth: string | null;
          email: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          first_name: string | null;
          gender: string | null;
          id: string;
          insurance_policy_number: string | null;
          insurance_provider: string | null;
          is_active_customer: boolean | null;
          language: string | null;
          last_eye_exam_date: string | null;
          last_name: string | null;
          medical_conditions: string[] | null;
          medical_notes: string | null;
          medications: string[] | null;
          newsletter_subscribed: boolean | null;
          next_eye_exam_due: string | null;
          phone: string | null;
          postal_code: string | null;
          preferred_branch_id: string | null;
          preferred_contact_method: string | null;
          rut: string | null;
          state: string | null;
          timezone: string | null;
          updated_at: string;
        };
        Insert: {
          address_line_1?: string | null;
          address_line_2?: string | null;
          allergies?: string[] | null;
          avatar_url?: string | null;
          bio?: string | null;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          date_of_birth?: string | null;
          email?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          first_name?: string | null;
          gender?: string | null;
          id: string;
          insurance_policy_number?: string | null;
          insurance_provider?: string | null;
          is_active_customer?: boolean | null;
          language?: string | null;
          last_eye_exam_date?: string | null;
          last_name?: string | null;
          medical_conditions?: string[] | null;
          medical_notes?: string | null;
          medications?: string[] | null;
          newsletter_subscribed?: boolean | null;
          next_eye_exam_due?: string | null;
          phone?: string | null;
          postal_code?: string | null;
          preferred_branch_id?: string | null;
          preferred_contact_method?: string | null;
          rut?: string | null;
          state?: string | null;
          timezone?: string | null;
          updated_at?: string;
        };
        Update: {
          address_line_1?: string | null;
          address_line_2?: string | null;
          allergies?: string[] | null;
          avatar_url?: string | null;
          bio?: string | null;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          date_of_birth?: string | null;
          email?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          first_name?: string | null;
          gender?: string | null;
          id?: string;
          insurance_policy_number?: string | null;
          insurance_provider?: string | null;
          is_active_customer?: boolean | null;
          language?: string | null;
          last_eye_exam_date?: string | null;
          last_name?: string | null;
          medical_conditions?: string[] | null;
          medical_notes?: string | null;
          medications?: string[] | null;
          newsletter_subscribed?: boolean | null;
          next_eye_exam_due?: string | null;
          phone?: string | null;
          postal_code?: string | null;
          preferred_branch_id?: string | null;
          preferred_contact_method?: string | null;
          rut?: string | null;
          state?: string | null;
          timezone?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_preferred_branch_id_fkey";
            columns: ["preferred_branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
        ];
      };
      quote_settings: {
        Row: {
          branch_id: string | null;
          created_at: string | null;
          currency: string | null;
          default_expiration_days: number | null;
          default_labor_cost: number | null;
          default_margin_percentage: number | null;
          default_tax_percentage: number | null;
          id: string;
          labor_cost_includes_tax: boolean | null;
          lens_cost_includes_tax: boolean | null;
          lens_material_multipliers: Json | null;
          lens_type_base_costs: Json | null;
          notes_template: string | null;
          organization_id: string | null;
          terms_and_conditions: string | null;
          treatment_prices: Json | null;
          treatments_cost_includes_tax: boolean | null;
          updated_at: string | null;
          updated_by: string | null;
          use_treatments_table: boolean | null;
          volume_discounts: Json | null;
        };
        Insert: {
          branch_id?: string | null;
          created_at?: string | null;
          currency?: string | null;
          default_expiration_days?: number | null;
          default_labor_cost?: number | null;
          default_margin_percentage?: number | null;
          default_tax_percentage?: number | null;
          id?: string;
          labor_cost_includes_tax?: boolean | null;
          lens_cost_includes_tax?: boolean | null;
          lens_material_multipliers?: Json | null;
          lens_type_base_costs?: Json | null;
          notes_template?: string | null;
          organization_id?: string | null;
          terms_and_conditions?: string | null;
          treatment_prices?: Json | null;
          treatments_cost_includes_tax?: boolean | null;
          updated_at?: string | null;
          updated_by?: string | null;
          use_treatments_table?: boolean | null;
          volume_discounts?: Json | null;
        };
        Update: {
          branch_id?: string | null;
          created_at?: string | null;
          currency?: string | null;
          default_expiration_days?: number | null;
          default_labor_cost?: number | null;
          default_margin_percentage?: number | null;
          default_tax_percentage?: number | null;
          id?: string;
          labor_cost_includes_tax?: boolean | null;
          lens_cost_includes_tax?: boolean | null;
          lens_material_multipliers?: Json | null;
          lens_type_base_costs?: Json | null;
          notes_template?: string | null;
          organization_id?: string | null;
          terms_and_conditions?: string | null;
          treatment_prices?: Json | null;
          treatments_cost_includes_tax?: boolean | null;
          updated_at?: string | null;
          updated_by?: string | null;
          use_treatments_table?: boolean | null;
          volume_discounts?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "quote_settings_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_settings_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      quotes: {
        Row: {
          branch_id: string | null;
          contact_lens_cost: number | null;
          contact_lens_family_id: string | null;
          contact_lens_price: number | null;
          contact_lens_quantity: number | null;
          contact_lens_rx_add_od: number | null;
          contact_lens_rx_add_os: number | null;
          contact_lens_rx_axis_od: number | null;
          contact_lens_rx_axis_os: number | null;
          contact_lens_rx_base_curve_od: number | null;
          contact_lens_rx_base_curve_os: number | null;
          contact_lens_rx_cylinder_od: number | null;
          contact_lens_rx_cylinder_os: number | null;
          contact_lens_rx_diameter_od: number | null;
          contact_lens_rx_diameter_os: number | null;
          contact_lens_rx_sphere_od: number | null;
          contact_lens_rx_sphere_os: number | null;
          converted_to_work_order_id: string | null;
          created_at: string | null;
          created_by: string | null;
          currency: string | null;
          customer_id: string;
          customer_notes: string | null;
          customer_own_frame: boolean;
          customer_own_near_frame: boolean | null;
          discount_amount: number | null;
          discount_percentage: number | null;
          expiration_date: string | null;
          far_lens_cost: number | null;
          far_lens_family_id: string | null;
          field_operation_id: string | null;
          frame_brand: string | null;
          frame_color: string | null;
          frame_cost: number | null;
          frame_model: string | null;
          frame_name: string | null;
          frame_price: number | null;
          frame_product_id: string | null;
          frame_size: string | null;
          frame_sku: string | null;
          id: string;
          labor_cost: number | null;
          lens_cost: number | null;
          lens_family_id: string | null;
          lens_index: number | null;
          lens_material: string | null;
          lens_sourcing_type: string | null;
          lens_tint_color: string | null;
          lens_tint_percentage: number | null;
          lens_treatments: string[] | null;
          lens_type: string | null;
          near_frame_brand: string | null;
          near_frame_color: string | null;
          near_frame_cost: number | null;
          near_frame_model: string | null;
          near_frame_name: string | null;
          near_frame_price: number | null;
          near_frame_price_includes_tax: boolean | null;
          near_frame_product_id: string | null;
          near_frame_size: string | null;
          near_frame_sku: string | null;
          near_lens_cost: number | null;
          near_lens_family_id: string | null;
          notes: string | null;
          organization_id: string | null;
          original_status: string | null;
          presbyopia_solution: string | null;
          prescription_id: string | null;
          quote_date: string;
          quote_number: string;
          sent_at: string | null;
          sent_by: string | null;
          status: string | null;
          subtotal: number | null;
          tax_amount: number | null;
          terms_and_conditions: string | null;
          total_amount: number;
          treatments_cost: number | null;
          updated_at: string | null;
        };
        Insert: {
          branch_id?: string | null;
          contact_lens_cost?: number | null;
          contact_lens_family_id?: string | null;
          contact_lens_price?: number | null;
          contact_lens_quantity?: number | null;
          contact_lens_rx_add_od?: number | null;
          contact_lens_rx_add_os?: number | null;
          contact_lens_rx_axis_od?: number | null;
          contact_lens_rx_axis_os?: number | null;
          contact_lens_rx_base_curve_od?: number | null;
          contact_lens_rx_base_curve_os?: number | null;
          contact_lens_rx_cylinder_od?: number | null;
          contact_lens_rx_cylinder_os?: number | null;
          contact_lens_rx_diameter_od?: number | null;
          contact_lens_rx_diameter_os?: number | null;
          contact_lens_rx_sphere_od?: number | null;
          contact_lens_rx_sphere_os?: number | null;
          converted_to_work_order_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          currency?: string | null;
          customer_id: string;
          customer_notes?: string | null;
          customer_own_frame?: boolean;
          customer_own_near_frame?: boolean | null;
          discount_amount?: number | null;
          discount_percentage?: number | null;
          expiration_date?: string | null;
          far_lens_cost?: number | null;
          far_lens_family_id?: string | null;
          field_operation_id?: string | null;
          frame_brand?: string | null;
          frame_color?: string | null;
          frame_cost?: number | null;
          frame_model?: string | null;
          frame_name?: string | null;
          frame_price?: number | null;
          frame_product_id?: string | null;
          frame_size?: string | null;
          frame_sku?: string | null;
          id?: string;
          labor_cost?: number | null;
          lens_cost?: number | null;
          lens_family_id?: string | null;
          lens_index?: number | null;
          lens_material?: string | null;
          lens_sourcing_type?: string | null;
          lens_tint_color?: string | null;
          lens_tint_percentage?: number | null;
          lens_treatments?: string[] | null;
          lens_type?: string | null;
          near_frame_brand?: string | null;
          near_frame_color?: string | null;
          near_frame_cost?: number | null;
          near_frame_model?: string | null;
          near_frame_name?: string | null;
          near_frame_price?: number | null;
          near_frame_price_includes_tax?: boolean | null;
          near_frame_product_id?: string | null;
          near_frame_size?: string | null;
          near_frame_sku?: string | null;
          near_lens_cost?: number | null;
          near_lens_family_id?: string | null;
          notes?: string | null;
          organization_id?: string | null;
          original_status?: string | null;
          presbyopia_solution?: string | null;
          prescription_id?: string | null;
          quote_date?: string;
          quote_number: string;
          sent_at?: string | null;
          sent_by?: string | null;
          status?: string | null;
          subtotal?: number | null;
          tax_amount?: number | null;
          terms_and_conditions?: string | null;
          total_amount: number;
          treatments_cost?: number | null;
          updated_at?: string | null;
        };
        Update: {
          branch_id?: string | null;
          contact_lens_cost?: number | null;
          contact_lens_family_id?: string | null;
          contact_lens_price?: number | null;
          contact_lens_quantity?: number | null;
          contact_lens_rx_add_od?: number | null;
          contact_lens_rx_add_os?: number | null;
          contact_lens_rx_axis_od?: number | null;
          contact_lens_rx_axis_os?: number | null;
          contact_lens_rx_base_curve_od?: number | null;
          contact_lens_rx_base_curve_os?: number | null;
          contact_lens_rx_cylinder_od?: number | null;
          contact_lens_rx_cylinder_os?: number | null;
          contact_lens_rx_diameter_od?: number | null;
          contact_lens_rx_diameter_os?: number | null;
          contact_lens_rx_sphere_od?: number | null;
          contact_lens_rx_sphere_os?: number | null;
          converted_to_work_order_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          currency?: string | null;
          customer_id?: string;
          customer_notes?: string | null;
          customer_own_frame?: boolean;
          customer_own_near_frame?: boolean | null;
          discount_amount?: number | null;
          discount_percentage?: number | null;
          expiration_date?: string | null;
          far_lens_cost?: number | null;
          far_lens_family_id?: string | null;
          field_operation_id?: string | null;
          frame_brand?: string | null;
          frame_color?: string | null;
          frame_cost?: number | null;
          frame_model?: string | null;
          frame_name?: string | null;
          frame_price?: number | null;
          frame_product_id?: string | null;
          frame_size?: string | null;
          frame_sku?: string | null;
          id?: string;
          labor_cost?: number | null;
          lens_cost?: number | null;
          lens_family_id?: string | null;
          lens_index?: number | null;
          lens_material?: string | null;
          lens_sourcing_type?: string | null;
          lens_tint_color?: string | null;
          lens_tint_percentage?: number | null;
          lens_treatments?: string[] | null;
          lens_type?: string | null;
          near_frame_brand?: string | null;
          near_frame_color?: string | null;
          near_frame_cost?: number | null;
          near_frame_model?: string | null;
          near_frame_name?: string | null;
          near_frame_price?: number | null;
          near_frame_price_includes_tax?: boolean | null;
          near_frame_product_id?: string | null;
          near_frame_size?: string | null;
          near_frame_sku?: string | null;
          near_lens_cost?: number | null;
          near_lens_family_id?: string | null;
          notes?: string | null;
          organization_id?: string | null;
          original_status?: string | null;
          presbyopia_solution?: string | null;
          prescription_id?: string | null;
          quote_date?: string;
          quote_number?: string;
          sent_at?: string | null;
          sent_by?: string | null;
          status?: string | null;
          subtotal?: number | null;
          tax_amount?: number | null;
          terms_and_conditions?: string | null;
          total_amount?: number;
          treatments_cost?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "quotes_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_contact_lens_family_id_fkey";
            columns: ["contact_lens_family_id"];
            isOneToOne: false;
            referencedRelation: "contact_lens_families";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_far_lens_family_id_fkey";
            columns: ["far_lens_family_id"];
            isOneToOne: false;
            referencedRelation: "lens_families";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_field_operation_id_fkey";
            columns: ["field_operation_id"];
            isOneToOne: false;
            referencedRelation: "field_operations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_frame_product_id_fkey";
            columns: ["frame_product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_frame_product_id_fkey";
            columns: ["frame_product_id"];
            isOneToOne: false;
            referencedRelation: "products_with_stock";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_lens_family_id_fkey";
            columns: ["lens_family_id"];
            isOneToOne: false;
            referencedRelation: "lens_families";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_near_frame_product_id_fkey";
            columns: ["near_frame_product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_near_frame_product_id_fkey";
            columns: ["near_frame_product_id"];
            isOneToOne: false;
            referencedRelation: "products_with_stock";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_near_lens_family_id_fkey";
            columns: ["near_lens_family_id"];
            isOneToOne: false;
            referencedRelation: "lens_families";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_prescription_id_fkey";
            columns: ["prescription_id"];
            isOneToOne: false;
            referencedRelation: "prescriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      saas_backups: {
        Row: {
          backup_type: string;
          created_at: string;
          created_by: string | null;
          filename: string;
          id: string;
          size_bytes: number;
          source: string | null;
          status: string;
          storage_path: string;
        };
        Insert: {
          backup_type?: string;
          created_at?: string;
          created_by?: string | null;
          filename: string;
          id?: string;
          size_bytes?: number;
          source?: string | null;
          status?: string;
          storage_path: string;
        };
        Update: {
          backup_type?: string;
          created_at?: string;
          created_by?: string | null;
          filename?: string;
          id?: string;
          size_bytes?: number;
          source?: string | null;
          status?: string;
          storage_path?: string;
        };
        Relationships: [];
      };
      saas_support_messages: {
        Row: {
          attachments: Json | null;
          created_at: string;
          id: string;
          is_from_customer: boolean | null;
          is_internal: boolean | null;
          message: string;
          message_type: string | null;
          sender_email: string;
          sender_id: string | null;
          sender_name: string;
          ticket_id: string;
          updated_at: string;
        };
        Insert: {
          attachments?: Json | null;
          created_at?: string;
          id?: string;
          is_from_customer?: boolean | null;
          is_internal?: boolean | null;
          message: string;
          message_type?: string | null;
          sender_email: string;
          sender_id?: string | null;
          sender_name: string;
          ticket_id: string;
          updated_at?: string;
        };
        Update: {
          attachments?: Json | null;
          created_at?: string;
          id?: string;
          is_from_customer?: boolean | null;
          is_internal?: boolean | null;
          message?: string;
          message_type?: string | null;
          sender_email?: string;
          sender_id?: string | null;
          sender_name?: string;
          ticket_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saas_support_messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saas_support_messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "admin_users_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saas_support_messages_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "saas_support_tickets";
            referencedColumns: ["id"];
          },
        ];
      };
      saas_support_templates: {
        Row: {
          category: string | null;
          content: string;
          created_at: string;
          created_by: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          subject: string | null;
          updated_at: string;
          usage_count: number | null;
          variables: Json | null;
        };
        Insert: {
          category?: string | null;
          content: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          subject?: string | null;
          updated_at?: string;
          usage_count?: number | null;
          variables?: Json | null;
        };
        Update: {
          category?: string | null;
          content?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          subject?: string | null;
          updated_at?: string;
          usage_count?: number | null;
          variables?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "saas_support_templates_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saas_support_templates_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "admin_users_view";
            referencedColumns: ["id"];
          },
        ];
      };
      saas_support_tickets: {
        Row: {
          assigned_at: string | null;
          assigned_to: string | null;
          category: string;
          created_at: string;
          created_by_user_id: string | null;
          customer_feedback: string | null;
          customer_satisfaction_rating: number | null;
          description: string;
          first_response_at: string | null;
          id: string;
          last_response_at: string | null;
          metadata: Json | null;
          organization_id: string | null;
          priority: string;
          requester_email: string;
          requester_name: string | null;
          requester_role: string | null;
          resolution: string | null;
          resolution_time_minutes: number | null;
          resolved_at: string | null;
          resolved_by: string | null;
          response_time_minutes: number | null;
          status: string;
          subject: string;
          ticket_number: string;
          updated_at: string;
        };
        Insert: {
          assigned_at?: string | null;
          assigned_to?: string | null;
          category: string;
          created_at?: string;
          created_by_user_id?: string | null;
          customer_feedback?: string | null;
          customer_satisfaction_rating?: number | null;
          description: string;
          first_response_at?: string | null;
          id?: string;
          last_response_at?: string | null;
          metadata?: Json | null;
          organization_id?: string | null;
          priority?: string;
          requester_email: string;
          requester_name?: string | null;
          requester_role?: string | null;
          resolution?: string | null;
          resolution_time_minutes?: number | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          response_time_minutes?: number | null;
          status?: string;
          subject: string;
          ticket_number: string;
          updated_at?: string;
        };
        Update: {
          assigned_at?: string | null;
          assigned_to?: string | null;
          category?: string;
          created_at?: string;
          created_by_user_id?: string | null;
          customer_feedback?: string | null;
          customer_satisfaction_rating?: number | null;
          description?: string;
          first_response_at?: string | null;
          id?: string;
          last_response_at?: string | null;
          metadata?: Json | null;
          organization_id?: string | null;
          priority?: string;
          requester_email?: string;
          requester_name?: string | null;
          requester_role?: string | null;
          resolution?: string | null;
          resolution_time_minutes?: number | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          response_time_minutes?: number | null;
          status?: string;
          subject?: string;
          ticket_number?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saas_support_tickets_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saas_support_tickets_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "admin_users_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saas_support_tickets_created_by_user_id_fkey";
            columns: ["created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saas_support_tickets_created_by_user_id_fkey";
            columns: ["created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "admin_users_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saas_support_tickets_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saas_support_tickets_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saas_support_tickets_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "admin_users_view";
            referencedColumns: ["id"];
          },
        ];
      };
      schedule_settings: {
        Row: {
          blocked_dates: string[] | null;
          branch_id: string | null;
          buffer_time_minutes: number | null;
          created_at: string | null;
          default_appointment_duration: number | null;
          id: string;
          max_advance_booking_days: number | null;
          min_advance_booking_hours: number | null;
          organization_id: string | null;
          slot_duration_minutes: number | null;
          staff_specific_settings: Json | null;
          updated_at: string | null;
          updated_by: string | null;
          working_hours: Json | null;
        };
        Insert: {
          blocked_dates?: string[] | null;
          branch_id?: string | null;
          buffer_time_minutes?: number | null;
          created_at?: string | null;
          default_appointment_duration?: number | null;
          id?: string;
          max_advance_booking_days?: number | null;
          min_advance_booking_hours?: number | null;
          organization_id?: string | null;
          slot_duration_minutes?: number | null;
          staff_specific_settings?: Json | null;
          updated_at?: string | null;
          updated_by?: string | null;
          working_hours?: Json | null;
        };
        Update: {
          blocked_dates?: string[] | null;
          branch_id?: string | null;
          buffer_time_minutes?: number | null;
          created_at?: string | null;
          default_appointment_duration?: number | null;
          id?: string;
          max_advance_booking_days?: number | null;
          min_advance_booking_hours?: number | null;
          organization_id?: string | null;
          slot_duration_minutes?: number | null;
          staff_specific_settings?: Json | null;
          updated_at?: string | null;
          updated_by?: string | null;
          working_hours?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "schedule_settings_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_settings_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      subscription_tiers: {
        Row: {
          created_at: string;
          features: Json | null;
          gateway_plan_id: string | null;
          id: string;
          max_branches: number | null;
          max_customers: number | null;
          max_products: number | null;
          max_users: number | null;
          name: string;
          price_monthly: number;
        };
        Insert: {
          created_at?: string;
          features?: Json | null;
          gateway_plan_id?: string | null;
          id?: string;
          max_branches?: number | null;
          max_customers?: number | null;
          max_products?: number | null;
          max_users?: number | null;
          name: string;
          price_monthly: number;
        };
        Update: {
          created_at?: string;
          features?: Json | null;
          gateway_plan_id?: string | null;
          id?: string;
          max_branches?: number | null;
          max_customers?: number | null;
          max_products?: number | null;
          max_users?: number | null;
          name?: string;
          price_monthly?: number;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          cancel_at: string | null;
          canceled_at: string | null;
          created_at: string;
          current_period_end: string | null;
          current_period_start: string | null;
          gateway: string | null;
          gateway_customer_id: string | null;
          gateway_payment_method_id: string | null;
          gateway_subscription_id: string | null;
          id: string;
          organization_id: string;
          status: string | null;
          trial_ends_at: string | null;
          updated_at: string;
        };
        Insert: {
          cancel_at?: string | null;
          canceled_at?: string | null;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          gateway?: string | null;
          gateway_customer_id?: string | null;
          gateway_payment_method_id?: string | null;
          gateway_subscription_id?: string | null;
          id?: string;
          organization_id: string;
          status?: string | null;
          trial_ends_at?: string | null;
          updated_at?: string;
        };
        Update: {
          cancel_at?: string | null;
          canceled_at?: string | null;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          gateway?: string | null;
          gateway_customer_id?: string | null;
          gateway_payment_method_id?: string | null;
          gateway_subscription_id?: string | null;
          id?: string;
          organization_id?: string;
          status?: string | null;
          trial_ends_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      support_categories: {
        Row: {
          branch_id: string | null;
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          sort_order: number | null;
          updated_at: string;
        };
        Insert: {
          branch_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          sort_order?: number | null;
          updated_at?: string;
        };
        Update: {
          branch_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          sort_order?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "support_categories_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
        ];
      };
      support_messages: {
        Row: {
          attachments: Json | null;
          created_at: string;
          id: string;
          is_from_customer: boolean | null;
          is_internal: boolean | null;
          message: string;
          message_type: string | null;
          sender_email: string | null;
          sender_id: string | null;
          sender_name: string | null;
          ticket_id: string;
          updated_at: string;
        };
        Insert: {
          attachments?: Json | null;
          created_at?: string;
          id?: string;
          is_from_customer?: boolean | null;
          is_internal?: boolean | null;
          message: string;
          message_type?: string | null;
          sender_email?: string | null;
          sender_id?: string | null;
          sender_name?: string | null;
          ticket_id: string;
          updated_at?: string;
        };
        Update: {
          attachments?: Json | null;
          created_at?: string;
          id?: string;
          is_from_customer?: boolean | null;
          is_internal?: boolean | null;
          message?: string;
          message_type?: string | null;
          sender_email?: string | null;
          sender_id?: string | null;
          sender_name?: string | null;
          ticket_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "support_tickets";
            referencedColumns: ["id"];
          },
        ];
      };
      support_templates: {
        Row: {
          category_id: string | null;
          content: string;
          created_at: string;
          created_by: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          subject: string | null;
          updated_at: string;
          usage_count: number | null;
          variables: Json | null;
        };
        Insert: {
          category_id?: string | null;
          content: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          subject?: string | null;
          updated_at?: string;
          usage_count?: number | null;
          variables?: Json | null;
        };
        Update: {
          category_id?: string | null;
          content?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          subject?: string | null;
          updated_at?: string;
          usage_count?: number | null;
          variables?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "support_templates_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "support_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "support_templates_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "support_templates_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "admin_users_view";
            referencedColumns: ["id"];
          },
        ];
      };
      support_tickets: {
        Row: {
          assigned_at: string | null;
          assigned_to: string | null;
          branch_id: string | null;
          category_id: string | null;
          created_at: string;
          customer_email: string;
          customer_id: string | null;
          customer_name: string | null;
          customer_satisfaction_rating: number | null;
          description: string;
          first_response_at: string | null;
          id: string;
          last_response_at: string | null;
          order_id: string | null;
          priority: Database["public"]["Enums"]["support_priority"] | null;
          resolution: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          status: Database["public"]["Enums"]["support_status"] | null;
          subject: string;
          ticket_number: string;
          updated_at: string;
        };
        Insert: {
          assigned_at?: string | null;
          assigned_to?: string | null;
          branch_id?: string | null;
          category_id?: string | null;
          created_at?: string;
          customer_email: string;
          customer_id?: string | null;
          customer_name?: string | null;
          customer_satisfaction_rating?: number | null;
          description: string;
          first_response_at?: string | null;
          id?: string;
          last_response_at?: string | null;
          order_id?: string | null;
          priority?: Database["public"]["Enums"]["support_priority"] | null;
          resolution?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: Database["public"]["Enums"]["support_status"] | null;
          subject: string;
          ticket_number: string;
          updated_at?: string;
        };
        Update: {
          assigned_at?: string | null;
          assigned_to?: string | null;
          branch_id?: string | null;
          category_id?: string | null;
          created_at?: string;
          customer_email?: string;
          customer_id?: string | null;
          customer_name?: string | null;
          customer_satisfaction_rating?: number | null;
          description?: string;
          first_response_at?: string | null;
          id?: string;
          last_response_at?: string | null;
          order_id?: string | null;
          priority?: Database["public"]["Enums"]["support_priority"] | null;
          resolution?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: Database["public"]["Enums"]["support_status"] | null;
          subject?: string;
          ticket_number?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "support_tickets_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "admin_users_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "support_tickets_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "support_tickets_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "support_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "support_tickets_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "support_tickets_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "support_tickets_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "admin_users_view";
            referencedColumns: ["id"];
          },
        ];
      };
      survey_invitations: {
        Row: {
          created_at: string;
          customer_id: string | null;
          expires_at: string;
          id: string;
          organization_id: string;
          token: string;
          used_at: string | null;
          work_order_id: string;
        };
        Insert: {
          created_at?: string;
          customer_id?: string | null;
          expires_at: string;
          id?: string;
          organization_id: string;
          token: string;
          used_at?: string | null;
          work_order_id: string;
        };
        Update: {
          created_at?: string;
          customer_id?: string | null;
          expires_at?: string;
          id?: string;
          organization_id?: string;
          token?: string;
          used_at?: string | null;
          work_order_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "survey_invitations_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "survey_invitations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "survey_invitations_work_order_id_fkey";
            columns: ["work_order_id"];
            isOneToOne: false;
            referencedRelation: "lab_work_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      system_config: {
        Row: {
          branch_id: string | null;
          category: string;
          config_key: string;
          config_value: Json;
          created_at: string;
          description: string | null;
          id: string;
          is_public: boolean | null;
          is_sensitive: boolean | null;
          last_modified_by: string | null;
          organization_id: string | null;
          updated_at: string;
          validation_rules: Json | null;
          value_type: string | null;
        };
        Insert: {
          branch_id?: string | null;
          category?: string;
          config_key: string;
          config_value: Json;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_public?: boolean | null;
          is_sensitive?: boolean | null;
          last_modified_by?: string | null;
          organization_id?: string | null;
          updated_at?: string;
          validation_rules?: Json | null;
          value_type?: string | null;
        };
        Update: {
          branch_id?: string | null;
          category?: string;
          config_key?: string;
          config_value?: Json;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_public?: boolean | null;
          is_sensitive?: boolean | null;
          last_modified_by?: string | null;
          organization_id?: string | null;
          updated_at?: string;
          validation_rules?: Json | null;
          value_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "system_config_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "system_config_last_modified_by_fkey";
            columns: ["last_modified_by"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "system_config_last_modified_by_fkey";
            columns: ["last_modified_by"];
            isOneToOne: false;
            referencedRelation: "admin_users_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "system_config_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      system_email_templates: {
        Row: {
          category: string | null;
          content: string;
          created_at: string;
          created_by: string | null;
          id: string;
          is_active: boolean | null;
          is_default: boolean | null;
          is_system: boolean | null;
          last_used_at: string | null;
          name: string;
          organization_id: string | null;
          subject: string;
          template_group: string | null;
          type: string;
          updated_at: string;
          usage_count: number | null;
          variables: Json | null;
        };
        Insert: {
          category?: string | null;
          content: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_default?: boolean | null;
          is_system?: boolean | null;
          last_used_at?: string | null;
          name: string;
          organization_id?: string | null;
          subject: string;
          template_group?: string | null;
          type: string;
          updated_at?: string;
          usage_count?: number | null;
          variables?: Json | null;
        };
        Update: {
          category?: string | null;
          content?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_default?: boolean | null;
          is_system?: boolean | null;
          last_used_at?: string | null;
          name?: string;
          organization_id?: string | null;
          subject?: string;
          template_group?: string | null;
          type?: string;
          updated_at?: string;
          usage_count?: number | null;
          variables?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "system_email_templates_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "system_email_templates_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "admin_users_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "system_email_templates_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      system_health_metrics: {
        Row: {
          category: string;
          collected_at: string;
          expires_at: string | null;
          id: string;
          is_healthy: boolean | null;
          metadata: Json | null;
          metric_name: string;
          metric_unit: string | null;
          metric_value: number;
          subcategory: string | null;
          threshold_critical: number | null;
          threshold_warning: number | null;
        };
        Insert: {
          category?: string;
          collected_at?: string;
          expires_at?: string | null;
          id?: string;
          is_healthy?: boolean | null;
          metadata?: Json | null;
          metric_name: string;
          metric_unit?: string | null;
          metric_value: number;
          subcategory?: string | null;
          threshold_critical?: number | null;
          threshold_warning?: number | null;
        };
        Update: {
          category?: string;
          collected_at?: string;
          expires_at?: string | null;
          id?: string;
          is_healthy?: boolean | null;
          metadata?: Json | null;
          metric_name?: string;
          metric_unit?: string | null;
          metric_value?: number;
          subcategory?: string | null;
          threshold_critical?: number | null;
          threshold_warning?: number | null;
        };
        Relationships: [];
      };
      system_maintenance_log: {
        Row: {
          automated: boolean | null;
          completed_at: string | null;
          created_at: string;
          description: string | null;
          duration_seconds: number | null;
          error_message: string | null;
          executed_by: string | null;
          id: string;
          parameters: Json | null;
          result_data: Json | null;
          started_at: string | null;
          status: string | null;
          task_name: string;
          task_type: string;
          updated_at: string;
        };
        Insert: {
          automated?: boolean | null;
          completed_at?: string | null;
          created_at?: string;
          description?: string | null;
          duration_seconds?: number | null;
          error_message?: string | null;
          executed_by?: string | null;
          id?: string;
          parameters?: Json | null;
          result_data?: Json | null;
          started_at?: string | null;
          status?: string | null;
          task_name: string;
          task_type: string;
          updated_at?: string;
        };
        Update: {
          automated?: boolean | null;
          completed_at?: string | null;
          created_at?: string;
          description?: string | null;
          duration_seconds?: number | null;
          error_message?: string | null;
          executed_by?: string | null;
          id?: string;
          parameters?: Json | null;
          result_data?: Json | null;
          started_at?: string | null;
          status?: string | null;
          task_name?: string;
          task_type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "system_maintenance_log_executed_by_fkey";
            columns: ["executed_by"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "system_maintenance_log_executed_by_fkey";
            columns: ["executed_by"];
            isOneToOne: false;
            referencedRelation: "admin_users_view";
            referencedColumns: ["id"];
          },
        ];
      };
      telemetry_aggregates: {
        Row: {
          avg_response_time: number | null;
          created_at: string;
          date: string;
          error_rate: number | null;
          feature_usage: Json | null;
          id: string;
          organization_id: string | null;
          page_views: Json | null;
          period: string;
          total_events: number | null;
          unique_sessions: number | null;
          unique_users: number | null;
          updated_at: string;
        };
        Insert: {
          avg_response_time?: number | null;
          created_at?: string;
          date: string;
          error_rate?: number | null;
          feature_usage?: Json | null;
          id?: string;
          organization_id?: string | null;
          page_views?: Json | null;
          period: string;
          total_events?: number | null;
          unique_sessions?: number | null;
          unique_users?: number | null;
          updated_at?: string;
        };
        Update: {
          avg_response_time?: number | null;
          created_at?: string;
          date?: string;
          error_rate?: number | null;
          feature_usage?: Json | null;
          id?: string;
          organization_id?: string | null;
          page_views?: Json | null;
          period?: string;
          total_events?: number | null;
          unique_sessions?: number | null;
          unique_users?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "telemetry_aggregates_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      telemetry_config: {
        Row: {
          anonymize_ip: boolean | null;
          created_at: string;
          enabled: boolean | null;
          exclude_sensitive_paths: string[] | null;
          id: string;
          organization_id: string | null;
          retention_days: number | null;
          sampling_rate: number | null;
          track_errors: boolean | null;
          track_feature_usage: boolean | null;
          track_page_views: boolean | null;
          track_performance: boolean | null;
          updated_at: string;
        };
        Insert: {
          anonymize_ip?: boolean | null;
          created_at?: string;
          enabled?: boolean | null;
          exclude_sensitive_paths?: string[] | null;
          id?: string;
          organization_id?: string | null;
          retention_days?: number | null;
          sampling_rate?: number | null;
          track_errors?: boolean | null;
          track_feature_usage?: boolean | null;
          track_page_views?: boolean | null;
          track_performance?: boolean | null;
          updated_at?: string;
        };
        Update: {
          anonymize_ip?: boolean | null;
          created_at?: string;
          enabled?: boolean | null;
          exclude_sensitive_paths?: string[] | null;
          id?: string;
          organization_id?: string | null;
          retention_days?: number | null;
          sampling_rate?: number | null;
          track_errors?: boolean | null;
          track_feature_usage?: boolean | null;
          track_page_views?: boolean | null;
          track_performance?: boolean | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "telemetry_config_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: true;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      telemetry_events: {
        Row: {
          browser: string | null;
          created_at: string;
          device_type: string | null;
          duration: number | null;
          event_name: string;
          event_type: string;
          id: string;
          ip_address: unknown;
          organization_id: string | null;
          os: string | null;
          page_url: string | null;
          payload: Json | null;
          performance_data: Json | null;
          processed: boolean | null;
          processed_at: string | null;
          referrer: string | null;
          screen_size: string | null;
          session_id: string | null;
          timestamp: string;
          user_agent: string | null;
          user_id: string | null;
        };
        Insert: {
          browser?: string | null;
          created_at?: string;
          device_type?: string | null;
          duration?: number | null;
          event_name: string;
          event_type: string;
          id?: string;
          ip_address?: unknown;
          organization_id?: string | null;
          os?: string | null;
          page_url?: string | null;
          payload?: Json | null;
          performance_data?: Json | null;
          processed?: boolean | null;
          processed_at?: string | null;
          referrer?: string | null;
          screen_size?: string | null;
          session_id?: string | null;
          timestamp?: string;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Update: {
          browser?: string | null;
          created_at?: string;
          device_type?: string | null;
          duration?: number | null;
          event_name?: string;
          event_type?: string;
          id?: string;
          ip_address?: unknown;
          organization_id?: string | null;
          os?: string | null;
          page_url?: string | null;
          payload?: Json | null;
          performance_data?: Json | null;
          processed?: boolean | null;
          processed_at?: string | null;
          referrer?: string | null;
          screen_size?: string | null;
          session_id?: string | null;
          timestamp?: string;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "telemetry_events_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      tier_change_audit: {
        Row: {
          changed_by_user_id: string | null;
          created_at: string;
          from_tier: string;
          id: string;
          organization_id: string;
          source: string;
          to_tier: string;
        };
        Insert: {
          changed_by_user_id?: string | null;
          created_at?: string;
          from_tier: string;
          id?: string;
          organization_id: string;
          source: string;
          to_tier: string;
        };
        Update: {
          changed_by_user_id?: string | null;
          created_at?: string;
          from_tier?: string;
          id?: string;
          organization_id?: string;
          source?: string;
          to_tier?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tier_change_audit_changed_by_user_id_fkey";
            columns: ["changed_by_user_id"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tier_change_audit_changed_by_user_id_fkey";
            columns: ["changed_by_user_id"];
            isOneToOne: false;
            referencedRelation: "admin_users_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tier_change_audit_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      treatments: {
        Row: {
          applied_in: string | null;
          category: string | null;
          created_at: string | null;
          default_price: number;
          description: string | null;
          exclusions: Json | null;
          id: string;
          is_active: boolean | null;
          is_default: boolean | null;
          lens_type_compatibility: string[] | null;
          material_compatibility: string[] | null;
          name: string;
          organization_id: string;
          price_override: Json | null;
          treatment_key: string;
          treatment_type: string;
          updated_at: string | null;
        };
        Insert: {
          applied_in?: string | null;
          category?: string | null;
          created_at?: string | null;
          default_price: number;
          description?: string | null;
          exclusions?: Json | null;
          id?: string;
          is_active?: boolean | null;
          is_default?: boolean | null;
          lens_type_compatibility?: string[] | null;
          material_compatibility?: string[] | null;
          name: string;
          organization_id: string;
          price_override?: Json | null;
          treatment_key: string;
          treatment_type?: string;
          updated_at?: string | null;
        };
        Update: {
          applied_in?: string | null;
          category?: string | null;
          created_at?: string | null;
          default_price?: number;
          description?: string | null;
          exclusions?: Json | null;
          id?: string;
          is_active?: boolean | null;
          is_default?: boolean | null;
          lens_type_compatibility?: string[] | null;
          material_compatibility?: string[] | null;
          name?: string;
          organization_id?: string;
          price_override?: Json | null;
          treatment_key?: string;
          treatment_type?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "treatments_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      user_tour_progress: {
        Row: {
          completed_at: string | null;
          completed_steps: number[] | null;
          created_at: string;
          current_step: number | null;
          id: string;
          last_accessed_at: string | null;
          organization_id: string | null;
          skip_on_next_login: boolean | null;
          started_at: string | null;
          status: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          completed_steps?: number[] | null;
          created_at?: string;
          current_step?: number | null;
          id?: string;
          last_accessed_at?: string | null;
          organization_id?: string | null;
          skip_on_next_login?: boolean | null;
          started_at?: string | null;
          status?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          completed_steps?: number[] | null;
          created_at?: string;
          current_step?: number | null;
          id?: string;
          last_accessed_at?: string | null;
          organization_id?: string | null;
          skip_on_next_login?: boolean | null;
          started_at?: string | null;
          status?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_tour_progress_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      vehicles: {
        Row: {
          capacity: number | null;
          created_at: string;
          id: string;
          is_active: boolean | null;
          model: string | null;
          organization_id: string;
          plate_number: string;
          updated_at: string;
        };
        Insert: {
          capacity?: number | null;
          created_at?: string;
          id?: string;
          is_active?: boolean | null;
          model?: string | null;
          organization_id: string;
          plate_number: string;
          updated_at?: string;
        };
        Update: {
          capacity?: number | null;
          created_at?: string;
          id?: string;
          is_active?: boolean | null;
          model?: string | null;
          organization_id?: string;
          plate_number?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vehicles_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      webhook_events: {
        Row: {
          created_at: string;
          event_type: string;
          gateway: string;
          gateway_event_id: string;
          id: string;
          metadata: Json | null;
          payment_id: string | null;
          processed: boolean;
          processed_at: string | null;
        };
        Insert: {
          created_at?: string;
          event_type: string;
          gateway: string;
          gateway_event_id: string;
          id?: string;
          metadata?: Json | null;
          payment_id?: string | null;
          processed?: boolean;
          processed_at?: string | null;
        };
        Update: {
          created_at?: string;
          event_type?: string;
          gateway?: string;
          gateway_event_id?: string;
          id?: string;
          metadata?: Json | null;
          payment_id?: string | null;
          processed?: boolean;
          processed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "webhook_events_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
        ];
      };
      whatsapp_phone_numbers: {
        Row: {
          access_token_encrypted: string | null;
          created_at: string;
          display_phone_number: string | null;
          id: string;
          organization_id: string;
          phone_number_id: string;
          updated_at: string;
          waba_id: string;
        };
        Insert: {
          access_token_encrypted?: string | null;
          created_at?: string;
          display_phone_number?: string | null;
          id?: string;
          organization_id: string;
          phone_number_id: string;
          updated_at?: string;
          waba_id: string;
        };
        Update: {
          access_token_encrypted?: string | null;
          created_at?: string;
          display_phone_number?: string | null;
          id?: string;
          organization_id?: string;
          phone_number_id?: string;
          updated_at?: string;
          waba_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "whatsapp_phone_numbers_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      admin_users_view: {
        Row: {
          created_at: string | null;
          email: string | null;
          full_name: string | null;
          id: string | null;
          is_active: boolean | null;
          last_login: string | null;
          role: string | null;
        };
        Relationships: [];
      };
      products_with_stock: {
        Row: {
          barcode: string | null;
          benefits: string[] | null;
          blue_light_filter: boolean | null;
          blue_light_filter_percentage: number | null;
          branch_id: string | null;
          brand: string | null;
          category_id: string | null;
          certifications: string[] | null;
          collections: string[] | null;
          compare_at_price: number | null;
          compatible_with: string[] | null;
          cost_price: number | null;
          created_at: string | null;
          currency: string | null;
          description: string | null;
          dimensions: Json | null;
          featured_image: string | null;
          frame_age_group: string | null;
          frame_brand: string | null;
          frame_color: string | null;
          frame_colors: string[] | null;
          frame_features: string[] | null;
          frame_gender: string | null;
          frame_material: string | null;
          frame_measurements: Json | null;
          frame_model: string | null;
          frame_shape: string | null;
          frame_size: string | null;
          frame_sku: string | null;
          frame_type: string | null;
          gallery: Json | null;
          id: string | null;
          ingredients: Json | null;
          inventory_policy: string | null;
          inventory_quantity: number | null;
          is_customizable: boolean | null;
          is_digital: boolean | null;
          is_featured: boolean | null;
          lens_coatings: string[] | null;
          lens_index: number | null;
          lens_material: string | null;
          lens_tint_options: string[] | null;
          lens_type: string | null;
          low_stock_threshold: number | null;
          manufacturer: string | null;
          meta_description: string | null;
          meta_title: string | null;
          model_number: string | null;
          name: string | null;
          optical_category: string | null;
          organization_id: string | null;
          package_characteristics: string | null;
          photochromic: boolean | null;
          photochromic_tint_levels: Json | null;
          precautions: string | null;
          prescription_available: boolean | null;
          prescription_range: Json | null;
          price: number | null;
          price_includes_tax: boolean | null;
          product_type: string | null;
          published_at: string | null;
          requires_prescription: boolean | null;
          requires_shipping: boolean | null;
          search_keywords: string[] | null;
          shelf_life_months: number | null;
          short_description: string | null;
          skin_type: string[] | null;
          sku: string | null;
          slug: string | null;
          status: string | null;
          tags: string[] | null;
          total_available_quantity: number | null;
          total_inventory_quantity: number | null;
          track_inventory: boolean | null;
          updated_at: string | null;
          usage_instructions: string | null;
          uv_protection: string | null;
          vendor: string | null;
          video_url: string | null;
          warranty_details: string | null;
          warranty_months: number | null;
          weight: number | null;
        };
        Insert: {
          barcode?: string | null;
          benefits?: string[] | null;
          blue_light_filter?: boolean | null;
          blue_light_filter_percentage?: number | null;
          branch_id?: string | null;
          brand?: string | null;
          category_id?: string | null;
          certifications?: string[] | null;
          collections?: string[] | null;
          compare_at_price?: number | null;
          compatible_with?: string[] | null;
          cost_price?: number | null;
          created_at?: string | null;
          currency?: string | null;
          description?: string | null;
          dimensions?: Json | null;
          featured_image?: string | null;
          frame_age_group?: string | null;
          frame_brand?: string | null;
          frame_color?: string | null;
          frame_colors?: string[] | null;
          frame_features?: string[] | null;
          frame_gender?: string | null;
          frame_material?: string | null;
          frame_measurements?: Json | null;
          frame_model?: string | null;
          frame_shape?: string | null;
          frame_size?: string | null;
          frame_sku?: string | null;
          frame_type?: string | null;
          gallery?: Json | null;
          id?: string | null;
          ingredients?: Json | null;
          inventory_policy?: string | null;
          inventory_quantity?: number | null;
          is_customizable?: boolean | null;
          is_digital?: boolean | null;
          is_featured?: boolean | null;
          lens_coatings?: string[] | null;
          lens_index?: number | null;
          lens_material?: string | null;
          lens_tint_options?: string[] | null;
          lens_type?: string | null;
          low_stock_threshold?: number | null;
          manufacturer?: string | null;
          meta_description?: string | null;
          meta_title?: string | null;
          model_number?: string | null;
          name?: string | null;
          optical_category?: string | null;
          organization_id?: string | null;
          package_characteristics?: string | null;
          photochromic?: boolean | null;
          photochromic_tint_levels?: Json | null;
          precautions?: string | null;
          prescription_available?: boolean | null;
          prescription_range?: Json | null;
          price?: number | null;
          price_includes_tax?: boolean | null;
          product_type?: string | null;
          published_at?: string | null;
          requires_prescription?: boolean | null;
          requires_shipping?: boolean | null;
          search_keywords?: string[] | null;
          shelf_life_months?: number | null;
          short_description?: string | null;
          skin_type?: string[] | null;
          sku?: string | null;
          slug?: string | null;
          status?: string | null;
          tags?: string[] | null;
          total_available_quantity?: never;
          total_inventory_quantity?: never;
          track_inventory?: boolean | null;
          updated_at?: string | null;
          usage_instructions?: string | null;
          uv_protection?: string | null;
          vendor?: string | null;
          video_url?: string | null;
          warranty_details?: string | null;
          warranty_months?: number | null;
          weight?: number | null;
        };
        Update: {
          barcode?: string | null;
          benefits?: string[] | null;
          blue_light_filter?: boolean | null;
          blue_light_filter_percentage?: number | null;
          branch_id?: string | null;
          brand?: string | null;
          category_id?: string | null;
          certifications?: string[] | null;
          collections?: string[] | null;
          compare_at_price?: number | null;
          compatible_with?: string[] | null;
          cost_price?: number | null;
          created_at?: string | null;
          currency?: string | null;
          description?: string | null;
          dimensions?: Json | null;
          featured_image?: string | null;
          frame_age_group?: string | null;
          frame_brand?: string | null;
          frame_color?: string | null;
          frame_colors?: string[] | null;
          frame_features?: string[] | null;
          frame_gender?: string | null;
          frame_material?: string | null;
          frame_measurements?: Json | null;
          frame_model?: string | null;
          frame_shape?: string | null;
          frame_size?: string | null;
          frame_sku?: string | null;
          frame_type?: string | null;
          gallery?: Json | null;
          id?: string | null;
          ingredients?: Json | null;
          inventory_policy?: string | null;
          inventory_quantity?: number | null;
          is_customizable?: boolean | null;
          is_digital?: boolean | null;
          is_featured?: boolean | null;
          lens_coatings?: string[] | null;
          lens_index?: number | null;
          lens_material?: string | null;
          lens_tint_options?: string[] | null;
          lens_type?: string | null;
          low_stock_threshold?: number | null;
          manufacturer?: string | null;
          meta_description?: string | null;
          meta_title?: string | null;
          model_number?: string | null;
          name?: string | null;
          optical_category?: string | null;
          organization_id?: string | null;
          package_characteristics?: string | null;
          photochromic?: boolean | null;
          photochromic_tint_levels?: Json | null;
          precautions?: string | null;
          prescription_available?: boolean | null;
          prescription_range?: Json | null;
          price?: number | null;
          price_includes_tax?: boolean | null;
          product_type?: string | null;
          published_at?: string | null;
          requires_prescription?: boolean | null;
          requires_shipping?: boolean | null;
          search_keywords?: string[] | null;
          shelf_life_months?: number | null;
          short_description?: string | null;
          skin_type?: string[] | null;
          sku?: string | null;
          slug?: string | null;
          status?: string | null;
          tags?: string[] | null;
          total_available_quantity?: never;
          total_inventory_quantity?: never;
          track_inventory?: boolean | null;
          updated_at?: string | null;
          usage_instructions?: string | null;
          uv_protection?: string | null;
          vendor?: string | null;
          video_url?: string | null;
          warranty_details?: string | null;
          warranty_months?: number | null;
          weight?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "products_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      support_ticket_stats: {
        Row: {
          avg_resolution_time_hours: number | null;
          closed_tickets: number | null;
          high_priority_tickets: number | null;
          in_progress_tickets: number | null;
          open_tickets: number | null;
          pending_customer_tickets: number | null;
          resolved_tickets: number | null;
          tickets_this_month: number | null;
          tickets_this_week: number | null;
          total_tickets: number | null;
          urgent_tickets: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      archive_old_telemetry_data: {
        Args: { archive_before_date?: string };
        Returns: {
          archive_date: string;
          archived_count: number;
        }[];
      };
      calculate_contact_lens_price: {
        Args: {
          p_addition?: number;
          p_axis?: number;
          p_contact_lens_family_id: string;
          p_cylinder?: number;
          p_organization_id?: string;
          p_sphere: number;
        };
        Returns: {
          base_curve: number;
          cost: number;
          diameter: number;
          price: number;
        }[];
      };
      calculate_iva: {
        Args: { amount: number; include_iva?: boolean };
        Returns: number;
      };
      calculate_lens_price:
        | {
            Args: {
              p_addition?: number;
              p_cylinder?: number;
              p_lens_family_id: string;
              p_sourcing_type?: string;
              p_sphere: number;
            };
            Returns: {
              cost: number;
              price: number;
              sourcing_type: string;
            }[];
          }
        | {
            Args: {
              p_cylinder?: number;
              p_lens_family_id: string;
              p_sourcing_type?: string;
              p_sphere: number;
            };
            Returns: {
              cost: number;
              price: number;
              sourcing_type: string;
            }[];
          };
      calculate_order_balance: {
        Args: { p_order_id: string };
        Returns: number;
      };
      calculate_treatments_total: {
        Args: { p_lens_material?: string; p_treatment_keys: string[] };
        Returns: number;
      };
      can_access_branch: {
        Args: { p_branch_id?: string; user_id?: string };
        Returns: boolean;
      };
      check_and_expire_quotes: { Args: never; Returns: undefined };
      check_appointment_availability: {
        Args: {
          p_appointment_id?: string;
          p_branch_id?: string;
          p_date: string;
          p_duration_minutes?: number;
          p_staff_id?: string;
          p_time: string;
        };
        Returns: boolean;
      };
      check_contact_lens_stock: {
        Args: {
          p_branch_id: string;
          p_contact_lens_family_id: string;
          p_cylinder: number;
          p_sphere: number;
        };
        Returns: {
          available_quantity: number;
          has_stock: boolean;
          inventory_id: string;
        }[];
      };
      cleanup_expired_demo_organizations: {
        Args: never;
        Returns: {
          deleted_org_id: string;
          deleted_org_slug: string;
        }[];
      };
      cleanup_old_notifications: { Args: never; Returns: undefined };
      cleanup_old_telemetry_data: { Args: never; Returns: undefined };
      collect_system_health_metrics: { Args: never; Returns: undefined };
      create_demo_organization_for_user: {
        Args: { p_demo_type?: string; p_user_id: string };
        Returns: string;
      };
      create_lens_family_full: {
        Args: { p_family_data: Json; p_matrices_data: Json };
        Returns: Json;
      };
      decrement_inventory: {
        Args: { product_id: string; quantity: number };
        Returns: boolean;
      };
      delete_campaign_cascade: {
        Args: { p_campaign_id: string };
        Returns: undefined;
      };
      delete_demo_request_and_org: {
        Args: { p_request_id: string };
        Returns: {
          deleted_org_id: string;
          deleted_request_id: string;
        }[];
      };
      expire_quotes: { Args: never; Returns: number };
      generate_agreement_institutional_invoice_folio: {
        Args: { p_branch_id: string };
        Returns: string;
      };
      generate_billing_folio: {
        Args: { p_branch_id: string; p_document_type: string };
        Returns: string;
      };
      generate_credit_note_number: { Args: never; Returns: string };
      generate_internal_order_number: {
        Args: { org_id: string };
        Returns: string;
      };
      generate_optical_internal_ticket_number: { Args: never; Returns: string };
      generate_quote_number: { Args: never; Returns: string };
      generate_saas_ticket_number: { Args: never; Returns: string };
      generate_sii_invoice_number: {
        Args: { invoice_type: string };
        Returns: string;
      };
      generate_ticket_number: { Args: never; Returns: string };
      generate_work_order_number: { Args: never; Returns: string };
      get_admin_role: { Args: { user_id?: string }; Returns: string };
      get_auth_user_id_by_email: { Args: { p_email: string }; Returns: string };
      get_available_time_slots: {
        Args: {
          p_branch_id?: string;
          p_date: string;
          p_duration_minutes?: number;
          p_staff_id?: string;
        };
        Returns: {
          available: boolean;
          time_slot: string;
        }[];
      };
      get_current_branch_id: { Args: never; Returns: string };
      get_current_prescription: {
        Args: { customer_uuid: string };
        Returns: {
          expiration_date: string;
          id: string;
          od_axis: number;
          od_cylinder: number;
          od_sphere: number;
          os_axis: number;
          os_cylinder: number;
          os_sphere: number;
          prescription_date: string;
        }[];
      };
      get_min_deposit: {
        Args: { p_branch_id?: string; p_order_total: number };
        Returns: number;
      };
      get_notification_priority:
        | {
            Args: {
              p_default_priority?: Database["public"]["Enums"]["admin_notification_priority"];
              p_notification_type: Database["public"]["Enums"]["admin_notification_type"];
            };
            Returns: Database["public"]["Enums"]["admin_notification_priority"];
          }
        | {
            Args: {
              p_branch_id?: string;
              p_default_priority?: Database["public"]["Enums"]["admin_notification_priority"];
              p_notification_type: Database["public"]["Enums"]["admin_notification_type"];
              p_organization_id?: string;
            };
            Returns: Database["public"]["Enums"]["admin_notification_priority"];
          };
      get_notification_setting_effective: {
        Args: {
          p_branch_id?: string;
          p_notification_type: Database["public"]["Enums"]["admin_notification_type"];
          p_organization_id?: string;
        };
        Returns: {
          enabled: boolean;
          priority: Database["public"]["Enums"]["admin_notification_priority"];
        }[];
      };
      get_product_stock: {
        Args: { p_branch_id: string; p_product_id: string };
        Returns: {
          available_quantity: number;
          is_low_stock: boolean;
          low_stock_threshold: number;
          quantity: number;
          reorder_point: number;
          reserved_quantity: number;
        }[];
      };
      get_telemetry_stats: {
        Args: { org_id?: string };
        Returns: {
          date_range: string;
          organization_id: string;
          storage_size_mb: number;
          total_events: number;
          unique_users: number;
        }[];
      };
      get_treatment_price: {
        Args: { p_lens_material?: string; p_treatment_key: string };
        Returns: number;
      };
      get_unread_notification_count: {
        Args: { admin_user_id?: string };
        Returns: number;
      };
      get_upcoming_appointments: {
        Args: { customer_uuid: string; days_ahead?: number };
        Returns: {
          appointment_date: string;
          appointment_time: string;
          appointment_type: string;
          id: string;
          notes: string;
          status: string;
        }[];
      };
      get_user_branches: {
        Args: { user_id?: string };
        Returns: {
          branch_code: string;
          branch_id: string;
          branch_name: string;
          is_primary: boolean;
          role: string;
        }[];
      };
      get_user_organization_id: { Args: { user_id?: string }; Returns: string };
      is_admin: { Args: { user_id?: string }; Returns: boolean };
      is_employee: { Args: { user_id?: string }; Returns: boolean };
      is_notification_enabled:
        | {
            Args: {
              p_notification_type: Database["public"]["Enums"]["admin_notification_type"];
            };
            Returns: boolean;
          }
        | {
            Args: {
              p_branch_id?: string;
              p_notification_type: Database["public"]["Enums"]["admin_notification_type"];
              p_organization_id?: string;
            };
            Returns: boolean;
          };
      is_root_user: { Args: { user_id?: string }; Returns: boolean };
      is_super_admin: { Args: { user_id?: string }; Returns: boolean };
      log_admin_activity: {
        Args: {
          p_action: string;
          p_details?: Json;
          p_resource_id?: string;
          p_resource_type: string;
        };
        Returns: string;
      };
      log_debug: { Args: { message: string }; Returns: undefined };
      mark_all_notifications_read: { Args: never; Returns: undefined };
      mark_notification_read: {
        Args: { notification_id: string };
        Returns: undefined;
      };
      normalize_rut_for_search: { Args: { rut_text: string }; Returns: string };
      optimize_database: { Args: never; Returns: Json };
      process_pos_sale: {
        Args: { p_payload: string; p_user_id: string };
        Returns: Json;
      };
      reduce_contact_lens_stock: {
        Args: {
          p_branch_id: string;
          p_contact_lens_family_id: string;
          p_cylinder: number;
          p_quantity_to_reduce?: number;
          p_sphere: number;
        };
        Returns: boolean;
      };
      reset_demo_organization: { Args: never; Returns: undefined };
      schedule_telemetry_cleanup: { Args: never; Returns: undefined };
      search_customers_by_rut: {
        Args: {
          p_branch_id?: string;
          p_branch_ids?: string[];
          rut_search_term: string;
        };
        Returns: {
          email: string;
          first_name: string;
          id: string;
          last_name: string;
          phone: string;
          rut: string;
        }[];
      };
      search_embeddings: {
        Args: {
          filter_source_types?: string[];
          filter_user_id?: string;
          match_count?: number;
          match_threshold?: number;
          query_embedding: string;
        };
        Returns: {
          content: string;
          created_at: string;
          id: string;
          metadata: Json;
          similarity: number;
          source_id: string;
          source_type: string;
        }[];
      };
      search_embeddings_small: {
        Args: {
          filter_source_types?: string[];
          filter_user_id?: string;
          match_count?: number;
          match_threshold?: number;
          query_embedding: string;
        };
        Returns: {
          content: string;
          created_at: string;
          id: string;
          metadata: Json;
          similarity: number;
          source_id: string;
          source_type: string;
        }[];
      };
      search_frames_by_measurements: {
        Args: {
          max_bridge_width?: number;
          max_lens_width?: number;
          max_temple_length?: number;
          min_bridge_width?: number;
          min_lens_width?: number;
          min_temple_length?: number;
        };
        Returns: {
          frame_measurements: Json;
          id: string;
          name: string;
        }[];
      };
      search_memory_facts: {
        Args: {
          match_count?: number;
          match_threshold?: number;
          min_importance?: number;
          query_embedding: string;
          target_user_id: string;
        };
        Returns: {
          category: string;
          content: string;
          created_at: string;
          fact_type: string;
          id: string;
          importance: number;
          similarity: number;
        }[];
      };
      seed_demo_mirada_clara: { Args: never; Returns: undefined };
      seed_demo_organization_data: { Args: never; Returns: undefined };
      update_pos_session_cash: {
        Args: { cash_amount: number; session_id: string };
        Returns: boolean;
      };
      update_product_stock: {
        Args: {
          p_branch_id: string;
          p_created_by?: string;
          p_movement_type?: string;
          p_product_id: string;
          p_quantity_change: number;
          p_reference_id?: string;
          p_reference_type?: string;
          p_reserve?: boolean;
        };
        Returns: boolean;
      };
      update_work_order_status: {
        Args: {
          p_changed_by: string;
          p_new_status: string;
          p_notes?: string;
          p_work_order_id: string;
        };
        Returns: undefined;
      };
      uuid_generate_v4: { Args: never; Returns: string };
      validate_treatment_compatibility: {
        Args: {
          p_lens_material?: string;
          p_lens_type?: string;
          p_treatment_keys: string[];
        };
        Returns: Json;
      };
    };
    Enums: {
      admin_notification_priority: "low" | "medium" | "high" | "urgent";
      admin_notification_type:
        | "order_new"
        | "order_status_change"
        | "low_stock"
        | "out_of_stock"
        | "new_customer"
        | "new_review"
        | "review_pending"
        | "support_ticket_new"
        | "support_ticket_update"
        | "payment_received"
        | "payment_failed"
        | "system_alert"
        | "system_update"
        | "security_alert"
        | "custom"
        | "quote_new"
        | "quote_status_change"
        | "quote_converted"
        | "work_order_new"
        | "work_order_status_change"
        | "work_order_completed"
        | "appointment_new"
        | "appointment_cancelled"
        | "sale_new";
      support_priority: "low" | "medium" | "high" | "urgent";
      support_status:
        | "open"
        | "in_progress"
        | "pending_customer"
        | "resolved"
        | "closed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      admin_notification_priority: ["low", "medium", "high", "urgent"],
      admin_notification_type: [
        "order_new",
        "order_status_change",
        "low_stock",
        "out_of_stock",
        "new_customer",
        "new_review",
        "review_pending",
        "support_ticket_new",
        "support_ticket_update",
        "payment_received",
        "payment_failed",
        "system_alert",
        "system_update",
        "security_alert",
        "custom",
        "quote_new",
        "quote_status_change",
        "quote_converted",
        "work_order_new",
        "work_order_status_change",
        "work_order_completed",
        "appointment_new",
        "appointment_cancelled",
        "sale_new",
      ],
      support_priority: ["low", "medium", "high", "urgent"],
      support_status: [
        "open",
        "in_progress",
        "pending_customer",
        "resolved",
        "closed",
      ],
    },
  },
} as const;
