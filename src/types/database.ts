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
      adventure_chapter_entries: {
        Row: {
          chapter_id: string
          entry_id: string
          sort_order: number
        }
        Insert: {
          chapter_id: string
          entry_id: string
          sort_order?: number
        }
        Update: {
          chapter_id?: string
          entry_id?: string
          sort_order?: number
        }
        Relationships: []
      }
      adventure_chapter_outfits: {
        Row: {
          chapter_id: string
          outfit_id: string
          sort_order: number
        }
        Insert: {
          chapter_id: string
          outfit_id: string
          sort_order?: number
        }
        Update: {
          chapter_id?: string
          outfit_id?: string
          sort_order?: number
        }
        Relationships: []
      }
      adventure_chapter_products: {
        Row: {
          chapter_id: string
          product_id: string
          sort_order: number
        }
        Insert: {
          chapter_id: string
          product_id: string
          sort_order?: number
        }
        Update: {
          chapter_id?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: []
      }
      adventure_chapters: {
        Row: {
          cover_path: string | null
          created_at: string
          id: string
          label: string
          season_id: string
          slug: string
          sort_order: number
          status: string
          summary: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          cover_path?: string | null
          created_at?: string
          id?: string
          label: string
          season_id: string
          slug: string
          sort_order?: number
          status?: string
          summary?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          cover_path?: string | null
          created_at?: string
          id?: string
          label?: string
          season_id?: string
          slug?: string
          sort_order?: number
          status?: string
          summary?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "adventure_chapters_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "adventure_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      adventure_seasons: {
        Row: {
          cover_path: string | null
          created_at: string
          id: string
          number: number
          slug: string
          status: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          cover_path?: string | null
          created_at?: string
          id?: string
          number: number
          slug: string
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          cover_path?: string | null
          created_at?: string
          id?: string
          number?: number
          slug?: string
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      adventures: {
        Row: {
          body: string | null
          chapter_id: string
          cover_path: string | null
          created_at: string
          id: string
          sort_order: number
          status: string
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          body?: string | null
          chapter_id: string
          cover_path?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          body?: string | null
          chapter_id?: string
          cover_path?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adventures_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "adventure_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          created_at: string
          entry_id: string | null
          event: string
          id: number
          order_id: string | null
          outfit_id: string | null
          path: string | null
          product_id: string | null
          quantity: number | null
          query: string | null
          session_id: string
          value: number | null
        }
        Insert: {
          created_at?: string
          entry_id?: string | null
          event: string
          id?: never
          order_id?: string | null
          outfit_id?: string | null
          path?: string | null
          product_id?: string | null
          quantity?: number | null
          query?: string | null
          session_id: string
          value?: number | null
        }
        Update: {
          created_at?: string
          entry_id?: string | null
          event?: string
          id?: never
          order_id?: string | null
          outfit_id?: string | null
          path?: string | null
          product_id?: string | null
          quantity?: number | null
          query?: string | null
          session_id?: string
          value?: number | null
        }
        Relationships: []
      }
      camino_rewards: {
        Row: {
          created_at: string
          cycle: number
          discount_amount: number | null
          id: string
          order_id: string | null
          percent: number | null
          station: number
          status: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          cycle: number
          discount_amount?: number | null
          id?: string
          order_id?: string | null
          percent?: number | null
          station: number
          status?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          cycle?: number
          discount_amount?: number | null
          id?: string
          order_id?: string | null
          percent?: number | null
          station?: number
          status?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "camino_rewards_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      camino_settings: {
        Row: {
          conditions: string | null
          id: boolean
          max_discount_amount: number | null
          rewards_enabled: boolean
          station10_percent: number | null
          updated_at: string
        }
        Insert: {
          conditions?: string | null
          id?: boolean
          max_discount_amount?: number | null
          rewards_enabled?: boolean
          station10_percent?: number | null
          updated_at?: string
        }
        Update: {
          conditions?: string | null
          id?: boolean
          max_discount_amount?: number | null
          rewards_enabled?: boolean
          station10_percent?: number | null
          updated_at?: string
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
        Relationships: [
          {
            foreignKeyName: "email_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      event_adventure_chapters: {
        Row: {
          chapter_id: string
          event_id: string
          sort_order: number
        }
        Insert: {
          chapter_id: string
          event_id: string
          sort_order?: number
        }
        Update: {
          chapter_id?: string
          event_id?: string
          sort_order?: number
        }
        Relationships: []
      }
      event_entries: {
        Row: {
          entry_id: string
          event_id: string
          sort_order: number
        }
        Insert: {
          entry_id: string
          event_id: string
          sort_order?: number
        }
        Update: {
          entry_id?: string
          event_id?: string
          sort_order?: number
        }
        Relationships: []
      }
      event_outfits: {
        Row: {
          event_id: string
          outfit_id: string
          sort_order: number
        }
        Insert: {
          event_id: string
          outfit_id: string
          sort_order?: number
        }
        Update: {
          event_id?: string
          outfit_id?: string
          sort_order?: number
        }
        Relationships: []
      }
      event_products: {
        Row: {
          event_id: string
          product_id: string
          sort_order: number
        }
        Insert: {
          event_id: string
          product_id: string
          sort_order?: number
        }
        Update: {
          event_id?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: []
      }
      events: {
        Row: {
          cover_path: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          extra_info: string | null
          id: string
          kind: string
          members_only: boolean
          participation: string | null
          place: string | null
          schedule: string | null
          slug: string
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          cover_path?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          extra_info?: string | null
          id?: string
          kind: string
          members_only?: boolean
          participation?: string | null
          place?: string | null
          schedule?: string | null
          slug: string
          starts_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          cover_path?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          extra_info?: string | null
          id?: string
          kind?: string
          members_only?: boolean
          participation?: string | null
          place?: string | null
          schedule?: string | null
          slug?: string
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      manual_sales: {
        Row: {
          channel: string
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          product_name: string
          quantity: number
          variant_id: string | null
          variant_label: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          product_name: string
          quantity: number
          variant_id?: string | null
          variant_label?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          product_name?: string
          quantity?: number
          variant_id?: string | null
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manual_sales_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_sales_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      member_addresses: {
        Row: {
          apartment: string
          created_at: string
          floor: string
          id: string
          is_default: boolean
          label: string
          locality: string
          postal_code: string
          province: string
          street_name: string
          street_number: string
          user_id: string
        }
        Insert: {
          apartment?: string
          created_at?: string
          floor?: string
          id?: string
          is_default?: boolean
          label?: string
          locality: string
          postal_code: string
          province: string
          street_name: string
          street_number: string
          user_id?: string
        }
        Update: {
          apartment?: string
          created_at?: string
          floor?: string
          id?: string
          is_default?: boolean
          label?: string
          locality?: string
          postal_code?: string
          province?: string
          street_name?: string
          street_number?: string
          user_id?: string
        }
        Relationships: []
      }
      member_favorites: {
        Row: {
          created_at: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          product_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      member_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          order_id: string | null
          payload: Json
          read_at: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          order_id?: string | null
          payload?: Json
          read_at?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          order_id?: string | null
          payload?: Json
          read_at?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      member_profiles: {
        Row: {
          created_at: string
          first_name: string
          last_name: string
          phone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          first_name?: string
          last_name?: string
          phone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          first_name?: string
          last_name?: string
          phone?: string
          updated_at?: string
          user_id?: string
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
          id?: never
          order_id: string
          status: string
        }
        Update: {
          created_at?: string
          id?: never
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_due_online: number | null
          balance_due: number
          camino_reward_id: string | null
          cancel_reason: string | null
          created_at: string
          customer_id: string
          discount_amount: number
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
          camino_reward_id?: string | null
          cancel_reason?: string | null
          created_at?: string
          customer_id: string
          discount_amount?: number
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
          camino_reward_id?: string | null
          cancel_reason?: string | null
          created_at?: string
          customer_id?: string
          discount_amount?: number
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
            foreignKeyName: "orders_camino_reward_id_fkey"
            columns: ["camino_reward_id"]
            isOneToOne: false
            referencedRelation: "camino_rewards"
            referencedColumns: ["id"]
          },
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
          style: string | null
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
          style?: string | null
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
          style?: string | null
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
        Relationships: [
          {
            foreignKeyName: "product_measurements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_measurements_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "sizes"
            referencedColumns: ["id"]
          },
        ]
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
          members_only_until: string | null
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
          members_only_until?: string | null
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
          members_only_until?: string | null
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
          about_body: string | null
          gk_description: string | null
          help_body: string | null
          hero_image_alt: string | null
          hero_image_path: string | null
          id: boolean
          instagram_url: string | null
          members_description: string | null
          tiktok_url: string | null
          universo_description: string | null
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          about_body?: string | null
          gk_description?: string | null
          help_body?: string | null
          hero_image_alt?: string | null
          hero_image_path?: string | null
          id?: boolean
          instagram_url?: string | null
          members_description?: string | null
          tiktok_url?: string | null
          universo_description?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          about_body?: string | null
          gk_description?: string | null
          help_body?: string | null
          hero_image_alt?: string | null
          hero_image_path?: string | null
          id?: boolean
          instagram_url?: string | null
          members_description?: string | null
          tiktok_url?: string | null
          universo_description?: string | null
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
      universe_entries: {
        Row: {
          body: string | null
          cover_path: string | null
          created_at: string
          has_page: boolean
          id: string
          kind: string
          members_only: boolean
          published_at: string
          slug: string
          sort_order: number
          status: string
          summary: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          body?: string | null
          cover_path?: string | null
          created_at?: string
          has_page?: boolean
          id?: string
          kind: string
          members_only?: boolean
          published_at?: string
          slug: string
          sort_order?: number
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          body?: string | null
          cover_path?: string | null
          created_at?: string
          has_page?: boolean
          id?: string
          kind?: string
          members_only?: boolean
          published_at?: string
          slug?: string
          sort_order?: number
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      universe_entry_media: {
        Row: {
          alt_text: string | null
          created_at: string
          entry_id: string
          id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          entry_id: string
          id?: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          entry_id?: string
          id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "universe_entry_media_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "universe_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      universe_entry_outfits: {
        Row: {
          entry_id: string
          outfit_id: string
          sort_order: number
        }
        Insert: {
          entry_id: string
          outfit_id: string
          sort_order?: number
        }
        Update: {
          entry_id?: string
          outfit_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "universe_entry_outfits_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "universe_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "universe_entry_outfits_outfit_id_fkey"
            columns: ["outfit_id"]
            isOneToOne: false
            referencedRelation: "outfits"
            referencedColumns: ["id"]
          },
        ]
      }
      universe_entry_products: {
        Row: {
          entry_id: string
          product_id: string
          sort_order: number
        }
        Insert: {
          entry_id: string
          product_id: string
          sort_order?: number
        }
        Update: {
          entry_id?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "universe_entry_products_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "universe_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "universe_entry_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      universe_entry_relations: {
        Row: {
          entry_id: string
          related_entry_id: string
          sort_order: number
        }
        Insert: {
          entry_id: string
          related_entry_id: string
          sort_order?: number
        }
        Update: {
          entry_id?: string
          related_entry_id?: string
          sort_order?: number
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
      admin_analytics_summary: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
      admin_broadcast_notification: {
        Args: { p_body: string | null; p_link: string | null; p_title: string }
        Returns: number
      }
      admin_cancel_order: {
        Args: { p_order_id: string; p_reason: string }
        Returns: undefined
      }
      admin_member_lookup: {
        Args: { p_query: string }
        Returns: {
          confirmed_purchases: number
          created_at: string
          email: string
          email_confirmed: boolean
          first_name: string
          last_name: string
          phone: string
          user_id: string
        }[]
      }
      admin_record_manual_sale: {
        Args: {
          p_channel: string
          p_note: string | null
          p_quantity: number
          p_variant_id: string
        }
        Returns: number
      }
      admin_register_manual_payment: {
        Args: { p_amount: number; p_order_id: string }
        Returns: string
      }
      camino_confirmed_count: { Args: { p_user_id: string }; Returns: number }
      confirm_order_payment: { Args: { p_order_id: string }; Returns: string }
      create_order: {
        Args: {
          p_camino_reward_id?: string | null
          p_customer_email: string
          p_customer_name: string
          p_customer_phone: string
          p_is_member?: boolean
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
        Returns: {
          amount_due_online: number | null
          balance_due: number
          camino_reward_id: string | null
          cancel_reason: string | null
          created_at: string
          customer_id: string
          discount_amount: number
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
          amount_due_online: number | null
          balance_due: number
          camino_reward_id: string | null
          cancel_reason: string | null
          created_at: string
          customer_id: string
          discount_amount: number
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
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_member_email: { Args: never; Returns: string }
      is_active_admin: { Args: never; Returns: boolean }
      is_member: { Args: never; Returns: boolean }
      is_variant_active: { Args: { p_variant_id: string }; Returns: boolean }
      member_for_email: { Args: { p_email: string }; Returns: string }
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
      release_expired_stock_reservations: { Args: never; Returns: number }
      restore_order_stock: { Args: { p_order_id: string }; Returns: undefined }
      sync_camino_rewards: { Args: { p_user_id: string }; Returns: number }
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
