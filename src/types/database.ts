// Tipos generados desde el esquema real de Supabase (proyecto GxK12-2).
// Regenerar cuando el esquema cambie: supabase gen types typescript --project-id <id> > src/types/database.ts
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
      admins: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          is_active?: boolean
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image: string | null
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      colors: {
        Row: {
          created_at: string
          hex_code: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hex_code?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hex_code?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          phone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          phone: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      delivery_methods: {
        Row: {
          cost: number | null
          details: string | null
          id: string
          is_enabled: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          cost?: number | null
          details?: string | null
          id: string
          is_enabled?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          cost?: number | null
          details?: string | null
          id?: string
          is_enabled?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_log: {
        Row: {
          created_at: string
          error: string | null
          id: string
          order_id: string | null
          provider: string
          recipient: string
          status: string
          template: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          order_id?: string | null
          provider: string
          recipient: string
          status: string
          template: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          order_id?: string | null
          provider?: string
          recipient?: string
          status?: string
          template?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          sku: string | null
          subtotal: number | null
          unit_price: number
          variant_id: string | null
          variant_label: string | null
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          sku?: string | null
          subtotal?: number | null
          unit_price: number
          variant_id?: string | null
          variant_label?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          sku?: string | null
          subtotal?: number | null
          unit_price?: number
          variant_id?: string | null
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          created_at: string
          id: number
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: number
          order_id: string
          status: string
        }
        Update: {
          created_at?: string
          id?: number
          order_id?: string
          status?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount_due_online: number | null
          balance_due: number
          cancel_reason: string | null
          created_at: string
          customer_id: string
          id: string
          incidence_reason: string | null
          lookup_token_expires_at: string | null
          lookup_token_hash: string
          meeting_point_details: string | null
          order_number: string
          payment_expires_at: string | null
          payment_method: string
          payment_plan: string
          shipping_address: Json
          shipping_cost: number
          shipping_method: string
          status: string
          stock_committed: boolean
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          amount_due_online?: number | null
          balance_due?: number
          cancel_reason?: string | null
          created_at?: string
          customer_id: string
          id?: string
          incidence_reason?: string | null
          lookup_token_expires_at?: string | null
          lookup_token_hash: string
          meeting_point_details?: string | null
          order_number: string
          payment_expires_at?: string | null
          payment_method?: string
          payment_plan?: string
          shipping_address: Json
          shipping_cost?: number
          shipping_method: string
          status?: string
          stock_committed?: boolean
          subtotal: number
          total: number
          updated_at?: string
        }
        Update: {
          amount_due_online?: number | null
          balance_due?: number
          cancel_reason?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          incidence_reason?: string | null
          lookup_token_expires_at?: string | null
          lookup_token_hash?: string
          meeting_point_details?: string | null
          order_number?: string
          payment_expires_at?: string | null
          payment_method?: string
          payment_plan?: string
          shipping_address?: Json
          shipping_cost?: number
          shipping_method?: string
          status?: string
          stock_committed?: boolean
          subtotal?: number
          total?: number
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
        ]
      }
      outfit_products: {
        Row: {
          id: string
          outfit_id: string
          product_id: string
          sort_order: number
          variant_id: string | null
        }
        Insert: {
          id?: string
          outfit_id: string
          product_id: string
          sort_order?: number
          variant_id?: string | null
        }
        Update: {
          id?: string
          outfit_id?: string
          product_id?: string
          sort_order?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outfit_products_outfit_id_fkey"
            columns: ["outfit_id"]
            isOneToOne: false
            referencedRelation: "outfits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outfit_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outfit_products_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outfit_products_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      outfits: {
        Row: {
          cover_image: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          starts_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cover_image?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          starts_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cover_image?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          starts_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_settings: {
        Row: {
          cash_enabled: boolean
          id: boolean
          max_installments: number | null
          meeting_point_deposit_enabled: boolean
          mercado_pago_enabled: boolean
          updated_at: string
        }
        Insert: {
          cash_enabled?: boolean
          id?: boolean
          max_installments?: number | null
          meeting_point_deposit_enabled?: boolean
          mercado_pago_enabled?: boolean
          updated_at?: string
        }
        Update: {
          cash_enabled?: boolean
          id?: boolean
          max_installments?: number | null
          meeting_point_deposit_enabled?: boolean
          mercado_pago_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          external_id: string | null
          id: string
          order_id: string
          provider: string
          raw_reference: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          external_id?: string | null
          id?: string
          order_id: string
          provider?: string
          raw_reference?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          external_id?: string | null
          id?: string
          order_id?: string
          provider?: string
          raw_reference?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          is_primary: boolean
          product_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_measurements: {
        Row: {
          created_at: string
          id: string
          label: string
          product_id: string
          size_id: string | null
          sort_order: number
          value_cm: number
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          product_id: string
          size_id?: string | null
          sort_order?: number
          value_cm: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          product_id?: string
          size_id?: string | null
          sort_order?: number
          value_cm?: number
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          color_id: string | null
          created_at: string
          id: string
          is_active: boolean
          price_override: number | null
          product_id: string
          size_id: string | null
          sku: string | null
          stock: number
          updated_at: string
        }
        Insert: {
          color_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          price_override?: number | null
          product_id: string
          size_id?: string | null
          sku?: string | null
          stock?: number
          updated_at?: string
        }
        Update: {
          color_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          price_override?: number | null
          product_id?: string
          size_id?: string | null
          sku?: string | null
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string
          composition: string | null
          created_at: string
          description: string | null
          height_cm: number | null
          id: string
          is_featured: boolean
          length_cm: number | null
          name: string
          price: number
          product_type: string | null
          slug: string
          status: string
          updated_at: string
          weight_grams: number | null
          width_cm: number | null
        }
        Insert: {
          category_id: string
          composition?: string | null
          created_at?: string
          description?: string | null
          height_cm?: number | null
          id?: string
          is_featured?: boolean
          length_cm?: number | null
          name: string
          price: number
          product_type?: string | null
          slug: string
          status?: string
          updated_at?: string
          weight_grams?: number | null
          width_cm?: number | null
        }
        Update: {
          category_id?: string
          composition?: string | null
          created_at?: string
          description?: string | null
          height_cm?: number | null
          id?: string
          is_featured?: boolean
          length_cm?: number | null
          name?: string
          price?: number
          product_type?: string | null
          slug?: string
          status?: string
          updated_at?: string
          weight_grams?: number | null
          width_cm?: number | null
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
      shipments: {
        Row: {
          attempts: number
          cost: number | null
          created_at: string
          destination_data: Json
          destination_type: string | null
          external_id: string | null
          id: string
          label_url: string | null
          last_attempt_at: string | null
          last_error: string | null
          order_id: string
          provider: string
          service_type: string | null
          status: string | null
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          cost?: number | null
          created_at?: string
          destination_data?: Json
          destination_type?: string | null
          external_id?: string | null
          id?: string
          label_url?: string | null
          last_attempt_at?: string | null
          last_error?: string | null
          order_id: string
          provider: string
          service_type?: string | null
          status?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          cost?: number | null
          created_at?: string
          destination_data?: Json
          destination_type?: string | null
          external_id?: string | null
          id?: string
          label_url?: string | null
          last_attempt_at?: string | null
          last_error?: string | null
          order_id?: string
          provider?: string
          service_type?: string | null
          status?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_settings: {
        Row: {
          active_provider: string | null
          id: boolean
          origin_address: Json | null
          origin_contact: Json | null
          service_type: string | null
          shipping_cost: number | null
          updated_at: string
        }
        Insert: {
          active_provider?: string | null
          id?: boolean
          origin_address?: Json | null
          origin_contact?: Json | null
          service_type?: string | null
          shipping_cost?: number | null
          updated_at?: string
        }
        Update: {
          active_provider?: string | null
          id?: boolean
          origin_address?: Json | null
          origin_contact?: Json | null
          service_type?: string | null
          shipping_cost?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: boolean
          instagram_url: string | null
          tiktok_url: string | null
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          id?: boolean
          instagram_url?: string | null
          tiktok_url?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          id?: boolean
          instagram_url?: string | null
          tiktok_url?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      sizes: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      storefront_product_variants: {
        Row: {
          color_id: string | null
          id: string | null
          in_stock: boolean | null
          is_active: boolean | null
          price_override: number | null
          product_id: string | null
          size_id: string | null
          sku: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "sizes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_cancel_order: { Args: { p_order_id: string; p_reason: string }; Returns: undefined }
      admin_register_manual_payment: { Args: { p_amount: number; p_order_id: string }; Returns: string }
      confirm_order_payment: { Args: { p_order_id: string }; Returns: string }
      create_order: {
        Args: {
          p_customer_email: string
          p_customer_name: string
          p_customer_phone: string
          p_items: Json
          p_lookup_token_expires_at: string
          p_lookup_token_hash: string
          p_meeting_point_details: string | null
          p_payment_method: string
          p_payment_plan: string
          p_shipping_address: Json
          p_shipping_cost: number
          p_shipping_method: string
        }
        Returns: Database["public"]["Tables"]["orders"]["Row"]
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_order_with_reservation: {
        Args: {
          p_customer_email: string
          p_customer_name: string
          p_customer_phone: string
          p_items: Json
          p_lookup_token_expires_at: string
          p_lookup_token_hash: string
          p_shipping_address: Json
          p_shipping_cost: number
          p_shipping_method: string
        }
        Returns: {
          created_at: string
          customer_id: string
          id: string
          lookup_token_expires_at: string | null
          lookup_token_hash: string
          order_number: string
          payment_expires_at: string | null
          shipping_address: Json
          shipping_cost: number
          shipping_method: string
          status: string
          subtotal: number
          total: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_payment_result: {
        Args: {
          p_amount: number
          p_currency: string
          p_external_id: string
          p_order_number: string
          p_provider: string
          p_raw_reference: Json
          p_status: string
        }
        Returns: {
          amount: number
          created_at: string
          currency: string
          external_id: string | null
          id: string
          order_id: string
          provider: string
          raw_reference: Json | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_active_admin: { Args: never; Returns: boolean }
      release_expired_stock_reservations: { Args: never; Returns: number }
      restore_order_stock: { Args: { p_order_id: string }; Returns: undefined }
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
