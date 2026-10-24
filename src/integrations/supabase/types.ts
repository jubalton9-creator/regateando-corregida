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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      compradores: {
        Row: {
          alias: string | null
          apellido: string | null
          barrio: string | null
          ciudad: string | null
          correo: string | null
          created_at: string
          direccion: string | null
          dni: string | null
          estado: string
          id: string
          metodo: string
          nombre: string | null
          updated_at: string
          user_id: string
          whatsapp: string | null
          zona: string | null
        }
        Insert: {
          alias?: string | null
          apellido?: string | null
          barrio?: string | null
          ciudad?: string | null
          correo?: string | null
          created_at?: string
          direccion?: string | null
          dni?: string | null
          estado?: string
          id?: string
          metodo?: string
          nombre?: string | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
          zona?: string | null
        }
        Update: {
          alias?: string | null
          apellido?: string | null
          barrio?: string | null
          ciudad?: string | null
          correo?: string | null
          created_at?: string
          direccion?: string | null
          dni?: string | null
          estado?: string
          id?: string
          metodo?: string
          nombre?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
          zona?: string | null
        }
        Relationships: []
      }
      cotizaciones: {
        Row: {
          created_at: string
          entrega: string | null
          foto_url: string | null
          id: string
          mensaje: string | null
          pedido_id: string
          precio: number | null
          responded_at: string | null
          status: string
          supplier_id: string
        }
        Insert: {
          created_at?: string
          entrega?: string | null
          foto_url?: string | null
          id?: string
          mensaje?: string | null
          pedido_id: string
          precio?: number | null
          responded_at?: string | null
          status?: string
          supplier_id: string
        }
        Update: {
          created_at?: string
          entrega?: string | null
          foto_url?: string | null
          id?: string
          mensaje?: string | null
          pedido_id?: string
          precio?: number | null
          responded_at?: string | null
          status?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotizaciones_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      garage_products: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          photos: string[]
          price: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          photos?: string[]
          price: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          photos?: string[]
          price?: number
        }
        Relationships: []
      }
      opciones_lista: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          original: boolean
          tipo: string
          valor: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          original?: boolean
          tipo: string
          valor: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          original?: boolean
          tipo?: string
          valor?: string
        }
        Relationships: []
      }
      pagos: {
        Row: {
          buyer_id: string
          created_at: string
          descripcion: string
          estado: string
          id: string
          moneda: string
          monto: number
          pedido_id: string | null
          referencia: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          descripcion: string
          estado?: string
          id?: string
          moneda?: string
          monto: number
          pedido_id?: string | null
          referencia?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          descripcion?: string
          estado?: string
          id?: string
          moneda?: string
          monto?: number
          pedido_id?: string | null
          referencia?: string
        }
        Relationships: []
      }
      pedidos: {
        Row: {
          buyer_id: string | null
          buyer_name: string | null
          cancellation_token_hash: string | null
          categoria: string | null
          created_at: string
          detalle: string
          fotos: string[]
          id: string
          status: string
        }
        Insert: {
          buyer_id?: string | null
          buyer_name?: string | null
          cancellation_token_hash?: string | null
          categoria?: string | null
          created_at?: string
          detalle: string
          fotos?: string[]
          id?: string
          status?: string
        }
        Update: {
          buyer_id?: string | null
          buyer_name?: string | null
          cancellation_token_hash?: string | null
          categoria?: string | null
          created_at?: string
          detalle?: string
          fotos?: string[]
          id?: string
          status?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          stock: number | null
          supplier_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price: number
          stock?: number | null
          supplier_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          stock?: number | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      regateo_mensajes: {
        Row: {
          autor: string
          cotizacion_id: string
          created_at: string
          fotos: string[]
          id: string
          pedido_id: string
          precio: number | null
          texto: string
          tipo: string
        }
        Insert: {
          autor: string
          cotizacion_id: string
          created_at?: string
          fotos?: string[]
          id?: string
          pedido_id: string
          precio?: number | null
          texto?: string
          tipo?: string
        }
        Update: {
          autor?: string
          cotizacion_id?: string
          created_at?: string
          fotos?: string[]
          id?: string
          pedido_id?: string
          precio?: number | null
          texto?: string
          tipo?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          active: boolean | null
          address: string | null
          category: string
          created_at: string | null
          estado: string
          id: string
          name: string
          owner_id: string | null
          phone: string | null
          zone: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          category: string
          created_at?: string | null
          estado?: string
          id?: string
          name: string
          owner_id?: string | null
          phone?: string | null
          zone?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          category?: string
          created_at?: string | null
          estado?: string
          id?: string
          name?: string
          owner_id?: string | null
          phone?: string | null
          zone?: string | null
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
      vendedores: {
        Row: {
          activo: boolean
          alias: string | null
          apellido: string | null
          barrio: string | null
          ciudad: string | null
          correo: string | null
          created_at: string
          cuit: string | null
          direccion: string
          dni: string | null
          estado: string
          id: string
          lat: number | null
          lng: number | null
          nombre: string | null
          nombre_comercio: string
          owner_id: string
          rubro: string
          telefono: string | null
          updated_at: string
          whatsapp: string
          whatsapp_verificado: boolean
          zona: string | null
        }
        Insert: {
          activo?: boolean
          alias?: string | null
          apellido?: string | null
          barrio?: string | null
          ciudad?: string | null
          correo?: string | null
          created_at?: string
          cuit?: string | null
          direccion: string
          dni?: string | null
          estado?: string
          id?: string
          lat?: number | null
          lng?: number | null
          nombre?: string | null
          nombre_comercio: string
          owner_id: string
          rubro: string
          telefono?: string | null
          updated_at?: string
          whatsapp: string
          whatsapp_verificado?: boolean
          zona?: string | null
        }
        Update: {
          activo?: boolean
          alias?: string | null
          apellido?: string | null
          barrio?: string | null
          ciudad?: string | null
          correo?: string | null
          created_at?: string
          cuit?: string | null
          direccion?: string
          dni?: string | null
          estado?: string
          id?: string
          lat?: number | null
          lng?: number | null
          nombre?: string | null
          nombre_comercio?: string
          owner_id?: string
          rubro?: string
          telefono?: string | null
          updated_at?: string
          whatsapp?: string
          whatsapp_verificado?: boolean
          zona?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      suppliers_public: {
        Row: {
          active: boolean | null
          category: string | null
          id: string | null
          name: string | null
          zone: string | null
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          id?: string | null
          name?: string | null
          zone?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string | null
          id?: string | null
          name?: string | null
          zone?: string | null
        }
        Relationships: []
      }
      vendedores_public: {
        Row: {
          activo: boolean | null
          id: string | null
          nombre_comercio: string | null
          rubro: string | null
          zona: string | null
        }
        Insert: {
          activo?: boolean | null
          id?: string | null
          nombre_comercio?: string | null
          rubro?: string | null
          zona?: string | null
        }
        Update: {
          activo?: boolean | null
          id?: string | null
          nombre_comercio?: string | null
          rubro?: string | null
          zona?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      agregar_comercio_propio: { Args: { _m: Json }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "cliente" | "vendedor" | "admin"
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
    Enums: {
      app_role: ["cliente", "vendedor", "admin"],
    },
  },
} as const
