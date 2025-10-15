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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      amostras: {
        Row: {
          cliente_id: string
          created_at: string
          data_entrega: string
          id: string
          observacoes: string | null
          produto_id: string
          quantidade: number
          responsavel_id: string
          retorno: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_entrega?: string
          id?: string
          observacoes?: string | null
          produto_id: string
          quantidade: number
          responsavel_id: string
          retorno?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_entrega?: string
          id?: string
          observacoes?: string | null
          produto_id?: string
          quantidade?: number
          responsavel_id?: string
          retorno?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "amostras_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amostras_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogos: {
        Row: {
          arquivo_nome: string
          arquivo_url: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          tipo: string
          updated_at: string
        }
        Insert: {
          arquivo_nome: string
          arquivo_url: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          tipo: string
          updated_at?: string
        }
        Update: {
          arquivo_nome?: string
          arquivo_url?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      cliente_produtos: {
        Row: {
          cliente_id: string
          created_at: string
          id: string
          produto_id: string
          status_interesse: Database["public"]["Enums"]["interest_status"]
          ultimo_pedido_data: string | null
          updated_at: string
          volume_medio: number | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          id?: string
          produto_id: string
          status_interesse?: Database["public"]["Enums"]["interest_status"]
          ultimo_pedido_data?: string | null
          updated_at?: string
          volume_medio?: number | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          id?: string
          produto_id?: string
          status_interesse?: Database["public"]["Enums"]["interest_status"]
          ultimo_pedido_data?: string | null
          updated_at?: string
          volume_medio?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_produtos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_produtos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          aniversario: string | null
          ativo: boolean
          cep: string | null
          cidade: string | null
          cnpj_cpf: string | null
          compra_mensal_media: number | null
          created_at: string
          email: string | null
          historico_pedidos: string | null
          id: string
          logradouro: string | null
          nome_fantasia: string
          numero: string | null
          observacoes: string | null
          razao_social: string | null
          responsavel_id: string | null
          segmento: string | null
          tags: string[] | null
          tamanho: string | null
          telefone: string | null
          total_comprado: number | null
          uf: string | null
          ultima_compra_data: string | null
          updated_at: string
        }
        Insert: {
          aniversario?: string | null
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          cnpj_cpf?: string | null
          compra_mensal_media?: number | null
          created_at?: string
          email?: string | null
          historico_pedidos?: string | null
          id?: string
          logradouro?: string | null
          nome_fantasia: string
          numero?: string | null
          observacoes?: string | null
          razao_social?: string | null
          responsavel_id?: string | null
          segmento?: string | null
          tags?: string[] | null
          tamanho?: string | null
          telefone?: string | null
          total_comprado?: number | null
          uf?: string | null
          ultima_compra_data?: string | null
          updated_at?: string
        }
        Update: {
          aniversario?: string | null
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          cnpj_cpf?: string | null
          compra_mensal_media?: number | null
          created_at?: string
          email?: string | null
          historico_pedidos?: string | null
          id?: string
          logradouro?: string | null
          nome_fantasia?: string
          numero?: string | null
          observacoes?: string | null
          razao_social?: string | null
          responsavel_id?: string | null
          segmento?: string | null
          tags?: string[] | null
          tamanho?: string | null
          telefone?: string | null
          total_comprado?: number | null
          uf?: string | null
          ultima_compra_data?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comentarios: {
        Row: {
          comentario: string
          created_at: string | null
          entidade_id: string
          entidade_tipo: string
          id: string
          usuario_id: string
        }
        Insert: {
          comentario: string
          created_at?: string | null
          entidade_id: string
          entidade_tipo: string
          id?: string
          usuario_id: string
        }
        Update: {
          comentario?: string
          created_at?: string | null
          entidade_id?: string
          entidade_tipo?: string
          id?: string
          usuario_id?: string
        }
        Relationships: []
      }
      contatos_clientes: {
        Row: {
          aniversario: string | null
          cargo: string | null
          cliente_id: string
          created_at: string | null
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          aniversario?: string | null
          cargo?: string | null
          cliente_id: string
          created_at?: string | null
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          aniversario?: string | null
          cargo?: string | null
          cliente_id?: string
          created_at?: string | null
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contatos_clientes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro: {
        Row: {
          arquivo_nome: string | null
          arquivo_url: string | null
          beneficiario: string | null
          categoria: string | null
          codigo_barras: string | null
          created_at: string
          data: string
          data_vencimento: string | null
          descricao: string
          id: string
          observacoes: string | null
          status_pagamento: string | null
          tipo: Database["public"]["Enums"]["transaction_type"]
          tipo_transacao: string | null
          updated_at: string
          usuario_id: string
          valor: number
          valor_boleto: number | null
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          beneficiario?: string | null
          categoria?: string | null
          codigo_barras?: string | null
          created_at?: string
          data?: string
          data_vencimento?: string | null
          descricao: string
          id?: string
          observacoes?: string | null
          status_pagamento?: string | null
          tipo: Database["public"]["Enums"]["transaction_type"]
          tipo_transacao?: string | null
          updated_at?: string
          usuario_id: string
          valor: number
          valor_boleto?: number | null
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          beneficiario?: string | null
          categoria?: string | null
          codigo_barras?: string | null
          created_at?: string
          data?: string
          data_vencimento?: string | null
          descricao?: string
          id?: string
          observacoes?: string | null
          status_pagamento?: string | null
          tipo?: Database["public"]["Enums"]["transaction_type"]
          tipo_transacao?: string | null
          updated_at?: string
          usuario_id?: string
          valor?: number
          valor_boleto?: number | null
        }
        Relationships: []
      }
      interacoes: {
        Row: {
          cliente_id: string
          comentario: string | null
          created_at: string
          data_hora: string
          duracao_min: number | null
          id: string
          motivo: string | null
          resultado: Database["public"]["Enums"]["interaction_result"]
          sentimento: Database["public"]["Enums"]["sentiment_type"] | null
          tipo: Database["public"]["Enums"]["interaction_type"]
          updated_at: string
          usuario_id: string
        }
        Insert: {
          cliente_id: string
          comentario?: string | null
          created_at?: string
          data_hora?: string
          duracao_min?: number | null
          id?: string
          motivo?: string | null
          resultado?: Database["public"]["Enums"]["interaction_result"]
          sentimento?: Database["public"]["Enums"]["sentiment_type"] | null
          tipo: Database["public"]["Enums"]["interaction_type"]
          updated_at?: string
          usuario_id: string
        }
        Update: {
          cliente_id?: string
          comentario?: string | null
          created_at?: string
          data_hora?: string
          duracao_min?: number | null
          id?: string
          motivo?: string | null
          resultado?: Database["public"]["Enums"]["interaction_result"]
          sentimento?: Database["public"]["Enums"]["sentiment_type"] | null
          tipo?: Database["public"]["Enums"]["interaction_type"]
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interacoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marcas: {
        Row: {
          ativa: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          site: string | null
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          site?: string | null
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          site?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      movimentacao_estoque: {
        Row: {
          created_at: string
          id: string
          observacao: string | null
          produto_id: string
          quantidade: number
          responsavel_id: string | null
          tipo: string
        }
        Insert: {
          created_at?: string
          id?: string
          observacao?: string | null
          produto_id: string
          quantidade: number
          responsavel_id?: string | null
          tipo: string
        }
        Update: {
          created_at?: string
          id?: string
          observacao?: string | null
          produto_id?: string
          quantidade?: number
          responsavel_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentacao_estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          arquivo_nome: string | null
          arquivo_url: string | null
          cliente_id: string
          created_at: string | null
          data_pedido: string | null
          id: string
          numero_pedido: string | null
          observacoes: string | null
          status: string | null
          updated_at: string | null
          valor_total: number | null
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          cliente_id: string
          created_at?: string | null
          data_pedido?: string | null
          id?: string
          numero_pedido?: string | null
          observacoes?: string | null
          status?: string | null
          updated_at?: string | null
          valor_total?: number | null
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          cliente_id?: string
          created_at?: string | null
          data_pedido?: string | null
          id?: string
          numero_pedido?: string | null
          observacoes?: string | null
          status?: string | null
          updated_at?: string | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_produtos: {
        Row: {
          created_at: string
          id: string
          observacoes: string | null
          pedido_id: string | null
          preco_unitario: number
          produto_id: string | null
          quantidade: number
        }
        Insert: {
          created_at?: string
          id?: string
          observacoes?: string | null
          pedido_id?: string | null
          preco_unitario: number
          produto_id?: string | null
          quantidade: number
        }
        Update: {
          created_at?: string
          id?: string
          observacoes?: string | null
          pedido_id?: string | null
          preco_unitario?: number
          produto_id?: string | null
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_produtos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_produtos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          estoque_escritorio: number | null
          id: string
          marca_id: string | null
          nome: string
          peso_unidade_kg: number | null
          preco_base: number | null
          rendimento_dose_gramas: number | null
          sku: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          estoque_escritorio?: number | null
          id?: string
          marca_id?: string | null
          nome: string
          peso_unidade_kg?: number | null
          preco_base?: number | null
          rendimento_dose_gramas?: number | null
          sku?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          estoque_escritorio?: number | null
          id?: string
          marca_id?: string | null
          nome?: string
          peso_unidade_kg?: number | null
          preco_base?: number | null
          rendimento_dose_gramas?: number | null
          sku?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "marcas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          equipe: string | null
          id: string
          nome: string
          perfil: Database["public"]["Enums"]["user_role"]
          telefone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          equipe?: string | null
          id: string
          nome: string
          perfil?: Database["public"]["Enums"]["user_role"]
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          equipe?: string | null
          id?: string
          nome?: string
          perfil?: Database["public"]["Enums"]["user_role"]
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tarefas: {
        Row: {
          cliente_id: string
          created_at: string
          data_conclusao: string | null
          data_prevista: string | null
          descricao: string | null
          horario: string | null
          id: string
          origem: string | null
          prioridade: Database["public"]["Enums"]["priority_type"]
          responsavel_id: string
          status: Database["public"]["Enums"]["task_status"]
          tipo: Database["public"]["Enums"]["task_type"]
          titulo: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_conclusao?: string | null
          data_prevista?: string | null
          descricao?: string | null
          horario?: string | null
          id?: string
          origem?: string | null
          prioridade?: Database["public"]["Enums"]["priority_type"]
          responsavel_id: string
          status?: Database["public"]["Enums"]["task_status"]
          tipo: Database["public"]["Enums"]["task_type"]
          titulo: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_conclusao?: string | null
          data_prevista?: string | null
          descricao?: string | null
          horario?: string | null
          id?: string
          origem?: string | null
          prioridade?: Database["public"]["Enums"]["priority_type"]
          responsavel_id?: string
          status?: Database["public"]["Enums"]["task_status"]
          tipo?: Database["public"]["Enums"]["task_type"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calcular_metricas_cliente: {
        Args: { cliente_uuid: string }
        Returns: {
          compra_mensal_media: number
          total_comprado: number
        }[]
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["user_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      pode_ver_faturamento: {
        Args: { user_id: string }
        Returns: boolean
      }
      pode_ver_financeiro: {
        Args: { user_id: string }
        Returns: boolean
      }
      processar_clientes_inativos: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      interaction_result: "concluida" | "nao_atendido" | "reagendada"
      interaction_type: "visita" | "ligacao"
      interest_status: "comprando" | "interessado" | "parado"
      priority_type: "baixa" | "media" | "alta"
      sentiment_type: "positivo" | "neutro" | "negativo"
      task_status: "pendente" | "em_andamento" | "concluida" | "cancelada"
      task_type: "visitar" | "ligar"
      transaction_type: "receita" | "despesa"
      user_role: "admin" | "gestor" | "colaborador" | "leitura"
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
      interaction_result: ["concluida", "nao_atendido", "reagendada"],
      interaction_type: ["visita", "ligacao"],
      interest_status: ["comprando", "interessado", "parado"],
      priority_type: ["baixa", "media", "alta"],
      sentiment_type: ["positivo", "neutro", "negativo"],
      task_status: ["pendente", "em_andamento", "concluida", "cancelada"],
      task_type: ["visitar", "ligar"],
      transaction_type: ["receita", "despesa"],
      user_role: ["admin", "gestor", "colaborador", "leitura"],
    },
  },
} as const
